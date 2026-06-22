import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { UserCircle, Activity, Heart, ShieldAlert, Phone, MapPin } from "lucide-react";
import { motion } from "motion/react";

function ageFromDob(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function PatientProfile() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [meds, setMeds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    api(`/patients/${user.id}`).then(setPatient).catch(() => setPatient(null));
    api<any[]>(`/patients/${user.id}/allergies`).then((a) => setAllergies((a ?? []).map((x) => x.allergen))).catch(() => {});
    api<any[]>(`/patients/${user.id}/medications`).then((m) => setMeds((m ?? []).map((x) => x.drugName))).catch(() => {});
  }, [user?.id]);

  const name = patient?.fullName ?? user?.name ?? "Patient";
  const age = ageFromDob(patient?.dateOfBirth);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-16 text-foreground font-sans min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="apple-hero-text text-4xl tracking-tight text-white">Summary.</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="apple-card p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="w-32 h-32 rounded-[2rem] bg-black/50 border border-white/10 flex items-center justify-center relative z-10 shadow-xl backdrop-blur-xl">
            <span className="text-5xl font-bold text-white">{user?.avatarInitials}</span>
          </div>
          <div className="text-center md:text-left relative z-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">{name}</h2>
            <p className="text-xl text-[#86868b] font-medium mb-4">Patient ID: {(patient?.id ?? user?.id ?? "").toUpperCase()}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {patient?.gender && (
                <span className="px-4 py-1.5 rounded-full bg-[#32d74b]/10 text-[#32d74b] border border-[#32d74b]/20 font-bold text-sm tracking-wide">
                  {patient.gender}
                </span>
              )}
              {age != null && (
                <span className="px-4 py-1.5 rounded-full bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 font-bold text-sm tracking-wide">
                  {age} Years Old
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Heart className="w-5 h-5 text-[#ff453a] fill-current" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Medical ID</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex justify-between items-center px-6 py-4 hover:bg-white/5 transition-colors">
              <span className="text-white font-medium text-[17px]">Blood Group</span>
              <span className="text-[#ff453a] font-bold text-[17px]">{patient?.bloodGroup ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center px-6 py-4 hover:bg-white/5 transition-colors">
              <span className="text-white font-medium text-[17px]">Date of Birth</span>
              <span className="text-[#86868b] font-semibold text-[17px]">
                {patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-IN") : "—"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <ShieldAlert className="w-5 h-5 text-[#bf5af2]" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Conditions & Meds</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="px-6 py-4 hover:bg-white/5 transition-colors">
              <span className="block text-[#86868b] font-medium text-[15px] mb-1">Allergies</span>
              <span className="text-white font-medium text-[17px]">{allergies.length ? allergies.join(", ") : "None reported"}</span>
            </div>
            <div className="px-6 py-4 hover:bg-white/5 transition-colors">
              <span className="block text-[#86868b] font-medium text-[15px] mb-1">Active Medications</span>
              <span className="text-white font-medium text-[17px]">{meds.length ? meds.join(", ") : "None reported"}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <UserCircle className="w-5 h-5 text-[#2997ff]" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Contact Info</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
              <Phone className="w-5 h-5 text-[#86868b]" />
              <span className="text-white font-medium text-[17px]">{patient?.phone ?? user?.phone ?? "—"}</span>
            </div>
            {patient?.address && (
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                <MapPin className="w-5 h-5 text-[#86868b]" />
                <span className="text-white font-medium text-[17px]">{patient.address}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
