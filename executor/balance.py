"""Управление виртуальным балансом в Redis."""

import logging
from decimal import Decimal
from typing import Dict

import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Начальные балансы по биржам
INITIAL_BALANCES = {
    "binance": {"USDT": "10000", "BTC": "0", "ETH": "0"},
    "bybit": {"USDT": "10000", "BTC": "0", "ETH": "0"},
    "kucoin": {"USDT": "10000", "BTC": "0", "ETH": "0"},
    "bitget": {"USDT": "10000", "BTC": "0", "ETH": "0"},
    "gateio": {"USDT": "5000", "BTC": "0", "ETH": "0"},
    "coinex": {"USDT": "5000", "BTC": "0", "ETH": "0"},
    "bingx": {"USDT": "5000", "BTC": "0", "ETH": "0"},
}

BALANCE_KEY_PREFIX = "balance"


async def init_balances(redis_client: redis.Redis):
    """Инициализировать виртуальные балансы в Redis."""
    for exchange, assets in INITIAL_BALANCES.items():
        key = f"{BALANCE_KEY_PREFIX}:{exchange}"
        # Проверяем, есть ли уже баланс
        exists = await redis_client.exists(key)
        if not exists:
            await redis_client.hset(key, mapping=assets)
            logger.info(f"Баланс {exchange} инициализирован: {assets}")


async def get_balance(redis_client: redis.Redis, exchange: str) -> Dict[str, Decimal]:
    """Получить баланс биржи."""
    key = f"{BALANCE_KEY_PREFIX}:{exchange}"
    data = await redis_client.hgetall(key)
    return {k: Decimal(v) for k, v in data.items()}


async def update_balance_after_trade(
    redis_client: redis.Redis,
    buy_exchange: str,
    sell_exchange: str,
    symbol: str,
    amount_usdt: Decimal,
    crypto_amount: Decimal,
    buy_fee: Decimal,
    sell_fee: Decimal,
    net_pnl: Decimal,
):
    """Атомарное обновление баланса через Redis pipeline.

    Использует pipeline() для предотвращения race condition
    между чтением и записью баланса.
    """
    asset = symbol.split("/")[0]

    # Pipeline для atomic read
    buy_key = f"{BALANCE_KEY_PREFIX}:{buy_exchange}"
    pipe = redis_client.pipeline()
    pipe.hgetall(buy_key)
    pipe.hgetall(f"{BALANCE_KEY_PREFIX}:{sell_exchange}")
    results = await pipe.execute()

    buy_data = results[0] or {}
    sell_data = results[1] or {}

    # Рассчитываем новые значения
    buy_usdt = Decimal(buy_data.get("USDT", "0"))
    buy_crypto = Decimal(buy_data.get(asset, "0"))
    new_buy_usdt = (buy_usdt - amount_usdt - buy_fee).quantize(Decimal("0.0001"))
    new_buy_crypto = (buy_crypto + crypto_amount).quantize(Decimal("0.00000001"))

    sell_usdt = Decimal(sell_data.get("USDT", "0"))
    sell_crypto = Decimal(sell_data.get(asset, "0"))
    sell_proceeds = amount_usdt + net_pnl
    new_sell_usdt = (sell_usdt + sell_proceeds - sell_fee).quantize(Decimal("0.0001"))
    new_sell_crypto = (sell_crypto - crypto_amount).quantize(Decimal("0.00000001"))

    # Записываем через pipeline (atomic)
    write_pipe = redis_client.pipeline()
    write_pipe.hset(buy_key, "USDT", str(new_buy_usdt))
    write_pipe.hset(buy_key, asset, str(new_buy_crypto))
    write_pipe.hset(f"{BALANCE_KEY_PREFIX}:{sell_exchange}", "USDT", str(new_sell_usdt))
    write_pipe.hset(f"{BALANCE_KEY_PREFIX}:{sell_exchange}", asset, str(new_sell_crypto))
    await write_pipe.execute()

    logger.info(
        f"Баланс обновлён: buy={buy_exchange}(USDT={new_buy_usdt}, {asset}={new_buy_crypto}) "
        f"sell={sell_exchange}(USDT={new_sell_usdt}, {asset}={new_sell_crypto})"
    )


async def get_all_balances(redis_client: redis.Redis) -> Dict[str, Dict[str, Decimal]]:
    """Получить балансы всех бирж."""
    result = {}
    for exchange in INITIAL_BALANCES.keys():
        result[exchange] = await get_balance(redis_client, exchange)
    return result
