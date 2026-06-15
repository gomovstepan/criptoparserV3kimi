"""Тест подключения к биржам через CCXT (public API, без ключей)."""

import ccxt.async_support as ccxt
import asyncio
from typing import Dict, Optional

# Маппинг ID бирж на классы CCXT
EXCHANGE_MAP: Dict[str, type] = {
    "binance": ccxt.binance,
    "bybit": ccxt.bybit,
    "kucoin": ccxt.kucoin,
    "gateio": ccxt.gateio,
    "bitget": ccxt.bitget,
    "coinex": ccxt.coinex,
    "bingx": ccxt.bingx,
}


async def test_exchange_connection(exchange_id: str) -> Dict:
    """Тест подключения к бирже через CCXT public API.

    Загружает рынки биржи и запрашивает тикер BTC/USDT
    для проверки доступности.

    Args:
        exchange_id: ID биржи (binance, bybit, kucoin, ...).

    Returns:
        Dict со статусом подключения: status, bid, ask, markets_loaded.
    """
    exchange_class = EXCHANGE_MAP.get(exchange_id)
    if not exchange_class:
        return {
            "exchange": exchange_id,
            "status": "error",
            "message": "Unknown exchange",
        }

    exchange = exchange_class(
        {
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        }
    )

    try:
        # Загружаем рынки
        await exchange.load_markets()

        # Проверяем наличие пары BTC/USDT
        symbol = "BTC/USDT"
        if symbol in exchange.symbols:
            ticker = await exchange.fetch_ticker(symbol)
            return {
                "exchange": exchange_id,
                "status": "ok",
                "symbol": symbol,
                "bid": ticker.get("bid"),
                "ask": ticker.get("ask"),
                "markets_loaded": len(exchange.symbols),
            }
        else:
            return {
                "exchange": exchange_id,
                "status": "warning",
                "message": f"{symbol} not available",
                "markets_loaded": len(exchange.symbols),
            }
    except Exception as e:
        return {"exchange": exchange_id, "status": "error", "message": str(e)}
    finally:
        await exchange.close()


async def test_all_exchanges() -> list:
    """Тест подключения ко всем 7 биржам."""
    tasks = [test_exchange_connection(eid) for eid in EXCHANGE_MAP.keys()]
    return await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    results = asyncio.run(test_all_exchanges())
    for r in results:
        print(r)
