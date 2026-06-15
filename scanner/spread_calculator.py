"""Расчёт арбитражных спредов между биржами."""

import time
import logging
from typing import Dict, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict, OrderedDict

from shared.config import EXCHANGES

logger = logging.getLogger(__name__)

# Минимальный спред для триггера (default 0.30%)
DEFAULT_MIN_SPREAD_PCT = Decimal("0.30")

# Максимальный размер кэша (символов)
MAX_CACHE_SYMBOLS = 50
# Максимум бирж на символ
MAX_CACHE_EXCHANGES = 20


class PriceCache:
    """LRU-кэш последних цен с автоматической очисткой.

    Использует OrderedDict для LRU eviction — при превышении
    MAX_CACHE_SYMBOLS удаляет наименее недавно использованные.

    Attributes:
        _data: OrderedDict[str, Dict[str, dict]] — {symbol: {exchange: price_data}}
        max_age_ms: максимальный возраст цены в ms
    """

    def __init__(self, max_age_ms: int = 5000):
        self._data: OrderedDict[str, Dict[str, dict]] = OrderedDict()
        self.max_age_ms = max_age_ms

    def update(self, exchange: str, symbol: str, bid: Decimal, ask: Decimal, timestamp_ms: int):
        """Обновить цену для биржи и пары с LRU eviction."""
        # Создаём символ если нужно, с LRU move_to_end
        if symbol not in self._data:
            # Eviction если превышен лимит
            if len(self._data) >= MAX_CACHE_SYMBOLS:
                removed = self._data.popitem(last=False)
                logger.debug(f"LRU evict: removed symbol {removed[0]}")
            self._data[symbol] = {}
        else:
            # Перемещаем в конец (недавно использован)
            self._data.move_to_end(symbol)

        # Eviction бирж если нужно
        exchanges = self._data[symbol]
        if len(exchanges) >= MAX_CACHE_EXCHANGES and exchange not in exchanges:
            # Удаляем устаревшую биржу
            oldest = min(exchanges.items(), key=lambda x: x[1].get("timestamp_ms", 0))
            del exchanges[oldest[0]]
            logger.debug(f"LRU evict: removed exchange {oldest[0]} for {symbol}")

        exchanges[exchange] = {
            "bid": bid,
            "ask": ask,
            "timestamp_ms": timestamp_ms,
        }

    def get_active_prices(self, symbol: str) -> Dict[str, dict]:
        """Получить неустаревшие цены для торговой пары."""
        now_ms = int(time.time() * 1000)
        result = {}
        for exchange, data in self._data.get(symbol, {}).items():
            age_ms = now_ms - data["timestamp_ms"]
            if age_ms <= self.max_age_ms:
                result[exchange] = data
            else:
                logger.debug(f"PriceCache: цена {exchange}:{symbol} устарела ({age_ms}ms)")
        return result

    def remove_exchange(self, symbol: str, exchange: str):
        """Удалить биржу из кэша."""
        if symbol in self._data and exchange in self._data[symbol]:
            del self._data[symbol][exchange]

    def get_stats(self) -> dict:
        """Статистика кэша."""
        total_exchanges = sum(len(v) for v in self._data.values())
        return {
            "symbols_cached": len(self._data),
            "total_exchange_entries": total_exchanges,
            "max_symbols": MAX_CACHE_SYMBOLS,
            "max_exchanges_per_symbol": MAX_CACHE_EXCHANGES,
        }


