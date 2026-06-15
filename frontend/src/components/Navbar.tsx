import { useAuthStore } from "@/store/authStore";
import { Bell, CircleUser, LogOut, Activity } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-navbar-bg border-b border-[#1e1e2e] z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center">
          <Activity className="w-5 h-5 text-page" />
        </div>
        <span className="font-semibold text-lg text-text-primary">ArbitragePro</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-[#1e1e2e]">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
          <span className="text-xs text-text-secondary">Online</span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-surface transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <CircleUser className="w-5 h-5 text-text-secondary" />
          <span className="text-sm text-text-secondary hidden sm:block">
            {user?.email || "user@example.com"}
          </span>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-surface transition-colors ml-2" title="Выйти">
            <LogOut className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
    </nav>
  );
}
