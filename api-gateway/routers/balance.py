"""REST API: /api/v1/balance — виртуальные балансы."""

from fastapi import APIRouter, Depends
from typing import Dict

from auth import get_current_user
import redis.asyncio as redis
import os

router = APIRouter(prefix="/balance", tags=["Balance"])


async def get_redis() -> redis.Redis:
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.from_url(redis_url, decode_responses=True)


@router.get("")
async def get_balance(user: str = Depends(get_current_user)):
    """Получить виртуальные балансы всех бирж."""
    exchanges = ["binance", "bybit", "kucoin", "bitget", "gateio", "coinex", "bingx"]
    r = await get_redis()

    try:
        result = {}
        for ex in exchanges:
            data = await r.hgetall(f"balance:{ex}")
            result[ex] = {k: float(v) for k, v in data.items()} if data else {"USDT": 0, "BTC": 0, "ETH": 0}
        return result
    finally:
        await r.close()
