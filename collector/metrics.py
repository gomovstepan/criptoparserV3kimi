"""Prometheus метрики для collector сервиса."""

from prometheus_client import Counter, Histogram, Gauge

# Счётчик полученных тиков
PRICE_TICKS_TOTAL = Counter(
    "price_ticks_total",
    "Total price ticks received",
    ["exchange", "symbol"],
)

# Гистограмма задержки (latency)
PRICE_LATENCY_MS = Histogram(
    "price_latency_ms",
    "Price tick latency in milliseconds",
    ["exchange"],
    buckets=[5, 10, 25, 50, 100, 250, 500, 1000],
)

# Gauge активных WS соединений
WS_CONNECTIONS = Gauge(
    "ws_connections_active",
    "Number of active WebSocket connections",
    ["exchange"],
)

# Счётчик ошибок соединений
WS_ERRORS_TOTAL = Counter(
    "ws_errors_total",
    "Total WebSocket connection errors",
    ["exchange", "error_type"],
)

# Счётчик reconnect
WS_RECONNECTS_TOTAL = Counter(
    "ws_reconnects_total",
    "Total WebSocket reconnects",
    ["exchange"],
)

# Gauge Redis connected
REDIS_CONNECTED = Gauge(
    "redis_connected",
    "Redis connection status (1=connected, 0=disconnected)",
)
