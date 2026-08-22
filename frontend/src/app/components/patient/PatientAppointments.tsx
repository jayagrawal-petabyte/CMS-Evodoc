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
    <div className="max-w-4xl mx-auto py-8 text-foreground font-sans min-h-screen space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#2997ff]">Appointments</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Your Visits</h1>
        </div>
        <button 
          onClick={() => navigate("/book")}
          className="bg-[#2997ff] text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#0077ed] transition-all shadow-lg shadow-[#2997ff]/30"
        >
          <Plus className="w-4 h-4" /> <span>Book New</span>
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
        {upcoming.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Calendar className="w-4 h-4 text-[#2997ff]" />
              <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Upcoming Consultations</h2>
            </div>
            <div className="space-y-3">
              {upcoming.map((appt) => (
                <div key={appt.id} className="interactive-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#2997ff]/15 text-[#2997ff] flex flex-col items-center justify-center border border-[#2997ff]/30 shadow-md flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase">{new Date(appt.slotStart).toLocaleDateString("en-IN", { month: "short" })}</span>
                      <span className="text-xl font-black leading-none">{new Date(appt.slotStart).toLocaleDateString("en-IN", { day: "numeric" })}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-white mb-0.5">{appt.doctorName}</h3>
                      <p className="text-[#8e8e93] text-xs font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#2997ff]" /> {new Date(appt.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Status: <span className="text-[#32d74b] font-semibold">{appt.status}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8e8e93] hidden md:block group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="apple-card p-10 text-center">
            <Calendar className="w-12 h-12 text-[#8e8e93] mx-auto mb-3 opacity-40" />
            <h2 className="text-xl font-bold tracking-tight text-white mb-1">No upcoming visits</h2>
            <p className="text-[#8e8e93] font-medium text-xs">You have no scheduled appointments currently.</p>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Activity className="w-4 h-4 text-[#8e8e93]" />
              <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Past History</h2>
            </div>
            <div className="space-y-3">
              {past.map((appt) => (
                <div key={appt.id} className="apple-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e93] flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-white">{appt.doctorName}</h3>
                      <p className="text-[#8e8e93] text-xs font-medium">
                        {new Date(appt.slotStart).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider self-start md:self-auto ${
                    appt.status === "Completed" ? "bg-[#32d74b]/10 text-[#32d74b] border border-[#32d74b]/20" : "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20"
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
