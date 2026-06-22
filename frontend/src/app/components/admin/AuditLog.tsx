import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Shield, Search, Filter, Activity, User, FileText, CreditCard, Clock } from "lucide-react";

const ACTION_STYLES: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  TOKEN_CALLED: { color: "#00e5a0", bg: "rgba(0,229,160,0.08)", icon: <Activity className="w-3.5 h-3.5" /> },
  TOKEN_HOLD: { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", icon: <Clock className="w-3.5 h-3.5" /> },
  VISIT_STARTED: { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", icon: <FileText className="w-3.5 h-3.5" /> },
  PRESCRIPTION_FINALIZED: { color: "#00e5a0", bg: "rgba(0,229,160,0.08)", icon: <FileText className="w-3.5 h-3.5" /> },
  INVOICE_PAID: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", icon: <CreditCard className="w-3.5 h-3.5" /> },
  WALKIN_REGISTERED: { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", icon: <User className="w-3.5 h-3.5" /> },
  APPOINTMENT_CANCELLED: { color: "#ff4d6d", bg: "rgba(255,77,109,0.08)", icon: <Activity className="w-3.5 h-3.5" /> },
  DOCTOR_CREATED: { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", icon: <User className="w-3.5 h-3.5" /> },
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/audit-logs")
      .then((rows) =>
        setAuditLogs(
          (rows ?? []).map((l) => ({
            id: l.id,
            action: l.action,
            description:
              l.metadata && Object.keys(l.metadata).length ? JSON.stringify(l.metadata) : `${(l.action || "").replace(/_/g, " ")} · ${l.entityType ?? ""}`,
            performedByName: l.userFullName ?? l.userRole ?? "System",
            createdAt: l.createdAt,
            entityType: l.entityType ?? "",
            entityId: l.entityId ?? "",
          }))
        )
      )
      .catch(() => setAuditLogs([]));
  }, []);

  const filtered = auditLogs.filter((log) => {
    const matchSearch = log.description.toLowerCase().includes(search.toLowerCase()) || log.performedByName.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const uniqueActions = [...new Set(auditLogs.map((l) => l.action))];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(167,139,250,0.1)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#a78bfa]" />
        </div>
        <div>
          <h1 className="text-[#daeeff]">Audit Log</h1>
          <p className="text-[#4a7a94] text-sm">Complete action history for compliance</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7a94]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions..."
            className="w-full bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl pl-10 pr-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl px-4 py-2.5 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]">
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] overflow-hidden">
        <div className="divide-y divide-[rgba(0,212,255,0.05)]">
          {filtered.map((log) => {
            const style = ACTION_STYLES[log.action] ?? { color: "#7ec8e3", bg: "rgba(0,212,255,0.06)", icon: <Activity className="w-3.5 h-3.5" /> };
            return (
              <div key={log.id} className="px-5 py-4 flex items-start gap-4 hover:bg-[rgba(0,212,255,0.02)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: style.bg, color: style.color }}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: style.bg, color: style.color }}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[#daeeff] text-sm">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#4a7a94]">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.performedByName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <span className="text-[#4a7a94] text-xs font-mono flex-shrink-0">{log.entityType}/{log.entityId.slice(-6)}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[#4a7a94]">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No audit events found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
