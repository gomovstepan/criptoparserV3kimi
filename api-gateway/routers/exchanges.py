"""REST API: /api/v1/exchanges — конфигурация бирж."""

from fastapi import APIRouter, Depends

from auth import get_current_user
from shared.config import EXCHANGES

router = APIRouter(prefix="/exchanges", tags=["Exchanges"])


@router.get("")
async def get_exchanges(user: str = Depends(get_current_user)):
    """Получить конфигурацию всех бирж."""
    return {
        exchange_id: {
            "exchange": config.exchange,
            "is_active": config.is_active,
            "maker_fee_pct": float(config.maker_fee_pct),
            "taker_fee_pct": float(config.taker_fee_pct),
            "withdrawal_btc": float(config.withdrawal_btc) if config.withdrawal_btc else None,
            "withdrawal_usdt": float(config.withdrawal_usdt) if config.withdrawal_usdt else None,
            "rate_limit_req_per_sec": config.rate_limit_req_per_sec,
        }
        for exchange_id, config in EXCHANGES.items()
    }
