"""Notifier Service — Telegram Bot + Redis Streams consumer.

Читает opportunities и trades из Redis Streams,
отправляет Telegram уведомления с rate limiting.
"""

import uvloop
import asyncio
import logging
import os
from fastapi import FastAPI
from contextlib import asynccontextmanager

from aiogram import Bot, Dispatcher

import redis.asyncio as redis

from bot import router, notify_all
from formatter import format_opportunity, format_trade
from notifier.queue import TelegramQueue

uvloop.install()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Настройки
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
NOTIFICATION_THRESHOLD = 0.50  # %

# Redis Streams
OPPORTUNITIES_STREAM = "opportunities"
TRADES_STREAM = "trades"
CONSUMER_GROUP = "notifier-cg"
CONSUMER_NAME = "notifier-1"

# Глобальные переменные
app_status = {
    "telegram_connected": False,
    "bot_username": "",
    "messages_sent_today": 0,
    "queue_length": 0,
}


async def get_redis_client() -> redis.Redis:
    """Получить Redis клиент."""
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.from_url(redis_url, decode_responses=True)


async def redis_consumer_loop(bot: Bot, redis_client: redis.Redis, queue: TelegramQueue):
    """Читать из Redis Streams и отправлять в Telegram."""
    logger.info("Redis consumer loop запущен")

    # Создаём consumer group для обоих streams
    for stream in [OPPORTUNITIES_STREAM, TRADES_STREAM]:
        try:
            await redis_client.xgroup_create(
                stream, CONSUMER_GROUP, id="0", mkstream=True
            )
            logger.info(f"Consumer group '{CONSUMER_GROUP}' создан для '{stream}'")
        except redis.ResponseError as e:
            if "already exists" in str(e):
                logger.info(f"CG '{CONSUMER_GROUP}' уже существует для '{stream}'")
            else:
                raise

    while True:
        try:
            # Читаем из обоих streams
            messages = await redis_client.xreadgroup(
                groupname=CONSUMER_GROUP,
                consumername=CONSUMER_NAME,
                streams={
                    OPPORTUNITIES_STREAM: ">",
                    TRADES_STREAM: ">",
                },
                count=10,
                block=500,
            )

            if messages:
                for stream_name, entries in messages:
                    stream_name = stream_name.decode() if isinstance(stream_name, bytes) else stream_name
                    for entry_id, fields in entries:
                        try:
                            if stream_name == OPPORTUNITIES_STREAM:
                                gross = float(fields.get("gross_spread_pct", "0"))
                                if gross >= NOTIFICATION_THRESHOLD:
                                    text = format_opportunity(fields)
                                    # Отправляем всем авторизованным чатам
                                    await notify_all(bot, redis_client, text)
                                    app_status["messages_sent_today"] += 1

                            elif stream_name == TRADES_STREAM:
                                text = format_trade(fields)
                                await notify_all(bot, redis_client, text)
                                app_status["messages_sent_today"] += 1

                        except Exception as e:
                            logger.error(f"Ошибка обработки записи: {e}")

        except asyncio.CancelledError:
            logger.info("Redis consumer loop остановлен")
            break
        except Exception as e:
            logger.error(f"Ошибка в consumer loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan контекст."""
    # Startup
    logger.info("Notifier Service запускается...")

    redis_client = await get_redis_client()
    try:
        await redis_client.ping()
        logger.info("Redis: подключен")
    except Exception as e:
        logger.error(f"Redis: ошибка — {e}")

    # Инициализация aiogram
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)

    try:
        me = await bot.get_me()
        app_status["telegram_connected"] = True
        app_status["bot_username"] = me.username
        logger.info(f"Telegram Bot: @{me.username}")
    except Exception as e:
        logger.error(f"Telegram: ошибка подключения — {e}")
        app_status["telegram_connected"] = False

    # Запускаем queue и consumer
    queue = TelegramQueue(redis_client, bot)
    queue_task = asyncio.create_task(queue.start())
    consumer_task = asyncio.create_task(redis_consumer_loop(bot, redis_client, queue))

    # Запускаем polling в фоне
    polling_task = asyncio.create_task(dp.start_polling(bot))

    yield

    # Shutdown
    logger.info("Notifier Service останавливается...")

    for task in [queue_task, consumer_task, polling_task]:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    await bot.session.close()
    await redis_client.close()


app = FastAPI(title="Notifier Service", lifespan=lifespan)


@app.get("/health")
async def health():
    """Health check."""
    return {
        "status": "healthy" if app_status["telegram_connected"] else "degraded",
        "service": "notifier",
        "telegram_connected": app_status["telegram_connected"],
        "bot_username": app_status["bot_username"],
        "messages_sent_today": app_status["messages_sent_today"],
        "queue_length": app_status["queue_length"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=False, loop="uvloop")
