"""Connection pool для переиспользования CCXT exchange инстансов."""

import asyncio
import logging
from typing import Dict, Optional, Any

import ccxt.pro as ccxtpro
import ccxt.async_support as ccxt_rest

logger = logging.getLogger(__name__)

CCXT_PRO_MAP = {
    "binance": ccxtpro.binance,
    "bybit": ccxtpro.bybit,
    "kucoin": ccxtpro.kucoin,
    "gateio": ccxtpro.gateio,
    "bitget": ccxtpro.bitget,
    "coinex": ccxtpro.coinex,
    "bingx": ccxtpro.bingx,
}

CCXT_REST_MAP = {
    "binance": ccxt_rest.binance,
    "bybit": ccxt_rest.bybit,
    "kucoin": ccxt_rest.kucoin,
    "gateio": ccxt_rest.gateio,
    "bitget": ccxt_rest.bitget,
    "coinex": ccxt_rest.coinex,
    "bingx": ccxt_rest.bingx,
}


class ExchangePool:
    """Pool для переиспользования CCXT exchange инстансов.

    Thread-safe через asyncio.Lock.
    """

    def __init__(self, max_reuse: int = 100):
        self._pro_pools: Dict[str, Any] = {}
        self._rest_pools: Dict[str, Any] = {}
        self._reuse_count: Dict[str, int] = {}
        self.max_reuse = max_reuse
        self._lock = asyncio.Lock()

    async def get_pro(self, exchange_id: str):
        """Получить или создать Pro exchange инстанс (thread-safe)."""
        async with self._lock:
            if exchange_id in self._pro_pools:
                self._reuse_count[exchange_id] = self._reuse_count.get(exchange_id, 0) + 1
                logger.debug(f"[{exchange_id}] Reuse Pro instance (#{self._reuse_count[exchange_id]})")
                return self._pro_pools[exchange_id]

            exchange_class = CCXT_PRO_MAP.get(exchange_id)
            if not exchange_class:
                raise ValueError(f"Unknown exchange: {exchange_id}")

            exchange = exchange_class(
                {"enableRateLimit": True, "options": {"defaultType": "spot"}}
            )
            self._pro_pools[exchange_id] = exchange
            self._reuse_count[exchange_id] = 0
            logger.info(f"[{exchange_id}] Created new Pro instance")
            return exchange

    async def get_rest(self, exchange_id: str):
        """Получить или создать REST exchange инстанс (thread-safe)."""
        async with self._lock:
            if exchange_id in self._rest_pools:
                return self._rest_pools[exchange_id]

            exchange_class = CCXT_REST_MAP.get(exchange_id)
            if not exchange_class:
                raise ValueError(f"Unknown exchange: {exchange_id}")

            exchange = exchange_class(
                {"enableRateLimit": True, "options": {"defaultType": "spot"}}
            )
            self._rest_pools[exchange_id] = exchange
            logger.info(f"[{exchange_id}] Created new REST instance")
            return exchange

    async def invalidate(self, exchange_id: str):
        """Инвалидировать exchange инстанс."""
        async with self._lock:
            for pool, name in [(self._pro_pools, "Pro"), (self._rest_pools, "REST")]:
                if exchange_id in pool:
                    try:
                        await pool[exchange_id].close()
                    except Exception:
                        pass
                    del pool[exchange_id]
                    logger.info(f"[{exchange_id}] Invalidated {name} instance")

    async def close_all(self):
        """Закрыть все exchange инстансы."""
        async with self._lock:
            for pool in (self._pro_pools, self._rest_pools):
                for ex_id, exchange in list(pool.items()):
                    try:
                        await exchange.close()
                    except Exception:
                        pass
                pool.clear()
            self._reuse_count.clear()
            logger.info("All exchange instances closed")

    def get_stats(self) -> dict:
        """Статистика pool."""
        return {
            "pro_instances": len(self._pro_pools),
            "rest_instances": len(self._rest_pools),
            "reuse_counts": dict(self._reuse_count),
            "total_reuses": sum(self._reuse_count.values()),
        }


# Глобальный pool
_pool: Optional[ExchangePool] = None
_pool_lock = asyncio.Lock()


async def get_pool() -> ExchangePool:
    """Получить глобальный exchange pool (singleton, thread-safe)."""
    global _pool
    if _pool is None:
        async with _pool_lock:
            if _pool is None:
                _pool = ExchangePool()
    return _pool


async def close_pool():
    """Закрыть глобальный pool."""
    global _pool
    if _pool:
        await _pool.close_all()
        _pool = None
