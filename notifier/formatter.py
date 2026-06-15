"""Форматирование Telegram сообщений с эмодзи."""


def format_opportunity(opp: dict) -> str:
    """Форматировать opportunity как Telegram сообщение."""
    symbol = opp.get("symbol", "")
    buy_ex = opp.get("buy_exchange", "")
    sell_ex = opp.get("sell_exchange", "")
    gross = float(opp.get("gross_spread_pct", "0"))
    net = float(opp.get("net_spread_pct", "0"))
    buy_price = opp.get("buy_price", "")
    sell_price = opp.get("sell_price", "")

    emoji = "🟢" if net > 0 else "🔴"

    return (
        f"{emoji} <b>Арбитражная возможность!</b>\n\n"
        f"📊 <b>{symbol}</b>\n"
        f"🟢 Купить: <b>{buy_ex}</b> @ {buy_price}\n"
        f"🔴 Продать: <b>{sell_ex}</b> @ {sell_price}\n\n"
        f"📈 Гросс-спред: <code>{gross:.4f}%</code>\n"
        f"💰 Нет-спред: <code>{net:.4f}%</code>\n\n"
        f"#арбитраж #{symbol.replace('/', '')}"
    )


def format_trade(trade: dict) -> str:
    """Форматировать trade как Telegram сообщение."""
    symbol = trade.get("symbol", "")
    buy_ex = trade.get("buy_exchange", "")
    sell_ex = trade.get("sell_exchange", "")
    gross_pnl = float(trade.get("gross_pnl", "0"))
    net_pnl = float(trade.get("net_pnl", "0"))

    emoji = "✅" if net_pnl > 0 else "❌"
    pnl_emoji = "🟢" if net_pnl > 0 else "🔴"

    return (
        f"{emoji} <b>Сделка завершена</b>\n\n"
        f"📊 <b>{symbol}</b>\n"
        f"🟢 Покупка: <b>{buy_ex}</b>\n"
        f"🔴 Продажа: <b>{sell_ex}</b>\n\n"
        f"💵 Гросс P&L: <code>{gross_pnl:.4f} USDT</code>\n"
        f"{pnl_emoji} Нет P&L: <code>{net_pnl:.4f} USDT</code>\n\n"
        f"#trade #{symbol.replace('/', '')}"
    )


def format_status(status: dict) -> str:
    """Форматировать статус системы."""
    lines = ["📊 <b>Статус системы</b>\n"]

    for service, data in status.items():
        if isinstance(data, dict):
            svc_status = data.get("status", "unknown")
            emoji = "🟢" if svc_status == "healthy" else "🔴" if svc_status == "degraded" else "⚪"
            lines.append(f"{emoji} <b>{service}</b>: {svc_status}")
        else:
            lines.append(f"⚪ <b>{service}</b>: {data}")

    return "\n".join(lines)


def format_balance(balances: dict) -> str:
    """Форматировать балансы бирж."""
    lines = ["💰 <b>Виртуальные балансы</b>\n"]
    for exchange, assets in balances.items():
        usdt = assets.get("USDT", "0")
        btc = assets.get("BTC", "0")
        eth = assets.get("ETH", "0")
        lines.append(f"🏦 <b>{exchange}</b>: USDT={usdt}, BTC={btc}, ETH={eth}")
    return "\n".join(lines)
