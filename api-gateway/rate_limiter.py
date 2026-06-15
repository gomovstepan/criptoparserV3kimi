"""Simple in-memory rate limiter."""

import time
from typing import Dict, Optional
from fastapi import HTTPException, Request, status


class RateLimiter:
    """In-memory rate limiter по IP."""

    def __init__(self, requests_per_minute: int = 100):
        self.requests_per_minute = requests_per_minute
        self._requests: Dict[str, list] = {}  # ip -> [timestamps]

    def is_allowed(self, key: str) -> bool:
        """Проверить, не превышен ли лимит."""
        now = time.time()
        window_start = now - 60

        # Получаем историю запросов
        history = self._requests.get(key, [])
        history = [ts for ts in history if ts > window_start]
        history.append(now)
        self._requests[key] = history

        return len(history) <= self.requests_per_minute

    def reset(self, key: str):
        """Сбросить счётчик для ключа."""
        self._requests.pop(key, None)


# Глобальный rate limiter
rest_limiter = RateLimiter(requests_per_minute=100)
ws_limiter = RateLimiter(requests_per_minute=600)  # 10 msg/sec


def check_rate_limit(request: Request):
    """Dependency для REST rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    if not rest_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: 100 req/min",
        )
