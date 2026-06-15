"""Telegram Bot router — aiogram 3.x."""

import logging
import os
from typing import Optional

from aiogram import Router, types, Bot
from aiogram.filters import Command

from formatter import format_status, format_balance

logger = logging.getLogger(__name__)
router = Router()

# Хранение chat_id авторизованных пользователей
AUTHORIZED_CHATS_KEY = "telegram:authorized_chats"


async def notify_all(bot: Bot, redis_client, text: str):
    """Отправить сообщение всем авторизованным чатам."""
    try:
        chat_ids = await redis_client.smembers(AUTHORIZED_CHATS_KEY)
        for chat_id in chat_ids:
            try:
                await bot.send_message(
                    chat_id=int(chat_id),
                    text=text,
                    parse_mode="HTML",
                )
            except Exception as e:
                logger.error(f"Ошибка отправки в чат {chat_id}: {e}")
    except Exception as e:
        logger.error(f"Ошибка notify_all: {e}")


@router.message(Command("start"))
async def cmd_start(message: types.Message):
    """Команда /start — регистрация пользователя."""
    await message.answer(
        "🚀 <b>Crypto Arbitrage Bot</b>\n\n"
        "Привет! Я бот для мониторинга крипто-арбитражных возможностей.\n\n"
        "📊 <b>Доступные команды:</b>\n"
        "/start — Это сообщение\n"
        "/status — Статус всех сервисов\n"
        "/balance — Виртуальные балансы\n"
        "/trades — Последние сделки\n"
        "/killswitch — Аварийная остановка\n\n"
        "Я буду автоматически отправлять уведомления о спредах > 0.50% и завершённых сделках.",
        parse_mode="HTML",
    )
    logger.info(f"Новый пользователь: chat_id={message.chat.id}")


@router.message(Command("status"))
async def cmd_status(message: types.Message):
    """Команда /status — статус сервисов."""
    # Получаем статус через HTTP запросы к сервисам
    import aiohttp

    services = {
        "api-gateway": "http://api-gateway:8000/health",
        "collector": "http://collector:8001/health",
        "scanner": "http://scanner:8002/health",
        "executor": "http://executor:8003/health",
    }

    status_data = {}
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
        for name, url in services.items():
            try:
                async with session.get(url) as resp:
                    data = await resp.json()
                    status_data[name] = data
            except Exception as e:
                status_data[name] = {"status": "unreachable", "error": str(e)}

    text = format_status(status_data)
    await message.answer(text, parse_mode="HTML")


@router.message(Command("balance"))
async def cmd_balance(message: types.Message):
    """Команда /balance — виртуальные балансы."""
    # Получаем балансы из Redis
    import redis.asyncio as redis
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    r = redis.from_url(redis_url, decode_responses=True)

    try:
        exchanges = ["binance", "bybit", "kucoin", "bitget", "gateio", "coinex", "bingx"]
        balances = {}
        for ex in exchanges:
            data = await r.hgetall(f"balance:{ex}")
            if data:
                balances[ex] = data

        if balances:
            text = format_balance(balances)
        else:
            text = "💰 <b>Балансы</b>\n\nБалансы ещё не инициализированы."

        await message.answer(text, parse_mode="HTML")
    except Exception as e:
        logger.error(f"Ошибка получения балансов: {e}")
        await message.answer("❌ Ошибка получения балансов")
    finally:
        await r.close()


@router.message(Command("trades"))
async def cmd_trades(message: types.Message):
    """Команда /trades — последние сделки."""
    import redis.asyncio as redis
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    r = redis.from_url(redis_url, decode_responses=True)

    try:
        # Читаем последние 5 trades из Redis Stream
        trades = await r.xrevrange("trades", "+", "-", count=5)
        if trades:
            lines = ["📈 <b>Последние сделки</b>\n"]
            for entry_id, fields in trades:
                symbol = fields.get("symbol", "")
                buy_ex = fields.get("buy_exchange", "")
                sell_ex = fields.get("sell_exchange", "")
                net_pnl = float(fields.get("net_pnl", "0"))
                emoji = "🟢" if net_pnl > 0 else "🔴"
                lines.append(
                    f"{emoji} {symbol}: {buy_ex}→{sell_ex} "
                    f"P&L={net_pnl:.4f} USDT"
                )
            await message.answer("\n".join(lines), parse_mode="HTML")
        else:
            await message.answer("📈 <b>Сделки</b>\n\nПока нет сделок.")
    except Exception as e:
        logger.error(f"Ошибка получения сделок: {e}")
        await message.answer("❌ Ошибка получения сделок")
    finally:
        await r.close()


@router.message(Command("killswitch"))
async def cmd_killswitch(message: types.Message):
    """Команда /killswitch — аварийная остановка."""
    import aiohttp

    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            async with session.post("http://executor:8003/killswitch?reason=telegram") as resp:
                result = await resp.json()
                status = result.get("status", "unknown")
                await message.answer(
                    f"🚨 <b>Kill Switch</b>\n\n"
                    f"Статус: <code>{status}</code>\n"
                    f"Причина: Telegram команда\n\n"
                    f"⚠️ Все новые сделки остановлены!",
                    parse_mode="HTML",
                )
    except Exception as e:
        logger.error(f"Ошибка killswitch: {e}")
        await message.answer(f"❌ Ошибка активации killswitch: {e}")
