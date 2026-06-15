"""REST API: /api/v1/prices — цены из TimescaleDB."""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from auth import get_current_user
from shared.db import get_db_pool

router = APIRouter(prefix="/prices", tags=["Prices"])


@router.get("")
async def get_prices(
    symbol: Optional[str] = Query(None, description="Торговая пара"),
    exchange: Optional[str] = Query(None, description="ID биржи"),
    limit: int = Query(100, ge=1, le=1000, description="Лимит записей"),
    offset: int = Query(0, ge=0, description="Смещение"),
    user: str = Depends(get_current_user),
):
    """Получить цены из TimescaleDB."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        conditions = ["1=1"]
        params = []
        if symbol:
            params.append(symbol)
            conditions.append(f"symbol = ${len(params)}")
        if exchange:
            params.append(exchange)
            conditions.append(f"exchange = ${len(params)}")

        where_clause = " AND ".join(conditions)

        # Получаем данные
        query = f"""
            SELECT time, exchange, symbol, bid, ask, bid_volume, ask_volume
            FROM prices
            WHERE {where_clause}
            ORDER BY time DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params.extend([limit, offset])

        rows = await conn.fetch(query, *params)

        # Считаем общее количество
        count_query = f"SELECT COUNT(*) FROM prices WHERE {where_clause}"
        total = await conn.fetchval(count_query, *params[:-2] if params else [])

        items = [
            {
                "time": row["time"].isoformat(),
                "exchange": row["exchange"],
                "symbol": row["symbol"],
                "bid": float(row["bid"]),
                "ask": float(row["ask"]),
                "bid_volume": float(row["bid_volume"]) if row["bid_volume"] else None,
                "ask_volume": float(row["ask_volume"]) if row["ask_volume"] else None,
            }
            for row in rows
        ]

        return {"items": items, "total": total or 0, "limit": limit, "offset": offset}
