"""Pydantic v2 модели для арбитражной системы."""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from decimal import Decimal


class PriceTick(BaseModel):
    """Тик цены с биржи."""

    exchange: str = Field(..., description="ID биржи")
    symbol: str = Field(..., description="Торговая пара")
    bid: Decimal = Field(..., gt=0, description="Лучшая цена покупки")
    ask: Decimal = Field(..., gt=0, description="Лучшая цена продажи")
    bid_volume: Optional[Decimal] = Field(
        None, ge=0, description="Объём на лучшем bid"
    )
    ask_volume: Optional[Decimal] = Field(
        None, ge=0, description="Объём на лучшем ask"
    )
    timestamp: int = Field(..., description="Время с биржи (unix ms)")
    received_at: int = Field(..., description="Время получения (unix ms)")
    latency_ms: int = Field(..., ge=0, description="Задержка получения")


class Opportunity(BaseModel):
    """Арбитражная возможность."""

    id: str = Field(..., description="Уникальный ID")
    symbol: str = Field(..., description="Торговая пара")
    buy_exchange: str = Field(..., description="Биржа покупки")
    sell_exchange: str = Field(..., description="Биржа продажи")
    buy_price: Decimal = Field(..., gt=0)
    sell_price: Decimal = Field(..., gt=0)
    gross_spread_pct: Decimal = Field(..., description="Гросс-спред %")
    buy_fee_pct: Decimal = Field(...)
    sell_fee_pct: Decimal = Field(...)
    withdrawal_fee_usd: Decimal = Field(default=Decimal("0"))
    net_spread_pct: Decimal = Field(
        ..., description="Нет-спред % (с учётом комиссий)"
    )
    detected_at: int = Field(..., description="Время обнаружения (unix ms)")
    ttl_seconds: int = Field(default=5, description="Время жизни в секундах")

    @field_validator("net_spread_pct")
    @classmethod
    def validate_net_spread(cls, v: Decimal, info) -> Decimal:
        """Нет-спред не может быть больше гросс-спреда."""
        values = info.data
        if "gross_spread_pct" in values and v > values["gross_spread_pct"]:
            raise ValueError("net_spread_pct не может быть больше gross_spread_pct")
        return v


class Trade(BaseModel):
    """Сделка (paper trading)."""

    id: str = Field(..., description="Уникальный ID сделки")
    opportunity_id: str = Field(..., description="ID связанной возможности")
    symbol: str = Field(..., description="Торговая пара")
    buy_exchange: str = Field(..., description="Биржа покупки")
    sell_exchange: str = Field(..., description="Биржа продажи")
    buy_price: Decimal = Field(..., gt=0)
    sell_price: Decimal = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0, description="Объём сделки")
    buy_fee: Decimal = Field(default=Decimal("0"))
    sell_fee: Decimal = Field(default=Decimal("0"))
    withdrawal_fee: Decimal = Field(default=Decimal("0"))
    slippage_cost: Decimal = Field(default=Decimal("0"))
    gross_pnl: Decimal = Field(..., description="Гросс P&L")
    net_pnl: Decimal = Field(..., description="Нет P&L (с учётом всех комиссий)")
    status: str = Field(
        default="pending",
        description="Статус: pending/completed/failed/cancelled",
    )
    executed_at: Optional[int] = Field(
        None, description="Время исполнения (unix ms)"
    )
    duration_ms: Optional[int] = Field(None)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Проверка допустимых статусов."""
        allowed = {"pending", "completed", "failed", "cancelled"}
        if v not in allowed:
            raise ValueError(f"status должен быть одним из: {allowed}")
        return v
