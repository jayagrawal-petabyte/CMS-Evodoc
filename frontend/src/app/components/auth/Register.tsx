import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, HeartPulse } from "lucide-react";
import { apiPost } from "../lib/api";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", password: "", dob: "", gender: "Male", bloodGroup: "O+" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) { setError("Please enter your full name."); return; }
    if (form.phone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit phone number."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      await apiPost("/auth/register", {
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        dateOfBirth: form.dob || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/auth/patient"), 2000);
    } catch (err: any) {
      setError(err?.message ?? "Registration failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-[#111827] selection:text-white">
      {/* ── Main Split Card Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1000px] bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-[#e8e4dc] grid grid-cols-1 md:grid-cols-12 min-h-[620px]"
      >
        {/* ── Left: Form Panel (7 cols) ── */}
        <div className="md:col-span-7 p-8 sm:p-10 md:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Top Brand Logo */}
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="flex items-center gap-1.5 group">
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  evodoc<span className="text-xs font-normal align-top ml-0.5">®</span>
                </span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/80 ml-2">
                  Patient Registration
                </span>
              </Link>
              <Link to="/" className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                ← Home
              </Link>
            </div>

            {/* Visually Grouped Headline Block */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1.5">
                Create your Health ID
              </h1>
              <p className="text-sm text-gray-500 font-normal">
                One unified profile for instant clinic tokens, EMR prescriptions, and vitals
              </p>
            </div>

            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto border border-green-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Account Created Successfully</h2>
                <p className="text-gray-500 text-sm">Redirecting to sign in...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm pr-11"
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Date of birth
                    </label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => update("dob", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 shadow-sm cursor-pointer"
                    >
                      {["Male", "Female", "Other"].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Blood group
                  </label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => update("bloodGroup", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 shadow-sm cursor-pointer"
                  >
                    {bloodGroups.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-xs font-medium text-center bg-red-50 border border-red-100 py-2 px-3 rounded-xl"
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
                      <>Register & Create ID <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Footer */}
          {!success && (
            <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
              <p>
                Already have a Health ID?{" "}
                <Link to="/auth/patient" className="text-blue-600 font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Illustrated Brand Panel (5 cols) ── */}
        <div className="hidden md:col-span-5 md:flex flex-col items-center justify-center p-8 lg:p-10 bg-[#e8f1fd] text-center relative overflow-hidden">
          <div className="w-48 h-48 relative mb-6 flex items-center justify-center">
            <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="120" cy="120" r="85" fill="#d4e6fc" />
              <rect x="75" y="65" width="90" height="90" rx="22" fill="#ffffff" className="drop-shadow-md" />
              <path d="M120 85 L120 125 M100 105 L140 105" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
              <circle cx="65" cy="85" r="5" fill="#3b82f6" />
              <circle cx="175" cy="80" r="4" fill="#60a5fa" />
              <circle cx="180" cy="140" r="6" fill="#93c5fd" />
              <path d="M75 190 L95 190 L105 175 L115 205 L125 180 L135 195 L145 190 L165 190" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xs">
            <h3 className="font-serif text-xl font-bold text-gray-900 mb-1.5">
              Instant Patient Onboarding
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed font-normal">
              Secure digital health records, allergy profiles, and priority queue appointments.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
