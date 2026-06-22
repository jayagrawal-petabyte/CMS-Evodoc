import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Activity, Eye, EyeOff } from "lucide-react";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", password: "", dob: "", gender: "Male", bloodGroup: "O+" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden text-foreground bg-black selection:bg-primary selection:text-white">
      <div className="apple-bg" />

      {/* Top Navbar mimic */}
      <nav className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm tracking-tight">MediCare Plus</span>
        </div>
        <div className="flex items-center gap-8 text-xs font-medium text-[#86868b]">
          <Link to="/" className="hover:text-white transition-colors">Sign In</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24 pb-12 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px]"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-semibold tracking-tight mb-2 text-white">Create Account</h1>
            <p className="text-base text-[#86868b] font-medium tracking-tight">
              One ID for all your health needs.
            </p>
          </div>

          <div className="">
            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
                <div className="w-24 h-24 rounded-full bg-[#32d74b]/10 border border-[#32d74b]/30 flex items-center justify-center mx-auto text-5xl text-[#32d74b]">✓</div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Welcome</h2>
                <p className="text-[#86868b] text-lg font-medium">Redirecting to sign in...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-0 rounded-[1.25rem] overflow-hidden border border-white/10 apple-card">
                  <div className="relative border-b border-white/5">
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px]"
                      required
                    />
                  </div>

                  <div className="relative border-b border-white/5">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px]"
                      required
                    />
                  </div>

                  <div className="relative border-b border-white/5">
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Password"
                      className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px]"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-white">
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex border-b border-white/5 divide-x divide-white/5">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => update("dob", e.target.value)}
                        className="w-full bg-transparent px-5 py-4 text-white placeholder:text-[#86868b] focus:outline-none transition-all text-[17px] appearance-none"
                        required
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div className="relative flex-1">
                      <select
                        value={form.gender}
                        onChange={(e) => update("gender", e.target.value)}
                        className="w-full h-full bg-transparent px-5 py-4 text-white focus:outline-none transition-all text-[17px] appearance-none"
                      >
                        {["Male", "Female", "Other"].map((g) => <option key={g} value={g} className="bg-black text-white">{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <select
                      value={form.bloodGroup}
                      onChange={(e) => update("bloodGroup", e.target.value)}
                      className="w-full bg-transparent px-5 py-4 text-[#86868b] focus:outline-none transition-all text-[17px] appearance-none"
                    >
                      <option value="" disabled className="bg-black text-white">Select Blood Group</option>
                      {bloodGroups.map((b) => <option key={b} value={b} className="bg-black text-white">{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-semibold text-[17px] transition-all ${loading ? "bg-[#2c2c2e] text-[#86868b] cursor-not-allowed" : "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"}`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      "Agree & Continue"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {!success && (
            <div className="mt-12 text-center border-t border-white/10 pt-6">
              <p className="text-[#86868b] text-sm font-medium">
                Already have an account?{" "}
                <Link to="/" className="text-primary hover:underline">
                  Sign in here.
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
