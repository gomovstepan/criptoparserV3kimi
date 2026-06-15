import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Eye, EyeOff, Activity } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Email обязателен";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Неверный формат email";
    if (!password) errs.password = "Пароль обязателен";
    else if (password.length < 6) errs.password = "Минимум 6 символов";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      if (email === "test@example.com" && password === "test123") {
        login("mock_jwt_" + Date.now(), email);
        toast.success("Успешный вход!");
        navigate("/dashboard");
      } else {
        toast.error("Неверный email или пароль");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-center px-16"
        style={{ background: "linear-gradient(160deg, #0a0a14 0%, #12121f 40%, #1a1a2e 100%)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 50%, rgba(0,212,170,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa] to-indigo-500 flex items-center justify-center">
              <Activity className="w-7 h-7 text-[#0a0a14]" />
            </div>
            <span className="text-2xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">
            Крипто-арбитражная<br />платформа
          </h1>
          <p className="text-[#94a3b8] text-lg mb-8 max-w-md">
            Мониторинг спредов между 7 биржами в реальном времени.
            Paper trading с полным P&L учётом.
          </p>
          <ul className="space-y-3 text-[#94a3b8]">
            {[
              "7 бирж: Binance, Bybit, KuCoin, Gate.io, Bitget, CoinEx, BingX",
              "WebSocket real-time данные",
              "Paper trading с виртуальным балансом",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "#0a0a14" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4aa] to-indigo-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#0a0a14]" />
            </div>
            <span className="text-xl font-bold text-[#f1f5f9]">ArbitragePro</span>
          </div>

          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-1">Вход в систему</h2>
          <p className="text-[#64748b] text-sm mb-6">Введите свои данные для входа</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/15 transition-colors" />
              {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5">Пароль</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль"
                  className="w-full h-10 px-3.5 pr-10 rounded-lg bg-[#0f0f1a] border border-[#1e1e2e] text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#00d4aa] focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/15 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[#ef4444] text-xs mt-1">{errors.password}</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-lg bg-[#00d4aa] text-[#0a0a14] font-semibold text-sm hover:bg-[#00b894] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0a0a14]/30 border-t-[#0a0a14] rounded-full animate-spin" />
                  Вход...
                </span>
              ) : "Войти"}
            </button>
          </form>
          <p className="text-center text-xs text-[#64748b] mt-6">
            Тестовый доступ: <code className="text-[#00d4aa]">test@example.com / test123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
