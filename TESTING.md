# End-to-End Тестовый Сценарий

## Цель
Проверить полный цикл работы системы: от WebSocket подключения до paper trade.

## Предусловия
- Docker Compose запущен: `docker-compose up -d`
- Все 7 сервисов в статусе `Up`

---

## Сценарий 1: Запуск и health check

**Шаги:**
1. Запустить `docker-compose up -d`
2. Подождать 30 секунд
3. Выполнить: `curl http://localhost:300001/health`
4. Выполнить: `curl http://localhost:300002/health`
5. Выполнить: `curl http://localhost:300003/health`

**Ожидаемый результат:**
- collector: `status: "healthy"`, `ws_connections >= 1`
- scanner: `status: "healthy"`, `opportunities_found >= 0`
- executor: `status: "healthy"`, `trades_today >= 0`

---

## Сценарий 2: Collector получает данные с Binance

**Шаги:**
1. Подождать 60 секунд после запуска
2. Выполнить: `docker-compose logs collector | grep "WS подключен"`
3. Проверить Redis: `docker-compose exec redis redis-cli XLEN prices`

**Ожидаемый результат:**
- Лог содержит: `[binance:BTC/USDT] WS подключен`
- Redis `prices` stream имеет > 10 записей

---

## Сценарий 3: Scanner находит спреды

**Шаги:**
1. Подождать 2 минуты после запуска
2. Выполнить: `curl http://localhost:300002/health`
3. Проверить TimescaleDB:
   ```bash
   docker-compose exec timescaledb psql -U arbitrage -d arbitrage_db -c "SELECT COUNT(*) FROM opportunities;"
   ```

**Ожидаемый результат:**
- `opportunities_found > 0`
- Таблица `opportunities` содержит записи

---

## Сценарий 4: Paper trading

**Шаги:**
1. Подождать 3 минуты после запуска
2. Выполнить: `curl http://localhost:300003/health`
3. Проверить: `docker-compose logs executor | grep "Trade executed"`

**Ожидаемый результат:**
- `trades_today > 0`
- Лог содержит записи о выполненных сделках
- Балансы обновлены в Redis:
  ```bash
  docker-compose exec redis redis-cli HGETALL balance:binance
  ```

---

## Сценарий 5: API Gateway + Frontend

**Шаги:**
1. Открыть http://localhost:5173
2. Ввести `test@example.com` / `test123`
3. Нажать "Войти"

**Ожидаемый результат:**
- Dashboard загружается
- KPI cards отображаются
- Таблица opportunities заполнена
- WS статус: "Online"

---

## Сценарий 6: Kill switch

**Шаги:**
1. Выполнить: `curl -X POST http://localhost:300003/killswitch?reason=test`
2. Проверить: `curl http://localhost:300003/health`
3. Выполнить: `curl -X POST http://localhost:300003/killswitch/reset`

**Ожидаемый результат:**
- Шаг 1: `{"status": "activated"}`
- Шаг 2: `kill_switch_active: true`, `status: "degraded"`
- Шаг 3: `{"status": "reset"}`, `kill_switch_active: false`

---

## Сценарий 7: Dead Letter Queue

**Шаги:**
1. Запустить с killswitch активным
2. Подождать 2 минуты
3. Выполнить: `curl http://localhost:300003/dead-letter`

**Ожидаемый результат:**
- Список failed trades с reason и error_message
