"""Утилиты для переподключения с exponential backoff."""

import asyncio
import logging
from typing import List, Optional, Callable

logger = logging.getLogger(__name__)

# Стандартные задержки для exponential backoff
DEFAULT_BACKOFF_DELAYS = [0.1, 1, 5, 30, 60]


class ReconnectManager:
    """Менеджер переподключения с exponential backoff."""

    def __init__(
        self,
        delays: Optional[List[float]] = None,
        max_attempts: Optional[int] = None,
    ):
        self.delays = delays or DEFAULT_BACKOFF_DELAYS
        self.max_attempts = max_attempts
        self.attempt = 0
        self.last_reconnect_at: Optional[float] = None

    def get_delay(self) -> float:
        """Получить задержку для текущей попытки."""
        delay = self.delays[min(self.attempt, len(self.delays) - 1)]
        return delay

    async def wait(self):
        """Подождать перед следующей попыткой."""
        delay = self.get_delay()
        self.attempt += 1
        self.last_reconnect_at = asyncio.get_event_loop().time()
        logger.info(f"Переподключение через {delay}s (попытка {self.attempt})")
        await asyncio.sleep(delay)

    def reset(self):
        """Сбросить счётчик попыток (успешное подключение)."""
        if self.attempt > 0:
            logger.info(f"Переподключение успешно после {self.attempt} попыток")
        self.attempt = 0

    def is_max_reached(self) -> bool:
        """Достигнуто ли максимальное число попыток."""
        if self.max_attempts is None:
            return False
        return self.attempt >= self.max_attempts


async def reconnect_with_backoff(
    connect_fn: Callable,
    delays: Optional[List[float]] = None,
    max_attempts: Optional[int] = None,
    on_success: Optional[Callable] = None,
    on_failure: Optional[Callable] = None,
):
    """Повторять подключение с exponential backoff.
    
    Args:
        connect_fn: async функция для подключения
        delays: список задержек в секундах
        max_attempts: максимальное число попыток (None = бесконечно)
        on_success: callback при успешном подключении
        on_failure: callback при исчерпании попыток
    """
    manager = ReconnectManager(delays=delays, max_attempts=max_attempts)

    while not manager.is_max_reached():
        try:
            await connect_fn()
            manager.reset()
            if on_success:
                await on_success()
            return True
        except Exception as e:
            logger.error(f"Ошибка подключения: {e}")
            await manager.wait()

    logger.critical("Исчерпаны все попытки переподключения")
    if on_failure:
        await on_failure()
    return False
