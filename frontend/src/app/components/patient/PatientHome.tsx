import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { Calendar, FileText, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>({ bloodGroup: "—", allergies: [], activeMedications: [] });
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [myTokens, setMyTokens] = useState<any[]>([]);
  const [myPrescriptions, setMyPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const id = user.id;
    Promise.allSettled([
      api(`/patients/${id}`),
      api<any[]>(`/patients/${id}/allergies`),
      api<any[]>(`/patients/${id}/medications`),
    ]).then(([p, a, m]) =>
      setPatient({
        ...(p.status === "fulfilled" ? p.value : {}),
        bloodGroup: (p.status === "fulfilled" && (p.value as any)?.bloodGroup) || "—",
        allergies: a.status === "fulfilled" ? a.value ?? [] : [],
        activeMedications: m.status === "fulfilled" ? m.value ?? [] : [],
      })
    );
    api<any[]>("/appointments")
      .then((rows) =>
        setMyAppointments(
          (rows ?? [])
            .filter((x) => x.status === "Scheduled" || x.status === "Arrived")
            .map((x) => ({ ...x, doctorName: x.doctorName ? `Dr. ${x.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor" }))
        )
      )
      .catch(() => {});
    api<any>("/tokens/my-today").then((t) => setMyTokens(t ? [t] : [])).catch(() => setMyTokens([]));
    api<any[]>(`/patients/${id}/prescriptions`)
      .then((rows) =>
        setMyPrescriptions(
          (rows ?? []).map((p) => ({
            id: p.id,
            diagnosis: p.diagnosis ?? "Prescription",
            doctorName: p.doctorName ? `Dr. ${p.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor",
            createdAt: p.signedAt ?? p.createdAt,
          }))
        )
      )
      .catch(() => {});
  }, [user?.id]);

  const name = user?.name ?? "there";
  const upcomingAppt = myAppointments[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-12 text-foreground font-sans">
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <div className="md:text-left py-8">
          <h1 className="apple-hero-text text-[3.5rem] md:text-[5rem] mb-2 tracking-tighter">
            <span className="text-white">Welcome back,</span><br/>
            <span className="apple-text-gradient">{name}.</span>
          </h1>
        </div>
      </motion.div>

      {/* Grid Layout (Apple Widget Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Main Action Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-2 md:row-span-2 apple-card p-8 md:p-10 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
          onClick={() => navigate("/book")}
        >
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#000000] border border-white/5 flex items-center justify-center mb-6 shadow-xl">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-4xl font-semibold tracking-tight mb-3 text-white">Book an<br/>appointment.</h2>
            <p className="text-[#86868b] font-medium text-lg leading-snug">Schedule a visit with our top specialists in just a few taps.</p>
          </div>
          <div className="relative z-10 mt-12 flex justify-end">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black group-hover:scale-105 transition-transform duration-300">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        {/* Queue Status Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-2 apple-card p-8 md:p-10 flex flex-col cursor-pointer group"
          onClick={() => navigate("/patient/queue")}
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-semibold tracking-tight text-white">Live Queue</h3>
            <div className={`w-3 h-3 rounded-full ${myTokens.length > 0 ? 'bg-[#32d74b] animate-pulse shadow-[0_0_10px_#32d74b]' : 'bg-[#38383a]'}`} />
          </div>
          {myTokens.length > 0 ? (
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-sm text-[#86868b] font-medium mb-2 uppercase tracking-widest">Your Token</p>
              <div className="flex items-end justify-between">
                <p className="text-6xl font-bold tracking-tighter text-white">#{myTokens[0].tokenNumber}</p>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${myTokens[0].status === 'Called' ? 'bg-[#32d74b] text-black' : 'bg-[#ff9f0a]/20 text-[#ff9f0a]'}`}>
                  {myTokens[0].status}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-[#86868b] font-medium text-lg">No active queue today.</p>
            </div>
          )}
        </motion.div>

        {/* Next Appointment Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="apple-card p-8 flex flex-col justify-between cursor-pointer group"
          onClick={() => navigate("/patient/appointments")}
        >
          <h3 className="text-xl font-semibold tracking-tight mb-6 text-white">Upcoming</h3>
          {upcomingAppt ? (
            <div>
              <p className="font-semibold text-xl leading-tight tracking-tight mb-2 text-white">{upcomingAppt.doctorName}</p>
              <p className="text-base text-[#86868b] font-medium">{new Date(upcomingAppt.slotStart).toLocaleDateString("en-IN", { weekday: "long", day: "numeric" })}</p>
            </div>
          ) : (
            <p className="text-[#86868b] text-base font-medium">None scheduled.</p>
          )}
        </motion.div>

        {/* Profile/Health Summary Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="apple-card p-8 flex flex-col justify-between cursor-pointer group"
          onClick={() => navigate("/patient/profile")}
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-semibold tracking-tight text-white">Health ID</h3>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 rounded-full bg-[#ff453a]" />
              <span className="text-base font-semibold text-white">Blood: {patient.bloodGroup}</span>
            </div>
            <p className="text-sm text-[#86868b] font-medium">{patient.allergies.length} Allergies, {patient.activeMedications.length} Meds</p>
          </div>
        </motion.div>

      </div>

      {/* Recent Records List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12 pt-8 border-t border-white/10"
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Recent Records</h2>
          <button onClick={() => navigate("/patient/history")} className="text-primary text-base font-medium hover:underline flex items-center gap-1">
            See All <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          {myPrescriptions.slice(0, 3).map((rx) => (
            <div key={rx.id} className="apple-card p-6 flex items-center justify-between cursor-pointer hover:bg-[#2c2c2e] transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-[1rem] bg-black border border-white/5 flex items-center justify-center shadow-md">
                  <FileText className="w-6 h-6 text-[#86868b]" />
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-tight text-white mb-1">{rx.diagnosis}</p>
                  <p className="text-base text-[#86868b] font-medium">{rx.doctorName} · {new Date(rx.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-[#86868b]" />
            </div>
          ))}
          {myPrescriptions.length === 0 && (
            <div className="p-12 text-center apple-card">
              <p className="text-[#86868b] font-medium text-lg">No medical records available.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
