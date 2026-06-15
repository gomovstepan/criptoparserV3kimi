import { useState } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { Building2, Wifi, WifiOff, ArrowUpDown } from "lucide-react";

const exchangeData = [
  { id: "binance", name: "Binance", makerFee: 0.10, takerFee: 0.10, withdrawalBtc: 0.0005, withdrawalUsdt: 0, wsEndpoint: "wss://stream.binance.com:9443", restEndpoint: "https://api.binance.com" },
  { id: "bybit", name: "Bybit", makerFee: 0.10, takerFee: 0.10, withdrawalBtc: 0.000085, withdrawalUsdt: 1.0, wsEndpoint: "wss://stream.bybit.com", restEndpoint: "https://api.bybit.com" },
  { id: "kucoin", name: "KuCoin", makerFee: 0.10, takerFee: 0.10, withdrawalBtc: 0, withdrawalUsdt: 0, wsEndpoint: "wss://ws-api.kucoin.com", restEndpoint: "https://api.kucoin.com" },
  { id: "bitget", name: "Bitget", makerFee: 0.10, takerFee: 0.10, withdrawalBtc: 0.0003, withdrawalUsdt: 1.0, wsEndpoint: "wss://ws.bitget.com", restEndpoint: "https://api.bitget.com" },
  { id: "gateio", name: "Gate.io", makerFee: 0.30, takerFee: 0.30, withdrawalBtc: 0.001, withdrawalUsdt: 1.0, wsEndpoint: "wss://api.gateio.ws", restEndpoint: "https://api.gateio.ws" },
  { id: "coinex", name: "CoinEx", makerFee: 0.20, takerFee: 0.20, withdrawalBtc: 0.0001, withdrawalUsdt: 1.0, wsEndpoint: "wss://socket.coinex.com", restEndpoint: "https://api.coinex.com" },
  { id: "bingx", name: "BingX", makerFee: 0.10, takerFee: 0.10, withdrawalBtc: 0.00035, withdrawalUsdt: 1.0, wsEndpoint: "wss://open-api-ws.bingx.com", restEndpoint: "https://open-api.bingx.com" },
];

export default function Exchanges() {
  const { exchangeStatus } = useDashboardStore();
  const [activeOnly, setActiveOnly] = useState(false);

  const filtered = activeOnly
    ? exchangeData.filter((e) => exchangeStatus[e.id]?.connected)
    : exchangeData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Биржи</h1>
          <p className="text-sm text-text-secondary mt-0.5">Конфигурация и статус 7 бирж</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-secondary">Только активные</span>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${activeOnly ? "bg-primary" : "bg-[#2a2a40]"}`}
            onClick={() => setActiveOnly(!activeOnly)}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${activeOnly ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </div>
        </label>
      </div>

      <div className="bg-surface border border-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f0f1a]">
                {["Биржа", "Статус", "Maker", "Taker", "BTC вывод", "USDT вывод", "WS Endpoint"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[13px] font-medium text-text-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => {
                const status = exchangeStatus[ex.id];
                return (
                  <tr key={ex.id} className="border-b border-[#1e1e2e] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs font-bold text-text-primary">
                          {ex.name.slice(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-text-primary">{ex.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {status?.connected ? (
                          <>
                            <Wifi className="w-3.5 h-3.5 text-success" />
                            <span className="text-xs text-success">Online</span>
                            <span className="text-xs text-text-muted">({status.latency}ms)</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3.5 h-3.5 text-danger" />
                            <span className="text-xs text-danger">Offline</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-text-primary">{ex.makerFee}%</td>
                    <td className="px-4 py-3 font-mono text-sm text-text-primary">{ex.takerFee}%</td>
                    <td className="px-4 py-3 font-mono text-sm text-text-primary">{ex.withdrawalBtc || "0"}</td>
                    <td className="px-4 py-3 font-mono text-sm text-text-primary">{ex.withdrawalUsdt || "0"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted truncate max-w-[200px]">{ex.wsEndpoint}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
