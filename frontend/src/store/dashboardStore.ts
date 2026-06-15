import { create } from "zustand";

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
  exchangeStatus: Record<string, ExchangeStatus>;
  addPrice: (price: PriceTick) => void;
  addOpportunity: (opp: Opportunity) => void;
  addTrade: (trade: Trade) => void;
  setExchangeStatus: (status: Record<string, ExchangeStatus>) => void;
}

const mockOpportunities: Opportunity[] = [
  { id: "opp_1", symbol: "BTC/USDT", buy_exchange: "bybit", sell_exchange: "binance", buy_price: 67432.15, sell_price: 67450.30, gross_spread_pct: 0.027, net_spread_pct: -0.073, detected_at: "2025-07-15T12:00:00Z" },
  { id: "opp_2", symbol: "BTC/USDT", buy_exchange: "kucoin", sell_exchange: "bybit", buy_price: 67420.50, sell_price: 67445.80, gross_spread_pct: 0.038, net_spread_pct: -0.062, detected_at: "2025-07-15T12:01:00Z" },
  { id: "opp_3", symbol: "ETH/USDT", buy_exchange: "binance", sell_exchange: "bitget", buy_price: 3520.40, sell_price: 3531.20, gross_spread_pct: 0.307, net_spread_pct: 0.107, detected_at: "2025-07-15T12:02:00Z" },
  { id: "opp_4", symbol: "BTC/USDT", buy_exchange: "gateio", sell_exchange: "binance", buy_price: 67410.00, sell_price: 67448.90, gross_spread_pct: 0.058, net_spread_pct: -0.042, detected_at: "2025-07-15T12:03:00Z" },
  { id: "opp_5", symbol: "ETH/USDT", buy_exchange: "kucoin", sell_exchange: "bybit", buy_price: 3518.30, sell_price: 3528.70, gross_spread_pct: 0.296, net_spread_pct: 0.096, detected_at: "2025-07-15T12:04:00Z" },
  { id: "opp_6", symbol: "BTC/USDT", buy_exchange: "coinex", sell_exchange: "binance", buy_price: 67405.20, sell_price: 67455.00, gross_spread_pct: 0.074, net_spread_pct: -0.026, detected_at: "2025-07-15T12:05:00Z" },
  { id: "opp_7", symbol: "ETH/USDT", buy_exchange: "gateio", sell_exchange: "kucoin", buy_price: 3515.80, sell_price: 3525.40, gross_spread_pct: 0.273, net_spread_pct: 0.073, detected_at: "2025-07-15T12:06:00Z" },
  { id: "opp_8", symbol: "BTC/USDT", buy_exchange: "bingx", sell_exchange: "bybit", buy_price: 67418.70, sell_price: 67442.30, gross_spread_pct: 0.035, net_spread_pct: -0.065, detected_at: "2025-07-15T12:07:00Z" },
];

const mockTrades: Trade[] = [
  { id: "trade_1", symbol: "BTC/USDT", buy_exchange: "bybit", sell_exchange: "binance", amount: 0.05, gross_pnl: 0.91, net_pnl: -12.58, status: "completed", executed_at: "2025-07-15T11:30:00Z" },
  { id: "trade_2", symbol: "ETH/USDT", buy_exchange: "binance", sell_exchange: "bitget", amount: 1.2, gross_pnl: 12.96, net_pnl: 2.44, status: "completed", executed_at: "2025-07-15T11:45:00Z" },
  { id: "trade_3", symbol: "BTC/USDT", buy_exchange: "kucoin", sell_exchange: "bybit", amount: 0.03, gross_pnl: 0.76, net_pnl: -8.32, status: "completed", executed_at: "2025-07-15T10:15:00Z" },
  { id: "trade_4", symbol: "ETH/USDT", buy_exchange: "kucoin", sell_exchange: "bybit", amount: 0.8, gross_pnl: 8.32, net_pnl: -1.21, status: "completed", executed_at: "2025-07-15T09:50:00Z" },
  { id: "trade_5", symbol: "BTC/USDT", buy_exchange: "gateio", sell_exchange: "binance", amount: 0.04, gross_pnl: 1.56, net_pnl: -6.89, status: "completed", executed_at: "2025-07-15T09:20:00Z" },
  { id: "trade_6", symbol: "ETH/USDT", buy_exchange: "gateio", sell_exchange: "kucoin", amount: 1.5, gross_pnl: 14.40, net_pnl: 3.88, status: "completed", executed_at: "2025-07-15T08:45:00Z" },
];

export const useDashboardStore = create<DashboardState>((set) => ({
  prices: [],
  opportunities: mockOpportunities,
  trades: mockTrades,
  exchangeStatus: {
    binance: { connected: true, latency: 24 },
    bybit: { connected: true, latency: 31 },
    kucoin: { connected: true, latency: 45 },
    bitget: { connected: true, latency: 28 },
    gateio: { connected: false, latency: 0 },
    coinex: { connected: true, latency: 52 },
    bingx: { connected: true, latency: 38 },
  },
  addPrice: (price) =>
    set((state) => ({ prices: [price, ...state.prices].slice(0, 1000) })),
  addOpportunity: (opp) =>
    set((state) => ({ opportunities: [opp, ...state.opportunities].slice(0, 100) })),
  addTrade: (trade) =>
    set((state) => ({ trades: [trade, ...state.trades].slice(0, 500) })),
  setExchangeStatus: (status) => set({ exchangeStatus: status }),
}));
