import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Zap, ArrowLeftRight, BarChart3,
  Building2, Settings, ChevronsLeft, ChevronsRight,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", route: "/dashboard" },
  { icon: Zap, label: "Возможности", route: "/opportunities" },
  { icon: ArrowLeftRight, label: "Сделки", route: "/trades" },
  { icon: BarChart3, label: "Аналитика", route: "/analytics" },
  { icon: Building2, label: "Биржи", route: "/exchanges" },
  { icon: Settings, label: "Настройки", route: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className={`fixed top-14 left-0 bottom-0 bg-surface border-r border-[#1e1e2e] z-40 transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      <div className="flex flex-col h-full py-4">
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.route;
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left ${
                  isActive
                    ? "bg-[#1a1a2e] text-primary border-l-[3px] border-primary"
                    : "text-text-secondary hover:bg-[#16162a] border-l-[3px] border-transparent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pt-2 border-t border-[#1e1e2e]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[#16162a] transition-colors text-text-muted"
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
