"""REST API: /api/v1/opportunities — арбитражные возможности."""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from auth import get_current_user
from shared.db import get_db_pool

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.get("")
async def get_opportunities(
    symbol: Optional[str] = Query(None),
    buy_exchange: Optional[str] = Query(None),
    sell_exchange: Optional[str] = Query(None),
    min_spread: Optional[float] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
):
    """Получить арбитражные возможности."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        conditions = ["1=1"]
        params = []

        if symbol:
            params.append(symbol)
            conditions.append(f"symbol = ${len(params)}")
        if buy_exchange:
            params.append(buy_exchange)
            conditions.append(f"buy_exchange = ${len(params)}")
        if sell_exchange:
            params.append(sell_exchange)
            conditions.append(f"sell_exchange = ${len(params)}")
        if min_spread is not None:
            params.append(min_spread)
            conditions.append(f"net_spread_pct >= ${len(params)}")

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT time, id, symbol, buy_exchange, sell_exchange,
                   buy_price, sell_price, gross_spread_pct, net_spread_pct
            FROM opportunities
            WHERE {where_clause}
            ORDER BY time DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params.extend([limit, offset])

        rows = await conn.fetch(query, *params)
        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM opportunities WHERE {where_clause}",
            *params[:-2] if params else []
        )

        items = [
            {
                "id": row["id"],
                "symbol": row["symbol"],
                "buy_exchange": row["buy_exchange"],
                "sell_exchange": row["sell_exchange"],
                "buy_price": float(row["buy_price"]),
                "sell_price": float(row["sell_price"]),
                "gross_spread_pct": float(row["gross_spread_pct"]),
                "net_spread_pct": float(row["net_spread_pct"]),
                "detected_at": row["time"].isoformat(),
            }
            for row in rows
        ]

        return {"items": items, "total": total or 0, "limit": limit, "offset": offset}
