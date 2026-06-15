"""WebSocket клиент для сбора данных с криптобирж через CCXT Pro."""

import asyncio
import time
import ccxt.pro as ccxtpro
import ccxt.async_support as ccxt_rest
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Маппинг ID бирж на CCXT Pro классы
CCXT_PRO_MAP = {
    "binance": ccxtpro.binance,
    "bybit": ccxtpro.bybit,
    "kucoin": ccxtpro.kucoin,
    "gateio": ccxtpro.gate,
    "bitget": ccxtpro.bitget,
    "coinex": ccxtpro.coinex,
    "bingx": ccxtpro.bingx,
}

# Маппинг ID бирж на CCXT REST классы (fallback)
CCXT_REST_MAP = {
    "binance": ccxt_rest.binance,
    "bybit": ccxt_rest.bybit,
    "kucoin": ccxt_rest.kucoin,
    "gateio": ccxt_rest.gate,
    "bitget": ccxt_rest.bitget,
    "coinex": ccxt_rest.coinex,
    "bingx": ccxt_rest.bingx,
}


class ExchangeCollector:
    """WebSocket коллектор для одной биржи и пары."""

    def __init__(
        self,
        exchange_id: str,
        symbol: str = "BTC/USDT",
        on_tick: Optional[Callable] = None,
    ):
        """Инициализировать WebSocket коллектор для биржи.

        Args:
            exchange_id: ID биржи (binance, bybit, kucoin, ...).
            symbol: Торговая пара (по умолчанию BTC/USDT).
            on_tick: Callback при получении нового тика.
        """
        self.exchange_id = exchange_id
        self.symbol = symbol
        self.on_tick = on_tick
        self.exchange: Optional[Any] = None
        self.running = False
        self.connected = False
        self.reconnect_delays = [0.1, 1, 5, 30, 60]
        self.reconnect_attempt = 0
        self.ws_fallback_since: Optional[float] = None
        self.messages_count = 0
        self.last_message_at: Optional[float] = None

    async def start(self):
        """Запустить WebSocket сборщик с REST fallback."""
        self.running = True

        while self.running:
            try:
                # Пробуем WebSocket
                await self._run_ws()
            except Exception as e:
                logger.error(f"[{self.exchange_id}:{self.symbol}] WS ошибка: {e}")
                # Если WS не работает > 30 сек — fallback на REST
                if self.ws_fallback_since is None:
                    self.ws_fallback_since = time.time()
                elif time.time() - self.ws_fallback_since > 30:
                    logger.warning(
                        f"[{self.exchange_id}:{self.symbol}] Fallback на REST API"
                    )
                    await self._run_rest()
                    continue
                await self._reconnect()
            finally:
                if self.exchange:
                    await self.exchange.close()
                    self.exchange = None
                self.connected = False

    async def _run_ws(self):
        """Запустить WebSocket сбор через CCXT Pro watch_order_book."""
        exchange_class = CCXT_PRO_MAP.get(self.exchange_id)
        if not exchange_class:
            logger.error(f"Неизвестная биржа: {self.exchange_id}")
            return

        self.exchange = exchange_class(
            {"enableRateLimit": True, "options": {"defaultType": "spot"}}
        )

        logger.info(f"[{self.exchange_id}:{self.symbol}] WS подключение...")
        await self._watch_loop()

    async def _watch_loop(self):
        """Основной цикл watch_order_book."""
        logger.info(f"[{self.exchange_id}:{self.symbol}] WS подключен")
        self.reconnect_attempt = 0
        self.ws_fallback_since = None
        self.connected = True

        while self.running:
            order_book = await self.exchange.watch_order_book(self.symbol)

            if not order_book or "bids" not in order_book:
                continue

            best_bid = order_book["bids"][0] if order_book["bids"] else None
            best_ask = order_book["asks"][0] if order_book["asks"] else None

            if best_bid and best_ask:
                self.messages_count += 1
                self.last_message_at = time.time()

                tick_data = {
                    "exchange": self.exchange_id,
                    "symbol": self.symbol,
                    "bid": float(best_bid[0]),
                    "ask": float(best_ask[0]),
                    "bid_volume": float(best_bid[1]) if len(best_bid) > 1 else None,
                    "ask_volume": float(best_ask[1]) if len(best_ask) > 1 else None,
                    "timestamp": int(time.time() * 1000),
                }

                if self.on_tick:
                    await self.on_tick(tick_data)

    async def _run_rest(self):
        """Fallback: сбор через REST API fetch_ticker."""
        exchange_class = CCXT_REST_MAP.get(self.exchange_id)
        if not exchange_class:
            return

        logger.info(f"[{self.exchange_id}:{self.symbol}] REST fallback запущен")
        self.connected = True

        while self.running:
            try:
                if self.exchange is None:
                    self.exchange = exchange_class(
                        {"enableRateLimit": True, "options": {"defaultType": "spot"}}
                    )
                ticker = await self.exchange.fetch_ticker(self.symbol)
                if ticker and ticker.get("bid") and ticker.get("ask"):
                    self.messages_count += 1
                    self.last_message_at = time.time()

                    tick_data = {
                        "exchange": self.exchange_id,
                        "symbol": self.symbol,
                        "bid": float(ticker["bid"]),
                        "ask": float(ticker["ask"]),
                        "bid_volume": float(ticker.get("bidVolume", 0)) or None,
                        "ask_volume": float(ticker.get("askVolume", 0)) or None,
                        "timestamp": int(time.time() * 1000),
                    }

                    if self.on_tick:
                        await self.on_tick(tick_data)

                # REST polling — 1 секунда между запросами
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"[{self.exchange_id}:{self.symbol}] REST ошибка: {e}")
                if self.exchange:
                    try:
                        await self.exchange.close()
                    except Exception:
                        pass
                    self.exchange = None
                await asyncio.sleep(5)

    async def _reconnect(self):
        """Переподключение с exponential backoff."""
        delay = self.reconnect_delays[
            min(self.reconnect_attempt, len(self.reconnect_delays) - 1)
        ]
        self.reconnect_attempt += 1
        logger.info(
            f"[{self.exchange_id}:{self.symbol}] Переподключение через {delay}s "
            f"(попытка {self.reconnect_attempt})"
        )
        await asyncio.sleep(delay)

    async def stop(self):
        """Остановить сборщик."""
        logger.info(f"[{self.exchange_id}:{self.symbol}] Остановка...")
        self.running = False
        self.connected = False
        if self.exchange:
            await self.exchange.close()
            self.exchange = None

    def get_status(self) -> dict:
        """Получить статус коллектора."""
        return {
            "exchange": self.exchange_id,
            "symbol": self.symbol,
            "connected": self.connected,
            "messages_count": self.messages_count,
            "last_message_at": self.last_message_at,
            "reconnect_attempt": self.reconnect_attempt,
        }
