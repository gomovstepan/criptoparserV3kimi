import { useState } from "react";
import { Eye, EyeOff, Activity, LayoutDashboard, Zap, ArrowLeftRight, BarChart3, Building2, Settings, LogOut, Search, SlidersHorizontal, Download, AlertTriangle } from "lucide-react";

type Page = "login" | "dashboard" | "opportunities" | "trades" | "analytics" | "exchanges" | "settings";

const exchanges = [
  { id: "binance", name: "Binance", maker: 0.10, taker: 0.10, wBtc: 0.0005, wUsdt: 0, connected: true, lat: 24 },
  { id: "bybit", name: "Bybit", maker: 0.10, taker: 0.10, wBtc: 0.000085, wUsdt: 1, connected: true, lat: 31 },
  { id: "kucoin", name: "KuCoin", maker: 0.10, taker: 0.10, wBtc: 0, wUsdt: 0, connected: true, lat: 45 },
  { id: "bitget", name: "Bitget", maker: 0.10, taker: 0.10, wBtc: 0.0003, wUsdt: 1, connected: true, lat: 28 },
  { id: "gateio", name: "Gate.io", maker: 0.30, taker: 0.30, wBtc: 0.001, wUsdt: 1, connected: false, lat: 0 },
  { id: "coinex", name: "CoinEx", maker: 0.20, taker: 0.20, wBtc: 0.0001, wUsdt: 1, connected: true, lat: 52 },
  { id: "bingx", name: "BingX", maker: 0.10, taker: 0.10, wBtc: 0.00035, wUsdt: 1, connected: true, lat: 38 },
];

const opportunities = [
  { id: "o1", sym: "ETH/USDT", spread: 0.307, buy: "binance", sell: "bitget", buyP: 3520.40, sellP: 3531.20, net: 0.107 },
  { id: "o2", sym: "ETH/USDT", spread: 0.296, buy: "kucoin", sell: "bybit", buyP: 3518.30, sellP: 3528.70, net: 0.096 },
  { id: "o3", sym: "ETH/USDT", spread: 0.273, buy: "gateio", sell: "kucoin", buyP: 3515.80, sellP: 3525.40, net: 0.073 },
  { id: "o4", sym: "BTC/USDT", spread: 0.074, buy: "coinex", sell: "binance", buyP: 67405.20, sellP: 67455.00, net: -0.026 },
  { id: "o5", sym: "BTC/USDT", spread: 0.058, buy: "gateio", sell: "binance", buyP: 67410.00, sellP: 67448.90, net: -0.042 },
  { id: "o6", sym: "BTC/USDT", spread: 0.038, buy: "kucoin", sell: "bybit", buyP: 67420.50, sellP: 67445.80, net: -0.062 },
  { id: "o7", sym: "BTC/USDT", spread: 0.035, buy: "bingx", sell: "bybit", buyP: 67418.70, sellP: 67442.30, net: -0.065 },
  { id: "o8", sym: "BTC/USDT", spread: 0.027, buy: "bybit", sell: "binance", buyP: 67432.15, sellP: 67450.30, net: -0.073 },
];

const trades = [
  { id: "t1", sym: "BTC/USDT", buy: "bybit", sell: "binance", amt: 0.05, pnl: -12.58, gross: 0.91, status: "completed", time: "11:30:00" },
  { id: "t2", sym: "ETH/USDT", buy: "binance", sell: "bitget", amt: 1.2, pnl: 2.44, gross: 12.96, status: "completed", time: "11:45:00" },
  { id: "t3", sym: "BTC/USDT", buy: "kucoin", sell: "bybit", amt: 0.03, pnl: -8.32, gross: 0.76, status: "completed", time: "10:15:00" },
  { id: "t4", sym: "ETH/USDT", buy: "kucoin", sell: "bybit", amt: 0.8, pnl: -1.21, gross: 8.32, status: "completed", time: "09:50:00" },
  { id: "t5", sym: "BTC/USDT", buy: "gateio", sell: "binance", amt: 0.04, pnl: -6.89, gross: 1.56, status: "completed", time: "09:20:00" },
  { id: "t6", sym: "ETH/USDT", buy: "gateio", sell: "kucoin", amt: 1.5, pnl: 3.88, gross: 14.40, status: "completed", time: "08:45:00" },
];

