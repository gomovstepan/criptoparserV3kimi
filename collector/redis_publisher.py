"""Публикация тиков цен в Redis Stream."""

import redis.asyncio as redis
import os
from datetime import datetime
from typing import Optional

REDIS_POOL: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Получить Redis клиент."""
    global REDIS_POOL
    if REDIS_POOL is None:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        REDIS_POOL = redis.from_url(redis_url, decode_responses=True)
    return REDIS_POOL


async def publish_price(
    exchange: str,
    symbol: str,
    bid: float,
    ask: float,
    bid_volume: Optional[float] = None,
    ask_volume: Optional[float] = None,
) -> str:
    """Публиковать тик цены в Redis Stream 'prices'.

    Returns:
        ID записи в стриме.
    """
    r = await get_redis()
    now_ms = int(datetime.utcnow().timestamp() * 1000)

    data = {
        "exchange": exchange,
        "symbol": symbol,
        "bid": str(bid),
        "ask": str(ask),
        "timestamp": str(now_ms),
        "received_at": str(now_ms),
        "latency_ms": "0",
    }

    if bid_volume is not None:
        data["bid_volume"] = str(bid_volume)
    if ask_volume is not None:
        data["ask_volume"] = str(ask_volume)

    # XADD prices * ...
    entry_id = await r.xadd("prices", data, maxlen=100000, approximate=True)
    return entry_id


async def close_redis():
    """Закрыть Redis соединение."""
    global REDIS_POOL
    if REDIS_POOL:
        await REDIS_POOL.close()
        REDIS_POOL = None
