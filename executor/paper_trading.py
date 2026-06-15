"""Paper Trading Engine — симуляция исполнения арбитражных сделок."""

import asyncio
import time
import logging
from decimal import Decimal
from typing import Optional, Dict

import redis.asyncio as redis
import asyncpg

from shared.config import EXCHANGES
from executor.pnl import calculate_pnl, calculate_trade_amount, check_max_position
from executor.balance import update_balance_after_trade
from executor.validation import validate_opportunity, validate_trade_amount

logger = logging.getLogger(__name__)

# Redis настройки
INPUT_STREAM = "opportunities"
CONSUMER_GROUP = "executor-cg"
CONSUMER_NAME = "executor-1"
OUTPUT_STREAM = "trades"


class PaperTradingEngine:
    """Движок paper trading."""

    def __init__(
        self,
        redis_client: redis.Redis,
        db_pool: asyncpg.Pool,
        kill_switch: bool = False,
    ):
        self.redis = redis_client
        self.db_pool = db_pool
        self.kill_switch = kill_switch
        self.running = False
        self.trades_executed = 0
        self.total_pnl = Decimal("0")

    async def start(self):
        """Запустить paper trading engine."""
        self.running = True
        logger.info("Paper Trading Engine запущен")

        # Создаём consumer group
        try:
            await self.redis.xgroup_create(
                INPUT_STREAM, CONSUMER_GROUP, id="0", mkstream=True
            )
            logger.info(f"Consumer group '{CONSUMER_GROUP}' создан")
        except redis.ResponseError as e:
            if "already exists" in str(e):
                logger.info(f"Consumer group '{CONSUMER_GROUP}' уже существует")
            else:
                raise

        while self.running:
            try:
                if self.kill_switch:
                    logger.warning("Kill switch активен — сделки не исполняются")
                    await asyncio.sleep(1)
                    continue

                messages = await self.redis.xreadgroup(
                    groupname=CONSUMER_GROUP,
                    consumername=CONSUMER_NAME,
                    streams={INPUT_STREAM: ">"},
                    count=10,
                    block=500,
                )

                if messages:
                    for stream_name, entries in messages:
                        for entry_id, fields in entries:
                            await self._process_opportunity(fields)

            except asyncio.CancelledError:
                logger.info("Paper Trading Engine остановлен")
                break
            except Exception as e:
                logger.error(f"Ошибка в Paper Trading Engine: {e}")
                await asyncio.sleep(1)

    async def _process_opportunity(self, fields: dict):
        """Обработать одну арбитражную opportunity.

        Выполняет полный цикл paper trade:
        1. Валидация входных данных
        2. Проверка баланса на buy_exchange
        3. Расчёт размера позиции (max 10% от баланса)
        4. Расчёт P&L с учётом комиссий и slippage
        5. Создание и публикация trade в Redis Stream
        6. Сохранение trade в TimescaleDB
        7. Обновление виртуальных балансов

        Args:
            fields: Поля opportunity из Redis Stream.
        """
        try:
            symbol = fields.get("symbol", "")
            buy_exchange = fields.get("buy_exchange", "")
            sell_exchange = fields.get("sell_exchange", "")
            buy_price = Decimal(fields.get("buy_price", "0"))
            sell_price = Decimal(fields.get("sell_price", "0"))
            buy_fee_pct = Decimal(fields.get("buy_fee_pct", "0"))
            sell_fee_pct = Decimal(fields.get("sell_fee_pct", "0"))
            withdrawal_fee = Decimal(fields.get("withdrawal_fee_usd", "1.0"))
            opportunity_id = fields.get("id", "unknown")

            # Валидация opportunity через shared module
            is_valid, error_msg = validate_opportunity(
                symbol=symbol,
                buy_exchange=buy_exchange,
                sell_exchange=sell_exchange,
                buy_price=buy_price,
                sell_price=sell_price,
                gross_spread_pct=Decimal(fields.get("gross_spread_pct", "0")),
            )
            if not is_valid:
                logger.warning(f"Opportunity validation failed: {error_msg}")
                # Добавляем в DLQ если есть
                if hasattr(self, 'dlq') and self.dlq:
                    await self.dlq.add(fields, "validation_failed", error_msg)
                return

            # Проверяем баланс buy_exchange
            from executor.balance import get_balance
            balance = await get_balance(self.redis, buy_exchange)
            usdt_balance = balance.get("USDT", Decimal("0"))

            if usdt_balance <= 0:
                logger.warning(f"Нулевой баланс на {buy_exchange}")
                return

            # Рассчитываем размер сделки
            amount_usdt = calculate_trade_amount(usdt_balance)

            # Валидация размера сделки
            is_valid, error_msg = validate_trade_amount(amount_usdt, usdt_balance)
            if not is_valid:
                logger.warning(f"Trade amount validation failed: {error_msg}")
                return

            # Проверяем max position
            if not check_max_position(usdt_balance, amount_usdt):
                logger.warning(f"Превышен max position на {buy_exchange}")
                return

            # Рассчитываем P&L
            pnl_result = calculate_pnl(
                buy_price=buy_price,
                sell_price=sell_price,
                amount_usdt=amount_usdt,
                buy_fee_pct=buy_fee_pct,
                sell_fee_pct=sell_fee_pct,
                withdrawal_fee_usd=withdrawal_fee,
            )

            # Создаём trade
            now_ms = int(time.time() * 1000)
            trade_id = f"trade_{now_ms}_{buy_exchange}_{sell_exchange}_{symbol.replace('/', '').lower()}"

            trade = {
                "id": trade_id,
                "opportunity_id": opportunity_id,
                "symbol": symbol,
                "buy_exchange": buy_exchange,
                "sell_exchange": sell_exchange,
                "buy_price": str(buy_price),
                "sell_price": str(sell_price),
                "amount": str(pnl_result["crypto_amount"]),
                "amount_usdt": str(amount_usdt),
                "buy_fee": str(pnl_result["buy_fee"]),
                "sell_fee": str(pnl_result["sell_fee"]),
                "withdrawal_fee": str(pnl_result["withdrawal_fee"]),
                "slippage_cost": str(pnl_result["slippage_cost"]),
                "gross_pnl": str(pnl_result["gross_pnl"]),
                "net_pnl": str(pnl_result["net_pnl"]),
                "status": "completed",
                "executed_at": str(now_ms),
            }

            # Публикуем в Redis Stream trades
            await self.redis.xadd(OUTPUT_STREAM, trade, maxlen=10000, approximate=True)

            # Сохраняем в TimescaleDB
            await self._save_trade(trade)

            # Обновляем баланс
            await update_balance_after_trade(
                redis_client=self.redis,
                buy_exchange=buy_exchange,
                sell_exchange=sell_exchange,
                symbol=symbol,
                amount_usdt=amount_usdt,
                crypto_amount=pnl_result["crypto_amount"],
                buy_fee=pnl_result["buy_fee"],
                sell_fee=pnl_result["sell_fee"],
                net_pnl=pnl_result["net_pnl"],
            )

            self.trades_executed += 1
            self.total_pnl += pnl_result["net_pnl"]

            logger.info(
                f"Trade executed: {trade_id} "
                f"{symbol} buy={buy_exchange} sell={sell_exchange} "
                f"net_pnl={pnl_result['net_pnl']} USDT"
            )

        except Exception as e:
            logger.error(f"Ошибка обработки opportunity: {e}", exc_info=True)

    async def _save_trade(self, trade: dict):
        """Сохранить trade в TimescaleDB."""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO trades 
                        (time, id, opportunity_id, symbol, buy_exchange, sell_exchange,
                         buy_price, sell_price, amount, buy_fee, sell_fee,
                         withdrawal_fee, slippage_cost, gross_pnl, net_pnl, 
                         status, executed_at)
                    VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    trade["id"],
                    trade["opportunity_id"],
                    trade["symbol"],
                    trade["buy_exchange"],
                    trade["sell_exchange"],
                    Decimal(trade["buy_price"]),
                    Decimal(trade["sell_price"]),
                    Decimal(trade["amount"]),
                    Decimal(trade["buy_fee"]),
                    Decimal(trade["sell_fee"]),
                    Decimal(trade["withdrawal_fee"]),
                    Decimal(trade["slippage_cost"]),
                    Decimal(trade["gross_pnl"]),
                    Decimal(trade["net_pnl"]),
                    trade["status"],
                )
        except Exception as e:
            logger.error(f"Ошибка сохранения trade: {e}")

    async def stop(self):
        """Остановить engine."""
        self.running = False
        logger.info("Paper Trading Engine остановка...")

    def get_status(self) -> dict:
        """Статус engine."""
        return {
            "running": self.running,
            "kill_switch": self.kill_switch,
            "trades_executed": self.trades_executed,
            "total_pnl": str(self.total_pnl),
        }
