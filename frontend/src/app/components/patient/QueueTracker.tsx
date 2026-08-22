import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { Clock, Users, CheckCircle2, Bell, RefreshCw } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  Waiting: { label: "In Queue", color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10", desc: "You're in the queue. We'll notify you when it's your turn." },
  Arrived: { label: "Arrived", color: "text-white", bg: "bg-white/10", desc: "Your presence is confirmed at the clinic." },
  Called: { label: "Please Go In", color: "text-[#32d74b]", bg: "bg-[#32d74b]/10", desc: "The doctor is ready for you! Please proceed to the consultation room." },
  OnHold: { label: "On Hold", color: "text-[#bf5af2]", bg: "bg-[#bf5af2]/10", desc: "Your token is on hold. Please check in at reception." },
  Skipped: { label: "Skipped", color: "text-[#ff453a]", bg: "bg-[#ff453a]/10", desc: "Your token was skipped. Please visit reception." },
  Completed: { label: "Completed", color: "text-[#32d74b]", bg: "bg-[#32d74b]/10", desc: "Your consultation is complete." },
};

export default function QueueTracker() {
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [myToken, setMyToken] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState<string>("Your doctor");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await api<any>("/tokens/my-today");
      setMyToken(token);
      // Find the doctor for this token via the patient's appointments.
      try {
        const appts = await api<any[]>("/appointments");
        const appt = (appts ?? []).find((a) => a.id === token.appointmentId);
        if (appt?.doctorName) setDoctorName(`Dr. ${appt.doctorName}`.replace(/^Dr\. Dr\./, "Dr."));
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      if (e?.status === 404) setMyToken(null);
    }
    try {
      setQueue(await api<any[]>("/tokens/queue"));
    } catch {
      /* ignore */
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // poll for the "live" feel
    return () => clearInterval(t);
  }, [load]);

  const activeTokens = queue.filter((t) => ["Waiting", "Arrived", "Called", "OnHold"].includes(t.status));
  const aheadCount = myToken?.tokensAhead ?? 0;
  const statusInfo = myToken ? STATUS_LABELS[myToken.status] ?? STATUS_LABELS.Waiting : null;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 text-foreground font-sans">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#2997ff]">Live Clinic Tracking</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Queue Status</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-2xl apple-glass text-white text-xs font-bold hover:bg-white/10 transition-colors border border-white/10 shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {myToken ? (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="apple-card p-8 md:p-12 text-center relative overflow-hidden shadow-2xl border border-white/10"
          >
            {myToken.status === "Called" && <div className="absolute inset-0 bg-[#32d74b]/15 animate-pulse pointer-events-none" />}
            <div className="relative z-10">
              <p className="text-[#8e8e93] font-bold tracking-widest uppercase text-xs mb-3">Your Live Token</p>
              <div className={`text-7xl md:text-9xl font-black tracking-tighter leading-none mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${statusInfo?.color}`}>
                #{myToken.tokenNumber}
              </div>
              <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold tracking-wide text-sm ${statusInfo?.bg} ${statusInfo?.color} border border-current/30 mb-4 shadow-lg`}>
                {myToken.status === "Called" && <Bell className="w-4 h-4 animate-bounce" />}
                {myToken.status === "Waiting" && <Clock className="w-4 h-4" />}
                {myToken.status === "Arrived" && <CheckCircle2 className="w-4 h-4" />}
                {statusInfo?.label}
              </div>
              <p className="text-[#8e8e93] font-medium text-sm max-w-md mx-auto">{statusInfo?.desc}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="apple-card p-6 md:p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8e8e93]">Estimated Wait</p>
                  <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">Turn Forecast</h3>
                </div>
                <Clock className="w-6 h-6 text-[#2997ff]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-1">{aheadCount}</p>
                  <p className="text-[#8e8e93] font-semibold text-xs uppercase tracking-wider">Patients Ahead</p>
                </div>
                <div>
                  <p className="text-4xl md:text-5xl font-black tracking-tighter text-[#2997ff] mb-1">~{aheadCount * 10}m</p>
                  <p className="text-[#8e8e93] font-semibold text-xs uppercase tracking-wider">Est. Wait Time</p>
                </div>
              </div>
            </div>

            <div className="apple-card p-6 md:p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8e8e93]">Assigned Specialist</p>
                  <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">Doctor Station</h3>
                </div>
                <Users className="w-6 h-6 text-[#8e8e93]" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight mb-1 text-white">{doctorName}</p>
                <p className="text-xs font-semibold text-[#2997ff]">Source: {myToken.source} · Token ID: #{myToken.id.slice(0, 8)}</p>
              </div>
            </div>
          </div>

          <div className="apple-card p-6 md:p-8">
            <h3 className="text-lg font-bold tracking-tight mb-6 text-white">Live Queue Sequence</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
              {activeTokens
                .sort((a, b) => a.tokenNumber - b.tokenNumber)
                .slice(0, 15)
                .map((t) => (
                  <div
                    key={t.id}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black tracking-tight transition-all ${
                      t.id === myToken.id
                        ? "bg-[#2997ff] text-white scale-110 shadow-[0_0_20px_rgba(41,151,255,0.4)] z-10 border border-white/20"
                        : t.status === "Called"
                        ? "bg-[#32d74b]/20 text-[#32d74b] border border-[#32d74b]/30"
                        : t.status === "OnHold"
                        ? "bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30"
                        : "apple-glass text-[#8e8e93] border border-white/10"
                    }`}
                  >
                    #{t.tokenNumber}
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs text-[#8e8e93] font-medium border-t border-white/5 pt-4">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#32d74b]" /> In Consultation</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#2997ff]" /> Your Token</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-white/20" /> Waiting</span>
            </div>
          </div>

          <p className="text-center text-[#8e8e93] text-xs font-medium">Auto-refreshing live · Last updated at {lastRefresh.toLocaleTimeString()}</p>
        </div>
      ) : (
        <div className="apple-card p-12 md:p-16 text-center">
          <Clock className="w-16 h-16 text-[#8e8e93] mx-auto mb-6 opacity-40" />
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">{loading ? "Loading Queue…" : "No Active Tokens Today"}</h2>
          <p className="text-[#8e8e93] font-medium text-sm mb-8">You do not currently have a token issued for today's OPD.</p>
          <button onClick={() => window.location.href = "/book"} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2997ff] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#0077ed] transition-all shadow-lg shadow-[#2997ff]/30">
            Book Appointment Slot
          </button>
        </div>
      )}
    </div>
  );
}
