import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";

function SpreadColor({ v }: { v: number }) {
  const c = v > 0.3 ? "#22c55e" : v > 0.15 ? "#f59e0b" : "#64748b";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v.toFixed(3)}%</span>;
}

function PnLColor({ v }: { v: number }) {
  const c = v >= 0 ? "#22c55e" : "#ef4444";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v >= 0 ? "+" : ""}{v.toFixed(3)}%</span>;
}

export default function Opportunities() {
  const { opportunities } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [exF, setExF] = useState("all");
  const [minS, setMinS] = useState(0);

  const exchanges = useMemo(() => {
    const exs = new Set<string>();
    opportunities.forEach((o) => { exs.add(o.buy_exchange); exs.add(o.sell_exchange); });
    return Array.from(exs).sort();
  }, [opportunities]);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (search) {
        const s = search.toLowerCase();
        if (!o.symbol.toLowerCase().includes(s) && !o.buy_exchange.toLowerCase().includes(s) && !o.sell_exchange.toLowerCase().includes(s)) return false;
      }
      if (exF !== "all" && o.buy_exchange !== exF && o.sell_exchange !== exF) return false;
      if (minS > 0 && o.gross_spread_pct < minS / 100) return false;
      return true;
    });
  }, [opportunities, search, exF, minS]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по паре или бирже..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none transition-colors" />
        </div>
        <select value={exF} onChange={(e) => setExF(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm focus:border-[#00d4aa] focus:outline-none">
          <option value="all">Все биржи</option>
          {exchanges.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#64748b]" />
          <span className="text-xs text-[#64748b]">Min: {(minS / 100).toFixed(2)}%</span>
          <input type="range" min="0" max="100" value={minS} onChange={(e) => setMinS(Number(e.target.value))} className="w-24" style={{ accentColor: "#00d4aa" }} />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748b]">{opportunities.length === 0 ? "Нет данных — ожидание от сканера..." : "Ничего не найдено"}</div>
        ) : (
          <>
            <table className="w-full">
              <thead><tr style={{ background: "#0f0f1a" }}>
                {["Пара", "Покупка", "Продажа", "Спред", "Цена покупки", "Цена продажи", "Net спред"].map((h) =>
                  <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors"
                    style={o.gross_spread_pct > 0.3 ? { borderLeft: "3px solid #00d4aa" } : o.gross_spread_pct > 0.15 ? { borderLeft: "3px solid #f59e0b" } : {}}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-[#f1f5f9]">{o.symbol}</td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: "#22c55e" }}>{o.buy_exchange}</td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: "#ef4444" }}>{o.sell_exchange}</td>
                    <td className="px-4 py-3.5"><SpreadColor v={o.gross_spread_pct} /></td>
                    <td className="px-4 py-3.5 font-mono text-sm text-[#f1f5f9]">${o.buy_price?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-sm text-[#f1f5f9]">${o.sell_price?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3.5"><PnLColor v={o.net_spread_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: "1px solid #1e1e2e" }}>
              <span className="text-xs text-[#64748b]">{filtered.length} из {opportunities.length}</span>
              <span className="text-xs text-[#64748b]">{new Date().toLocaleTimeString("ru-RU")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
