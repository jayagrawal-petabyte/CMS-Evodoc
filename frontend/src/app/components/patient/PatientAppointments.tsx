import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { Calendar, Clock, ChevronRight, Activity, Plus } from "lucide-react";
import { motion } from "motion/react";

export default function PatientAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myApps, setMyApps] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    api<any[]>("/appointments")
      .then((rows) =>
        setMyApps(
          (rows ?? []).map((a) => ({
            ...a,
            doctorName: a.doctorName ? `Dr. ${a.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor",
          }))
        )
      )
      .catch(() => setMyApps([]));
  }, [user?.id]);

  const upcoming = myApps.filter((a) => a.status === "Scheduled" || a.status === "Arrived");
  const past = myApps.filter((a) => a.status !== "Scheduled" && a.status !== "Arrived");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 text-foreground font-sans min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="apple-hero-text text-4xl tracking-tight text-white">Visits.</h1>
        <button 
          onClick={() => navigate("/book")}
          className="bg-white text-black p-2 md:px-4 md:py-2 rounded-full font-semibold text-[15px] flex items-center gap-2 hover:scale-[1.02] transition-transform"
        >
          <Plus className="w-5 h-5" /> <span className="hidden md:inline">Book New</span>
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
        {upcoming.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3 px-2">
              <Calendar className="w-5 h-5 text-[#2997ff]" />
              <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Upcoming</h2>
            </div>
            <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
              {upcoming.map((appt) => (
                <div key={appt.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="flex gap-5 items-start">
                    <div className="w-14 h-14 rounded-2xl bg-[#2997ff]/20 text-[#2997ff] flex flex-col items-center justify-center border border-[#2997ff]/30 shadow-lg">
                      <span className="text-[10px] font-bold uppercase">{new Date(appt.slotStart).toLocaleDateString("en-IN", { month: "short" })}</span>
                      <span className="text-xl font-bold leading-none">{new Date(appt.slotStart).toLocaleDateString("en-IN", { day: "numeric" })}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white mb-1">{appt.doctorName}</h3>
                      <p className="text-[#86868b] text-[15px] font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {new Date(appt.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-[#86868b] hidden md:block group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="apple-card p-12 text-center">
            <Calendar className="w-16 h-16 text-[#86868b] mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">No upcoming visits</h2>
            <p className="text-[#86868b] font-medium text-lg">You have no scheduled appointments.</p>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-2">
              <Activity className="w-5 h-5 text-[#86868b]" />
              <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Past Visits</h2>
            </div>
            <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
              {past.map((appt) => (
                <div key={appt.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-5 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-[#86868b]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-bold tracking-tight text-white">{appt.doctorName}</h3>
                      <p className="text-[#86868b] text-sm font-medium">
                        {new Date(appt.slotStart).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                    appt.status === "Completed" ? "bg-black text-[#86868b] border border-white/10" : "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20"
                  }`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
