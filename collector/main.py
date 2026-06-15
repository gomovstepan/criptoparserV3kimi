"""Collector Service — WebSocket сборщик цен с 7 криптобирж.

Фазы 4+5: все 7 бирж + batch writer в TimescaleDB.
"""

import uvloop
import asyncio
import signal
import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager

# Импортируем компоненты фаз 4-5
from exchange_factory import (
    create_all_seven_exchanges,
    create_collectors,
    run_collectors,
    stop_collectors,
)
from redis_publisher import publish_price, close_redis, get_redis
from db_writer import BatchWriter
from shared.db import get_db_pool, close_db_pool

# Устанавливаем uvloop для производительности
uvloop.install()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Глобальные переменные
active_collectors: list = []
app_status = {
    "ws_connections": 0,
    "ws_connections_detail": {},
    "redis_connected": False,
    "db_connected": False,
    "writer_status": {},
}
batch_writer: BatchWriter | None = None


async def handle_tick(tick_data: dict):
    """Обработчик нового тика — публикует в Redis Stream 'prices'."""
    try:
        await publish_price(
            exchange=tick_data["exchange"],
            symbol=tick_data["symbol"],
            bid=tick_data["bid"],
            ask=tick_data["ask"],
            bid_volume=tick_data.get("bid_volume"),
            ask_volume=tick_data.get("ask_volume"),
        )
        app_status["redis_connected"] = True
    except Exception as e:
        logger.error(f"Ошибка публикации в Redis: {e}")
        app_status["redis_connected"] = False


async def update_status_loop():
    """Фоновая задача обновления статуса соединений."""
    while True:
        try:
            # Статус WebSocket соединений
            ws_detail = {}
            connected_count = 0
            for c in active_collectors:
                status = c.get_status()
                key = f"{status['exchange']}:{status['symbol']}"
                ws_detail[key] = "connected" if status["connected"] else "disconnected"
                if status["connected"]:
                    connected_count += 1

            app_status["ws_connections"] = connected_count
            app_status["ws_connections_detail"] = ws_detail

            # Статус batch writer
            if batch_writer:
                app_status["writer_status"] = batch_writer.get_status()

            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Ошибка в status loop: {e}")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan контекст — startup и shutdown."""
    global active_collectors, batch_writer

    # ===== STARTUP =====
    logger.info("=" * 60)
    logger.info("Collector Service запускается...")
    logger.info("=" * 60)

    # Инициализация Redis
    try:
        redis_client = await get_redis()
        await redis_client.ping()
        app_status["redis_connected"] = True
        logger.info("Redis: подключен")
    except Exception as e:
        logger.error(f"Redis: ошибка подключения — {e}")
        app_status["redis_connected"] = False

    # Инициализация TimescaleDB
    try:
        db_pool = await get_db_pool()
        async with db_pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            assert result == 1
        app_status["db_connected"] = True
        logger.info("TimescaleDB: подключена")
    except Exception as e:
        logger.error(f"TimescaleDB: ошибка подключения — {e}")
        app_status["db_connected"] = False

    # Создаём коллекторы для 7 бирж (Фаза 4)
    # Используем create_all_seven_exchanges для BTC/USDT на всех 7 биржах
    active_collectors = create_all_seven_exchanges(on_tick=handle_tick)

    # Запускаем коллекторов в фоне (каждый — отдельная asyncio задача)
    asyncio.create_task(run_collectors(active_collectors))
    logger.info(f"Запущено {len(active_collectors)} WebSocket коллекторов")

    # Запускаем batch writer (Фаза 5)
    if app_status["redis_connected"] and app_status["db_connected"]:
        batch_writer = BatchWriter(
            redis_client=redis_client,
            db_pool=db_pool,
            batch_size=100,
            batch_timeout_ms=1000,
        )
        asyncio.create_task(batch_writer.start())
        logger.info("BatchWriter запущен")
    else:
        logger.warning("BatchWriter НЕ запущен — нет подключения к Redis или БД")

    # Запускаем цикл обновления статуса
    asyncio.create_task(update_status_loop())

    logger.info("Collector Service готов к работе")

    yield

    # ===== SHUTDOWN =====
    logger.info("=" * 60)
    logger.info("Collector Service останавливается...")
    logger.info("=" * 60)

    # Останавливаем коллекторов
    await stop_collectors(active_collectors)
    active_collectors = []

    # Останавливаем batch writer
    if batch_writer:
        await batch_writer.stop()
        batch_writer = None

    # Закрываем соединения
    await close_redis()
    await close_db_pool()

    app_status["ws_connections"] = 0
    app_status["redis_connected"] = False
    app_status["db_connected"] = False

    logger.info("Collector Service остановлен")


app = FastAPI(title="Collector Service", lifespan=lifespan)


@app.get("/health")
async def health():
    """Health check endpoint.

    Returns:
        status: healthy/degraded
        ws_connections: количество активных WS соединений
        ws_connections_detail: статус каждой биржи
        redis_connected: bool
        db_connected: bool
        writer_status: метрики batch writer
    """
    status = "healthy"
    if app_status["ws_connections"] == 0:
        status = "degraded"
    if not app_status["redis_connected"]:
        status = "degraded"

    return {
        "status": status,
        "service": "collector",
        "ws_connections": app_status["ws_connections"],
        "ws_connections_detail": app_status["ws_connections_detail"],
        "redis_connected": app_status["redis_connected"],
        "db_connected": app_status["db_connected"],
        "writer_status": app_status["writer_status"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False, loop="uvloop")
