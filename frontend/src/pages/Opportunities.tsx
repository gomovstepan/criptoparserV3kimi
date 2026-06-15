import { useState, useMemo } from "react";
import { useDashboardStore, type Opportunity } from "@/store/dashboardStore";
import {
  Search, SlidersHorizontal, RefreshCw, Eye,
  ArrowUpDown,
} from "lucide-react";

type SortKey = "gross_spread_pct" | "net_spread_pct" | "symbol";
type SortDir = "asc" | "desc";

function SpreadColor({ value }: { value: number }) {
  if (value > 0.30) return <span className="font-mono text-success font-semibold tabular-nums">{value.toFixed(3)}%</span>;
  if (value > 0.15) return <span className="font-mono text-warning font-medium tabular-nums">{value.toFixed(3)}%</span>;
  return <span className="font-mono text-text-muted tabular-nums">{value.toFixed(3)}%</span>;
}

function NetSpreadColor({ value }: { value: number }) {
  if (value > 0) return <span className="font-mono text-success font-semibold tabular-nums">+{value.toFixed(3)}%</span>;
  if (value < 0) return <span className="font-mono text-danger font-semibold tabular-nums">{value.toFixed(3)}%</span>;
  return <span className="font-mono text-text-muted tabular-nums">{value.toFixed(3)}%</span>;
}

function PriceFormat({ value }: { value: number }) {
  return <span className="font-mono text-sm tabular-nums">${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>;
}

export default function Opportunities() {
  const { opportunities } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const [pairFilter, setPairFilter] = useState("all");
  const [minSpread, setMinSpread] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("gross_spread_pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const exchanges = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => { set.add(o.buy_exchange); set.add(o.sell_exchange); });
    return Array.from(set).sort();
  }, [opportunities]);

  const pairs = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => set.add(o.symbol));
    return Array.from(set).sort();
  }, [opportunities]);

  const filtered = useMemo(() => {
    let data = [...opportunities];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((o) =>
        o.symbol.toLowerCase().includes(q) ||
        o.buy_exchange.toLowerCase().includes(q) ||
        o.sell_exchange.toLowerCase().includes(q)
      );
    }
    if (exchangeFilter !== "all") {
      data = data.filter((o) => o.buy_exchange === exchangeFilter || o.sell_exchange === exchangeFilter);
    }
    if (pairFilter !== "all") {
      data = data.filter((o) => o.symbol === pairFilter);
    }
    if (minSpread > 0) {
      data = data.filter((o) => o.gross_spread_pct >= minSpread / 100);
    }
    data.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "symbol") return dir * a.symbol.localeCompare(b.symbol);
      return dir * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return data;
  }, [opportunities, search, exchangeFilter, pairFilter, minSpread, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Арбитражные возможности</h1>
        <p className="text-sm text-text-secondary mt-0.5">Межбиржевые спреды в реальном времени</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по паре или бирже..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors" />
        </div>

        {/* Exchange filter */}
        <select value={exchangeFilter} onChange={(e) => setExchangeFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none">
          <option value="all">Все биржи</option>
          {exchanges.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
        </select>

        {/* Pair filter */}
        <select value={pairFilter} onChange={(e) => setPairFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none">
          <option value="all">Все пары</option>
          {pairs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Min spread slider */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted whitespace-nowrap">Min: {(minSpread / 100).toFixed(2)}%</span>
          <input type="range" min="0" max="100" value={minSpread} onChange={(e) => setMinSpread(Number(e.target.value))}
            className="w-24 accent-primary" />
        </div>

        <button onClick={() => { setSearch(""); setExchangeFilter("all"); setPairFilter("all"); setMinSpread(0); }}
          className="h-10 px-3 rounded-lg border border-[#1e1e2e] text-text-secondary hover:bg-surface transition-colors flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Сбросить
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface border border-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f0f1a]">
                <th className="text-left px-4 py-3 text-[13px] font-medium text-text-secondary">
                  <button onClick={() => toggleSort("symbol")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Пара <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-text-secondary">Покупка</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-text-secondary">Продажа</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-text-secondary">
                  <button onClick={() => toggleSort("gross_spread_pct")} className="flex items-center gap-1 ml-auto hover:text-text-primary transition-colors">
                    Спред <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-text-secondary">Цена покупки</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-text-secondary">Цена продажи</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-text-secondary">
                  <button onClick={() => toggleSort("net_spread_pct")} className="flex items-center gap-1 ml-auto hover:text-text-primary transition-colors">
                    Net спред <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-[13px] font-medium text-text-secondary">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-10 h-10 text-text-muted" />
                      <p className="text-text-secondary font-medium">Ничего не найдено</p>
                      <p className="text-text-muted text-sm">Попробуйте изменить фильтры</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((opp) => (
                  <tr key={opp.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors"
                    style={opp.gross_spread_pct > 0.30 ? { borderLeft: "3px solid #00d4aa" } : {}}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-text-primary">{opp.symbol}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{opp.buy_exchange}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{opp.sell_exchange}</td>
                    <td className="px-4 py-3.5 text-right"><SpreadColor value={opp.gross_spread_pct} /></td>
                    <td className="px-4 py-3.5 text-right"><PriceFormat value={opp.buy_price} /></td>
                    <td className="px-4 py-3.5 text-right"><PriceFormat value={opp.sell_price} /></td>
                    <td className="px-4 py-3.5 text-right"><NetSpreadColor value={opp.net_spread_pct} /></td>
                    <td className="px-4 py-3.5 text-center">
                      <button className="p-1.5 rounded-md hover:bg-[#1a1a2e] transition-colors text-text-muted hover:text-text-primary">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e1e2e] flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Показано {filtered.length} из {opportunities.length} возможностей
          </span>
          <span className="text-xs text-text-muted">
            Обновлено: {new Date().toLocaleTimeString("ru-RU")}
          </span>
        </div>
      </div>
    </div>
  );
}
