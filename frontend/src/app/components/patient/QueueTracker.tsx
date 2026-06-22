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
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12 text-foreground font-sans">
      <div className="flex items-center justify-between">
        <h1 className="apple-hero-text text-[3.5rem] tracking-tighter text-white">Queue Status.</h1>
        <button onClick={load} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1c1c1e] text-white text-base font-medium hover:bg-[#2c2c2e] transition-colors border border-white/5">
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {myToken ? (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`apple-card p-12 text-center relative overflow-hidden shadow-2xl`}
          >
            {myToken.status === "Called" && <div className="absolute inset-0 bg-[#32d74b]/10 animate-pulse pointer-events-none" />}
            <div className="relative z-10">
              <p className="text-[#86868b] font-semibold tracking-widest uppercase text-sm mb-4">Your Token</p>
              <div className={`text-[12rem] font-bold tracking-tighter leading-none mb-8 ${statusInfo?.color}`}>#{myToken.tokenNumber}</div>
              <div className={`inline-flex items-center gap-3 px-8 py-3 rounded-full font-bold tracking-wide text-xl ${statusInfo?.bg} ${statusInfo?.color} border border-current/20 mb-6`}>
                {myToken.status === "Called" && <Bell className="w-6 h-6 animate-bounce" />}
                {myToken.status === "Waiting" && <Clock className="w-6 h-6" />}
                {myToken.status === "Arrived" && <CheckCircle2 className="w-6 h-6" />}
                {statusInfo?.label}
              </div>
              <p className="text-[#86868b] font-medium text-xl max-w-lg mx-auto">{statusInfo?.desc}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="apple-card p-10 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-semibold tracking-tight text-white">Wait Time</h3>
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-6xl font-bold tracking-tighter text-white mb-2">{aheadCount}</p>
                  <p className="text-[#86868b] font-medium text-lg">Ahead of you</p>
                </div>
                <div>
                  <p className="text-6xl font-bold tracking-tighter text-primary mb-2">~{aheadCount * 12}</p>
                  <p className="text-[#86868b] font-medium text-lg">Est. minutes</p>
                </div>
              </div>
            </div>

            <div className="apple-card p-10 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-semibold tracking-tight text-white">Consulting</h3>
                <Users className="w-8 h-8 text-[#86868b]" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight mb-2 text-white">{doctorName}</p>
                <p className="text-[#86868b] font-medium text-lg">Token {myToken.source}</p>
              </div>
            </div>
          </div>

          <div className="apple-card p-10">
            <h3 className="text-2xl font-semibold tracking-tight mb-8 text-white">Live Queue Order</h3>
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-none">
              {activeTokens
                .sort((a, b) => a.tokenNumber - b.tokenNumber)
                .slice(0, 15)
                .map((t) => (
                  <div
                    key={t.id}
                    className={`flex-shrink-0 w-20 h-20 rounded-[1.25rem] flex items-center justify-center text-2xl font-bold tracking-tight transition-all ${
                      t.id === myToken.id
                        ? "bg-white text-black scale-110 shadow-xl z-10"
                        : t.status === "Called"
                        ? "bg-[#32d74b]/20 text-[#32d74b]"
                        : t.status === "OnHold"
                        ? "bg-[#bf5af2]/20 text-[#bf5af2]"
                        : "bg-black text-[#86868b] border border-white/5"
                    }`}
                  >
                    {t.tokenNumber}
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-8 mt-6 text-base text-[#86868b] font-medium">
              <span className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-[#32d74b]" /> Being called</span>
              <span className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-white" /> You</span>
              <span className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-black border border-white/20" /> Waiting</span>
            </div>
          </div>

          <p className="text-center text-[#86868b] text-base font-medium pt-6">Last refreshed at {lastRefresh.toLocaleTimeString()}</p>
        </div>
      ) : (
        <div className="apple-card p-20 text-center">
          <Clock className="w-24 h-24 text-[#86868b] mx-auto mb-8 opacity-50" />
          <h2 className="text-4xl font-bold tracking-tight mb-4 text-white">{loading ? "Loading…" : "No active queue."}</h2>
          <p className="text-[#86868b] font-medium text-xl mb-12">You don't have any active tokens for today.</p>
          <a href="/book" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold hover:scale-[1.02] transition-all text-xl">
            Book an Appointment
          </a>
        </div>
      )}
    </div>
  );
}
