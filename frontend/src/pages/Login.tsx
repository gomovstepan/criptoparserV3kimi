import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Activity, Loader2 } from "lucide-react";
import { login } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const authLogin = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email || !password) { setErr("Заполните все поля"); return; }
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.access_token) { authLogin(data.access_token, email); navigate("/dashboard"); }
      else { setErr("Неверный ответ сервера"); }
    } catch (error: any) {
      setErr(error.response?.data?.detail || "Неверный email или пароль");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a14" }}>
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-center px-16"
        style={{ background: "linear-gradient(160deg, #0a0a14 0%, #12121f 40%, #1a1a2e 100%)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 50%, rgba(0,212,170,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4aa, #6366f1)" }}>
              <Activity className="w-7 h-7" style={{ color: "#0a0a14" }} />
            </div>
            <span className="text-2xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Крипто-арбитражная<br />платформа</h1>
          <p className="text-[#94a3b8] text-lg mb-8 max-w-md">Мониторинг спредов между 7 биржами в реальном времени. Paper trading с полным P&L учётом.</p>
          <ul className="space-y-3 text-[#94a3b8]">
            {["7 бирж: Binance, Bybit, KuCoin, Gate.io, Bitget, CoinEx, BingX", "WebSocket real-time данные", "Paper trading с виртуальным балансом"].map((item, i) => (
              <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d4aa" }} />{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "#0a0a14" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4aa, #6366f1)" }}>
              <Activity className="w-5 h-5" style={{ color: "#0a0a14" }} />
            </div>
            <span className="text-xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-1">Вход в систему</h2>
          <p className="text-[#64748b] text-sm mb-6">Введите свои данные для входа</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full h-10 px-3.5 rounded-lg text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none transition-colors"
                style={{ background: "#0f0f1a", border: "1px solid #1e1e2e" }}
                onFocus={(e) => (e.target.style.borderColor = "#00d4aa")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")} />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Пароль</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль"
                  className="w-full h-10 px-3.5 pr-10 rounded-lg text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none transition-colors"
                  style={{ background: "#0f0f1a", border: "1px solid #1e1e2e" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00d4aa")}
                  onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
              style={{ background: "#00d4aa", color: "#0a0a14" }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Вход...</span> : "Войти"}
            </button>
          </form>
          <p className="text-center text-xs text-[#64748b] mt-6">Тестовый доступ: <code className="text-[#00d4aa]">test@example.com / test123</code></p>
        </div>
      </div>
    </div>
  );
}
