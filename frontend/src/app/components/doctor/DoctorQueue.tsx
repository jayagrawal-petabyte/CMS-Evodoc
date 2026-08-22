import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { api, apiPost } from "../lib/api";
import { toast } from "sonner";
import { Play, Users, CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronRight, Phone } from "lucide-react";

type Token = any;

// Semantic colours — meaning-based, not portal-based
const STATUS_CONFIG: Record<string, { badgeClass: string; label: string }> = {
  Waiting:   { badgeClass: "badge-pending",    label: "Waiting" },
  Arrived:   { badgeClass: "badge-inprogress", label: "Arrived" },
  Called:    { badgeClass: "badge-confirmed",   label: "In Consultation" },
  OnHold:    { badgeClass: "badge-pending",     label: "On Hold" },
  Skipped:   { badgeClass: "badge-cancelled",   label: "Skipped" },
  Completed: { badgeClass: "badge-confirmed",   label: "Done" },
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
    { label: "Total Today", value: myTokens.length,                                                                 tint: "stat-blue",   icon: Users },
    { label: "Waiting",     value: myTokens.filter((t) => ["Waiting", "Arrived"].includes(t.status)).length,        tint: "stat-yellow", icon: Clock },
    { label: "Completed",   value: completedTokens.length,                                                           tint: "stat-green",  icon: CheckCircle2 },
    { label: "Skipped",     value: myTokens.filter((t) => t.status === "Skipped").length,                           tint: "stat-red",    icon: AlertCircle },
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
    <div className="space-y-6">
      {/* Page header: Single clear heading line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">OPD Patient Queue</h1>
          <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Real-time Consultation Sequence</p>
        </div>
        <button onClick={load} className="cms-btn-secondary self-start md:self-auto cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, tint, icon: Icon }) => (
          <div key={label} className={`cms-card p-5 ${tint} border-0 rounded-2xl`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-gray-600">{label}</p>
              <Icon className="w-4 h-4 opacity-50" />
            </div>
            <p className="text-3xl font-bold leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Active patient highlight */}
      {currentToken && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="cms-card p-6 border-l-4 border-green-500 bg-green-50/70 rounded-2xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="avatar-chip bg-green-100 text-green-700 text-lg font-black w-14 h-14">
                #{currentToken.tokenNumber}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-confirmed">Active Patient</span>
                </div>
                <p className="text-gray-900 font-bold text-xl">{currentToken.patientName}</p>
                <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" /> {currentToken.patientPhone}
                  <span className="mx-1">·</span> {currentToken.source}
                </p>
              </div>
            </div>
            <button
              onClick={() => startVisit(currentToken)}
              className="cms-btn-primary text-sm px-6 py-3 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> Open Clinical Worksheet
            </button>
          </div>
        </motion.div>
      )}

      {/* Queue table */}
      <div className="cms-card overflow-hidden rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <h2 className="text-sm font-bold text-gray-900">Daily Token Sequence</h2>
          <span className="text-gray-500 text-xs font-semibold bg-white px-3 py-1 rounded-full border border-gray-200">
            {activeTokens.length} Active · {completedTokens.length} Done
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {myTokens.sort((a, b) => a.tokenNumber - b.tokenNumber).map((token) => {
            const sc = STATUS_CONFIG[token.status] ?? STATUS_CONFIG.Waiting;
            return (
              <motion.div
                key={token.id}
                layout
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="avatar-chip bg-gray-100 text-gray-700 font-black text-base w-11 h-11">
                    {token.tokenNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <p className="text-gray-800 font-semibold text-sm truncate">{token.patientName}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${sc.badgeClass}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {token.patientPhone}
                      <span className="mx-0.5">·</span> {token.source}
                      <span className="mx-0.5">·</span> {new Date(token.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {["Called", "Arrived", "Waiting"].includes(token.status) && (
                    <button
                      onClick={() => startVisit(token)}
                      className="cms-btn-primary text-xs px-4 py-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> {token.visitId ? "Resume" : "Consult"}
                    </button>
                  )}
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {myTokens.length === 0 && (
            /* Reduced visual weight for empty queue state: compact, subtle icon, centered message */
            <div className="py-8 text-center bg-gray-50/30">
              <Users className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
              <p className="text-gray-700 text-xs font-bold mb-0.5">Queue is empty</p>
              <p className="text-gray-400 text-[11px]">No patients assigned for today yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
