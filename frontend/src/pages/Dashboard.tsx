import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, TrendingUp, TrendingDown, Zap, ArrowLeftRight, Percent } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";

function SpreadColor({ v }: { v: number }) {
  const c = v > 0.3 ? "#22c55e" : v > 0.15 ? "#f59e0b" : "#64748b";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v.toFixed(3)}%</span>;
}

function PnLColor({ v }: { v: number }) {
  const c = v >= 0 ? "#22c55e" : "#ef4444";
  return <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: c }}>{v >= 0 ? "+" : ""}{v.toFixed(2)}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { opportunities, trades, exchangeStatus, lastUpdated, fetchAll } = useDashboardStore();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalPnl = trades.reduce((s, t) => s + (t.net_pnl || 0), 0);
  const bestSpread = opportunities.length > 0
    ? opportunities.reduce((max, o) => (o.gross_spread_pct > max.gross_spread_pct ? o : max), opportunities[0]) : null;

  const kpiCards = [
    { title: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`, color: totalPnl >= 0 ? "#22c55e" : "#ef4444", icon: totalPnl >= 0 ? TrendingUp : TrendingDown },
    { title: "Возможности", value: String(opportunities.length), color: "#00d4aa", icon: Zap },
    { title: "Сделок", value: String(trades.length), color: "#3b82f6", icon: ArrowLeftRight },
    { title: "Лучший спред", value: bestSpread ? `${bestSpread.gross_spread_pct.toFixed(3)}%` : "0%", color: "#f59e0b", icon: Percent, sub: bestSpread?.symbol || "" },
  ];

  const exchanges = [
    { id: "binance", name: "Binance" }, { id: "bybit", name: "Bybit" }, { id: "kucoin", name: "KuCoin" },
    { id: "bitget", name: "Bitget" }, { id: "gateio", name: "Gate.io" }, { id: "coinex", name: "CoinEx" }, { id: "bingx", name: "BingX" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => fetchAll()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
            style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Обновить
          </button>
          {lastUpdated && <span className="text-xs text-[#64748b]">Обновлено: {lastUpdated}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="rounded-xl p-5" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-[#94a3b8]">{c.title}</span>
                <Icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</div>
              {(c as any).sub && <div className="text-xs text-[#64748b] mt-1">{(c as any).sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-5" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Статус бирж</h3>
        <div className="grid grid-cols-7 gap-3">
          {exchanges.map((ex) => {
            const st = exchangeStatus[ex.id];
            return (
              <div key={ex.id} className="rounded-lg p-3 text-center" style={{ background: "#0f0f1a" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-[#f1f5f9]" style={{ background: "#1a1a2e" }}>{ex.name.slice(0, 2)}</div>
                <div className="text-xs text-[#f1f5f9] mb-1">{ex.name}</div>
                {st?.connected ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-[10px] text-[#22c55e]">{st.latency}ms</span>
                  </div>
                ) : <span className="text-[10px] text-[#ef4444]">Offline</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl overflow-hidden" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: "1px solid #1e1e2e" }}>
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Топ возможностей</h3>
            <button onClick={() => navigate("/opportunities")} className="text-xs text-[#00d4aa] hover:underline">Все →</button>
          </div>
          {opportunities.length === 0 ? <div className="p-8 text-center text-sm text-[#64748b]">Нет активных возможностей</div> : (
            <table className="w-full">
              <thead><tr style={{ background: "#0f0f1a" }}>
                {["Пара", "Спред", "Покупка", "Продажа", "Net"].map((h) => <th key={h} className="text-left px-4 py-2.5 text-[13px] font-medium text-[#94a3b8]">{h}</th>)}
              </tr></thead>
              <tbody>
                {opportunities.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-[#f1f5f9]">{o.symbol}</td>
                    <td className="px-4 py-3"><SpreadColor v={o.gross_spread_pct} /></td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{o.buy_exchange}</td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{o.sell_exchange}</td>
                    <td className="px-4 py-3"><PnLColor v={o.net_spread_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: "1px solid #1e1e2e" }}>
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Последние сделки</h3>
            <button onClick={() => navigate("/trades")} className="text-xs text-[#00d4aa] hover:underline">Все →</button>
          </div>
          {trades.length === 0 ? <div className="p-8 text-center text-sm text-[#64748b]">Нет сделок</div> : (
            <table className="w-full">
              <thead><tr style={{ background: "#0f0f1a" }}>
                {["Пара", "Маршрут", "Объём", "P&L", "Статус"].map((h) => <th key={h} className="text-left px-4 py-2.5 text-[13px] font-medium text-[#94a3b8]">{h}</th>)}
              </tr></thead>
              <tbody>
                {trades.slice(0, 5).map((t) => (
                  <tr key={t.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-[#f1f5f9]">{t.symbol}</td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{t.buy_exchange} → {t.sell_exchange}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{t.amount?.toFixed(4) || "—"}</td>
                    <td className="px-4 py-3"><PnLColor v={t.net_pnl} /></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: t.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: t.status === "completed" ? "#22c55e" : "#ef4444" }}>
                        {t.status === "completed" ? "Завершена" : t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
