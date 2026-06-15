"""Очередь сообщений Telegram с rate limiting."""

import asyncio
import logging
import time
from typing import Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)

MAX_MSG_PER_SEC = 20
QUEUE_KEY = "telegram_queue"
MAX_QUEUE_SIZE = 1000  # максимум сообщений в очереди


class TelegramQueue:
    """Очередь сообщений с rate limiting.
    
    Max 20 msg/sec (лимит Bot API).
    Сообщения накапливаются в Redis List, отправляются
    с контролем частоты.
    """

    def __init__(self, redis_client: redis.Redis, bot):
        self.redis = redis_client
        self.bot = bot
        self.running = False
        self.messages_sent = 0
        self.last_sent_at = 0.0

    async def enqueue(self, chat_id: int, text: str) -> Optional[str]:
        """Добавить сообщение в очередь с проверкой размера.
        
        Returns:
            message_id или None если очередь переполнена.
        """
        # Проверяем размер очереди
        queue_size = await self.redis.llen(QUEUE_KEY)
        if queue_size >= MAX_QUEUE_SIZE:
            logger.warning(f"TelegramQueue overflow: {queue_size}/{MAX_QUEUE_SIZE} — dropping message")
            return None

        msg_id = f"msg_{int(time.time() * 1000)}"
        data = f"{chat_id}|{text}"
        await self.redis.lpush(QUEUE_KEY, data)
        logger.debug(f"Сообщение {msg_id} добавлено в очередь")
        return msg_id

    async def start(self):
        """Запустить обработку очереди."""
        self.running = True
        logger.info("TelegramQueue запущена")

        while self.running:
            try:
                # Rate limiting: max 20 msg/sec
                now = time.time()
                elapsed = now - self.last_sent_at
                if elapsed < 1.0 / MAX_MSG_PER_SEC:
                    await asyncio.sleep(1.0 / MAX_MSG_PER_SEC - elapsed)

                # Получаем сообщение из очереди (блокирующее на 1 сек)
                result = await self.redis.brpop(QUEUE_KEY, timeout=1)
                if result:
                    _, data = result
                    chat_id_str, text = data.split("|", 1)
                    chat_id = int(chat_id_str)

                    try:
                        await self.bot.send_message(
                            chat_id=chat_id,
                            text=text,
                            parse_mode="HTML",
                        )
                        self.messages_sent += 1
                        self.last_sent_at = time.time()
                    except Exception as e:
                        logger.error(f"Ошибка отправки сообщения: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Ошибка в TelegramQueue: {e}")
                await asyncio.sleep(1)

    async def stop(self):
        """Остановить очередь."""
        self.running = False
        logger.info(f"TelegramQueue остановлена. Всего отправлено: {self.messages_sent}")

    def get_status(self) -> dict:
        """Статус очереди."""
        return {
            "running": self.running,
            "messages_sent": self.messages_sent,
            "queue_length": 0,  # обновляется асинхронно
        }
