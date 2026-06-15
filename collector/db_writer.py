"""Batch Writer — читает тики из Redis Stream и записывает в TimescaleDB."""

import asyncio
import asyncpg
import redis.asyncio as redis
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Batch настройки
BATCH_SIZE = 100       # максимум тиков в batch
BATCH_TIMEOUT_MS = 1000  # максимальное время ожидания (1 сек)
STREAM_KEY = "prices"
CONSUMER_GROUP = "writer-cg"
CONSUMER_NAME = "writer-1"


class BatchWriter:
    """Batch Writer для записи тиков из Redis Stream в TimescaleDB.
    
    Читает из Redis Stream через XREADGROUP, накапливает batch,
    выполняет batch INSERT в TimescaleDB.
    
    Batch сбрасывается при достижении:
    - BATCH_SIZE тиков
    - BATCH_TIMEOUT_MS миллисекунд
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        db_pool: asyncpg.Pool,
        batch_size: int = BATCH_SIZE,
        batch_timeout_ms: int = BATCH_TIMEOUT_MS,
    ):
        """Инициализировать BatchWriter.

        Args:
            redis_client: Клиент Redis для чтения из Stream.
            db_pool: Пул подключений к TimescaleDB.
            batch_size: Максимальное количество тиков в batch.
            batch_timeout_ms: Таймаут сброса batch в миллисекундах.
        """
        self.redis = redis_client
        self.db_pool = db_pool
        self.batch_size = batch_size
        self.batch_timeout_ms = batch_timeout_ms
        self.buffer: List[Dict[str, Any]] = []
        self.running = False
        self.total_written = 0
        self.total_batches = 0
        self.last_flush_at: Optional[datetime] = None
        self.errors_count = 0

    async def start(self):
        """Запустить Batch Writer."""
        self.running = True
        logger.info(
            f"BatchWriter запущен (batch_size={self.batch_size}, "
            f"timeout={self.batch_timeout_ms}ms)"
        )

        # Создаём consumer group (игнорируем ошибку если уже существует)
        try:
            await self.redis.xgroup_create(
                STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True
            )
            logger.info(f"Consumer group '{CONSUMER_GROUP}' создан")
        except redis.ResponseError as e:
            if "already exists" in str(e):
                logger.info(f"Consumer group '{CONSUMER_GROUP}' уже существует")
            else:
                raise

        # Основной цикл чтения
        while self.running:
            try:
                # Читаем из stream (блокирующее на 1 сек)
                messages = await self.redis.xreadgroup(
                    groupname=CONSUMER_GROUP,
                    consumername=CONSUMER_NAME,
                    streams={STREAM_KEY: ">"},
                    count=self.batch_size,
                    block=1000,
                )

                if messages:
                    for stream_name, entries in messages:
                        for entry_id, fields in entries:
                            tick = self._parse_tick(entry_id, fields)
                            if tick:
                                self.buffer.append(tick)

                    # Проверяем нужен ли flush
                    if len(self.buffer) >= self.batch_size:
                        await self._flush()

                else:
                    # Таймаут — flush если есть данные
                    if self.buffer:
                        await self._flush()

            except Exception as e:
                self.errors_count += 1
                logger.error(f"BatchWriter ошибка чтения: {e}", exc_info=True)
                await asyncio.sleep(1)

    async def _flush(self):
        """Записать batch в TimescaleDB."""
        if not self.buffer:
            return

        batch = self.buffer
        self.buffer = []

        try:
            # Формируем параметры для batch INSERT
            values = []
            for tick in batch:
                values.append(
                    (
                        tick["time"],
                        tick["exchange"],
                        tick["symbol"],
                        tick["bid"],
                        tick["ask"],
                        tick.get("bid_volume"),
                        tick.get("ask_volume"),
                        tick.get("latency_ms"),
                    )
                )

            # Batch INSERT
            async with self.db_pool.acquire() as conn:
                await conn.executemany(
                    """
                    INSERT INTO prices 
                        (time, exchange, symbol, bid, ask, bid_volume, ask_volume, latency_ms)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT DO NOTHING
                    """,
                    values,
                )

            self.total_written += len(batch)
            self.total_batches += 1
            self.last_flush_at = datetime.utcnow()

            logger.debug(
                f"BatchWriter: записано {len(batch)} тиков "
                f"(всего: {self.total_written})"
            )

        except Exception as e:
            self.errors_count += 1
            logger.error(f"BatchWriter ошибка записи: {e}", exc_info=True)
            # Возвращаем данные в буфер для повторной попытки
            self.buffer = batch[:100] + self.buffer  # ограничиваем размер
            await asyncio.sleep(0.5)

    def _parse_tick(self, entry_id: str, fields: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Парсить запись из Redis Stream в dict.
        
        Поля из Redis:
            exchange, symbol, bid, ask, bid_volume, ask_volume, 
            timestamp, received_at, latency_ms
        """
        try:
            exchange = fields.get("exchange")
            symbol = fields.get("symbol")
            bid = fields.get("bid")
            ask = fields.get("ask")

            if not all([exchange, symbol, bid, ask]):
                logger.warning(f"BatchWriter: пропущена неполная запись: {fields}")
                return None

            # timestamp из записи или текущее время
            ts_ms = int(fields.get("timestamp", 0))
            if ts_ms == 0:
                ts_ms = int(datetime.utcnow().timestamp() * 1000)

            # Конвертируем ms → datetime
            dt = datetime.utcfromtimestamp(ts_ms / 1000.0)

            tick = {
                "time": dt,
                "exchange": exchange,
                "symbol": symbol,
                "bid": float(bid),
                "ask": float(ask),
            }

            # Опциональные поля
            if "bid_volume" in fields and fields["bid_volume"]:
                tick["bid_volume"] = float(fields["bid_volume"])
            if "ask_volume" in fields and fields["ask_volume"]:
                tick["ask_volume"] = float(fields["ask_volume"])
            if "latency_ms" in fields and fields["latency_ms"]:
                tick["latency_ms"] = int(fields["latency_ms"])

            return tick

        except (ValueError, TypeError) as e:
            logger.warning(f"BatchWriter: ошибка парсинга записи: {e}")
            return None

    async def stop(self):
        """Остановить Batch Writer с flush оставшихся данных."""
        logger.info("BatchWriter останавливается...")
        self.running = False

        # Flush оставшихся данных
        if self.buffer:
            logger.info(f"BatchWriter: flush {len(self.buffer)} оставшихся тиков")
            await self._flush()

        logger.info(
            f"BatchWriter остановлен. Всего записано: {self.total_written} "
            f"тиков в {self.total_batches} batch, ошибок: {self.errors_count}"
        )

    def get_status(self) -> dict:
        """Получить статус writer."""
        return {
            "running": self.running,
            "buffer_size": len(self.buffer),
            "total_written": self.total_written,
            "total_batches": self.total_batches,
            "errors_count": self.errors_count,
            "last_flush_at": self.last_flush_at.isoformat() if self.last_flush_at else None,
        }
