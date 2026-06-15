/**
 * Dashboard — real-time мониторинг с backend.
 * 
 * Данные: REST API (начальная загрузка) + WebSocket (push обновления).
 * Fallback: если API недоступен, показываем что есть + сообщение.
 */

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  TrendingUp, TrendingDown, Zap, ArrowLeftRight,
  BarChart3, Activity, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// Mock P&L chart data (пока нет endpoint — будет из /api/v1/analytics)
const pnlData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  pnl: Math.round((Math.sin(i * 0.5) * 50 + Math.random() * 30 - 10) * 100) / 100,
}));

const exchangeNames: Record<string, string> = {
  binance: "Binance", bybit: "Bybit", kucoin: "KuCoin",
  bitget: "Bitget", gateio: "Gate.io", coinex: "CoinEx", bingx: "BingX",
};

function KpiCard({ title, value, trend, trendUp, icon: Icon, color, onClick }: {
  title: string; value: string; trend: string; trendUp: boolean;
  icon: React.ElementType; color: string; onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    success: "text-success", danger: "text-danger",
    primary: "text-primary", warning: "text-warning", info: "text-info",
  };
  const iconColor = colorMap[color] || "text-primary";
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-[#1e1e2e] rounded-xl p-5 min-h-[120px] hover:border-[#2a2a40] hover:shadow-md transition-all duration-200 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[13px] text-text-secondary font-medium">{title}</span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="font-mono text-[28px] font-bold tabular-nums text-text-primary mb-1">{value}</div>
      <div className="flex items-center gap-1 text-xs text-text-muted">
        {trendUp ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-danger" />}
        <span className={trendUp ? "text-success" : "text-danger"}>{trend}</span>
        <span>vs вчера</span>
      </div>
    </div>
  );
}

function ExchangeStatusCard({ name, connected, latency }: {
  name: string; connected: boolean; latency: number;
}) {
  return (
    <div className="bg-surface border border-[#1e1e2e] rounded-lg p-4 min-h-[100px] hover:border-[#2a2a40] transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs font-bold text-text-primary">
          {name.slice(0, 2)}
        </div>
        <span className="text-sm font-semibold text-text-primary">{name}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
            <span className="text-xs text-success">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-danger" />
            <span className="text-xs text-danger">Offline</span>
          </>
        )}
      </div>
      {connected && (
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Wifi className="w-3 h-3" />
          <span className="font-mono tabular-nums">{latency}ms</span>
        </div>
      )}
    </div>
  );
}

function SpreadColor({ value }: { value: number }) {
  if (value > 0.30) return <span className="font-mono text-success font-semibold">{value.toFixed(3)}%</span>;
  if (value > 0.15) return <span className="font-mono text-warning font-medium">{value.toFixed(3)}%</span>;
  return <span className="font-mono text-text-muted">{value.toFixed(3)}%</span>;
}

function PnlColor({ value }: { value: number }) {
  if (value > 0) return <span className="font-mono text-success font-semibold">+{value.toFixed(2)}</span>;
  if (value < 0) return <span className="font-mono text-danger font-semibold">{value.toFixed(2)}</span>;
  return <span className="font-mono text-text-muted">{value.toFixed(2)}</span>;
}

