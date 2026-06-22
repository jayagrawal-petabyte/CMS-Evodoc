import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, apiPost } from "../lib/api";
import { toast } from "sonner";
import { Users, Play, PauseCircle, SkipForward, RotateCcw, XCircle, CheckCircle2, Bell, Phone, Clock, RefreshCw } from "lucide-react";

type TokenStatus = "Waiting" | "Arrived" | "Called" | "OnHold" | "Skipped" | "Completed" | "Abandoned";
type Token = any;

// Maps a target status to the backend token action endpoint.
const ACTION: Record<string, string> = {
  Arrived: "arrive",
  Called: "recall", // sets a specific token to Called (used for Arrive→Call and Skip→Recall)
  OnHold: "hold",
  Waiting: "resume", // OnHold → Waiting
  Skipped: "skip",
  Abandoned: "abandon",
  Completed: "complete",
};

const STATUS_STYLES: Record<TokenStatus, { color: string; bg: string; border: string }> = {
  Waiting: { color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10", border: "border-[#ff9f0a]/20" },
  Arrived: { color: "text-white", bg: "bg-white/10", border: "border-white/20" },
  Called: { color: "text-[#32d74b]", bg: "bg-[#32d74b]/10", border: "border-[#32d74b]/20" },
  OnHold: { color: "text-[#bf5af2]", bg: "bg-[#bf5af2]/10", border: "border-[#bf5af2]/20" },
  Skipped: { color: "text-[#ff453a]", bg: "bg-[#ff453a]/10", border: "border-[#ff453a]/20" },
  Completed: { color: "text-[#86868b]", bg: "bg-[#2c2c2e]", border: "border-transparent" },
  Abandoned: { color: "text-[#86868b]", bg: "bg-[#2c2c2e]", border: "border-transparent" },
};

type Filter = "all" | "active";

export default function TokenQueuePanel() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [filterDoctor, setFilterDoctor] = useState("all");

  const load = useCallback(() => {
    api<any[]>("/tokens/queue").then((rows) => setTokens(rows ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function updateStatus(id: string, status: TokenStatus) {
    const verb = ACTION[status];
    if (!verb) return;
    const token = tokens.find((t) => t.id === id);
    const labels: Partial<Record<TokenStatus, string>> = {
      Arrived: "Marked as Arrived",
      Called: `Token #${token?.tokenNumber} called`,
      OnHold: "Token placed on hold",
      Waiting: "Token resumed to Waiting",
      Skipped: "Token skipped",
      Abandoned: "Token marked as Abandoned (LWBS)",
      Completed: "Visit completed",
    };
    try {
      await apiPost(`/tokens/${id}/${verb}`);
      toast.success(labels[status] ?? `Status → ${status}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  }

  async function callNext() {
    try {
      const res = await apiPost<any>("/tokens/next");
      toast.success(res?.tokenNumber ? `Called Token #${res.tokenNumber}` : "Called next patient");
      load();
    } catch (e: any) {
      if (e?.status === 404) toast.info("No patients waiting to be called");
      else toast.error(e?.message ?? "Failed to call next");
    }
  }

  const doctorOptions = [...new Set(tokens.map((t) => t.doctorId))];
  const doctorNames: Record<string, string> = {};
  tokens.forEach((t) => { doctorNames[t.doctorId] = t.doctorName; });

  const displayed = tokens
    .filter((t) => filter === "active" ? !["Completed", "Abandoned"].includes(t.status) : true)
    .filter((t) => filterDoctor === "all" || t.doctorId === filterDoctor)
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const activeCount = tokens.filter((t) => !["Completed", "Abandoned"].includes(t.status)).length;
  const waitingCount = tokens.filter((t) => t.status === "Waiting").length;
  const calledCount = tokens.filter((t) => t.status === "Called").length;
  const arrivedCount = tokens.filter((t) => t.status === "Arrived").length;

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="apple-hero-text text-5xl mb-3 text-white">Live Queue.</h1>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#bf5af2] animate-pulse shadow-[0_0_12px_#bf5af2]" />
            <p className="text-[#86868b] text-xl font-medium">{activeCount} active tokens · Realtime tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={load} className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white text-base font-medium hover:bg-white/10 transition-colors">
            <RefreshCw className="w-5 h-5 text-[#86868b]" /> Refresh
          </button>
          <button onClick={callNext}
            className="flex items-center gap-3 px-8 py-3 rounded-full text-base font-bold bg-[#bf5af2] text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(191,90,242,0.3)]">
            <Bell className="w-5 h-5" /> <span>Call Next Patient</span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: "Waiting", value: waitingCount, color: "text-[#ff9f0a]" },
          { label: "Arrived", value: arrivedCount, color: "text-white" },
          { label: "Called", value: calledCount, color: "text-[#32d74b]" },
          { label: "On Hold", value: tokens.filter((t) => t.status === "OnHold").length, color: "text-[#bf5af2]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="apple-card p-8">
            <p className={`text-6xl font-bold tracking-tighter ${color}`}>{value}</p>
            <p className="text-[#86868b] text-lg font-semibold mt-3">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-3 apple-card">
        <div className="flex rounded-[1rem] overflow-hidden p-1 bg-black/50 border border-white/5">
          {(["active", "all"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-8 py-3 text-base font-semibold capitalize rounded-xl transition-all ${filter === f ? "bg-[#2c2c2e] text-white shadow-sm" : "text-[#86868b] hover:text-white"}`}>
              {f === "active" ? "Active Only" : "All Tokens"}
            </button>
          ))}
        </div>
        <div className="pr-4">
          <select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}
            className="bg-transparent border-none text-white font-semibold text-lg focus:outline-none cursor-pointer">
            <option value="all" className="bg-black">All Doctors</option>
            {doctorOptions.map((id) => <option key={id} value={id} className="bg-black">{doctorNames[id]}</option>)}
          </select>
        </div>
      </div>

      {/* Token list */}
      <div className="apple-card overflow-hidden">
        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {displayed.map((token) => {
              const sc = STATUS_STYLES[token.status];
              return (
                <motion.div
                  key={token.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-8 py-6 flex items-center gap-8 hover:bg-white/5 transition-colors"
                >
                  {/* Token # */}
                  <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-bold tracking-tight flex-shrink-0 ${sc.bg} ${sc.border} border ${sc.color}`}>
                    {token.tokenNumber}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-4">
                      <p className="text-white text-2xl font-bold tracking-tight">{token.patientName}</p>
                      <span className={`text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border} font-bold`}>
                        {token.status}
                      </span>
                      {token.source === "WalkIn" && <span className="text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 font-bold">Walk-in</span>}
                    </div>
                    <p className="text-[#86868b] text-base font-medium flex items-center gap-4">
                      <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {token.patientPhone}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38383a]" />
                      <span>{token.doctorName}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38383a]" />
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(token.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {token.status === "Waiting" && (
                      <button onClick={() => updateStatus(token.id, "Arrived")} title="Mark Arrived"
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border border-white/20 text-white hover:bg-white/10 transition-colors">
                        <CheckCircle2 className="w-5 h-5" /> Arrive
                      </button>
                    )}
                    {token.status === "Arrived" && (
                      <button onClick={() => updateStatus(token.id, "Called")} title="Call Patient"
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border border-[#bf5af2]/40 text-[#bf5af2] hover:bg-[#bf5af2]/10 transition-colors">
                        <Bell className="w-5 h-5" /> Call
                      </button>
                    )}
                    {token.status === "Called" && (
                      <button onClick={() => updateStatus(token.id, "Completed")} title="Complete"
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border border-[#32d74b]/40 text-[#32d74b] hover:bg-[#32d74b]/10 transition-colors">
                        <Play className="w-5 h-5" /> Finish
                      </button>
                    )}
                    {["Waiting", "Arrived", "Called"].includes(token.status) && (
                      <button onClick={() => updateStatus(token.id, "OnHold")} title="Hold"
                        className="p-3.5 rounded-full text-[#86868b] hover:text-white hover:bg-white/10 transition-colors">
                        <PauseCircle className="w-6 h-6" />
                      </button>
                    )}
                    {token.status === "OnHold" && (
                      <button onClick={() => updateStatus(token.id, "Waiting")} title="Resume"
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border border-[#bf5af2]/40 text-[#bf5af2] hover:bg-[#bf5af2]/10 transition-colors">
                        <RotateCcw className="w-5 h-5" /> Resume
                      </button>
                    )}
                    {["Waiting", "Arrived"].includes(token.status) && (
                      <button onClick={() => updateStatus(token.id, "Skipped")} title="Skip"
                        className="p-3.5 rounded-full text-[#86868b] hover:text-[#ff9f0a] hover:bg-[#ff9f0a]/10 transition-colors">
                        <SkipForward className="w-6 h-6" />
                      </button>
                    )}
                    {token.status === "Skipped" && (
                      <button onClick={() => updateStatus(token.id, "Called")} title="Recall"
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border border-white/20 text-white hover:bg-white/10 transition-colors">
                        <RotateCcw className="w-5 h-5" /> Recall
                      </button>
                    )}
                    {!["Completed", "Abandoned"].includes(token.status) && (
                      <button onClick={() => updateStatus(token.id, "Abandoned")} title="Abandon (LWBS)"
                        className="p-3.5 rounded-full text-[#86868b] hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors">
                        <XCircle className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {displayed.length === 0 && (
            <div className="py-24 text-center">
              <Users className="w-20 h-20 text-[#86868b] mx-auto mb-6 opacity-30" />
              <p className="text-2xl font-bold text-white mb-2">No patients matching filter.</p>
              <p className="text-[#86868b] text-lg font-medium mt-1">Try changing your filter settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
