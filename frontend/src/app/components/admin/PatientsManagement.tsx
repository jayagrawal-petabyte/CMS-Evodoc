import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Search, User, Phone, Droplet, AlertCircle, Pill, ChevronRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  return isNaN(d.getTime()) ? "" : String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export default function PatientsManagement() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [detail, setDetail] = useState<{ allergies: any[]; activeMedications: any[] }>({ allergies: [], activeMedications: [] });

  useEffect(() => {
    api<any[]>("/patients")
      .then((rows) =>
        setPatients(
          (rows ?? []).map((p) => ({
            id: p.id,
            name: p.fullName ?? "Patient",
            phone: p.phone ?? "",
            gender: p.gender ?? "—",
            age: ageFromDob(p.dateOfBirth),
            bloodGroup: p.bloodGroup ?? "—",
            email: "—",
            medicalHistory: "",
            allergies: [] as any[],
            activeMedications: [] as any[],
          }))
        )
      )
      .catch(() => setPatients([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail({ allergies: [], activeMedications: [] });
      return;
    }
    Promise.allSettled([api<any[]>(`/patients/${selected}/allergies`), api<any[]>(`/patients/${selected}/medications`)]).then(([a, m]) =>
      setDetail({
        allergies: a.status === "fulfilled" ? (a.value ?? []).map((x: any) => ({ id: x.id, allergen: x.allergen, reaction: x.reaction ?? "" })) : [],
        activeMedications: m.status === "fulfilled" ? (m.value ?? []).map((x: any) => ({ id: x.id, name: x.drugName, dosage: x.dose ?? "" })) : [],
      })
    );
  }, [selected]);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.bloodGroup.toLowerCase().includes(search.toLowerCase())
  );

  const base = patients.find((p) => p.id === selected);
  const selectedPatient = base ? { ...base, ...detail } : undefined;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#daeeff]">Patients</h1>
          <p className="text-[#4a7a94] text-sm">{filtered.length} registered patients</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7a94]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, blood group..."
          className="w-full bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl pl-10 pr-4 py-3 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]" />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* List */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] overflow-hidden">
          <div className="divide-y divide-[rgba(0,212,255,0.05)]">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[rgba(0,212,255,0.03)] transition-colors ${selected === p.id ? "bg-[rgba(0,212,255,0.04)]" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.12)] flex items-center justify-center text-[#00d4ff] font-semibold text-sm flex-shrink-0">
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#daeeff] text-sm">{p.name}</p>
                  <p className="text-[#4a7a94] text-xs flex items-center gap-2 mt-0.5">
                    <Phone className="w-3 h-3" /> {p.phone}
                    <span>·</span> {p.gender}, {p.age}y
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,77,109,0.1)] text-[#ff4d6d]">{p.bloodGroup}</span>
                  {p.allergies.length > 0 && <AlertCircle className="w-3.5 h-3.5 text-[#fbbf24]" />}
                  <ChevronRight className="w-4 h-4 text-[#4a7a94]" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-[#4a7a94]">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No patients found
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedPatient && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="rounded-xl border border-[rgba(0,212,255,0.12)] bg-[#071428] h-fit space-y-0 overflow-hidden">
              <div className="p-5 border-b border-[rgba(0,212,255,0.07)] bg-[rgba(0,212,255,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center text-[#00d4ff] font-bold">
                    {selectedPatient.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-[#daeeff] font-medium">{selectedPatient.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[#4a7a94] text-xs">{selectedPatient.age}y · {selectedPatient.gender}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-[rgba(255,77,109,0.1)] text-[#ff4d6d]">{selectedPatient.bloodGroup}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 text-sm">
                {[
                  { icon: Phone, label: selectedPatient.phone },
                  { icon: User, label: selectedPatient.email },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[#7ec8e3]">
                    <Icon className="w-4 h-4 text-[#4a7a94]" />
                    <span className="text-xs">{label}</span>
                  </div>
                ))}

                {selectedPatient.allergies.length > 0 && (
                  <div className="rounded-lg p-3 bg-[rgba(255,77,109,0.05)] border border-[rgba(255,77,109,0.15)]">
                    <p className="text-[#ff4d6d] text-xs font-semibold mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Allergies</p>
                    {selectedPatient.allergies.map((a) => (
                      <p key={a.id} className="text-[#7ec8e3] text-xs">{a.allergen} → {a.reaction}</p>
                    ))}
                  </div>
                )}

                {selectedPatient.activeMedications.length > 0 && (
                  <div className="rounded-lg p-3 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.12)]">
                    <p className="text-[#a78bfa] text-xs font-semibold mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3" /> Medications</p>
                    {selectedPatient.activeMedications.map((m) => (
                      <p key={m.id} className="text-[#7ec8e3] text-xs">{m.name} · {m.dosage}</p>
                    ))}
                  </div>
                )}

                <div className="rounded-lg p-3 bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.1)]">
                  <p className="text-[#4a7a94] text-xs">{selectedPatient.medicalHistory || "No medical history"}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
