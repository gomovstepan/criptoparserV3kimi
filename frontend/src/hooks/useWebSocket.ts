import { useEffect, useRef, useCallback } from "react";
import { useDashboardStore } from "../store/dashboardStore";

const DEFAULT_WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

export function useWebSocket(url: string = DEFAULT_WS_URL) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const setWsConnected = useDashboardStore((s) => s.setWsConnected);
  const addPrice = useDashboardStore((s) => s.addPrice);
  const addOpportunity = useDashboardStore((s) => s.addOpportunity);
  const addTrade = useDashboardStore((s) => s.addTrade);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setWsConnected(false);

      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttempt.current = 0;
        try {
          ws.send(JSON.stringify({ action: "subscribe", channel: "all" }));
        } catch { /* ignore */ }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "price_tick" && msg.data) {
            addPrice({
              exchange: msg.data.exchange || "unknown",
              symbol: msg.data.symbol || "",
              bid: parseFloat(msg.data.bid) || 0,
              ask: parseFloat(msg.data.ask) || 0,
              timestamp: new Date().toISOString(),
            });
          } else if (msg.type === "opportunity" && msg.data) {
            addOpportunity({
              id: msg.data.id || `opp_${Date.now()}`,
              symbol: msg.data.symbol || "",
              buy_exchange: msg.data.buy_exchange || "",
              sell_exchange: msg.data.sell_exchange || "",
              buy_price: parseFloat(msg.data.buy_price) || 0,
              sell_price: parseFloat(msg.data.sell_price) || 0,
              gross_spread_pct: parseFloat(msg.data.gross_spread_pct) || 0,
              net_spread_pct: parseFloat(msg.data.net_spread_pct) || 0,
              detected_at: new Date().toISOString(),
            });
          } else if (msg.type === "trade" && msg.data) {
            addTrade({
              id: msg.data.id || `trade_${Date.now()}`,
              symbol: msg.data.symbol || "",
              buy_exchange: msg.data.buy_exchange || "",
              sell_exchange: msg.data.sell_exchange || "",
              amount: parseFloat(msg.data.amount) || 0,
              gross_pnl: parseFloat(msg.data.gross_pnl) || 0,
              net_pnl: parseFloat(msg.data.net_pnl) || 0,
              status: msg.data.status || "completed",
              executed_at: new Date().toISOString(),
            });
          }
        } catch { /* ignore invalid JSON */ }
      };

      ws.onclose = () => {
        setWsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
        reconnectAttempt.current++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    } catch {
      setWsConnected(false);
    }
  }, [url, setWsConnected, addPrice, addOpportunity, addTrade]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { status: wsRef.current?.readyState === WebSocket.OPEN ? "connected" : "disconnected" as "connecting" | "connected" | "disconnected" };
}
