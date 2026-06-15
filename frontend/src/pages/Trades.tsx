/**
 * Trades — реальные paper trading сделки с backend.
 */

import { useEffect, useState, useMemo } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { ArrowLeftRight, Download, Search, RefreshCw } from "lucide-react";

export default function Trades() {
  const { trades, fetchTrades } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Загрузка при mount
  useEffect(() => {
    setLoading(true);
    fetchTrades().finally(() => setLoading(false));
    const interval = setInterval(() => fetchTrades(), 10000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const filtered = useMemo(() => {
    let data = [...trades];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      data = data.filter((t) => t.status === statusFilter);
    }
    return data;
  }, [trades, search, statusFilter]);

  const totalPnl = filtered.reduce((sum, t) => sum + (t.net_pnl || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">История сделок</h1>
          <p className="text-sm text-text-secondary mt-0.5">Журнал paper trading сделок</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchTrades().finally(() => setLoading(false)); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 h-10 rounded-lg border border-[#1e1e2e] text-text-secondary hover:bg-surface transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="text-sm">Обновить</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ID или паре..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none">
          <option value="all">Все статусы</option>
          <option value="completed">Завершены</option>
          <option value="pending">В процессе</option>
          <option value="failed">Ошибка</option>
        </select>
        <button className="h-10 px-4 rounded-lg border border-[#1e1e2e] text-text-secondary hover:bg-surface transition-colors flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-surface border border-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f0f1a]">
                {["ID", "Время", "Пара", "Покупка", "Продажа", "Объём", "P&L", "Статус"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-text-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted text-sm">
                    {loading ? "Загрузка с backend..." : "Нет сделок"}
                  </td>
                </tr>
              ) : (
                filtered.map((trade) => {
                  const time = new Date(trade.executed_at).toLocaleString("ru-RU");
                  return (
                    <tr key={trade.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">#{trade.id.slice(-6)}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{time}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{trade.symbol}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{trade.buy_exchange}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{trade.sell_exchange}</td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">{(trade.amount || 0).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono font-semibold tabular-nums ${(trade.net_pnl || 0) >= 0 ? "text-success" : "text-danger"}`}>
                          {(trade.net_pnl || 0) >= 0 ? "+" : ""}{(trade.net_pnl || 0).toFixed(2)}
                        </span>
                      </td>
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
        <div className="px-5 py-3 border-t border-[#1e1e2e] flex items-center justify-between">
          <span className="text-xs text-text-muted">{filtered.length} сделок | Total P&L: {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} USDT</span>
        </div>
      </div>
    </div>
  );
}
