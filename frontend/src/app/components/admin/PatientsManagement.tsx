import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Search, User, Phone, AlertCircle, Pill, ChevronRight } from "lucide-react";
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{filtered.length} registered patients</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, blood group..."
          className="w-full cms-input rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        {/* List */}
        <div className="cms-card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${selected === p.id ? "bg-blue-50" : ""}`}>
                <div className="avatar-chip text-xs" style={{ backgroundColor: "#eef4ff", color: "#2563eb" }}>
                  {p.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-semibold">{p.name}</p>
                  <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3" /> {p.phone} · {p.gender}{p.age ? `, ${p.age}y` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="stat-red px-2 py-0.5 rounded-full text-[11px] font-bold">{p.bloodGroup}</span>
                  {p.allergies.length > 0 && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No patients found</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedPatient && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              className="cms-card h-fit overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="avatar-chip text-sm" style={{ backgroundColor: "#eef4ff", color: "#2563eb" }}>
                    {selectedPatient.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-gray-800 font-bold text-sm">{selectedPatient.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-400 text-xs">{selectedPatient.age}y · {selectedPatient.gender}</span>
                      <span className="stat-red px-1.5 py-0.5 rounded text-[10px] font-bold">{selectedPatient.bloodGroup}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {[
                  { icon: Phone, label: selectedPatient.phone },
                  { icon: User,  label: selectedPatient.email },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-gray-600">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs">{label}</span>
                  </div>
                ))}

                {selectedPatient.allergies.length > 0 && (
                  <div className="rounded-xl p-3 bg-red-50 border border-red-100">
                    <p className="text-red-600 text-xs font-bold mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Allergies</p>
                    {selectedPatient.allergies.map((a: any) => (
                      <p key={a.id} className="text-red-700 text-xs">{a.allergen} → {a.reaction}</p>
                    ))}
                  </div>
                )}

                {selectedPatient.activeMedications.length > 0 && (
                  <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
                    <p className="text-purple-600 text-xs font-bold mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3" /> Medications</p>
                    {selectedPatient.activeMedications.map((m: any) => (
                      <p key={m.id} className="text-purple-700 text-xs">{m.name} · {m.dosage}</p>
                    ))}
                  </div>
                )}

                <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                  <p className="text-gray-400 text-xs">{selectedPatient.medicalHistory || "No medical history recorded"}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