const pnlData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  pnl: Math.round((Math.sin(i * 0.5) * 50 + Math.random() * 30 - 10) * 100) / 100,
}));

const dailyPnl = Array.from({ length: 7 }, (_, i) => ({
  day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i],
  pnl: Math.round((Math.sin(i * 0.8) * 40 + Math.random() * 20 - 5) * 100) / 100,
  trades: Math.floor(Math.random() * 15) + 3,
}));

const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

// ─── Spread Color ───
function SC({ v }: { v: number }) {
  const c = v > 0.30 ? "#22c55e" : v > 0.15 ? "#f59e0b" : "#64748b";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v.toFixed(3)}%</span>;
}

// ─── P&L Color ───
function PC({ v }: { v: number }) {
  const c = v >= 0 ? "#22c55e" : "#ef4444";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v >= 0 ? "+" : ""}{v.toFixed(3)}%</span>;
}

// ─── Sidebar ───
function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items = [
    { key: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { key: "opportunities" as Page, label: "Возможности", icon: Zap },
    { key: "trades" as Page, label: "Сделки", icon: ArrowLeftRight },
    { key: "analytics" as Page, label: "Аналитика", icon: BarChart3 },
    { key: "exchanges" as Page, label: "Биржи", icon: Building2 },
    { key: "settings" as Page, label: "Настройки", icon: Settings },
  ];
  return (
    <aside className="w-60 bg-[#12121f] border-r border-[#1e1e2e] flex flex-col py-4 flex-shrink-0">
      <div className="px-4 mb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-indigo-500 flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#0a0a14]" />
        </div>
        <span className="font-semibold text-[#f1f5f9]">ArbitragePro</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => setPage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                active ? "bg-[#1a1a2e] text-[#00d4aa] border-l-[3px] border-[#00d4aa]" : "text-[#94a3b8] hover:bg-[#16162a] border-l-[3px] border-transparent"
              }`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 pt-4 border-t border-[#1e1e2e]">
        <button onClick={() => setPage("login")} className="flex items-center gap-2 text-[#94a3b8] hover:text-[#f1f5f9] text-sm transition-colors">
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>
    </aside>
  );
}

// ─── Layout wrapper ───
function AppLayout({ page, setPage, children }: { page: Page; setPage: (p: Page) => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a14" }}>
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">
              {page === "dashboard" && "Dashboard"}
              {page === "opportunities" && "Арбитражные возможности"}
              {page === "trades" && "История сделок"}
              {page === "analytics" && "Аналитика"}
              {page === "exchanges" && "Биржи"}
              {page === "settings" && "Настройки"}
            </h1>
            <p className="text-sm text-[#94a3b8] mt-0.5">
              {page === "dashboard" && "Мониторинг арбитража в реальном времени"}
              {page === "opportunities" && "Межбиржевые спреды в реальном времени"}
              {page === "trades" && "Журнал paper trading сделок"}
              {page === "analytics" && "Статистика и инсайты"}
              {page === "exchanges" && "Конфигурация и статус 7 бирж"}
              {page === "settings" && "Конфигурация системы"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12121f] border border-[#1e1e2e]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#94a3b8]">Online</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── Dashboard ───
function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`, color: totalPnl >= 0 ? "#22c55e" : "#ef4444", trend: "+12.5%" },
          { title: "Возможности", value: "8", color: "#00d4aa", trend: "Live" },
          { title: "Сделок", value: "6", color: "#3b82f6", trend: "Win 33%" },
          { title: "Лучший спред", value: "0.307%", color: "#f59e0b", trend: "ETH/USDT" },
        ].map((c) => (
          <div key={c.title} className="bg-[#12121f] border border-[#1e1e2e] rounded-xl p-5">
            <div className="text-[13px] text-[#94a3b8] mb-2">{c.title}</div>
            <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-[#64748b] mt-1">{c.trend}</div>
          </div>
        ))}
      </div>

      {/* Exchange Status */}
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Статус бирж</h3>
        <div className="grid grid-cols-7 gap-3">
          {exchanges.map((ex) => (
            <div key={ex.id} className="bg-[#0f0f1a] rounded-lg p-3 text-center">
              <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-2 text-xs font-bold text-[#f1f5f9]">{ex.name.slice(0, 2)}</div>
              <div className="text-xs text-[#f1f5f9] mb-1">{ex.name}</div>
              {ex.connected ? (
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[10px] text-[#22c55e]">{ex.lat}ms</span>
                </div>
              ) : <span className="text-[10px] text-[#ef4444]">Offline</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e2e] flex justify-between">
          <h3 className="text-sm font-semibold text-[#f1f5f9]">Топ возможностей</h3>
          <span className="text-xs text-[#64748b]">8 найдено</span>
        </div>
        <table className="w-full">
          <thead className="bg-[#0f0f1a]">
            <tr>{["Пара", "Спред", "Покупка", "Продажа", "P&L"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[13px] font-medium text-[#94a3b8]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {opportunities.slice(0, 5).map((o) => (
              <tr key={o.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03]">
                <td className="px-4 py-3 text-sm font-semibold text-[#f1f5f9]">{o.sym}</td>
                <td className="px-4 py-3"><SC v={o.spread} /></td>
                <td className="px-4 py-3 text-sm text-[#94a3b8]">{o.buy}</td>
                <td className="px-4 py-3 text-sm text-[#94a3b8]">{o.sell}</td>
                <td className="px-4 py-3"><PC v={o.net} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Opportunities ───
function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [exF, setExF] = useState("all");
  const [minS, setMinS] = useState(0);

  const filtered = opportunities.filter((o) => {
    if (search && !o.sym.toLowerCase().includes(search.toLowerCase()) && !o.buy.includes(search) && !o.sell.includes(search)) return false;
    if (exF !== "all" && o.buy !== exF && o.sell !== exF) return false;
    if (minS > 0 && o.spread < minS / 100) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none" />
        </div>
        <select value={exF} onChange={(e) => setExF(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm">
          <option value="all">Все биржи</option>
          {exchanges.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#64748b]" />
          <span className="text-xs text-[#64748b]">Min: {(minS / 100).toFixed(2)}%</span>
          <input type="range" min="0" max="100" value={minS} onChange={(e) => setMinS(Number(e.target.value))} className="w-24 accent-[#00d4aa]" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f0f1a]">
            <tr>{["Пара", "Покупка", "Продажа", "Спред", "Цена покупки", "Цена продажи", "Net спред"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors"
                style={o.spread > 0.30 ? { borderLeft: "3px solid #00d4aa" } : {}}>
                <td className="px-4 py-3.5 text-sm font-semibold text-[#f1f5f9]">{o.sym}</td>
                <td className="px-4 py-3.5 text-sm text-[#94a3b8]">{o.buy}</td>
                <td className="px-4 py-3.5 text-sm text-[#94a3b8]">{o.sell}</td>
                <td className="px-4 py-3.5"><SC v={o.spread} /></td>
                <td className="px-4 py-3.5 font-mono text-sm text-[#f1f5f9]">${o.buyP.toLocaleString()}</td>
                <td className="px-4 py-3.5 font-mono text-sm text-[#f1f5f9]">${o.sellP.toLocaleString()}</td>
                <td className="px-4 py-3.5"><PC v={o.net} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-[#1e1e2e] flex justify-between">
          <span className="text-xs text-[#64748b]">{filtered.length} из {opportunities.length}</span>
          <span className="text-xs text-[#64748b]">{new Date().toLocaleTimeString("ru-RU")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Trades ───
function TradesPage() {
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("all");
  const filtered = trades.filter((t) => {
    if (search && !t.sym.toLowerCase().includes(search.toLowerCase())) return false;
    if (stF !== "all" && t.status !== stF) return false;
    return true;
  });
  const tp = filtered.reduce((s, t) => s + t.pnl, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none" />
        </div>
        <select value={stF} onChange={(e) => setStF(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm">
          <option value="all">Все статусы</option>
          <option value="completed">Завершены</option>
          <option value="pending">В процессе</option>
        </select>
        <button className="h-10 px-4 rounded-lg border border-[#1e1e2e] text-[#94a3b8] hover:bg-[#12121f] flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f0f1a]">
            <tr>{["ID", "Время", "Пара", "Покупка", "Продажа", "Объём", "P&L", "Статус"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-mono text-xs text-[#64748b]">#{String(i + 1).padStart(3, "0")}</td>
                <td className="px-4 py-3 text-xs text-[#64748b]">{t.time}</td>
                <td className="px-4 py-3 text-sm font-medium text-[#f1f5f9]">{t.sym}</td>
                <td className="px-4 py-3 text-sm text-[#94a3b8]">{t.buy}</td>
                <td className="px-4 py-3 text-sm text-[#94a3b8]">{t.sell}</td>
                <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{t.amt.toFixed(4)}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold" style={{ color: t.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                    {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#22c55e]/15 text-[#22c55e]">Завершена</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-[#1e1e2e]">
          <span className="text-xs text-[#64748b]">{filtered.length} сделок | Total P&L: {tp >= 0 ? "+" : ""}{tp.toFixed(2)} USDT</span>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ───
function AnalyticsPage() {
  const wins = trades.filter((t) => t.pnl > 0).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { l: "Всего сделок", v: String(trades.length), c: "#00d4aa" },
          { l: "Win Rate", v: `${Math.round((wins / trades.length) * 100)}%`, c: "#3b82f6" },
          { l: "Gross P&L", v: `${trades.reduce((s, t) => s + t.gross, 0).toFixed(2)}`, c: "#22c55e" },
          { l: "Net P&L", v: `${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? "#22c55e" : "#ef4444" },
          { l: "Прибыльных", v: String(wins), c: "#22c55e" },
          { l: "Убыточных", v: String(trades.length - wins), c: "#ef4444" },
        ].map((s) => (
          <div key={s.l} className="bg-[#12121f] border border-[#1e1e2e] rounded-xl p-4">
            <div className="font-mono text-xl font-bold tabular-nums" style={{ color: s.c }}>{s.v}</div>
            <div className="text-xs text-[#94a3b8] mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
      {/* SVG P&L Chart */}
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">P&L по дням</h3>
        <svg viewBox="0 0 700 200" className="w-full h-48">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {dailyPnl.map((d, i) => {
            const maxVal = 60;
            const x = (i / (dailyPnl.length - 1)) * 650 + 25;
            const y = 180 - ((d.pnl + maxVal) / (maxVal * 2)) * 160;
            return i === 0 ? null : (
              <g key={i}>
                <line x1={(i - 1) / (dailyPnl.length - 1) * 650 + 25} y1={180 - ((dailyPnl[i - 1].pnl + maxVal) / (maxVal * 2)) * 160}
                  x2={x} y2={y} stroke="#00d4aa" strokeWidth="2" />
                <circle cx={x} cy={y} r="3" fill="#00d4aa" />
              </g>
            );
          })}
          {dailyPnl.map((d, i) => (
            <text key={`t${i}`} x={(i / (dailyPnl.length - 1)) * 650 + 25} y="195" fontSize="10" fill="#475569" textAnchor="middle">{d.day}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Exchanges ───
function ExchangesPage() {
  const [activeOnly, setActiveOnly] = useState(false);
  const filtered = activeOnly ? exchanges.filter((e) => e.connected) : exchanges;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-[#94a3b8]">Только активные</span>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${activeOnly ? "bg-[#00d4aa]" : "bg-[#2a2a40]"}`}
            onClick={() => setActiveOnly(!activeOnly)}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${activeOnly ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </div>
        </label>
      </div>
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f0f1a]">
            <tr>{["Биржа", "Статус", "Maker", "Taker", "BTC вывод", "USDT вывод"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((ex) => (
              <tr key={ex.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs font-bold text-[#f1f5f9]">{ex.name.slice(0, 2)}</div>
                    <span className="text-sm font-semibold text-[#f1f5f9]">{ex.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {ex.connected ? (
                    <span className="text-xs text-[#22c55e]">● Online ({ex.lat}ms)</span>
                  ) : <span className="text-xs text-[#ef4444]">● Offline</span>}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{ex.maker}%</td>
                <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{ex.taker}%</td>
                <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{ex.wBtc || "0"}</td>
                <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{ex.wUsdt || "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings ───
function SettingsPage() {
  const [minSpread, setMinSpread] = useState(0.30);
  const [maxPos, setMaxPos] = useState(10);
  const [slip, setSlip] = useState(0.20);
  const [timeout, setTimeout] = useState(2);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-[#12121f] border border-[#1e1e2e] rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#00d4aa]" /> Торговые параметры
        </h3>
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: "Минимальный спред (%)", value: minSpread, set: setMinSpread, step: 0.05 },
            { label: "Макс. позиция (%)", value: maxPos, set: setMaxPos, step: 1 },
            { label: "Slippage (%)", value: slip, set: setSlip, step: 0.05 },
            { label: "Таймаут (сек)", value: timeout, set: setTimeout, step: 1 },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-sm text-[#94a3b8] mb-1.5">{f.label}</label>
              <input type="number" step={f.step} value={f.value} onChange={(e) => f.set(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm focus:border-[#00d4aa] focus:outline-none" />
            </div>
          ))}
        </div>
        <button className="h-10 px-6 rounded-lg bg-[#00d4aa] text-[#0a0a14] font-medium text-sm hover:bg-[#00b894]">
          Сохранить настройки
        </button>
      </div>

      <div className="bg-[#12121f] border border-[#ef4444]/30 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#ef4444] flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" /> Аварийная остановка
        </h3>
        <p className="text-sm text-[#94a3b8] mb-4">
          Kill switch немедленно останавливает все новые сделки. Используйте только в экстренных ситуациях.
        </p>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="h-10 px-6 rounded-lg bg-[#ef4444] text-white font-medium text-sm hover:bg-red-600">
            Активировать Kill Switch
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#ef4444] font-medium">Вы уверены? Это немедленно остановит все сделки!</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)} className="h-10 px-6 rounded-lg bg-[#ef4444] text-white font-medium text-sm hover:bg-red-600">
                Да, остановить
              </button>
              <button onClick={() => setConfirm(false)} className="h-10 px-6 rounded-lg border border-[#1e1e2e] text-[#94a3b8] text-sm hover:bg-[#12121f]">
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login ───
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email || !password) { setErr("Заполните все поля"); return; }
    setLoading(true);
    setTimeout(() => {
      if (email === "test@example.com" && password === "test123") onLogin();
      else setErr("Неверный email или пароль");
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-center px-16"
        style={{ background: "linear-gradient(160deg, #0a0a14 0%, #12121f 40%, #1a1a2e 100%)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 50%, rgba(0,212,170,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa] to-indigo-500 flex items-center justify-center">
              <Activity className="w-7 h-7 text-[#0a0a14]" />
            </div>
            <span className="text-2xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Крипто-арбитражная<br />платформа</h1>
          <p className="text-[#94a3b8] text-lg mb-8 max-w-md">
            Мониторинг спредов между 7 биржами в реальном времени. Paper trading с полным P&L учётом.
          </p>
          <ul className="space-y-3 text-[#94a3b8]">
            {["7 бирж: Binance, Bybit, KuCoin, Gate.io, Bitget, CoinEx, BingX", "WebSocket real-time данные", "Paper trading с виртуальным балансом"].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "#0a0a14" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4aa] to-indigo-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#0a0a14]" />
            </div>
            <span className="text-xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-1">Вход в систему</h2>
          <p className="text-[#64748b] text-sm mb-6">Введите свои данные для входа</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full h-10 px-3.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/15 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Пароль</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль"
                  className="w-full h-10 px-3.5 pr-10 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/15 transition-colors" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {err && <p className="text-[#ef4444] text-sm">{err}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-lg bg-[#00d4aa] text-[#0a0a14] font-semibold text-sm hover:bg-[#00b894] active:scale-[0.98] transition-all disabled:opacity-60">
              {loading ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0a0a14]/30 border-t-[#0a0a14] rounded-full animate-spin" />Вход...
              </span> : "Войти"}
            </button>
          </form>
          <p className="text-center text-xs text-[#64748b] mt-6">
            Тестовый доступ: <code className="text-[#00d4aa]">test@example.com / test123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── App ───
export default function App() {
  const [page, setPage] = useState<Page>("login");

  if (page === "login") {
    return <LoginPage onLogin={() => setPage("dashboard")} />;
  }

  return (
    <AppLayout page={page} setPage={setPage}>
      {page === "dashboard" && <DashboardPage />}
      {page === "opportunities" && <OpportunitiesPage />}
      {page === "trades" && <TradesPage />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "exchanges" && <ExchangesPage />}
      {page === "settings" && <SettingsPage />}
    </AppLayout>
  );
}
