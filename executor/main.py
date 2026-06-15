"""Executor Service — Paper Trading Engine.

Читает opportunities из Redis Stream, симулирует сделки,
обновляет виртуальный баланс, записывает trades в TimescaleDB.
"""

import uvloop
import asyncio
import time
import logging
from decimal import Decimal
from fastapi import FastAPI
from contextlib import asynccontextmanager

import redis.asyncio as redis

from shared.db import get_db_pool, close_db_pool
from executor.paper_trading import PaperTradingEngine
from executor.balance import init_balances
from executor.validation import validate_opportunity, validate_trade_amount
from executor.dead_letter import DeadLetterQueue

uvloop.install()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Глобальные переменные
engine: PaperTradingEngine | None = None
app_status = {
    "redis_connected": False,
    "db_connected": False,
    "kill_switch_active": False,
    "trades_today": 0,
    "total_pnl_today": 0,
}


async def get_redis_client() -> redis.Redis:
    """Получить Redis клиент."""
    redis_url = "redis://redis:6379/0"
    import os
    redis_url = os.getenv("REDIS_URL", redis_url)
    return redis.from_url(redis_url, decode_responses=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan контекст — startup и shutdown Executor Service.

    Startup:
        1. Подключение к Redis и TimescaleDB
        2. Инициализация виртуальных балансов
        3. Запуск Paper Trading Engine
        4. Инициализация Dead Letter Queue

    Shutdown:
        1. Остановка Paper Trading Engine
        2. Закрытие соединений с Redis и TimescaleDB

    Args:
        app: Экземпляр FastAPI приложения.

    Yields:
        None
    """
    global engine, app_status

    # Startup
    logger.info("Executor Service запускается...")

    redis_client = await get_redis_client()
    try:
        await redis_client.ping()
        app_status["redis_connected"] = True
        logger.info("Redis: подключен")
    except Exception as e:
        logger.error(f"Redis: ошибка — {e}")

    db_pool = await get_db_pool()
    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            assert result == 1
        app_status["db_connected"] = True
        logger.info("TimescaleDB: подключена")
    except Exception as e:
        logger.error(f"TimescaleDB: ошибка — {e}")

    # Инициализируем балансы
    await init_balances(redis_client)
    logger.info("Виртуальные балансы инициализированы")

    # Запускаем paper trading engine
    engine = PaperTradingEngine(
        redis_client=redis_client,
        db_pool=db_pool,
        kill_switch=False,
    )

    # Инициализируем Dead Letter Queue
    dlq = DeadLetterQueue(redis_client)
    engine.dlq = dlq  # type: ignore[attr-defined]
    logger.info("Dead Letter Queue инициализирована")

    engine_task = asyncio.create_task(engine.start())
    logger.info("Paper Trading Engine запущен")

    yield

    # Shutdown
    logger.info("Executor Service останавливается...")
    if engine:
        await engine.stop()
    engine_task.cancel()
    try:
        await engine_task
    except asyncio.CancelledError:
        pass

    await redis_client.close()
    await close_db_pool()


app = FastAPI(title="Executor Service", lifespan=lifespan)


@app.get("/health")
async def health():
    """Health check."""
    status = "healthy"
    if app_status["kill_switch_active"]:
        status = "degraded"

    pnl = Decimal("0")
    if engine:
        pnl = Decimal(engine.get_status().get("total_pnl", "0"))

    return {
        "status": status,
        "service": "executor",
        "redis_connected": app_status["redis_connected"],
        "db_connected": app_status["db_connected"],
        "kill_switch_active": app_status["kill_switch_active"],
        "trades_today": engine.trades_executed if engine else 0,
        "total_pnl_today": float(pnl),
    }


@app.post("/killswitch")
async def killswitch(reason: str = "manual"):
    """Kill switch — аварийная остановка всех сделок.
    
    Args:
        reason: причина активации
    
    Returns:
        {"status": "activated", "reason": ..., "timestamp": ...}
    """
    global engine, app_status

    app_status["kill_switch_active"] = True
    if engine:
        engine.kill_switch = True

    logger.critical(f"Kill switch активирован: {reason}")

    return {
        "status": "activated",
        "reason": reason,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/killswitch/reset")
async def killswitch_reset():
    """Сбросить kill switch."""
    global engine, app_status

    app_status["kill_switch_active"] = False
    if engine:
        engine.kill_switch = False

    logger.info("Kill switch сброшен")

    return {
        "status": "reset",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/dead-letter")
async def get_dead_letter(count: int = 10):
    """Получить последние failed trades из DLQ."""
    if not engine or not hasattr(engine, 'dlq'):
        return {"items": [], "total": 0}
    items = await engine.dlq.get_recent(count)
    return {"items": items, "total": len(items)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False, loop="uvloop")
