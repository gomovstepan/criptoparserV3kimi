"""Middleware для API Gateway: error handling, request logging, CSRF protection."""

import time
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# CSRF: токен в заголовке X-CSRF-Token
CSRF_SECRET = "csrf_secret_change_in_production"


async def error_handling_middleware(request: Request, call_next):
    """Глобальный обработчик ошибок. Ловит все неперехваченные exceptions,
    логирует их и возвращает safe JSON response (без stack trace).
    """
    try:
        response = await call_next(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": str(id(request)),
            },
        )


async def logging_middleware(request: Request, call_next):
    """Middleware для логирования всех запросов.
    
    Логирует: method, path, status_code, duration_ms, client_ip
    """
    start = time.time()
    
    # Client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    
    response = await call_next(request)
    
    duration_ms = round((time.time() - start) * 1000, 2)
    
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} "
        f"({duration_ms}ms) "
        f"ip={client_ip}"
    )
    
    # Добавляем заголовок с request ID
    response.headers["X-Request-ID"] = str(id(request))
    return response


async def csrf_middleware(request: Request, call_next):
    """CSRF защита для state-changing запросов.
    
    Проверяет X-CSRF-Token для POST, PUT, DELETE, PATCH.
    GET, HEAD, OPTIONS — не проверяем (safe methods).
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)
    
    # Пропускаем auth endpoints (login получает токен)
    if request.url.path == "/api/v1/auth/login":
        return await call_next(request)
    
    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
        return JSONResponse(
            status_code=403,
            content={"detail": "CSRF token missing"},
        )
    
    # Простая проверка (в проде — HMAC signature)
    # Пропускаем для demo
    return await call_next(request)
