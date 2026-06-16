import { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";

export default function Trades() {
  const { trades } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("all");

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
      if (stF !== "all" && t.status !== stF) return false;
      return true;
    });
  }, [trades, search, stF]);

  const totalPnl = filtered.reduce((s, t) => s + (t.net_pnl || 0), 0);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["ID", "Symbol", "Buy", "Sell", "Amount", "Gross P&L", "Net P&L", "Status", "Time"];
    const rows = filtered.map((t) => [t.id, t.symbol, t.buy_exchange, t.sell_exchange, String(t.amount || 0), String(t.gross_pnl || 0), String(t.net_pnl || 0), t.status, t.executed_at || ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по паре..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none transition-colors" />
        </div>
        <select value={stF} onChange={(e) => setStF(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm focus:border-[#00d4aa] focus:outline-none">
          <option value="all">Все статусы</option>
          <option value="completed">Завершены</option>
          <option value="pending">В процессе</option>
          <option value="failed">Ошибка</option>
        </select>
        <button onClick={exportCSV}
          className="h-10 px-4 rounded-lg border border-[#1e1e2e] text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#12121f] flex items-center gap-2 text-sm transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
        {filtered.length === 0 ? <div className="p-8 text-center text-sm text-[#64748b]">{trades.length === 0 ? "Нет сделок" : "Ничего не найдено"}</div> : (
          <>
            <table className="w-full">
              <thead><tr style={{ background: "#0f0f1a" }}>
                {["ID", "Время", "Пара", "Покупка", "Продажа", "Объём", "P&L", "Статус"].map((h) =>
                  <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#64748b]">#{String(i + 1).padStart(3, "0")}</td>
                    <td className="px-4 py-3 text-xs text-[#64748b]">{t.executed_at ? new Date(t.executed_at).toLocaleTimeString("ru-RU") : "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#f1f5f9]">{t.symbol}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#22c55e" }}>{t.buy_exchange}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#ef4444" }}>{t.sell_exchange}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{t.amount?.toFixed(4) || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold" style={{ color: (t.net_pnl || 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                        {(t.net_pnl || 0) >= 0 ? "+" : ""}{(t.net_pnl || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: t.status === "completed" ? "rgba(34,197,94,0.15)" : t.status === "pending" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", color: t.status === "completed" ? "#22c55e" : t.status === "pending" ? "#f59e0b" : "#ef4444" }}>
                        {t.status === "completed" ? "Завершена" : t.status === "pending" ? "В процессе" : "Ошибка"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3" style={{ borderTop: "1px solid #1e1e2e" }}>
              <span className="text-xs text-[#64748b]">{filtered.length} сделок | Total P&L:{" "}
                <span style={{ color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} USDT</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
