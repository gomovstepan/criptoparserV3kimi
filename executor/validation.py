"""Валидация параметров сделок для paper trading."""

import logging
from decimal import Decimal
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Минимальные/максимальные значения
MIN_TRADE_AMOUNT_USDT = Decimal("10.00")       # минимум $10 на сделку
MAX_TRADE_AMOUNT_USDT = Decimal("100000.00")   # максимум $100K
MIN_SPREAD_PCT = Decimal("0.01")               # минимум 0.01% спред
MAX_SPREAD_PCT = Decimal("10.00")              # максимум 10% (подозрительно)
MAX_SLIPPAGE_PCT = Decimal("1.00")             # максимум 1% slippage
MIN_BALANCE_USDT = Decimal("10.00")            # минимальный баланс


class ValidationError(Exception):
    """Ошибка валидации trade параметров."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


def validate_opportunity(
    symbol: str,
    buy_exchange: str,
    sell_exchange: str,
    buy_price: Decimal,
    sell_price: Decimal,
    gross_spread_pct: Decimal,
) -> Tuple[bool, Optional[str]]:
    """Валидация opportunity перед исполнением.

    Returns:
        (is_valid, error_message)
    """
    # Символ не пустой и содержит /
    if not symbol or "/" not in symbol:
        return False, f"Invalid symbol: {symbol}"

    # Биржи не пустые
    if not buy_exchange or not isinstance(buy_exchange, str):
        return False, f"Invalid buy_exchange: {buy_exchange}"
    if not sell_exchange or not isinstance(sell_exchange, str):
        return False, f"Invalid sell_exchange: {sell_exchange}"

    # Разные биржи
    if buy_exchange == sell_exchange:
        return False, "Buy and sell exchanges must be different"

    # Цены положительные
    if buy_price <= 0 or sell_price <= 0:
        return False, "Prices must be positive"

    # sell_price > buy_price для арбитража
    if sell_price <= buy_price:
        return False, f"sell_price ({sell_price}) must be > buy_price ({buy_price})"

    # Спред в разумных пределах
    if gross_spread_pct < MIN_SPREAD_PCT:
        return False, f"Spread too small: {gross_spread_pct}% < {MIN_SPREAD_PCT}%"

    if gross_spread_pct > MAX_SPREAD_PCT:
        logger.warning(
            f"Suspicious spread: {gross_spread_pct}% — skipping")
        return False, f"Spread too large: {gross_spread_pct}% > {MAX_SPREAD_PCT}%"

    return True, None


def validate_trade_amount(
    amount_usdt: Decimal,
    available_balance: Decimal,
) -> Tuple[bool, Optional[str]]:
    """Валидация размера сделки.

    Returns:
        (is_valid, error_message)
    """
    if amount_usdt < MIN_TRADE_AMOUNT_USDT:
        return False, f"Amount too small: {amount_usdt} < {MIN_TRADE_AMOUNT_USDT}"

    if amount_usdt > MAX_TRADE_AMOUNT_USDT:
        return False, f"Amount too large: {amount_usdt} > {MAX_TRADE_AMOUNT_USDT}"

    if amount_usdt > available_balance:
        return False, f"Insufficient balance: {amount_usdt} > {available_balance}"

    return True, None


def validate_slippage(slippage_pct: Decimal) -> bool:
    """Проверить что slippage в допустимых пределах."""
    return Decimal("0") <= slippage_pct <= MAX_SLIPPAGE_PCT


def validate_balance(exchange: str, balance: Decimal) -> Tuple[bool, Optional[str]]:
    """Проверить что баланс биржи достаточен для торговли."""
    if balance < MIN_BALANCE_USDT:
        return False, f"Balance too low on {exchange}: {balance} < {MIN_BALANCE_USDT}"
    return True, None
