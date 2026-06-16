"""API Gateway — единая точка входа.

REST API /api/v1/* с JWT аутентификацией,
WebSocket /ws для real-time push,
Prometheus метрики на /metrics.
"""

import uvloop
import asyncio
import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

import redis.asyncio as redis
from prometheus_client import make_asgi_app

from auth import authenticate_user, create_token, TokenResponse, UserLogin
from rate_limiter import check_rate_limit
from websocket import websocket_handler, broadcast_from_redis, manager
from middleware import error_handling_middleware, logging_middleware, csrf_middleware

# Routers
from routers import prices, opportunities, trades, balance, exchanges, settings

uvloop.install()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Глобальные переменные
app_status = {
    "db_connected": False,
    "redis_connected": False,
    "ws_clients_active": 0,
}


async def get_redis_client() -> redis.Redis:
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.from_url(redis_url, decode_responses=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan контекст."""
    # Startup
    logger.info("API Gateway запускается...")

    redis_client = await get_redis_client()
    try:
        await redis_client.ping()
        app_status["redis_connected"] = True
        logger.info("Redis: подключен")
    except Exception as e:
        logger.error(f"Redis: ошибка — {e}")

    from shared.db import get_db_pool
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            assert result == 1
        app_status["db_connected"] = True
        logger.info("TimescaleDB: подключена")
    except Exception as e:
        logger.error(f"TimescaleDB: ошибка — {e}")

    # Запускаем WebSocket broadcast task
    ws_task = asyncio.create_task(broadcast_from_redis(redis_client))

    yield

    # Shutdown
    logger.info("API Gateway останавливается...")
    ws_task.cancel()
    try:
        await ws_task
    except asyncio.CancelledError:
        pass
    await redis_client.close()


app = FastAPI(
    title="Crypto Arbitrage API Gateway",
    description="REST API + WebSocket для крипто-арбитражной системы",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware
app.middleware("http")(error_handling_middleware)
app.middleware("http")(logging_middleware)
app.middleware("http")(csrf_middleware)

# CORS включён для development (nginx proxy в production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


# Auth endpoint
@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Аутентификация — получение JWT токена."""
    if not authenticate_user(credentials.email, credentials.password):
        return JSONResponse(
            status_code=401,
            content={"detail": "Неверный email или пароль"},
        )

    token = create_token(credentials.email)
    return TokenResponse(access_token=token)


# Include routers
app.include_router(prices.router, prefix="/api/v1")
app.include_router(opportunities.router, prefix="/api/v1")
app.include_router(trades.router, prefix="/api/v1")
app.include_router(balance.router, prefix="/api/v1")
app.include_router(exchanges.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")


# WebSocket endpoint
@app.websocket("/ws")
async def ws_endpoint(websocket):
    """WebSocket для real-time push данных."""
    await websocket_handler(websocket)


# Health
@app.get("/health")
async def health():
    """Health check."""
    app_status["ws_clients_active"] = len(manager.active_connections)
    return {
        "status": "healthy",
        "service": "api-gateway",
        "db_connected": app_status["db_connected"],
        "redis_connected": app_status["redis_connected"],
        "ws_clients_active": app_status["ws_clients_active"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, loop="uvloop")
