import { useState } from "react";
import { Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [minSpread, setMinSpread] = useState(0.30);
  const [maxPosition, setMaxPosition] = useState(10);
  const [slippage, setSlippage] = useState(0.20);
  const [execTimeout, setExecTimeout] = useState(2);
  const [showKillConfirm, setShowKillConfirm] = useState(false);

  const handleSave = () => {
    toast.success("Настройки сохранены");
  };

  const handleKillSwitch = () => {
    toast.error("Kill switch активирован! Все сделки остановлены.");
    setShowKillConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Настройки</h1>
        <p className="text-sm text-text-secondary mt-0.5">Конфигурация системы</p>
      </div>

      <div className="bg-surface border border-[#1e1e2e] rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Торговые параметры
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Минимальный спред (%)</label>
            <input type="number" step="0.05" value={minSpread}
              onChange={(e) => setMinSpread(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Макс. позиция (% от баланса)</label>
            <input type="number" step="1" value={maxPosition}
              onChange={(e) => setMaxPosition(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Slippage tolerance (%)</label>
            <input type="number" step="0.05" value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Таймаут исполнения (сек)</label>
            <input type="number" step="1" value={execTimeout}
              onChange={(e) => setExecTimeout(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-input-bg border border-[#1e1e2e] text-text-primary text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
          </div>
        </div>

        <button onClick={handleSave}
          className="h-10 px-6 rounded-lg bg-primary text-page font-medium text-sm hover:bg-primary-hover transition-colors">
          Сохранить настройки
        </button>
      </div>

      {/* Kill Switch */}
      <div className="bg-surface border border-danger/30 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-danger flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" /> Аварийная остановка
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Kill switch немедленно останавливает все новые сделки. Используйте только в экстренных ситуациях.
        </p>
        {!showKillConfirm ? (
          <button onClick={() => setShowKillConfirm(true)}
            className="h-10 px-6 rounded-lg bg-danger text-white font-medium text-sm hover:bg-red-600 transition-colors">
            Активировать Kill Switch
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-danger font-medium">Вы уверены? Это немедленно остановит все сделки!</p>
            <div className="flex gap-3">
              <button onClick={handleKillSwitch}
                className="h-10 px-6 rounded-lg bg-danger text-white font-medium text-sm hover:bg-red-600 transition-colors">
                Да, остановить
              </button>
              <button onClick={() => setShowKillConfirm(false)}
                className="h-10 px-6 rounded-lg border border-[#1e1e2e] text-text-secondary text-sm hover:bg-surface transition-colors">
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
