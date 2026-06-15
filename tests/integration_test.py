"""Integration tests для крипто-арбитражной системы.

Запуск: python -m pytest tests/integration_test.py -v
"""

import asyncio
import pytest
from decimal import Decimal

# Мок данные для тестирования
from executor.validation import (
    validate_opportunity,
    validate_trade_amount,
    validate_slippage,
    validate_balance,
    MIN_TRADE_AMOUNT_USDT,
    MAX_TRADE_AMOUNT_USDT,
)


class TestOpportunityValidation:
    """Тесты валидации opportunity."""

    def test_valid_opportunity(self):
        ok, err = validate_opportunity(
            symbol="BTC/USDT",
            buy_exchange="binance",
            sell_exchange="bybit",
            buy_price=Decimal("67000"),
            sell_price=Decimal("67200"),
            gross_spread_pct=Decimal("0.30"),
        )
        assert ok is True
        assert err is None

    def test_same_exchange(self):
        ok, err = validate_opportunity(
            symbol="BTC/USDT",
            buy_exchange="binance",
            sell_exchange="binance",
            buy_price=Decimal("67000"),
            sell_price=Decimal("67200"),
            gross_spread_pct=Decimal("0.30"),
        )
        assert ok is False
        assert "different" in err.lower()

    def test_negative_price(self):
        ok, err = validate_opportunity(
            symbol="BTC/USDT",
            buy_exchange="binance",
            sell_exchange="bybit",
            buy_price=Decimal("-100"),
            sell_price=Decimal("67200"),
            gross_spread_pct=Decimal("0.30"),
        )
        assert ok is False
        assert "positive" in err.lower()

    def test_spread_too_small(self):
        ok, err = validate_opportunity(
            symbol="BTC/USDT",
            buy_exchange="binance",
            sell_exchange="bybit",
            buy_price=Decimal("67000"),
            sell_price=Decimal("67001"),
            gross_spread_pct=Decimal("0.001"),
        )
        assert ok is False
        assert "too small" in err.lower()

    def test_spread_too_large(self):
        ok, err = validate_opportunity(
            symbol="BTC/USDT",
            buy_exchange="binance",
            sell_exchange="bybit",
            buy_price=Decimal("67000"),
            sell_price=Decimal("80000"),
            gross_spread_pct=Decimal("15.00"),
        )
        assert ok is False
        assert "too large" in err.lower()


class TestTradeAmountValidation:
    """Тесты валидации размера сделки."""

    def test_valid_amount(self):
        ok, err = validate_trade_amount(
            amount_usdt=Decimal("1000"),
            available_balance=Decimal("10000"),
        )
        assert ok is True
        assert err is None

    def test_amount_too_small(self):
        ok, err = validate_trade_amount(
            amount_usdt=Decimal("5"),
            available_balance=Decimal("10000"),
        )
        assert ok is False
        assert "too small" in err.lower()

    def test_amount_too_large(self):
        ok, err = validate_trade_amount(
            amount_usdt=Decimal("200000"),
            available_balance=Decimal("500000"),
        )
        assert ok is False
        assert "too large" in err.lower()

    def test_insufficient_balance(self):
        ok, err = validate_trade_amount(
            amount_usdt=Decimal("5000"),
            available_balance=Decimal("1000"),
        )
        assert ok is False
        assert "Insufficient" in err


class TestSlippageValidation:
    """Тесты валидации slippage."""

    def test_valid_slippage(self):
        assert validate_slippage(Decimal("0.15")) is True
        assert validate_slippage(Decimal("0.0")) is True
        assert validate_slippage(Decimal("1.00")) is True

    def test_slippage_too_high(self):
        assert validate_slippage(Decimal("1.50")) is False
        assert validate_slippage(Decimal("-0.10")) is False


class TestBalanceValidation:
    """Тесты валидации баланса."""

    def test_sufficient_balance(self):
        ok, err = validate_balance("binance", Decimal("5000"))
        assert ok is True
        assert err is None

    def test_low_balance(self):
        ok, err = validate_balance("binance", Decimal("5"))
        assert ok is False
        assert "too low" in err.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
