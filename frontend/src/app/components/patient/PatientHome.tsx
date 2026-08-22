import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion } from "motion/react";
import { Calendar, FileText, ChevronRight, Clock, Activity, HeartPulse, UserCheck } from "lucide-react";
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

  const name = user?.name?.split(" ")[0] ?? "there";
  const upcomingAppt = myAppointments[0];

  return (
    <div className="space-y-6">
      {/* ── Page Header: Simplified to single clear heading line (No duplicate avatar) ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Welcome back, {name}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Personal Health Dashboard
          </p>
        </div>
      </motion.div>

      {/* ── Pastel Stat Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Upcoming Visits", value: myAppointments.length, tint: "stat-blue", icon: Calendar },
          { label: "Active Token", value: myTokens.length > 0 ? `#${myTokens[0].tokenNumber}` : "—", tint: "stat-yellow", icon: Clock },
          { label: "Medical Records", value: myPrescriptions.length, tint: "stat-green", icon: FileText },
          { label: "Known Allergies", value: patient.allergies.length, tint: "stat-red", icon: Activity },
        ].map(({ label, value, tint, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`cms-card p-5 ${tint} border-0 rounded-2xl`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-gray-600">{label}</p>
              <Icon className="w-4 h-4 opacity-50" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main Action Grid (High Visual Confidence Utility Cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Book appointment — primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 cms-card p-6 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group rounded-2xl"
          onClick={() => navigate("/book")}
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full">
                  Instant Booking
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Book an appointment</h2>
              </div>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-xl">
              Schedule a clinic visit or consultation with top specialists. Choose your preferred slot and doctor with real-time availability.
            </p>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-800">Find available doctor slots</span>
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Live Queue Status (With reduced visual weight when empty) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="cms-card p-6 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-2xl"
          onClick={() => navigate("/patient/queue")}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Live OPD Queue</h3>
                  <p className="text-[11px] text-gray-400">Token Status</p>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${myTokens.length > 0 ? "bg-green-500 animate-pulse" : "bg-gray-200"}`} />
            </div>

            {myTokens.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Your Token</p>
                <p className="text-3xl font-black text-gray-900 leading-none">#{myTokens[0].tokenNumber}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  myTokens[0].status === "Called" ? "badge-confirmed" : "badge-pending"
                }`}>
                  {myTokens[0].status}
                </span>
              </div>
            ) : (
              /* Reduced visual weight for empty state: smaller icon, centered message */
              <div className="py-5 text-center">
                <Clock className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs text-gray-500 font-medium">No active token for today</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Tokens appear when you arrive</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 mt-4 pt-3 border-t border-gray-100">
            <span>View live tracker</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </motion.div>
      </div>

      {/* ── Upcoming Consultation + Health ID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Next Consultation Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="cms-card p-6 cursor-pointer hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between"
          onClick={() => navigate("/patient/appointments")}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Next Consultation</h3>
                  <p className="text-[11px] text-gray-400">Scheduled Doctor Visit</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            {upcomingAppt ? (
              <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl">
                <div className="avatar-chip bg-blue-100 text-blue-700 text-xs">
                  {(upcomingAppt.doctorName ?? "").replace("Dr. ", "").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 font-semibold text-xs sm:text-sm truncate">{upcomingAppt.doctorName}</p>
                  <p className="text-gray-400 text-[11px]">{new Date(upcomingAppt.slotStart).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</p>
                </div>
                <span className="badge-scheduled ml-auto text-[10px]">Scheduled</span>
              </div>
            ) : (
              /* Reduced visual weight for empty consultation */
              <div className="py-4 text-center">
                <Calendar className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500 font-medium">No upcoming appointments</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Health ID Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="cms-card p-6 cursor-pointer hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between"
          onClick={() => navigate("/patient/profile")}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <HeartPulse className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Health Profile</h3>
                  <p className="text-[11px] text-gray-400">Vitals & Clinical ID</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-gray-800">Blood Group: {patient.bloodGroup}</span>
              </div>
              <p className="text-gray-400 text-[11px]">{patient.allergies.length} Allergies · {patient.activeMedications.length} Meds</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Prescriptions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Recent Medical Records</h2>
          <button onClick={() => navigate("/patient/history")} className="text-gray-500 text-xs font-semibold flex items-center gap-1 hover:text-gray-900 cursor-pointer">
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {myPrescriptions.slice(0, 3).map((rx) => (
            <div
              key={rx.id}
              className="cms-card p-4 flex items-center gap-3.5 cursor-pointer hover:shadow-md transition-shadow rounded-2xl"
              onClick={() => navigate("/patient/history")}
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-xs sm:text-sm font-semibold truncate">{rx.diagnosis}</p>
                <p className="text-gray-400 text-[11px]">{rx.doctorName} · {new Date(rx.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
          {myPrescriptions.length === 0 && (
            /* Reduced visual weight empty state */
            <div className="cms-card p-5 text-center bg-gray-50/50 border-dashed rounded-2xl">
              <FileText className="w-5 h-5 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-500 font-medium">No medical records or prescriptions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
