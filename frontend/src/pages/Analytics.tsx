import { useMemo } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { BarChart3, TrendingUp, TrendingDown, Activity, Target, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const dailyPnl = Array.from({ length: 7 }, (_, i) => ({
  day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i],
  pnl: Math.round((Math.sin(i * 0.8) * 40 + Math.random() * 20 - 5) * 100) / 100,
  trades: Math.floor(Math.random() * 15) + 3,
}));

const cumulativePnl = dailyPnl.reduce<{ day: string; cumulative: number }[]>((acc, d, i) => {
  const prev = i > 0 ? acc[i - 1].cumulative : 0;
  acc.push({ day: d.day, cumulative: Math.round((prev + d.pnl) * 100) / 100 });
  return acc;
}, []);

export default function Analytics() {
  const { trades } = useDashboardStore();

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => t.net_pnl > 0).length;
    const totalPnl = trades.reduce((s, t) => s + t.net_pnl, 0);
    const grossPnl = trades.reduce((s, t) => s + t.gross_pnl, 0);
    return { total, wins, winRate: total ? Math.round((wins / total) * 100) : 0, totalPnl, grossPnl };
  }, [trades]);

  const statCards = [
    { label: "Всего сделок", value: String(stats.total), icon: Activity, color: "text-primary" },
    { label: "Win Rate", value: `${stats.winRate}%`, icon: Target, color: "text-info" },
    { label: "Gross P&L", value: `${stats.grossPnl >= 0 ? "+" : ""}${stats.grossPnl.toFixed(2)}`, icon: TrendingUp, color: stats.grossPnl >= 0 ? "text-success" : "text-danger" },
    { label: "Net P&L", value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`, icon: stats.totalPnl >= 0 ? TrendingUp : TrendingDown, color: stats.totalPnl >= 0 ? "text-success" : "text-danger" },
    { label: "Прибыльных", value: String(stats.wins), icon: TrendingUp, color: "text-success" },
    { label: "Убыточных", value: String(stats.total - stats.wins), icon: TrendingDown, color: "text-danger" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Аналитика</h1>
        <p className="text-sm text-text-secondary mt-0.5">Статистика и инсайты</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-surface border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2a2a40] transition-all">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className="font-mono text-xl font-bold text-text-primary tabular-nums">{s.value}</div>
            <div className="text-xs text-text-secondary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface border border-[#1e1e2e] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">P&L по дням</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyPnl}>
              <defs>
                <linearGradient id="pnlGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={50} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 8, color: "#f1f5f9" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]} />
              <Area type="monotone" dataKey="pnl" stroke="#00d4aa" strokeWidth={2} fill="url(#pnlGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface border border-[#1e1e2e] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Сделок в день</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyPnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={30} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 8, color: "#f1f5f9" }}
                formatter={(value: number) => [String(value), "Сделки"]} />
              <Bar dataKey="trades" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
