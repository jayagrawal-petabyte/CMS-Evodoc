import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { UserCircle, ShieldCheck, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "motion/react";

export default function DoctorProfile() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>({
    name: user?.name ?? "",
    specialization: user?.specialization ?? "",
    id: user?.doctorId ?? "",
    imageUrl: null,
    roomNumber: "OPD Suite 3",
    consultationFee: "500",
    rating: "4.9",
    reviews: "128",
    availability: { start: "09:00", end: "17:00" },
  });

  useEffect(() => {
    if (!user?.doctorId) return;
    api(`/doctors/${user.doctorId}`)
      .then((d: any) => {
        const sched = (d.schedules ?? []).find((s: any) => s.isActive) ?? (d.schedules ?? [])[0];
        setDoctor({
          name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
          specialization: d.specializationName ?? "",
          id: d.id,
          imageUrl: d.avatarUrl ?? null,
          roomNumber: d.roomNumber ?? "OPD Suite 3",
          consultationFee: d.consultationFee ?? "500",
          rating: "4.9",
          reviews: "128",
          availability: sched ? { start: sched.startTime, end: sched.endTime } : { start: "09:00", end: "17:00" },
        });
      })
      .catch(() => {});
  }, [user?.doctorId]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#32d74b]">Clinical Identity</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Provider Profile</h1>
        <p className="text-[#8e8e93] text-xs font-medium mt-0.5">Credentials, clinic assignment, and active consultation rates.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="apple-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#32d74b] to-[#10b981] flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(50,215,75,0.35)] overflow-hidden">
            {doctor.imageUrl ? (
              <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-black">{user?.avatarInitials ?? "DR"}</span>
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">{doctor.name}</h2>
            <p className="text-xs font-semibold text-[#32d74b] mt-0.5">{doctor.specialization}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-[#32d74b]/10 text-[#32d74b] border border-[#32d74b]/20 font-bold text-xs">
                Verified Specialist
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-[#8e8e93] border border-white/10 font-bold text-xs">
                ID: {doctor.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <UserCircle className="w-4 h-4 text-[#32d74b]" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Clinic Location & Duty</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Mail className="w-4 h-4 text-[#8e8e93]" />
              <span className="text-white font-medium text-sm">doctor@medicare.com</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Phone className="w-4 h-4 text-[#8e8e93]" />
              <span className="text-white font-medium text-sm">{user?.phone ?? "+91 9000000001"}</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <MapPin className="w-4 h-4 text-[#8e8e93]" />
              <span className="text-white font-medium text-sm">{doctor.roomNumber}, Clinical Wing</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <ShieldCheck className="w-4 h-4 text-[#32d74b]" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Practice Details</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex justify-between items-center px-5 py-3.5">
              <span className="text-[#8e8e93] font-medium text-sm">Consultation Fee</span>
              <span className="text-white font-bold text-sm">₹{doctor.consultationFee}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3.5">
              <span className="text-[#8e8e93] font-medium text-sm">Standard Operating Hours</span>
              <span className="text-white font-semibold text-sm">{doctor.availability.start} - {doctor.availability.end}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3.5">
              <span className="text-[#8e8e93] font-medium text-sm">Patient Rating</span>
              <span className="text-[#ff9f0a] font-bold text-sm">{doctor.rating} ★ ({doctor.reviews} verified reviews)</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
