"""Scanner Service — обнаружение арбитражных возможностей.

Читает тики из Redis Stream 'prices', рассчитывает спреды между биржами,
фильтрует по min_spread, публикует opportunities в Redis Stream 'opportunities'.
"""

import uvloop
import asyncio
import logging
from decimal import Decimal
from fastapi import FastAPI
from contextlib import asynccontextmanager

import redis.asyncio as redis
import asyncpg

from shared.db import get_db_pool, close_db_pool
from shared.config import EXCHANGES
from spread_calculator import PriceCache, calculate_all_spreads
from dedup import OpportunityDedup

uvloop.install()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Настройки
STREAM_KEY = "prices"
CONSUMER_GROUP = "scanner-cg"
CONSUMER_NAME = "scanner-1"
OUTPUT_STREAM = "opportunities"
MIN_SPREAD_PCT = Decimal("0.10")  # 0.10% для paper trading, иначе слишком редко

# Глобальные переменные
app_status = {
    "redis_connected": False,
    "db_connected": False,
    "spreads_calculated": 0,
    "opportunities_found": 0,
    "dedup_stats": {},
}
price_cache = PriceCache(max_age_ms=5000)
dedup = OpportunityDedup(ttl_seconds=5)


async def get_redis_client() -> redis.Redis:
    """Получить Redis клиент."""
    redis_url = "redis://redis:6379/0"
    import os
    redis_url = os.getenv("REDIS_URL", redis_url)
    return redis.from_url(redis_url, decode_responses=True)


async def publish_opportunity(redis_client: redis.Redis, opp: dict) -> str:
    """Опубликовать opportunity в Redis Stream 'opportunities'."""
    entry_id = await redis_client.xadd(
        OUTPUT_STREAM,
        opp,
        maxlen=10000,
        approximate=True,
    )
    return entry_id


async def save_opportunity_to_db(pool: asyncpg.Pool, opp: dict):
    """Сохранить opportunity в TimescaleDB."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO opportunities 
                    (time, id, symbol, buy_exchange, sell_exchange, buy_price, 
                     sell_price, gross_spread_pct, buy_fee_pct, sell_fee_pct,
                     withdrawal_fee_usd, net_spread_pct)
                VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT DO NOTHING
                """,
                opp["id"],
                opp["symbol"],
                opp["buy_exchange"],
                opp["sell_exchange"],
                Decimal(opp["buy_price"]),
                Decimal(opp["sell_price"]),
                Decimal(opp["gross_spread_pct"]),
                Decimal(opp["buy_fee_pct"]),
                Decimal(opp["sell_fee_pct"]),
                Decimal(opp["withdrawal_fee_usd"]),
                Decimal(opp["net_spread_pct"]),
            )
    except Exception as e:
        logger.error(f"Ошибка сохранения opportunity в БД: {e}")


async def scanner_loop(redis_client: redis.Redis, db_pool: asyncpg.Pool):
    """Основной цикл сканера арбитражных возможностей.

    Читает тики из Redis Stream 'prices' через XREADGROUP,
    обновляет PriceCache, рассчитывает спреды между всеми
    парами бирж, фильтрует через дедупликацию и публикует
    opportunities в Redis Stream 'opportunities' + TimescaleDB.

    Args:
        redis_client: Подключение к Redis.
        db_pool: Пул подключений к TimescaleDB.
    """
    logger.info("Scanner loop запущен")

    # Создаём consumer group
    try:
        await redis_client.xgroup_create(
            STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True
        )
        logger.info(f"Consumer group '{CONSUMER_GROUP}' создан")
    except redis.ResponseError as e:
        if "already exists" in str(e):
            logger.info(f"Consumer group '{CONSUMER_GROUP}' уже существует")
        else:
            raise

    while True:
        try:
            # Читаем из prices stream
            messages = await redis_client.xreadgroup(
                groupname=CONSUMER_GROUP,
                consumername=CONSUMER_NAME,
                streams={STREAM_KEY: ">"},
                count=100,
                block=500,
            )

            if messages:
                for stream_name, entries in messages:
                    for entry_id, fields in entries:
                        # Парсим тик
                        try:
                            exchange = fields.get("exchange")
                            symbol = fields.get("symbol")
                            bid = Decimal(fields.get("bid", "0"))
                            ask = Decimal(fields.get("ask", "0"))
                            ts = int(fields.get("timestamp", 0))

                            if exchange and symbol and bid > 0 and ask > 0:
                                price_cache.update(exchange, symbol, bid, ask, ts)
                        except Exception as e:
                            logger.warning(f"Ошибка парсинга тика: {e}")

                # Рассчитываем спреды
                opportunities = calculate_all_spreads(price_cache, MIN_SPREAD_PCT)
                app_status["spreads_calculated"] += 1

                # Публикуем opportunities
                for opp in opportunities:
                    # Дедупликация
                    if dedup.is_duplicate(opp["symbol"], opp["buy_exchange"], opp["sell_exchange"]):
                        continue

                    # Публикуем в Redis
                    await publish_opportunity(redis_client, opp)
                    app_status["opportunities_found"] += 1

                    # Сохраняем в БД
                    await save_opportunity_to_db(db_pool, opp)

                    logger.info(
                        f"Opportunity: {opp['symbol']} "
                        f"buy={opp['buy_exchange']}@{opp['buy_price']} "
                        f"sell={opp['sell_exchange']}@{opp['sell_price']} "
                        f"gross={opp['gross_spread_pct']}% "
                        f"net={opp['net_spread_pct']}%"
                    )

        except asyncio.CancelledError:
            logger.info("Scanner loop остановлен")
            break
        except Exception as e:
            logger.error(f"Ошибка в scanner loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan контекст."""
    # Startup
    logger.info("Scanner Service запускается...")

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

    # Запускаем scanner loop
    scanner_task = asyncio.create_task(scanner_loop(redis_client, db_pool))

    yield

    # Shutdown
    logger.info("Scanner Service останавливается...")
    scanner_task.cancel()
    try:
        await scanner_task
    except asyncio.CancelledError:
        pass

    await redis_client.close()
    await close_db_pool()


app = FastAPI(title="Scanner Service", lifespan=lifespan)


@app.get("/health")
async def health():
    """Health check."""
    status = "healthy" if app_status["redis_connected"] else "degraded"
    return {
        "status": status,
        "service": "scanner",
        "redis_connected": app_status["redis_connected"],
        "db_connected": app_status["db_connected"],
        "spreads_calculated": app_status["spreads_calculated"],
        "opportunities_found": app_status["opportunities_found"],
        "dedup_stats": dedup.get_stats(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False, loop="uvloop")
