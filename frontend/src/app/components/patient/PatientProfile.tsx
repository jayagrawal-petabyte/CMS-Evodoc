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
    <div className="max-w-3xl mx-auto py-8 text-foreground font-sans min-h-screen space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#2997ff]">Profile & Summary</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Medical ID</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="apple-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2997ff] to-[#0071e3] flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(41,151,255,0.35)]">
            <span className="text-3xl font-black text-white">{user?.avatarInitials ?? "PT"}</span>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">{name}</h2>
            <p className="text-xs text-[#8e8e93] font-medium mt-0.5">Patient ID: {(patient?.id ?? user?.id ?? "").slice(0, 12).toUpperCase()}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              {patient?.gender && (
                <span className="px-3 py-1 rounded-full bg-[#32d74b]/10 text-[#32d74b] border border-[#32d74b]/20 font-bold text-xs">
                  {patient.gender}
                </span>
              )}
              {age != null && (
                <span className="px-3 py-1 rounded-full bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 font-bold text-xs">
                  {age} Years Old
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20 font-bold text-xs">
                Active Member
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Heart className="w-4 h-4 text-[#ff453a] fill-current" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Vital Clinical Details</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex justify-between items-center px-5 py-3.5">
              <span className="text-[#8e8e93] font-medium text-sm">Blood Group</span>
              <span className="text-[#ff453a] font-bold text-sm bg-[#ff453a]/10 px-3 py-0.5 rounded-full border border-[#ff453a]/20">{patient?.bloodGroup ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3.5">
              <span className="text-[#8e8e93] font-medium text-sm">Date of Birth</span>
              <span className="text-white font-semibold text-sm">
                {patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-IN") : "—"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <ShieldAlert className="w-4 h-4 text-[#bf5af2]" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Allergies & Current Medications</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="px-5 py-3.5">
              <span className="block text-[#8e8e93] font-medium text-xs mb-1 uppercase tracking-wider">Known Allergies</span>
              <span className="text-white font-medium text-sm">{allergies.length ? allergies.join(", ") : "No drug or food allergies reported"}</span>
            </div>
            <div className="px-5 py-3.5">
              <span className="block text-[#8e8e93] font-medium text-xs mb-1 uppercase tracking-wider">Active Prescriptions</span>
              <span className="text-white font-medium text-sm">{meds.length ? meds.join(", ") : "No ongoing medications recorded"}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <UserCircle className="w-4 h-4 text-[#2997ff]" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Contact & Location</h2>
          </div>
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Phone className="w-4 h-4 text-[#8e8e93]" />
              <span className="text-white font-medium text-sm">{patient?.phone ?? user?.phone ?? "—"}</span>
            </div>
            {patient?.address && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <MapPin className="w-4 h-4 text-[#8e8e93]" />
                <span className="text-white font-medium text-sm">{patient.address}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
