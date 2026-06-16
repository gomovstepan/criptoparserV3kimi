import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function getPrices(params?: Record<string, any>) {
  const res = await api.get("/prices", { params });
  return res.data;
}

export async function getOpportunities(params?: Record<string, any>) {
  const res = await api.get("/opportunities", { params });
  return res.data;
}

export async function getTrades(params?: Record<string, any>) {
  const res = await api.get("/trades", { params });
  return res.data;
}

export async function getBalance() {
  const res = await api.get("/balance");
  return res.data;
}

export async function getExchanges() {
  const res = await api.get("/exchanges");
  return res.data;
}

export async function getSettings() {
  const res = await api.get("/settings");
  return res.data;
}

export async function getHealth() {
  const res = await axios.get("/health", { timeout: 5000 });
  return res.data;
}
