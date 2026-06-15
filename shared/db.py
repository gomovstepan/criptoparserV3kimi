"""Управление подключением к TimescaleDB через asyncpg."""

import os
import asyncio
import asyncpg
from typing import Optional

DB_POOL: Optional[asyncpg.Pool] = None
_pool_lock = asyncio.Lock()


async def get_db_pool() -> asyncpg.Pool:
    """Получить connection pool к TimescaleDB.

    Thread-safe singleton с asyncio.Lock для предотвращения
    race condition при одновременном создании из нескольких корутин.
    Автоматически пересоздаёт пул если он был закрыт (reconnection).
    """
    global DB_POOL
    if DB_POOL is not None and not DB_POOL._closed:
        return DB_POOL

    async with _pool_lock:
        # Двойная проверка после получения lock
        if DB_POOL is not None and not DB_POOL._closed:
            return DB_POOL

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            host = os.getenv("POSTGRES_HOST", "timescaledb")
            port = os.getenv("POSTGRES_PORT", "5432")
            user = os.getenv("POSTGRES_USER", "arbitrage")
            password = os.getenv("POSTGRES_PASSWORD", "arbitrage_pass")
            database = os.getenv("POSTGRES_DB", "arbitrage_db")
            db_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"

        DB_POOL = await asyncpg.create_pool(
            db_url,
            min_size=5,
            max_size=20,
            command_timeout=30,
            server_settings={"jit": "off", "application_name": "arbitrage_app"},
        )
        return DB_POOL


async def close_db_pool():
    """Закрыть connection pool."""
    global DB_POOL
    async with _pool_lock:
        if DB_POOL and not DB_POOL._closed:
            await DB_POOL.close()
        DB_POOL = None
