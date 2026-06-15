"""WebSocket endpoint /ws для real-time push данных."""

import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# Активные WebSocket соединения
active_connections: Set[WebSocket] = set()


class ConnectionManager:
    """Управление WebSocket соединениями."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WS подключен, всего: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WS отключен, всего: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Отправить сообщение всем подключённым клиентам."""
        if not self.active_connections:
            return

        text = json.dumps(message)
        dead = set()

        for conn in self.active_connections:
            try:
                await conn.send_text(text)
            except Exception:
                dead.add(conn)

        # Удаляем мёртвые соединения
        for conn in dead:
            self.active_connections.discard(conn)


manager = ConnectionManager()


async def websocket_handler(websocket: WebSocket):
    """Обработчик WebSocket соединения."""
    await manager.connect(websocket)

    try:
        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")

                if action == "subscribe":
                    channel = msg.get("channel", "")
                    await websocket.send_json({
                        "type": "subscribed",
                        "channel": channel,
                    })

                elif action == "ping":
                    await websocket.send_json({"type": "pong"})

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown action: {action}",
                    })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON",
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS ошибка: {e}")
        manager.disconnect(websocket)


async def broadcast_from_redis(redis_client):
    """Читать из Redis Streams и broadcast через WebSocket.
    
    Запускается как background task.
    """
    import redis.asyncio as redis

    streams = {
        "prices": ">",
        "opportunities": ">",
        "trades": ">",
    }

    try:
        # Создаём consumer group
        try:
            await redis_client.xgroup_create("prices", "ws-cg", id="0", mkstream=True)
        except redis.ResponseError as e:
            if "already exists" not in str(e):
                raise

        while True:
            try:
                messages = await redis_client.xreadgroup(
                    groupname="ws-cg",
                    consumername="ws-1",
                    streams={"prices": ">"},
                    count=100,
                    block=500,
                )

                if messages:
                    for stream_name, entries in messages:
                        for entry_id, fields in entries:
                            await manager.broadcast({
                                "type": "price_tick",
                                "data": dict(fields),
                            })

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"WS broadcast ошибка: {e}")
                await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"WS broadcast task завершён с ошибкой: {e}")