export default function Dashboard() {
  const {
    opportunities, trades, exchangeStatus, wsConnected, lastUpdated,
    fetchAll, fetchOpportunities, fetchTrades, fetchBalance,
  } = useDashboardStore();
  const [loading, setLoading] = useState(true);

  // Загрузка данных с backend при mount
  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));

    // Polling каждые 10 секунд
    const interval = setInterval(() => {
      fetchOpportunities();
      fetchTrades();
      fetchBalance();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAll, fetchOpportunities, fetchTrades, fetchBalance]);

  const totalPnl = useMemo(() =>
    trades.reduce((sum, t) => sum + (t.net_pnl || 0), 0),
  [trades]);

  const bestOpp = useMemo(() =>
    opportunities.length > 0
      ? opportunities.reduce((best, o) => (o.gross_spread_pct || 0) > (best?.gross_spread_pct || 0) ? o : best, opportunities[0])
      : null,
  [opportunities]);

  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    return Math.round((trades.filter((t) => (t.net_pnl || 0) > 0).length / trades.length) * 100);
  }, [trades]);

  const activeExchanges = useMemo(() =>
    Object.values(exchangeStatus).filter((s) => s.connected).length,
  [exchangeStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {wsConnected ? "WebSocket подключен" : "WebSocket отключен — polling каждые 10с"}
            {lastUpdated && ` · Обновлено: ${lastUpdated}`}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 h-10 rounded-lg border border-[#1e1e2e] text-text-secondary hover:bg-surface transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="text-sm">Обновить</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`}
          trend={`${winRate}% win rate`}
          trendUp={totalPnl >= 0}
          icon={BarChart3}
          color={totalPnl >= 0 ? "success" : "danger"}
        />
        <KpiCard
          title="Активные возможности"
          value={String(opportunities.length)}
          trend={`${activeExchanges}/7 бирж online`}
          trendUp={activeExchanges >= 4}
          icon={Zap}
          color="primary"
        />
        <KpiCard
          title="Сделок"
          value={String(trades.length)}
          trend={trades.length > 0 ? `${winRate}% успешных` : "Ожидание..."}
          trendUp={winRate > 50}
          icon={ArrowLeftRight}
          color="info"
        />
        <KpiCard
          title="Лучший спред"
          value={bestOpp ? `${bestOpp.gross_spread_pct.toFixed(3)}%` : "—"}
          trend={bestOpp ? `${bestOpp.buy_exchange} → ${bestOpp.sell_exchange}` : "Нет данных"}
          trendUp={!!bestOpp}
          icon={Activity}
          color="warning"
        />
      </div>

      {/* Exchange Status */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Статус бирж</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(exchangeStatus).map(([key, status]) => (
            <ExchangeStatusCard
              key={key}
              name={exchangeNames[key] || key}
              connected={status.connected}
              latency={status.latency}
            />
          ))}
        </div>
      </div>

      {/* P&L Chart */}
      <div className="bg-surface border border-[#1e1e2e] rounded-xl p-5">
        <h3 className="text-sm font-medium text-text-secondary mb-3">P&L (24ч)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={pnlData}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#475569" }} interval={5} />
            <YAxis tick={{ fontSize: 11, fill: "#475569" }} width={45}
              tickFormatter={(v: number) => `$${v}`} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 8, color: "#f1f5f9" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]} />
            <Area type="monotone" dataKey="pnl" stroke="#00d4aa" strokeWidth={2}
              fill="url(#pnlGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Opportunities */}
        <div className="bg-surface border border-[#1e1e2e] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Топ возможностей</h3>
            <span className="text-xs text-text-muted">{opportunities.length} найдено</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0f0f1a]">
                  {["Пара", "Спред", "Покупка", "Продажа", "P&L"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[13px] font-medium text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">
                      {loading ? "Загрузка..." : "Нет данных — ожидание от scanner"}
                    </td>
                  </tr>
                ) : (
                  opportunities.slice(0, 5).map((opp) => (
                    <tr key={opp.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">{opp.symbol}</td>
                      <td className="px-4 py-3"><SpreadColor value={opp.gross_spread_pct} /></td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{opp.buy_exchange}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{opp.sell_exchange}</td>
                      <td className="px-4 py-3"><PnlColor value={opp.net_spread_pct} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-surface border border-[#1e1e2e] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Последние сделки</h3>
            <span className="text-xs text-text-muted">{trades.length} всего</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0f0f1a]">
                  {["Время", "Пара", "P&L", "Статус"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[13px] font-medium text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-muted text-sm">
                      {loading ? "Загрузка..." : "Нет сделок — ожидание от executor"}
                    </td>
                  </tr>
                ) : (
                  trades.slice(0, 5).map((trade) => {
                    const time = new Date(trade.executed_at).toLocaleTimeString("ru-RU");
                    return (
                      <tr key={trade.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-text-muted">{time}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{trade.symbol}</td>
                        <td className="px-4 py-3"><PnlColor value={trade.net_pnl} /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${
                            trade.status === "completed" ? "bg-success/15 text-success" :
                            trade.status === "pending" ? "bg-warning/15 text-warning" :
                            "bg-danger/15 text-danger"
                          }`}>
                            {trade.status === "completed" ? "Завершена" : trade.status === "pending" ? "В процессе" : "Ошибка"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
