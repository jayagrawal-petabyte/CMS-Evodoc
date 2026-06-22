import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { api, apiPost } from "../lib/api";
import { toast } from "sonner";
import { Play, Users, CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronRight, Phone } from "lucide-react";

type Token = any;

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Waiting: { color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10", border: "border-[#ff9f0a]/20", label: "Waiting" },
  Arrived: { color: "text-white", bg: "bg-white/10", border: "border-white/20", label: "Arrived" },
  Called: { color: "text-[#32d74b]", bg: "bg-[#32d74b]/10", border: "border-[#32d74b]/20", label: "In Consultation" },
  OnHold: { color: "text-[#bf5af2]", bg: "bg-[#bf5af2]/10", border: "border-[#bf5af2]/20", label: "On Hold" },
  Skipped: { color: "text-[#ff453a]", bg: "bg-[#ff453a]/10", border: "border-[#ff453a]/20", label: "Skipped" },
  Completed: { color: "text-[#86868b]", bg: "bg-[#2c2c2e]", border: "border-transparent", label: "Done" },
};

export default function DoctorQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<Token[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await api<any[]>("/tokens/today");
      setTokens(
        (rows ?? []).map((t) => ({
          id: t.id,
          tokenNumber: t.tokenNumber,
          status: t.status,
          source: t.appointment?.source ?? t.source ?? "WalkIn",
          calledAt: t.calledAt,
          createdAt: t.createdAt,
          visitId: t.visit?.id ?? null,
          patientName: t.patient?.fullName ?? "Patient",
          patientPhone: t.patient?.phone ?? "",
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const myTokens = tokens;
  const activeTokens = myTokens.filter((t) => ["Waiting", "Arrived", "Called", "OnHold", "Skipped"].includes(t.status));
  const completedTokens = myTokens.filter((t) => t.status === "Completed");
  const currentToken = myTokens.find((t) => t.status === "Called");

  const stats = [
    { label: "Total Today", value: myTokens.length, color: "text-white", icon: Users },
    { label: "Waiting", value: myTokens.filter((t) => ["Waiting", "Arrived"].includes(t.status)).length, color: "text-[#ff9f0a]", icon: Clock },
    { label: "Completed", value: completedTokens.length, color: "text-[#32d74b]", icon: CheckCircle2 },
    { label: "Skipped", value: myTokens.filter((t) => t.status === "Skipped").length, color: "text-[#ff453a]", icon: AlertCircle },
  ];

  async function startVisit(token: Token) {
    try {
      const res = await apiPost<{ visitId: string }>(`/tokens/${token.id}/start-visit`);
      navigate(`/doctor/consult/${res.visitId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open the consultation");
    }
  }

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="apple-hero-text text-5xl mb-2 text-white">Patient Queue.</h1>
          <p className="text-[#86868b] font-medium text-xl">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white font-medium hover:bg-white/10 transition-colors">
          <RefreshCw className="w-5 h-5 text-[#86868b]" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="apple-card p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[#86868b] font-semibold text-lg tracking-tight">{label}</span>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <p className={`text-5xl font-bold tracking-tight ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Current patient highlight */}
      {currentToken && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="apple-card p-10 border border-[#32d74b]/30 relative overflow-hidden shadow-[0_0_80px_-20px_rgba(50,215,75,0.2)]"
        >
          <div className="absolute inset-0 bg-[#32d74b]/5 pointer-events-none" />
          <div className="absolute top-8 right-10 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#32d74b] animate-pulse shadow-[0_0_12px_#32d74b]" />
            <span className="text-[#32d74b] text-base font-bold uppercase tracking-widest">In Consultation</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-[1.5rem] bg-black border border-[#32d74b]/30 flex items-center justify-center text-[#32d74b] font-bold text-4xl tracking-tighter shadow-xl">
                #{currentToken.tokenNumber}
              </div>
              <div>
                <p className="text-white font-bold text-4xl tracking-tight mb-2">{currentToken.patientName}</p>
                <p className="text-[#86868b] font-medium flex items-center gap-2 text-xl">
                  <Phone className="w-5 h-5" /> {currentToken.patientPhone}
                </p>
                <p className="text-[#32d74b] text-base mt-3 font-semibold tracking-tight">{currentToken.source} · {currentToken.calledAt ? `Called at ${new Date(currentToken.calledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
              </div>
            </div>
            <button
              onClick={() => startVisit(currentToken)}
              className="flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xl font-bold bg-[#32d74b] text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_-5px_rgba(50,215,75,0.4)]"
            >
              <Play className="w-6 h-6 fill-current" /> Open Clinical Record
            </button>
          </div>
        </motion.div>
      )}

      {/* Queue list */}
      <div className="apple-card overflow-hidden">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/40">
          <h2 className="text-white font-semibold tracking-tight text-2xl">Waiting Queue</h2>
          <span className="text-[#86868b] text-base font-semibold tracking-tight px-4 py-1.5 bg-white/5 rounded-full">{activeTokens.length} Active · {completedTokens.length} Done</span>
        </div>

        <div className="divide-y divide-white/5">
          {myTokens.sort((a, b) => a.tokenNumber - b.tokenNumber).map((token) => {
            const sc = STATUS_CONFIG[token.status] ?? STATUS_CONFIG.Waiting;
            return (
              <motion.div
                key={token.id}
                layout
                className="px-8 py-6 flex items-center gap-8 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {/* Token number */}
                <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-bold tracking-tight flex-shrink-0 ${sc.bg} ${sc.border} border ${sc.color}`}>
                  {token.tokenNumber}
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <p className="text-white font-semibold text-2xl tracking-tight truncate">{token.patientName}</p>
                    <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex-shrink-0 border ${sc.bg} ${sc.color} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-[#86868b] text-base font-medium flex items-center gap-3">
                    <Phone className="w-4 h-4" /> {token.patientPhone}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38383a]" />
                    {token.source}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38383a]" />
                    {new Date(token.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {["Called", "Arrived", "Waiting"].includes(token.status) && (
                    <button
                      onClick={() => startVisit(token)}
                      className="flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold bg-[#32d74b] text-black hover:scale-[1.02] transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" /> {token.visitId ? "Resume" : "Open EMR"}
                    </button>
                  )}
                  <button className="text-[#86868b] hover:text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {myTokens.length === 0 && (
            <div className="py-24 text-center">
              <Users className="w-20 h-20 text-[#86868b] mx-auto mb-6 opacity-30" />
              <p className="text-white text-3xl font-semibold tracking-tight mb-2">No patients in queue</p>
              <p className="text-[#86868b] text-lg font-medium">You're all caught up for now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
