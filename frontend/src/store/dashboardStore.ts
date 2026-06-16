import { create } from "zustand";
import { getOpportunities, getTrades, getBalance } from "../lib/api";

export interface PriceTick {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  timestamp: string;
}

export interface Opportunity {
  id: string;
  symbol: string;
  buy_exchange: string;
  sell_exchange: string;
  buy_price: number;
  sell_price: number;
  gross_spread_pct: number;
  net_spread_pct: number;
  detected_at: string;
}

export interface Trade {
  id: string;
  symbol: string;
  buy_exchange: string;
  sell_exchange: string;
  amount: number;
  gross_pnl: number;
  net_pnl: number;
  status: string;
  executed_at: string;
}

interface ExchangeStatus {
  connected: boolean;
  latency: number;
}

interface DashboardState {
  prices: PriceTick[];
  opportunities: Opportunity[];
  trades: Trade[];
  balances: Record<string, Record<string, number>>;
  exchangeStatus: Record<string, ExchangeStatus>;
  wsConnected: boolean;
  lastUpdated: string;

  setPrices: (prices: PriceTick[]) => void;
  setOpportunities: (opps: Opportunity[]) => void;
  setTrades: (trades: Trade[]) => void;
  setBalances: (b: Record<string, Record<string, number>>) => void;
  addPrice: (price: PriceTick) => void;
  addOpportunity: (opp: Opportunity) => void;
  addTrade: (trade: Trade) => void;
  setExchangeStatus: (status: Record<string, ExchangeStatus>) => void;
  setWsConnected: (c: boolean) => void;

  fetchOpportunities: () => Promise<void>;
  fetchTrades: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  prices: [],
  opportunities: [],
  trades: [],
  balances: {},
  exchangeStatus: {
    binance: { connected: false, latency: 0 },
    bybit: { connected: false, latency: 0 },
    kucoin: { connected: false, latency: 0 },
    bitget: { connected: false, latency: 0 },
    gateio: { connected: false, latency: 0 },
    coinex: { connected: false, latency: 0 },
    bingx: { connected: false, latency: 0 },
  },
  wsConnected: false,
  lastUpdated: "",

  setPrices: (prices) => set({ prices }),
  setOpportunities: (opportunities) => set({ opportunities, lastUpdated: new Date().toLocaleTimeString("ru-RU") }),
  setTrades: (trades) => set({ trades }),
  setBalances: (balances) => set({ balances }),
  setExchangeStatus: (status) => set({ exchangeStatus: status }),
  setWsConnected: (c) => set({ wsConnected: c }),

  addPrice: (price) => set((state) => ({ prices: [price, ...state.prices].slice(0, 1000) })),
  addOpportunity: (opp) => set((state) => ({
    opportunities: [opp, ...state.opportunities.filter((o) => o.id !== opp.id)].slice(0, 100),
    lastUpdated: new Date().toLocaleTimeString("ru-RU"),
  })),
  addTrade: (trade) => set((state) => ({
    trades: [trade, ...state.trades.filter((t) => t.id !== trade.id)].slice(0, 500),
  })),

  fetchOpportunities: async () => {
    try {
      const data = await getOpportunities({ limit: 50 });
      if (data?.items?.length) {
        set({
          opportunities: data.items.map((item: any) => ({
            id: item.id || `opp_${Date.now()}_${Math.random()}`,
            symbol: item.symbol || "",
            buy_exchange: item.buy_exchange || "",
            sell_exchange: item.sell_exchange || "",
            buy_price: item.buy_price || 0,
            sell_price: item.sell_price || 0,
            gross_spread_pct: item.gross_spread_pct || 0,
            net_spread_pct: item.net_spread_pct || 0,
            detected_at: item.detected_at || new Date().toISOString(),
          })),
          lastUpdated: new Date().toLocaleTimeString("ru-RU"),
        });
      }
    } catch (e) { console.warn("fetchOpportunities failed:", e); }
  },

  fetchTrades: async () => {
    try {
      const data = await getTrades({ limit: 50 });
      if (data?.items?.length) {
        set({
          trades: data.items.map((item: any) => ({
            id: item.id || `trade_${Date.now()}`,
            symbol: item.symbol || "",
            buy_exchange: item.buy_exchange || "",
            sell_exchange: item.sell_exchange || "",
            amount: item.amount || 0,
            gross_pnl: item.gross_pnl || 0,
            net_pnl: item.net_pnl || 0,
            status: item.status || "completed",
            executed_at: item.executed_at || new Date().toISOString(),
          })),
        });
      }
    } catch (e) { console.warn("fetchTrades failed:", e); }
  },

  fetchBalance: async () => {
    try {
      const data = await getBalance();
      if (data) set({ balances: data });
    } catch (e) { console.warn("fetchBalance failed:", e); }
  },

  fetchAll: async () => {
    await Promise.all([get().fetchOpportunities(), get().fetchTrades(), get().fetchBalance()]);
  },
}));
