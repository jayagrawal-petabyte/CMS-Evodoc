import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, apiPost } from "../lib/api";
import { toast } from "sonner";
import { Users, Play, PauseCircle, SkipForward, RotateCcw, XCircle, CheckCircle2, Bell, Phone, Clock, RefreshCw } from "lucide-react";

type TokenStatus = "Waiting" | "Arrived" | "Called" | "OnHold" | "Skipped" | "Completed" | "Abandoned";
type Token = any;

const ACTION: Record<string, string> = {
  Arrived: "arrive",
  Called: "recall",
  OnHold: "hold",
  Waiting: "resume",
  Skipped: "skip",
  Abandoned: "abandon",
  Completed: "complete",
};

const STATUS_BADGE: Record<string, string> = {
  Waiting:   "badge-pending",
  Arrived:   "badge-inprogress",
  Called:    "badge-confirmed",
  OnHold:    "badge-pending",
  Skipped:   "badge-cancelled",
  Completed: "badge-confirmed",
  Abandoned: "badge-cancelled",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Live Patient Queue</h1>
          <p className="page-subtitle">{activeCount} active tokens · Live queue dispatcher</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button onClick={load} className="cms-btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={callNext} className="cms-btn-primary">
            <Bell className="w-4 h-4" /> Call Next Patient
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting",         value: waitingCount,                                               tint: "stat-yellow" },
          { label: "Arrived",         value: arrivedCount,                                               tint: "stat-blue" },
          { label: "In Consultation", value: calledCount,                                                tint: "stat-green" },
          { label: "On Hold",         value: tokens.filter((t) => t.status === "OnHold").length,         tint: "stat-red" },
        ].map(({ label, value, tint }) => (
          <div key={label} className={`cms-card p-5 ${tint} border-0`}>
            <p className="text-xs font-semibold text-gray-600 mb-3">{label}</p>
            <p className="text-3xl font-bold leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="cms-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg p-1 bg-gray-100 border border-gray-200">
          {(["active", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-700"}`}
            >
              {f === "active" ? "Active Only" : "All Tokens"}
            </button>
          ))}
        </div>
        <select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}
          className="cms-input rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer">
          <option value="all">All Specialists</option>
          {doctorOptions.map((id) => <option key={id} value={id}>{doctorNames[id]}</option>)}
        </select>
      </div>

      {/* Token list */}
      <div className="cms-card overflow-hidden">
        <div className="divide-y divide-gray-50">
          <AnimatePresence>
            {displayed.map((token) => (
              <motion.div
                key={token.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="avatar-chip bg-gray-100 text-gray-700 font-black text-base w-11 h-11">
                    {token.tokenNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                      <p className="text-gray-800 text-sm font-semibold truncate">{token.patientName}</p>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${STATUS_BADGE[token.status] ?? "badge-pending"}`}>
                        {token.status}
                      </span>
                      {token.source === "WalkIn" && <span className="badge-pending text-[10px]">Walk-in</span>}
                    </div>
                    <p className="text-gray-400 text-xs flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {token.patientPhone}</span>
                      <span>·</span><span>{token.doctorName}</span>
                      <span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(token.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-end md:self-auto">
                  {token.status === "Waiting" && (
                    <button onClick={() => updateStatus(token.id, "Arrived")} className="cms-btn-secondary text-xs px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Arrive
                    </button>
                  )}
                  {token.status === "Arrived" && (
                    <button onClick={() => updateStatus(token.id, "Called")} className="cms-btn-secondary text-xs px-3 py-1.5">
                      <Bell className="w-3.5 h-3.5" /> Call
                    </button>
                  )}
                  {token.status === "Called" && (
                    <button onClick={() => updateStatus(token.id, "Completed")} className="cms-btn-secondary text-xs px-3 py-1.5">
                      <Play className="w-3.5 h-3.5 fill-current text-green-600" /> Finish
                    </button>
                  )}
                  {["Waiting", "Arrived", "Called"].includes(token.status) && (
                    <button onClick={() => updateStatus(token.id, "OnHold")} title="Hold"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <PauseCircle className="w-4 h-4" />
                    </button>
                  )}
                  {token.status === "OnHold" && (
                    <button onClick={() => updateStatus(token.id, "Waiting")} className="cms-btn-secondary text-xs px-3 py-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {["Waiting", "Arrived"].includes(token.status) && (
                    <button onClick={() => updateStatus(token.id, "Skipped")} title="Skip"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}
                  {token.status === "Skipped" && (
                    <button onClick={() => updateStatus(token.id, "Called")} className="cms-btn-secondary text-xs px-3 py-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Recall
                    </button>
                  )}
                  {!["Completed", "Abandoned"].includes(token.status) && (
                    <button onClick={() => updateStatus(token.id, "Abandoned")} title="Abandon (LWBS)"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {displayed.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-800 text-base font-bold mb-1">No tokens match filter</p>
              <p className="text-gray-400 text-sm">Try changing your doctor or status filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
