"""Фабрика для создания WebSocket коллекторов бирж."""

import asyncio
import logging
from typing import List, Callable, Optional, Dict, Any

from ws_client import ExchangeCollector

logger = logging.getLogger(__name__)

# Пары P1 для отслеживания
TRACKED_PAIRS = [
    {"symbol": "BTC/USDT", "exchanges": ["binance", "bybit", "kucoin", "bitget"]},
    {"symbol": "ETH/USDT", "exchanges": ["binance", "bybit", "kucoin", "bitget"]},
]

# Все 7 бирж (для расширения)
ALL_EXCHANGES = ["bybit", "binance", "kucoin", "gateio", "bitget", "coinex", "bingx"]


def create_collectors(
    on_tick: Optional[Callable] = None,
    exchanges: Optional[List[str]] = None,
    symbols: Optional[List[str]] = None,
) -> List[ExchangeCollector]:
    """Создать коллекторы для указанных бирж и пар.
    
    Args:
        on_tick: callback при получении тика
        exchanges: список ID бирж (по умолчанию — все из TRACKED_PAIRS)
        symbols: список пар (по умолчанию — BTC/USDT, ETH/USDT)
    
    Returns:
        Список ExchangeCollector
    """
    collectors = []

    for pair_config in TRACKED_PAIRS:
        symbol = pair_config["symbol"]

        # Фильтр по символам
        if symbols and symbol not in symbols:
            continue

        for exchange_id in pair_config["exchanges"]:
            # Фильтр по биржам
            if exchanges and exchange_id not in exchanges:
                continue

            collector = ExchangeCollector(
                exchange_id=exchange_id,
                symbol=symbol,
                on_tick=on_tick,
            )
            collectors.append(collector)
            logger.debug(f"Создан коллектор: {exchange_id}:{symbol}")

    logger.info(f"Создано {len(collectors)} коллекторов")
    return collectors


def create_all_seven_exchanges(
    on_tick: Optional[Callable] = None,
) -> List[ExchangeCollector]:
    """Создать коллекторы для всех 7 бирж (только BTC/USDT).
    
    Используется для фазы 4 — подключение ко всем биржам.
    """
    collectors = []
    symbol = "BTC/USDT"

    for exchange_id in ALL_EXCHANGES:
        collector = ExchangeCollector(
            exchange_id=exchange_id,
            symbol=symbol,
            on_tick=on_tick,
        )
        collectors.append(collector)
        logger.debug(f"Создан коллектор: {exchange_id}:{symbol}")

    logger.info(f"Создано {len(collectors)} коллекторов для 7 бирж")
    return collectors


async def run_collectors(collectors: List[ExchangeCollector]):
    """Запустить все коллекторы параллельно.
    
    Каждый коллектор работает в отдельной asyncio задаче.
    """
    if not collectors:
        logger.warning("Нет коллекторов для запуска")
        return

    logger.info(f"Запуск {len(collectors)} коллекторов...")
    tasks = [asyncio.create_task(c.start()) for c in collectors]
    await asyncio.gather(*tasks, return_exceptions=True)


async def stop_collectors(collectors: List[ExchangeCollector]):
    """Остановить все коллекторы."""
    logger.info(f"Остановка {len(collectors)} коллекторов...")
    for c in collectors:
        await c.stop()
