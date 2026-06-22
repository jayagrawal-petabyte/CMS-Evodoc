import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { Activity, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function PatientLogin() {
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
    const result = await login(phone, password, "patient");
    setLoading(false);
    if (result.success) navigate("/patient");
    else setError(result.error ?? "Login failed");
  }

  function fillDemo() {
    setPhone("9876543210");
    setPassword("patient123");
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden text-foreground bg-black selection:bg-primary selection:text-white">
      <div className="apple-bg" />

      {/* Top Navbar mimic - Super minimalistic */}
      <nav className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm tracking-tight">MediCare Plus</span>
        </div>
        <div className="flex items-center gap-8 text-xs font-medium text-[#86868b]">
          <Link to="/auth/doctor" className="hover:text-white transition-colors">Doctor</Link>
          <Link to="/auth/admin" className="hover:text-white transition-colors">Admin</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-20 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-white rounded-[1.25rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Activity className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2 text-white">Sign in to MediCare</h1>
            <p className="text-base text-[#86868b] font-medium tracking-tight">
              Manage your health records.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-0 rounded-2xl overflow-hidden border border-white/10 apple-card">
              <div className="relative border-b border-white/5">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number"
                  className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px]"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px]"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center text-[#ff453a] text-sm font-medium pt-2">
                {error}
              </motion.div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-semibold text-[17px] transition-all ${loading ? "bg-[#2c2c2e] text-[#86868b] cursor-not-allowed" : "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  "Continue"
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={fillDemo}
                className="text-sm text-primary hover:underline font-medium"
              >
                Use demo credentials
              </button>
            </div>
          </form>

          <div className="mt-12 text-center border-t border-white/10 pt-6">
            <p className="text-[#86868b] text-sm font-medium">
              Don't have an account?{" "}
              <Link to="/auth/register" className="text-primary hover:underline">
                Create yours now.
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
