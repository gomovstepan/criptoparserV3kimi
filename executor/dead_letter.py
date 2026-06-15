"""Dead Letter Queue для failed trades.

Неудачные сделки (validation failed, insufficient balance,
external error) сохраняются в Redis Stream 'dead_letter_trades'
для последующего анализа.
"""

import time
import json
import logging
from typing import Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)

DLQ_STREAM = "dead_letter_trades"
DLQ_MAXLEN = 10000


class DeadLetterQueue:
    """Dead Letter Queue для failed trades.

    Причины попадания в DLQ:
    - validation_failed: не прошла валидация
    - insufficient_balance: недостаточно средств
    - external_error: ошибка внешнего API
    - circuit_open: circuit breaker открылся
    - timeout: превышен таймаут
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.count = 0

    async def add(
        self,
        trade_data: dict,
        reason: str,
        error_message: str,
        retry_count: int = 0,
    ) -> str:
        """Добавить failed trade в DLQ.

        Args:
            trade_data: исходные данные сделки
            reason: причина отказа
            error_message: описание ошибки
            retry_count: количество попыток

        Returns:
            ID записи в stream
        """
        entry = {
            "trade_data": json.dumps(trade_data),
            "reason": reason,
            "error_message": error_message,
            "retry_count": str(retry_count),
            "timestamp": str(int(time.time() * 1000)),
        }

        entry_id = await self.redis.xadd(
            DLQ_STREAM,
            entry,
            maxlen=DLQ_MAXLEN,
            approximate=True,
        )

        self.count += 1
        logger.warning(
            f"DLQ: trade added (reason={reason}, error={error_message})"
        )

        return entry_id  # type: ignore[return-value]

    async def get_recent(self, count: int = 10) -> list:
        """Получить последние N записей из DLQ.

        Returns:
            Список dict с trade_data, reason, error_message, timestamp
        """
        entries = await self.redis.xrevrange(
            DLQ_STREAM, "+", "-", count=count)
        result = []
        for entry_id, fields in entries:
            result.append({
                "id": entry_id,
                "trade_data": json.loads(fields.get("trade_data", "{}")),
                "reason": fields.get("reason", "unknown"),
                "error_message": fields.get("error_message", ""),
                "retry_count": int(fields.get("retry_count", "0")),
                "timestamp": fields.get("timestamp", ""),
            })
        return result

    async def get_stats(self) -> dict:
        """Статистика DLQ."""
        # Подсчитываем по причинам
        entries = await self.redis.xrange(DLQ_STREAM, "-", "+")
        reasons: dict[str, int] = {}
        for _, fields in entries:
            reason = fields.get("reason", "unknown")
            reasons[reason] = reasons.get(reason, 0) + 1

        return {
            "total": len(entries),
            "by_reason": reasons,
        }

    def get_status(self) -> dict:
        """Быстрый статус (без запроса к Redis)."""
        return {
            "stream": DLQ_STREAM,
            "count": self.count,
        }