def calculate_spread(
    symbol: str,
    buy_exchange: str,
    sell_exchange: str,
    buy_price_data: dict,
    sell_price_data: dict,
) -> Optional[dict]:
    """Рассчитать спред для пары бирж.

    Спред = (sell_bid - buy_ask) / buy_ask * 100

    Args:
        symbol: торговая пара
        buy_exchange: биржа для покупки (где ask ниже)
        sell_exchange: биржа для продажи (где bid выше)
        buy_price_data: {"bid": ..., "ask": ..., "timestamp_ms": ...}
        sell_price_data: {"bid": ..., "ask": ..., "timestamp_ms": ...}

    Returns:
        dict с данными opportunity или None если спред отрицательный
    """
    buy_ask = buy_price_data["ask"]   # покупаем по ask
    sell_bid = sell_price_data["bid"]  # продаём по bid

    if buy_ask <= 0 or sell_bid <= 0:
        return None

    # Гросс-спред: (sell_bid - buy_ask) / buy_ask * 100
    gross_spread_pct = ((sell_bid - buy_ask) / buy_ask * Decimal("100")).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    if gross_spread_pct <= 0:
        return None

    # Комиссии
    buy_config = EXCHANGES.get(buy_exchange)
    sell_config = EXCHANGES.get(sell_exchange)

    if not buy_config or not sell_config:
        return None

    buy_fee_pct = buy_config.taker_fee_pct   # покупка = taker
    sell_fee_pct = sell_config.taker_fee_pct  # продажа = taker

    # Комиссия вывода в USD (ориентировочно 1 USDT за перевод)
    withdrawal_fee_usd = Decimal("1.0")
    if buy_config.withdrawal_usdt:
        withdrawal_fee_usd = buy_config.withdrawal_usdt

    # Нет-спред: gross - buy_fee - sell_fee - withdrawal
    # withdrawal_fee_usd как % от средней цены сделки
    # Для простоты: считаем withdrawal как ~0.0015% от цены ~$65K = ~$1
    avg_price = (buy_ask + sell_bid) / Decimal("2")
    withdrawal_pct = (withdrawal_fee_usd / avg_price * Decimal("100")).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    net_spread_pct = (gross_spread_pct - buy_fee_pct - sell_fee_pct - withdrawal_pct).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    now_ms = int(time.time() * 1000)
    opp_id = f"opp_{now_ms}_{buy_exchange}_{sell_exchange}_{symbol.replace('/', '').lower()}"

    return {
        "id": opp_id,
        "symbol": symbol,
        "buy_exchange": buy_exchange,
        "sell_exchange": sell_exchange,
        "buy_price": str(buy_ask),
        "sell_price": str(sell_bid),
        "gross_spread_pct": str(gross_spread_pct),
        "buy_fee_pct": str(buy_fee_pct),
        "sell_fee_pct": str(sell_fee_pct),
        "withdrawal_fee_usd": str(withdrawal_fee_usd),
        "net_spread_pct": str(net_spread_pct),
        "detected_at": str(now_ms),
    }


def calculate_all_spreads(
    price_cache: PriceCache,
    min_spread_pct: Decimal = DEFAULT_MIN_SPREAD_PCT,
) -> List[dict]:
    """Рассчитать спреды между всеми парами бирж для всех пар.

    Returns:
        Список opportunity dicts, отфильтрованных по min_spread.
    """
    opportunities = []

    for symbol in list(price_cache._data.keys()):
        prices = price_cache.get_active_prices(symbol)
        exchanges = list(prices.keys())

        if len(exchanges) < 2:
            continue

        # Перебираем все пары бирж
        for i, buy_ex in enumerate(exchanges):
            for sell_ex in exchanges[i + 1:]:
                # buy на buy_ex (низкая ask), sell на sell_ex (высокая bid)
                opp1 = calculate_spread(symbol, buy_ex, sell_ex, prices[buy_ex], prices[sell_ex])
                if opp1 and Decimal(opp1["gross_spread_pct"]) >= min_spread_pct:
                    opportunities.append(opp1)

                # Обратная пара: buy на sell_ex, sell на buy_ex
                opp2 = calculate_spread(symbol, sell_ex, buy_ex, prices[sell_ex], prices[buy_ex])
                if opp2 and Decimal(opp2["gross_spread_pct"]) >= min_spread_pct:
                    opportunities.append(opp2)

    return opportunities
