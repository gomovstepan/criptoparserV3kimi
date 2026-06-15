"""REST API: /api/v1/trades — paper trading сделки."""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from auth import get_current_user
from shared.db import get_db_pool

router = APIRouter(prefix="/trades", tags=["Trades"])


@router.get("")
async def get_trades(
    symbol: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    exchange: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
):
    """Получить paper trades с пагинацией."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        conditions = ["1=1"]
        params = []

        if symbol:
            params.append(symbol)
            conditions.append(f"symbol = ${len(params)}")
        if status:
            params.append(status)
            conditions.append(f"status = ${len(params)}")
        if exchange:
            params.append(exchange)
            conditions.append(f"(buy_exchange = ${len(params)} OR sell_exchange = ${len(params)})")

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT time, id, symbol, buy_exchange, sell_exchange,
                   buy_price, sell_price, amount, gross_pnl, net_pnl,
                   status, executed_at
            FROM trades
            WHERE {where_clause}
            ORDER BY time DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params.extend([limit, offset])

        rows = await conn.fetch(query, *params)
        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM trades WHERE {where_clause}",
            *params[:-2] if params else []
        )

        items = [
            {
                "id": row["id"],
                "symbol": row["symbol"],
                "buy_exchange": row["buy_exchange"],
                "sell_exchange": row["sell_exchange"],
                "amount": float(row["amount"]),
                "gross_pnl": float(row["gross_pnl"]),
                "net_pnl": float(row["net_pnl"]),
                "status": row["status"],
                "executed_at": row["executed_at"].isoformat() if row["executed_at"] else None,
            }
            for row in rows
        ]

        return {"items": items, "total": total or 0, "limit": limit, "offset": offset}
