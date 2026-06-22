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
    roomNumber: "—",
    consultationFee: "—",
    rating: "—",
    reviews: "—",
    availability: { start: "—", end: "—" },
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
          roomNumber: "—",
          consultationFee: d.consultationFee ?? "—",
          rating: "—",
          reviews: "—",
          availability: sched ? { start: sched.startTime, end: sched.endTime } : { start: "—", end: "—" },
        });
      })
      .catch(() => {});
  }, [user?.doctorId]);

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="apple-hero-text text-5xl tracking-tight text-white">Profile.</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="apple-card p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#1c1c1e] to-transparent pointer-events-none" />
          <div className="w-32 h-32 rounded-[2rem] bg-[#2c2c2e] border border-white/10 flex items-center justify-center relative z-10 shadow-xl overflow-hidden">
            {doctor.imageUrl ? (
              <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold text-white">{user?.avatarInitials}</span>
            )}
          </div>
          <div className="text-center md:text-left relative z-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">{doctor.name}</h2>
            <p className="text-xl text-[#32d74b] font-medium mb-4">{doctor.specialization}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 font-bold text-sm tracking-wide">
                License: {doctor.id.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <UserCircle className="w-5 h-5 text-[#86868b]" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Contact Info</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex items-center gap-4 px-6 py-4">
              <Mail className="w-5 h-5 text-[#86868b]" />
              <span className="text-white font-medium text-[17px]">doctor@medicare.com</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-4">
              <Phone className="w-5 h-5 text-[#86868b]" />
              <span className="text-white font-medium text-[17px]">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-4">
              <MapPin className="w-5 h-5 text-[#86868b]" />
              <span className="text-white font-medium text-[17px]">Room {doctor.roomNumber}, Main Wing</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <ShieldCheck className="w-5 h-5 text-[#32d74b]" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Professional Details</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex justify-between items-center px-6 py-4">
              <span className="text-[#86868b] font-medium text-[17px]">Consultation Fee</span>
              <span className="text-white font-semibold text-[17px]">${doctor.consultationFee}</span>
            </div>
            <div className="flex justify-between items-center px-6 py-4">
              <span className="text-[#86868b] font-medium text-[17px]">Availability</span>
              <span className="text-white font-semibold text-[17px]">{doctor.availability.start} - {doctor.availability.end}</span>
            </div>
            <div className="flex justify-between items-center px-6 py-4">
              <span className="text-[#86868b] font-medium text-[17px]">Rating</span>
              <span className="text-white font-semibold text-[17px]">{doctor.rating} / 5.0 ({doctor.reviews} reviews)</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
