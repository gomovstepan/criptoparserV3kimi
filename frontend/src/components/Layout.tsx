import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard, Zap, ArrowLeftRight, BarChart3,
  Building2, Settings, Activity, LogOut,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";
import { useWebSocket } from "../hooks/useWebSocket";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/opportunities", label: "Возможности", icon: Zap },
  { path: "/trades", label: "Сделки", icon: ArrowLeftRight },
  { path: "/analytics", label: "Аналитика", icon: BarChart3 },
  { path: "/exchanges", label: "Биржи", icon: Building2 },
  { path: "/settings", label: "Настройки", icon: Settings },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Мониторинг арбитража в реальном времени" },
  "/opportunities": { title: "Арбитражные возможности", subtitle: "Межбиржевые спреды в реальном времени" },
  "/trades": { title: "История сделок", subtitle: "Журнал paper trading сделок" },
  "/analytics": { title: "Аналитика", subtitle: "Статистика и инсайты" },
  "/exchanges": { title: "Биржи", subtitle: "Конфигурация и статус 7 бирж" },
  "/settings": { title: "Настройки", subtitle: "Конфигурация системы" },
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const { fetchAll } = useDashboardStore();

  useWebSocket();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pageInfo = pageTitles[location.pathname] || { title: "", subtitle: "" };

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a14" }}>
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: "#12121f", borderRight: "1px solid #1e1e2e" }}>
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4aa, #6366f1)" }}>
            <Activity className="w-5 h-5" style={{ color: "#0a0a14" }} />
          </div>
          <span className="font-semibold text-[#f1f5f9]">ArbitragePro</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                style={{ background: active ? "#1a1a2e" : "transparent", color: active ? "#00d4aa" : "#94a3b8", borderLeft: active ? "3px solid #00d4aa" : "3px solid transparent" }}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 pt-4 pb-4" style={{ borderTop: "1px solid #1e1e2e" }}>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-2 text-sm transition-colors text-[#94a3b8] hover:text-[#f1f5f9]">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "#0a0a14", borderBottom: "1px solid #1e1e2e" }}>
          <div>
            <h1 className="text-lg font-bold text-[#f1f5f9]">{pageInfo.title}</h1>
            <p className="text-xs text-[#94a3b8]">{pageInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: wsConnected ? "#22c55e" : "#ef4444" }} />
            <span className="text-xs text-[#94a3b8]">{wsConnected ? "Live" : "Offline"}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
