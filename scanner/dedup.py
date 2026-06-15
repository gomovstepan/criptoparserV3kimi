"""Дедупликация арбитражных возможностей."""

import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Время дедупликации: 5 секунд
DEDUP_TTL_SECONDS = 5


class OpportunityDedup:
    """Дедупликация opportunity по ключу (symbol + buy_exchange + sell_exchange).
    
    Не публикует ту же opportunity повторно в течение DEDUP_TTL_SECONDS.
    """

    def __init__(self, ttl_seconds: int = DEDUP_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self._seen: dict[str, float] = {}  # key -> last_seen_timestamp

    def _make_key(self, symbol: str, buy_exchange: str, sell_exchange: str) -> str:
        """Создать ключ для дедупликации."""
        return f"{symbol}:{buy_exchange}:{sell_exchange}"

    def is_duplicate(self, symbol: str, buy_exchange: str, sell_exchange: str) -> bool:
        """Проверить, была ли эта opportunity недавно опубликована."""
        key = self._make_key(symbol, buy_exchange, sell_exchange)
        now = time.time()

        # Очистка старых записей (простая — каждые 100 проверок)
        if len(self._seen) > 1000:
            self._cleanup(now)

        last_seen = self._seen.get(key)
        if last_seen and (now - last_seen) < self.ttl_seconds:
            return True

        # Обновляем время видения
        self._seen[key] = now
        return False

    def mark_seen(self, symbol: str, buy_exchange: str, sell_exchange: str):
        """Отметить opportunity как опубликованную."""
        key = self._make_key(symbol, buy_exchange, sell_exchange)
        self._seen[key] = time.time()

    def _cleanup(self, now: float):
        """Удалить устаревшие записи."""
        cutoff = now - self.ttl_seconds
        expired = [k for k, v in self._seen.items() if v < cutoff]
        for k in expired:
            del self._seen[k]
        logger.debug(f"Dedup: очищено {len(expired)} устаревших записей")

    def get_stats(self) -> dict:
        """Статистика дедупликации."""
        return {
            "tracked_keys": len(self._seen),
            "ttl_seconds": self.ttl_seconds,
        }
