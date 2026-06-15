"""Circuit Breaker для защиты от каскадных отказов external API."""

import asyncio
import logging
import time
from enum import Enum
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"       # нормальная работа
    OPEN = "open"           # отказ, запросы не идут
    HALF_OPEN = "half_open" # тестовый режим


class CircuitBreaker:
    """Circuit Breaker для external API calls.
    
    - CLOSED: запросы проходят, считаем ошибки
    - После threshold ошибок → OPEN
    - OPEN: запросы блокируются, ждём timeout
    - После timeout → HALF_OPEN (1 тестовый запрос)
    - HALF_OPEN: если успех → CLOSED, если ошибка → OPEN
    
    Args:
        name: имя сервиса (для логов)
        failure_threshold: количество ошибок до OPEN
        recovery_timeout: секунд до HALF_OPEN
        half_open_max_calls: тестовых запросов в HALF_OPEN
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 1,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.half_open_calls = 0

    async def call(self, fn: Callable, *args, **kwargs):
        """Вызвать функцию с circuit breaker защитой.
        
        Returns:
            Результат функции
        
        Raises:
            CircuitBreakerOpen: если breaker в OPEN состоянии
        """
        if self.state == CircuitState.OPEN:
            if time.time() - (self.last_failure_time or 0) > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
                logger.info(f"[{self.name}] Circuit → HALF_OPEN")
            else:
                raise CircuitBreakerOpen(f"[{self.name}] Circuit breaker is OPEN")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise CircuitBreakerOpen(f"[{self.name}] HALF_OPEN limit reached")
            self.half_open_calls += 1

        try:
            result = await fn(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            # Декремент half_open_calls при ошибке чтобы не тратить слоты
            if self.state == CircuitState.HALF_OPEN:
                self.half_open_calls = max(0, self.half_open_calls - 1)
            self._on_failure()
            raise

    def _on_success(self):
        """Успешный вызов — сбрасываем счётчики."""
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            logger.info(f"[{self.name}] Circuit → CLOSED (recovered)")
        else:
            self.failure_count = 0

    def _on_failure(self):
        """Ошибка — увеличиваем счётчик."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                f"[{self.name}] Circuit → OPEN "
                f"({self.failure_count} failures)"
            )

    def get_status(self) -> dict:
        """Статус circuit breaker."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time,
        }


class CircuitBreakerOpen(Exception):
    """Исключение: circuit breaker в OPEN состоянии."""
    pass


# Singleton-инстансы для каждого сервиса
BREAKERS: dict[str, CircuitBreaker] = {}


def get_breaker(name: str) -> CircuitBreaker:
    """Получить или создать CircuitBreaker для сервиса."""
    if name not in BREAKERS:
        BREAKERS[name] = CircuitBreaker(name)
    return BREAKERS[name]
