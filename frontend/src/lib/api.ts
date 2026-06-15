/**
 * API client — axios instance с JWT авторизацией.
 * 
 * Через Nginx reverse proxy все запросы на /api/v1
 * проксируются в API Gateway.
 */

import axios from "axios";
import { useAuthStore } from "@/store/authStore";

// Singleton axios instance
export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// JWT interceptor — добавляет токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 interceptor — разлогинивает при истечении токена
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// === Auth API ===
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

// === Prices API ===
export async function getPrices(params?: { symbol?: string; exchange?: string; limit?: number; offset?: number }) {
  const res = await api.get("/prices", { params });
  return res.data;
}

// === Opportunities API ===
export async function getOpportunities(params?: { symbol?: string; buy_exchange?: string; min_spread?: number; limit?: number; offset?: number }) {
  const res = await api.get("/opportunities", { params });
  return res.data;
}

// === Trades API ===
export async function getTrades(params?: { symbol?: string; status?: string; exchange?: string; limit?: number; offset?: number }) {
  const res = await api.get("/trades", { params });
  return res.data;
}

// === Balance API ===
export async function getBalance() {
  const res = await api.get("/balance");
  return res.data;
}

// === Exchanges API ===
export async function getExchanges() {
  const res = await api.get("/exchanges");
  return res.data;
}

// === Settings API ===
export async function getSettings() {
  const res = await api.get("/settings");
  return res.data;
}

// === Health API (без auth) ===
export async function getHealth() {
  const res = await axios.get("/health", { timeout: 5000 });
  return res.data;
}
