"""Конфигурация бирж для арбитражной системы."""

from pydantic import BaseModel, Field
from typing import Dict, Optional
from decimal import Decimal


class ExchangeConfig(BaseModel):
    """Конфигурация биржи для арбитража."""

    exchange: str  # уникальный идентификатор
    is_active: bool = True
    maker_fee_pct: Decimal  # комиссия мейкера в процентах
    taker_fee_pct: Decimal  # комиссия тейкера в процентах
    withdrawal_btc: Optional[Decimal] = None  # комиссия вывода BTC
    withdrawal_usdt: Optional[Decimal] = None  # комиссия вывода USDT
    rate_limit_req_per_sec: int = 50  # лимит запросов в секунду

    class Config:
        frozen = True  # неизменяемый объект


# Реестр всех бирж
EXCHANGES: Dict[str, ExchangeConfig] = {
    "bybit": ExchangeConfig(
        exchange="bybit",
        maker_fee_pct=Decimal("0.10"),
        taker_fee_pct=Decimal("0.10"),
        withdrawal_btc=Decimal("0.000085"),
        withdrawal_usdt=Decimal("1.0"),
        rate_limit_req_per_sec=50,
    ),
    "binance": ExchangeConfig(
        exchange="binance",
        maker_fee_pct=Decimal("0.10"),
        taker_fee_pct=Decimal("0.10"),
        withdrawal_btc=Decimal("0.0005"),
        withdrawal_usdt=Decimal("0.0"),
        rate_limit_req_per_sec=1200,
    ),
    "kucoin": ExchangeConfig(
        exchange="kucoin",
        maker_fee_pct=Decimal("0.10"),
        taker_fee_pct=Decimal("0.10"),
        withdrawal_btc=Decimal("0.0"),
        withdrawal_usdt=Decimal("0.0"),
        rate_limit_req_per_sec=200,
    ),
    "gateio": ExchangeConfig(
        exchange="gateio",
        maker_fee_pct=Decimal("0.30"),
        taker_fee_pct=Decimal("0.30"),
        withdrawal_btc=Decimal("0.001"),
        withdrawal_usdt=Decimal("1.0"),
        rate_limit_req_per_sec=200,
    ),
    "bitget": ExchangeConfig(
        exchange="bitget",
        maker_fee_pct=Decimal("0.10"),
        taker_fee_pct=Decimal("0.10"),
        withdrawal_btc=Decimal("0.0003"),
        withdrawal_usdt=Decimal("1.0"),
        rate_limit_req_per_sec=20,
    ),
    "coinex": ExchangeConfig(
        exchange="coinex",
        maker_fee_pct=Decimal("0.20"),
        taker_fee_pct=Decimal("0.20"),
        withdrawal_btc=Decimal("0.0001"),
        withdrawal_usdt=Decimal("1.0"),
        rate_limit_req_per_sec=10,
    ),
    "bingx": ExchangeConfig(
        exchange="bingx",
        maker_fee_pct=Decimal("0.10"),
        taker_fee_pct=Decimal("0.10"),
        withdrawal_btc=Decimal("0.00035"),
        withdrawal_usdt=Decimal("1.0"),
        rate_limit_req_per_sec=24,
    ),
}

# Пары для отслеживания (P1 приоритет)
TRACKED_PAIRS = [
    {"symbol": "BTC/USDT", "exchanges": ["binance", "bybit", "kucoin", "bitget"]},
    {"symbol": "ETH/USDT", "exchanges": ["binance", "bybit", "kucoin", "bitget"]},
]


def get_exchange_config(exchange_id: str) -> ExchangeConfig:
    """Получить конфигурацию биржи по ID."""
    if exchange_id not in EXCHANGES:
        raise KeyError(f"Биржа '{exchange_id}' не найдена в конфигурации")
    return EXCHANGES[exchange_id]


def get_active_exchanges() -> Dict[str, ExchangeConfig]:
    """Получить только активные биржи."""
    return {k: v for k, v in EXCHANGES.items() if v.is_active}
