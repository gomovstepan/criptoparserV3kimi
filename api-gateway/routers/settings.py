"""REST API: /api/v1/settings — системные настройки."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_current_user
from shared.db import get_db_pool

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdate(BaseModel):
    min_spread_pct: float
    max_position_pct: float
    slippage_tolerance_pct: float
    execution_timeout_sec: int


@router.get("")
async def get_settings(user: str = Depends(get_current_user)):
    """Получить системные настройки."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT key, value FROM settings")
        return {row["key"]: row["value"] for row in rows}


@router.put("")
async def update_settings(
    settings: SettingsUpdate,
    user: str = Depends(get_current_user),
):
    """Обновить системные настройки."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        for key, value in settings.model_dump().items():
            await conn.execute(
                "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2",
                str(value), key
            )
        return {"status": "updated"}
