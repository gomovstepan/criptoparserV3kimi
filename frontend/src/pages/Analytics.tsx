import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Activity } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";

const chartTheme = {
  axis: "#64748b", grid: "#1e1e2e", line: "#00d4aa", bar: "#00d4aa",
  tooltipBg: "#12121f", tooltipBorder: "#1e1e2e", text: "#f1f5f9",
};

export default function Analytics() {
  const { trades } = useDashboardStore();

  const wins = trades.filter((t) => (t.net_pnl || 0) > 0).length;
  const totalPnl = trades.reduce((s, t) => s + (t.net_pnl || 0), 0);
  const grossPnl = trades.reduce((s, t) => s + (t.gross_pnl || 0), 0);

  const kpiCards = [
    { label: "Всего сделок", value: String(trades.length), color: "#00d4aa", icon: BarChart3 },
    { label: "Win Rate", value: trades.length > 0 ? `${Math.round((wins / trades.length) * 100)}%` : "0%", color: "#3b82f6", icon: Target },
    { label: "Gross P&L", value: `${grossPnl >= 0 ? "+" : ""}${grossPnl.toFixed(2)}`, color: "#22c55e", icon: DollarSign },
    { label: "Net P&L", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#22c55e" : "#ef4444", icon: totalPnl >= 0 ? TrendingUp : TrendingDown },
    { label: "Прибыльных", value: String(wins), color: "#22c55e", icon: TrendingUp },
    { label: "Убыточных", value: String(trades.length - wins), color: "#ef4444", icon: TrendingDown },
  ];

  const cumulativeData = useMemo(() => {
    let cum = 0;
    return trades.map((t, i) => {
      cum += t.net_pnl || 0;
      return { idx: i + 1, cumulative: Math.round(cum * 100) / 100, pnl: t.net_pnl || 0 };
    });
  }, [trades]);

  const pairData = useMemo(() => {
    const map: Record<string, { netPnl: number; count: number }> = {};
    trades.forEach((t) => {
      if (!map[t.symbol]) map[t.symbol] = { netPnl: 0, count: 0 };
      map[t.symbol].netPnl += t.net_pnl || 0;
      map[t.symbol].count += 1;
    });
    return Object.entries(map).map(([pair, d]) => ({ pair, netPnl: Math.round(d.netPnl * 100) / 100, count: d.count }));
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {kpiCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
              <Icon className="w-4 h-4 mb-1" style={{ color: s.color }} />
              <div className="font-mono text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
          <Activity className="w-8 h-8 text-[#64748b] mx-auto mb-3" />
          <p className="text-sm text-[#64748b]">Нет данных о сделках</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl p-5" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Кумулятивный P&L</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="idx" stroke={chartTheme.axis} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.axis, fontSize: 12 }} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
                <Tooltip contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.text, fontSize: "13px" }}
                  formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value.toFixed(2)} USDT`, "Cumulative P&L"]} labelFormatter={(label: number) => `Сделка #${label}`} />
                <Line type="monotone" dataKey="cumulative" stroke={chartTheme.line} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: chartTheme.line }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">P&L по парам</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pairData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="pair" stroke={chartTheme.axis} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.axis, fontSize: 12 }} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
                <Tooltip contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.text, fontSize: "13px" }}
                  formatter={(_value: number, _name: string, props: any) => {
                    const pnl = props?.payload?.netPnl; const count = props?.payload?.count;
                    return [`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDT (${count} сделок)`, "Net P&L"];
                  }} />
                <Bar dataKey="netPnl" fill={chartTheme.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
