import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Save, Plus, Activity, AlertCircle, FileText, Pill, HeartPulse } from "lucide-react";
import { api, apiPut, apiPost } from "../lib/api";
import { toast } from "sonner";

type Vitals = { bp: string; temp: string; weight: string; hr: string; spO2: string };

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export default function EMRWorksheet() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const [token, setToken] = useState<any>({ tokenNumber: "" });
  const [patient, setPatient] = useState<any>({ name: "", age: "", gender: "", bloodGroup: "", allergies: [] });
  const [version, setVersion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const [vitals, setVitals] = useState<Vitals>({ bp: "", temp: "", weight: "", hr: "", spO2: "" });
  const [symptoms, setSymptoms] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [prescriptions, setPrescriptions] = useState<any[]>([{ id: 1, name: "", dosage: "", duration: "" }]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!visitId) return;
    api(`/visits/${visitId}`)
      .then(async (v: any) => {
        setVersion(v.version ?? 0);
        setIsCompleted(v.status === "Completed");
        setToken({ tokenNumber: v.appointment?.token?.tokenNumber ?? "" });
        const p = v.patient ?? {};
        let allergies: string[] = [];
        try {
          allergies = ((await api<any[]>(`/patients/${p.id}/allergies`)) ?? []).map((a: any) => a.allergen);
        } catch {
          /* ignore */
        }
        setPatient({ name: p.fullName ?? "Patient", age: ageFromDob(p.dateOfBirth), gender: p.gender ?? "", bloodGroup: p.bloodGroup ?? "", allergies });
        const d = v.prescriptionDraft;
        if (d) {
          setDiagnosis(d.diagnosis ?? "");
          setSymptoms(d.chiefComplaint || d.symptoms || "");
          const vit = d.vitals ?? {};
          setVitals({ bp: vit.bp ?? "", temp: vit.temperature ?? vit.temp ?? "", weight: vit.weight ?? "", hr: vit.pulse ?? vit.hr ?? "", spO2: vit.spo2 ?? vit.spO2 ?? "" });
          if (Array.isArray(d.drugs) && d.drugs.length) {
            setPrescriptions(d.drugs.map((dr: any, i: number) => ({ id: dr.id ?? i + 1, name: dr.name ?? "", dosage: dr.dose || dr.frequency || "", duration: dr.duration ?? "" })));
          }
        }
      })
      .catch(() => toast.error("Could not load the visit"));
  }, [visitId]);

  async function handleSave() {
    if (isCompleted) {
      navigate("/doctor");
      return;
    }
    if (!diagnosis.trim()) {
      toast.error("Diagnosis is required");
      return;
    }
    const drugs = prescriptions
      .filter((m) => m.name.trim())
      .map((m) => ({ id: String(m.id), name: m.name, dose: m.dosage, frequency: "", duration: m.duration, foodTiming: "", instructions: "" }));
    if (!drugs.length) {
      toast.error("Add at least one medication");
      return;
    }
    try {
      await apiPut("/prescriptions/draft", {
        visitId,
        diagnosis,
        chiefComplaint: symptoms,
        symptoms,
        clinicalNotes: symptoms,
        vitals: { bp: vitals.bp, temperature: vitals.temp, weight: vitals.weight, pulse: vitals.hr, spo2: vitals.spO2 },
        drugs,
      });
      await apiPost("/prescriptions/finalize", { visitId, version });
      setSaved(true);
      toast.success("Saved & signed to EMR");
      setTimeout(() => navigate("/doctor"), 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the record");
    }
  }

  function addMeds() {
    setPrescriptions([...prescriptions, { id: Date.now(), name: "", dosage: "", duration: "" }]);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 text-foreground font-sans min-h-screen">
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-medium hover:opacity-80 transition-opacity text-lg">
          <ChevronLeft className="w-5 h-5" /> Queue
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-[15px] transition-all ${saved ? "bg-[#32d74b] text-black" : "bg-white text-black hover:scale-[1.02]"
            }`}
        >
          {saved ? <Activity className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? "Saved to EMR" : "Save Record"}
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
        {/* Patient Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[#86868b] font-semibold tracking-widest uppercase text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" /> Token #{token.tokenNumber}
            </p>
            <h1 className="text-5xl font-bold tracking-tight text-white mb-2">{patient.name}</h1>
            <p className="text-xl text-[#86868b] font-medium">{patient.age}y · {patient.gender} · {patient.bloodGroup}</p>
          </div>
          {patient.allergies.length > 0 && (
            <div className="bg-[#ff453a]/10 border border-[#ff453a]/20 rounded-2xl p-4 flex items-start gap-3 text-[#ff453a]">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold tracking-tight">Known Allergies</p>
                <p className="font-medium text-sm">{patient.allergies.join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* iOS Grouped List Style Sections */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-2">
              <HeartPulse className="w-5 h-5 text-[#ff453a]" />
              <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Vitals</h2>
            </div>
            <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
              {[
                { label: "Blood Pressure", val: vitals.bp, key: "bp", unit: "mmHg" },
                { label: "Temperature", val: vitals.temp, key: "temp", unit: "°F" },
                { label: "Heart Rate", val: vitals.hr, key: "hr", unit: "bpm" },
                { label: "Weight", val: vitals.weight, key: "weight", unit: "kg" },
                { label: "SpO2", val: vitals.spO2, key: "spO2", unit: "%" },
              ].map((v) => (
                <div key={v.key} className="flex items-center justify-between px-6 py-4">
                  <span className="text-white font-medium text-[17px]">{v.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={v.val}
                      onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                      className="bg-transparent text-right text-white font-semibold text-[17px] focus:outline-none w-20"
                    />
                    <span className="text-[#86868b] text-[17px]">{v.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3 px-2">
              <Activity className="w-5 h-5 text-[#ff9f0a]" />
              <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Clinical Notes</h2>
            </div>
            <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
              <div className="px-6 py-5">
                <label className="block text-white font-medium text-[17px] mb-2">Chief Complaints</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-transparent text-[#86868b] font-medium text-[17px] focus:outline-none resize-none min-h-[80px]"
                  placeholder="Describe patient symptoms..."
                />
              </div>
              <div className="px-6 py-5">
                <label className="block text-white font-medium text-[17px] mb-2">Primary Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-transparent text-[#86868b] font-medium text-[17px] focus:outline-none"
                  placeholder="Enter diagnosis (ICD-10)"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#32d74b]" />
                <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Rx & Orders</h2>
              </div>
              <button onClick={addMeds} className="text-primary font-medium flex items-center gap-1 text-[15px]">
                <Plus className="w-4 h-4" /> Add Med
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {prescriptions.map((med, index) => (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="apple-card overflow-hidden border border-white/10"
                  >
                    <div className="px-6 py-4 border-b border-white/5">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => {
                          const n = [...prescriptions];
                          n[index].name = e.target.value;
                          setPrescriptions(n);
                        }}
                        className="w-full bg-transparent text-white font-bold text-xl focus:outline-none placeholder:text-[#86868b]"
                        placeholder="Medication Name"
                      />
                    </div>
                    <div className="flex divide-x divide-white/5">
                      <div className="flex-1 px-6 py-4">
                        <label className="block text-[#86868b] text-[13px] font-semibold uppercase tracking-widest mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => {
                            const n = [...prescriptions];
                            n[index].dosage = e.target.value;
                            setPrescriptions(n);
                          }}
                          className="w-full bg-transparent text-white font-medium text-[17px] focus:outline-none placeholder:text-[#86868b]"
                          placeholder="e.g. 1-0-1"
                        />
                      </div>
                      <div className="flex-1 px-6 py-4">
                        <label className="block text-[#86868b] text-[13px] font-semibold uppercase tracking-widest mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => {
                            const n = [...prescriptions];
                            n[index].duration = e.target.value;
                            setPrescriptions(n);
                          }}
                          className="w-full bg-transparent text-white font-medium text-[17px] focus:outline-none placeholder:text-[#86868b]"
                          placeholder="e.g. 5 Days"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
