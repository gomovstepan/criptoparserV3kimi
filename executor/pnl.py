"""Расчёт P&L (Profit & Loss) для paper trading сделок."""

import random
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict

logger = logging.getLogger(__name__)

# Slippage: random 0.1-0.3%
SLIPPAGE_MIN_PCT = Decimal("0.001")
SLIPPAGE_MAX_PCT = Decimal("0.003")

# Max position: 10% от баланса
MAX_POSITION_PCT = Decimal("0.10")


def calculate_slippage() -> Decimal:
    """Сгенерировать случайный slippage 0.1-0.3%."""
    slippage = Decimal(str(random.uniform(
        float(SLIPPAGE_MIN_PCT), float(SLIPPAGE_MAX_PCT)
    ))).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    return slippage


def calculate_trade_amount(
    balance_usdt: Decimal,
    max_position_pct: Decimal = MAX_POSITION_PCT,
) -> Decimal:
    """Рассчитать размер позиции (max 10% от баланса).
    
    Returns:
        Количество USDT для сделки.
    """
    amount = (balance_usdt * max_position_pct).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    # Минимум $10
    if amount < Decimal("10"):
        amount = Decimal("10")
    return amount


def calculate_pnl(
    buy_price: Decimal,
    sell_price: Decimal,
    amount_usdt: Decimal,
    buy_fee_pct: Decimal,
    sell_fee_pct: Decimal,
    withdrawal_fee_usd: Decimal,
) -> Dict[str, Decimal]:
    """Рассчитать P&L сделки.
    
    Args:
        buy_price: цена покупки
        sell_price: цена продажи
        amount_usdt: сумма в USDT
        buy_fee_pct: комиссия покупки %
        sell_fee_pct: комиссия продажи %
        withdrawal_fee_usd: комиссия вывода в USD
    
    Returns:
        dict с buy_fee, sell_fee, withdrawal_fee, slippage_cost, gross_pnl, net_pnl
    """
    # Slippage
    slippage_pct = calculate_slippage()
    slippage_cost = (amount_usdt * slippage_pct).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    # Размер позиции в крипте
    crypto_amount = (amount_usdt / buy_price).quantize(
        Decimal("0.00000001"), rounding=ROUND_HALF_UP
    )

    # Комиссии
    buy_fee = (amount_usdt * buy_fee_pct / Decimal("100")).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    sell_fee = (amount_usdt * sell_fee_pct / Decimal("100")).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    # Gross P&L: разница цен * объём
    price_diff = sell_price - buy_price
    gross_pnl = (price_diff * crypto_amount).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    # Net P&L: gross - все комиссии - slippage
    total_costs = buy_fee + sell_fee + withdrawal_fee_usd + slippage_cost
    net_pnl = (gross_pnl - total_costs).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    return {
        "crypto_amount": crypto_amount,
        "slippage_pct": slippage_pct,
        "slippage_cost": slippage_cost,
        "buy_fee": buy_fee,
        "sell_fee": sell_fee,
        "withdrawal_fee": withdrawal_fee_usd,
        "gross_pnl": gross_pnl,
        "net_pnl": net_pnl,
    }


def check_max_position(balance: Decimal, amount: Decimal) -> bool:
    """Проверить что позиция не превышает 10% от баланса."""
    max_allowed = balance * MAX_POSITION_PCT
    return amount <= max_allowed
