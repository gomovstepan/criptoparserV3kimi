# Crypto Arbitrage SaaS System

> Крипто-арбитражная платформа для мониторинга спредов между 7 биржами в реальном времени.
> Paper trading engine с виртуальным балансом, Telegram уведомления, React дашборд.

## Архитектура

### Микросервисы (5)

| Сервис | Порт | Назначение |
|--------|------|------------|
| api-gateway | 8000 | REST API + WebSocket, JWT auth, Prometheus |
| collector | 8001 | WebSocket подключения к 7 биржам через CCXT Pro |
| scanner | 8002 | Расчёт спредов между биржами |
| executor | 8003 | Paper trading engine, P&L, killswitch |
| notifier | 8004 | Telegram бот (aiogram 3.x) |

### Инфраструктура

| Компонент | Порт | Назначение |
|-----------|------|------------|
| TimescaleDB | 5432 | Хранение цен, спредов, сделок (hypertables) |
| Redis | 6379 | Message bus через Streams |
| Frontend | 5173 | React 19 Dashboard |

### Биржи (7)
Bybit, Binance, KuCoin, Gate.io, Bitget, CoinEx, BingX

### Поток данных
```
Collector (CCXT Pro WS x7) -> Redis Stream "prices"
Scanner (XREADGROUP) -> Redis Stream "opportunities" + TimescaleDB
Executor (XREADGROUP) -> Redis Stream "trades" + TimescaleDB
Notifier (XREADGROUP) -> Telegram API (спред > 0.50%)
API Gateway <- TimescaleDB (REST) + Redis (WS push)
Frontend <- API Gateway (REST + WebSocket)
```

## Быстрый старт

### Требования
- Docker 20.10+ и Docker Compose 2.0+
- Python 3.11+
- Node.js 20+ (для frontend разработки)
- 4GB RAM минимум
- 10GB диска

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/gomovstepan/criptoparserV3kimi.git
cd criptoparserV3kimi

# 2. Скопировать переменные окружения
cp .env.example .env
# Отредактируйте .env: JWT_SECRET, TELEGRAM_BOT_TOKEN

# 3. Запустить инфраструктуру
docker-compose up -d timescaledb redis

# 4. Дождаться инициализации БД (10 сек)
sleep 10
docker-compose logs timescaledb | grep "ready to accept connections"

# 5. Запустить все сервисы
docker-compose up -d

# 6. Проверить статус
docker-compose ps
```

### Проверка health endpoints

```bash
# Collector (WebSocket сборщик)
curl http://localhost:300001/health
# -> {"status": "healthy", "service": "collector", "ws_connections": 7, ...}

# Scanner (расчёт спредов)
curl http://localhost:300002/health
# -> {"status": "healthy", "service": "scanner", "opportunities_found": N}

# Executor (paper trading)
curl http://localhost:300003/health
# -> {"status": "healthy", "service": "executor", "trades_today": N}

# API Gateway
curl http://localhost:300000/health
# -> {"status": "healthy", "service": "api-gateway", "ws_clients_active": 0}

# Notifier
curl http://localhost:300004/health
# -> {"status": "healthy", "service": "notifier", "telegram_connected": true}
```

### API примеры

```bash
# Логин (получить JWT)
curl -X POST http://localhost:300000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
# -> {"access_token": "eyJ...", "token_type": "bearer"}

# Получить цены
curl http://localhost:300000/api/v1/prices \
  -H "Authorization: Bearer $TOKEN"

# Получить возможности
curl http://localhost:300000/api/v1/opportunities?min_spread=0.2 \
  -H "Authorization: Bearer $TOKEN"

# Получить сделки
curl http://localhost:300000/api/v1/trades \
  -H "Authorization: Bearer $TOKEN"

# Получить балансы
curl http://localhost:300000/api/v1/balance \
  -H "Authorization: Bearer $TOKEN"

# Активировать kill switch
curl -X POST http://localhost:300003/killswitch?reason=manual

# Сбросить kill switch
curl -X POST http://localhost:300003/killswitch/reset

# Получить dead letter queue
curl http://localhost:300003/dead-letter

# Prometheus метрики
curl http://localhost:300000/metrics
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Открыть http://localhost:5173
# Логин: test@example.com / test123
```

## Структура проекта

```
+-- docker-compose.yml          # 7 сервисов
+-- .env.example                # Шаблон переменных
+-- README.md                   # Этот файл
+-- shared/                     # Общие модули
|   +-- config.py               # Конфигурация 7 бирж
|   +-- models.py               # Pydantic модели
|   +-- db.py                   # asyncpg pool
+-- scripts/
|   +-- init-db.sql             # Схема TimescaleDB
+-- collector/                  # Порт 8001
+-- scanner/                    # Порт 8002
+-- executor/                   # Порт 8003
+-- notifier/                   # Порт 8004
+-- api-gateway/                # Порт 8000
+-- frontend/                   # React 19
+-- tests/
    +-- integration_test.py     # 16 тестов
```

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| POSTGRES_USER | Пользователь БД | arbitrage |
| POSTGRES_PASSWORD | Пароль БД | arbitrage_pass |
| REDIS_URL | URL Redis | redis://redis:6379/0 |
| JWT_SECRET | Секрет для JWT | your_secret_key |
| TELEGRAM_BOT_TOKEN | Токен Telegram бота | 123456:ABC... |

## Лицензия

MIT
