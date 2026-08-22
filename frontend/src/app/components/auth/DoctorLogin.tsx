import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Sparkles, Stethoscope, Activity, FileText } from "lucide-react";

export default function DoctorLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(phone, password, "doctor");
    setLoading(false);
    if (result.success) navigate("/doctor");
    else setError(result.error ?? "Login failed");
  }

  function fillDemo() {
    setPhone("9000000001");
    setPassword("doctor123");
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-[#111827] selection:text-white">
      {/* ── Main Split Card Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[960px] bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-[#e8e4dc] grid grid-cols-1 md:grid-cols-2 min-h-[580px]"
      >
        {/* ── Left: Form Panel ── */}
        <div className="p-8 sm:p-10 md:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Top Brand Logo */}
            <div className="flex items-center justify-between mb-8">
              <Link to="/" className="flex items-center gap-1.5 group">
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  evodoc<span className="text-xs font-normal align-top ml-0.5">®</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/80 ml-2">
                  Doctor Portal
                </span>
              </Link>
              <Link to="/" className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                ← Home
              </Link>
            </div>

            {/* Visually Grouped Headline Block */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1.5">
                Provider sign in
              </h1>
              <p className="text-sm text-gray-500 font-normal">
                Sign in to manage your OPD queue and EMR worksheets
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Provider mobile
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9000000001"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => fillDemo()}
                    className="text-xs text-emerald-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-xs font-medium text-center bg-red-50 border border-red-100 py-2.5 px-3.5 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm bg-gray-900 text-white hover:bg-black active:scale-[0.99] transition-all shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign in to OPD <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-xs text-emerald-600 hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Use demo credentials (9000000001 / doctor123)
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Footer & Switchers */}
          <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>Clinical Practitioner access only</p>
            <div className="flex items-center gap-3">
              <Link to="/auth/patient" className="hover:text-gray-900 transition-colors">
                Patient portal
              </Link>
              <span>·</span>
              <Link to="/auth/admin" className="hover:text-gray-900 transition-colors">
                Staff admin
              </Link>
            </div>
          </div>
        </div>

        {/* ── Right: Illustrated Brand Panel (Role: Soft Green for Doctor) ── */}
        <div className="hidden md:flex flex-col items-center justify-center p-10 lg:p-12 bg-[#eaf6ee] text-center relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-200/40 blur-2xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-green-200/30 blur-2xl pointer-events-none" />

          {/* Flat Art / Line-Art Illustration */}
          <div className="w-56 h-56 relative mb-6 flex items-center justify-center">
            <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Soft background shape */}
              <circle cx="120" cy="120" r="90" fill="#d1f0db" />
              {/* Stethoscope & Medical Iconography */}
              <rect x="75" y="60" width="90" height="85" rx="16" fill="#ffffff" className="drop-shadow-md" />
              {/* EMR pulse grid */}
              <path d="M88 95 L102 95 L110 80 L120 115 L130 90 L140 102 L152 95" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="88" y="118" width="40" height="5" rx="2.5" fill="#86efac" />
              <rect x="88" y="128" width="60" height="4" rx="2" fill="#dcfce7" />
              {/* Stethoscope tubing */}
              <path d="M85 145 C85 185, 155 185, 155 145" stroke="#15803d" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M120 183 L120 198" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
              <circle cx="120" cy="204" r="9" fill="#15803d" />
              <circle cx="120" cy="204" r="4" fill="#ffffff" />
              {/* Decorative nodes */}
              <circle cx="65" cy="90" r="5" fill="#22c55e" />
              <circle cx="175" cy="75" r="4" fill="#15803d" />
              <circle cx="180" cy="140" r="6" fill="#86efac" />
            </svg>
          </div>

          {/* Tagline under illustration */}
          <div className="relative z-10 max-w-xs">
            <h3 className="font-serif text-xl lg:text-2xl font-bold text-gray-900 mb-2">
              Precision clinical care
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 leading-relaxed font-normal">
              Instant electronic medical records, automated diagnostic worksheets, and real-time OPD queue orchestration.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
