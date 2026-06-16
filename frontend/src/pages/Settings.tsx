import { useState, useEffect } from "react";
import { Settings, AlertTriangle, Loader2, Check } from "lucide-react";
import { getSettings, api } from "../lib/api";

interface AppSettings {
  min_spread_pct: number;
  max_position_pct: number;
  slippage_tolerance_pct: number;
  execution_timeout_sec: number;
}

const defaultSettings: AppSettings = {
  min_spread_pct: 0.3,
  max_position_pct: 10,
  slippage_tolerance_pct: 0.2,
  execution_timeout_sec: 2,
};

export default function SettingsPage() {
  const [s, setS] = useState<AppSettings>({ ...defaultSettings });
  const [original, setOriginal] = useState<AppSettings>({ ...defaultSettings });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);
  const [killStatus, setKillStatus] = useState<string>("");

  useEffect(() => {
    getSettings().then((data: Record<string, string>) => {
      const parsed: AppSettings = {
        min_spread_pct: parseFloat(data?.min_spread_pct) || 0.3,
        max_position_pct: parseFloat(data?.max_position_pct) || 10,
        slippage_tolerance_pct: parseFloat(data?.slippage_tolerance_pct) || 0.2,
        execution_timeout_sec: parseInt(data?.execution_timeout_sec) || 2,
      };
      setS(parsed); setOriginal(parsed);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try { await api.put("/settings", s); setSaved(true); setOriginal({ ...s }); setTimeout(() => setSaved(false), 3000); }
    catch (e) { console.error("Save failed:", e); }
    finally { setSaving(false); }
  };

  const handleKillSwitch = async () => {
    try { const res = await api.post("/killswitch?reason=frontend"); setKillStatus(res.data?.status || "activated"); }
    catch (e: any) { setKillStatus(`error: ${e.response?.data?.detail || e.message}`); }
    setKillConfirm(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#00d4aa]" /></div>;

  const fields = [
    { key: "min_spread_pct" as const, label: "Минимальный спред (%)", step: 0.05, min: 0, max: 5, desc: "Минимальный спред для триггера сделки" },
    { key: "max_position_pct" as const, label: "Макс. позиция (%)", step: 1, min: 1, max: 100, desc: "Максимальный размер позиции от баланса" },
    { key: "slippage_tolerance_pct" as const, label: "Slippage (%)", step: 0.05, min: 0, max: 1, desc: "Допустимый slippage при исполнении" },
    { key: "execution_timeout_sec" as const, label: "Таймаут (сек)", step: 1, min: 1, max: 30, desc: "Таймаут на исполнение сделки" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl p-6 space-y-5" style={{ background: "#12121f", border: "1px solid #1e1e2e" }}>
        <h3 className="text-sm font-semibold text-[#f1f5f9] flex items-center gap-2"><Settings className="w-4 h-4 text-[#00d4aa]" /> Торговые параметры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-[#94a3b8] mb-1.5">{f.label}</label>
              <input type="number" step={f.step} min={f.min} max={f.max} value={s[f.key]}
                onChange={(e) => setS((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm focus:border-[#00d4aa] focus:outline-none transition-colors" />
              <p className="text-xs text-[#64748b] mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="h-10 px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "#00d4aa", color: "#0a0a14" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? "Сохранено!" : saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button onClick={() => setS({ ...original })}
            className="h-10 px-6 rounded-lg border border-[#1e1e2e] text-[#94a3b8] text-sm hover:text-[#f1f5f9] hover:bg-[#0f0f1a] transition-colors">Сбросить</button>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: "#12121f", border: "1px solid rgba(239,68,68,0.3)" }}>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: "#ef4444" }}><AlertTriangle className="w-4 h-4" /> Аварийная остановка</h3>
        <p className="text-sm text-[#94a3b8] mb-4">Kill switch немедленно останавливает все новые сделки. Используйте только в экстренных ситуациях.</p>
        {!killConfirm ? (
          <button onClick={() => setKillConfirm(true)} className="h-10 px-6 rounded-lg font-medium text-sm text-white transition-colors hover:opacity-90" style={{ background: "#ef4444" }}>Активировать Kill Switch</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Вы уверены? Это немедленно остановит все сделки!</p>
            <div className="flex gap-3">
              <button onClick={handleKillSwitch} className="h-10 px-6 rounded-lg font-medium text-sm text-white transition-colors hover:opacity-90" style={{ background: "#ef4444" }}>Да, остановить</button>
              <button onClick={() => { setKillConfirm(false); setKillStatus(""); }} className="h-10 px-6 rounded-lg border border-[#1e1e2e] text-[#94a3b8] text-sm hover:text-[#f1f5f9] hover:bg-[#0f0f1a] transition-colors">Отмена</button>
            </div>
          </div>
        )}
        {killStatus && <p className="text-xs mt-3" style={{ color: killStatus.startsWith("error") ? "#ef4444" : "#22c55e" }}>{killStatus}</p>}
      </div>
    </div>
  );
}
