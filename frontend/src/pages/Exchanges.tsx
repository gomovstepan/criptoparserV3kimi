import { useState, useEffect } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { getExchanges } from "../lib/api";
import { useDashboardStore } from "../store/dashboardStore";

interface ExchangeInfo {
  exchange: string;
  is_active: boolean;
  maker_fee_pct: number;
  taker_fee_pct: number;
  withdrawal_btc: number | null;
  withdrawal_usdt: number | null;
}

const defaultExchanges: Record<string, ExchangeInfo> = {
  binance: { exchange: "Binance", is_active: true, maker_fee_pct: 0.1, taker_fee_pct: 0.1, withdrawal_btc: 0.0005, withdrawal_usdt: 0 },
  bybit: { exchange: "Bybit", is_active: true, maker_fee_pct: 0.1, taker_fee_pct: 0.1, withdrawal_btc: 0.000085, withdrawal_usdt: 1 },
  kucoin: { exchange: "KuCoin", is_active: true, maker_fee_pct: 0.1, taker_fee_pct: 0.1, withdrawal_btc: 0, withdrawal_usdt: 0 },
  bitget: { exchange: "Bitget", is_active: true, maker_fee_pct: 0.1, taker_fee_pct: 0.1, withdrawal_btc: 0.0003, withdrawal_usdt: 1 },
  gateio: { exchange: "Gate.io", is_active: false, maker_fee_pct: 0.3, taker_fee_pct: 0.3, withdrawal_btc: 0.001, withdrawal_usdt: 1 },
  coinex: { exchange: "CoinEx", is_active: true, maker_fee_pct: 0.2, taker_fee_pct: 0.2, withdrawal_btc: 0.0001, withdrawal_usdt: 1 },
  bingx: { exchange: "BingX", is_active: true, maker_fee_pct: 0.1, taker_fee_pct: 0.1, withdrawal_btc: 0.00035, withdrawal_usdt: 1 },
};

export default function Exchanges() {
  const { exchangeStatus } = useDashboardStore();
  const [data, setData] = useState<Record<string, ExchangeInfo>>(defaultExchanges);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    getExchanges().then((res) => { if (res && Object.keys(res).length > 0) setData(res); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const entries = Object.entries(data).filter(([, info]) => !activeOnly || info.is_active);
  const onlineCount = Object.values(data).filter((i) => i.is_active).length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#00d4aa]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="text-sm"><span className="text-[#94a3b8]">Активных: </span><span className="font-mono font-semibold text-[#22c55e]">{onlineCount}</span></div>
          <div className="text-sm"><span className="text-[#94a3b8]">Всего: </span><span className="font-mono font-semibold text-[#f1f5f9]">{Object.keys(data).length}</span></div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-[#94a3b8]">Только активные</span>
          <button onClick={() => setActiveOnly(!activeOnly)} className="w-11 h-6 rounded-full relative transition-colors" style={{ background: activeOnly ? "#00d4aa" : "#2a2a40" }}>
            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform" style={{ transform: activeOnly ? "translateX(22px)" : "translateX(2px)" }} />
          </button>
        </label>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
        <table className="w-full">
          <thead><tr style={{ background: "#0f0f1a" }}>
            {["Биржа", "Статус", "Задержка", "Maker", "Taker", "BTC вывод", "USDT вывод"].map((h) =>
              <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-[#94a3b8]">{h}</th>)}
          </tr></thead>
          <tbody>
            {entries.map(([id, info]) => {
              const st = exchangeStatus[id];
              const connected = st?.connected;
              const lat = st?.latency || 0;
              return (
                <tr key={id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#f1f5f9]" style={{ background: "#1a1a2e" }}>{info.exchange.slice(0, 2)}</div>
                      <span className="text-sm font-semibold text-[#f1f5f9]">{info.exchange}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {info.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-[#22c55e]"><Wifi className="w-3.5 h-3.5" /> Online</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[#ef4444]"><WifiOff className="w-3.5 h-3.5" /> Offline</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {connected ? (
                      <span className="text-sm font-mono" style={{ color: lat < 100 ? "#22c55e" : lat < 300 ? "#f59e0b" : "#ef4444" }}>{lat}ms</span>
                    ) : <span className="text-sm text-[#64748b]">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{info.maker_fee_pct}%</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{info.taker_fee_pct}%</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{info.withdrawal_btc ?? "0"}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">{info.withdrawal_usdt ?? "0"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
