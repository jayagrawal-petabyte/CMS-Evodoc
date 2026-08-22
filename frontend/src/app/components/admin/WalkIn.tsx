import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { api, apiPost } from "../lib/api";
import { UserPlus, Phone, Search, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  return isNaN(d.getTime()) ? "" : Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function WalkIn() {
  const [step, setStep] = useState<"lookup" | "details" | "assign" | "done">("lookup");
  const [phone, setPhone] = useState("");
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gender: "Male", age: "" });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [generatedToken, setGeneratedToken] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<any[]>("/doctors?active=true")
      .then((rows) => {
        const ds = (rows ?? []).map((d) => ({
          id: d.id,
          name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
          specialization: d.specializationName ?? "",
          todayStats: { waiting: 0 },
        }));
        setDoctors(ds);
        setSelectedDoctor((s) => s || ds[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  async function lookup() {
    setLoading(true);
    try {
      const p = await api<any>(`/patients/lookup?phone=${phone}`);
      setFoundPatient({ ...p, name: p.fullName, age: ageFromDob(p.dateOfBirth) });
      setIsNew(false);
      setStep("assign");
    } catch {
      setIsNew(true);
      setForm((f) => ({ ...f, phone }));
      setStep("details");
    } finally {
      setLoading(false);
    }
  }

  function registerAndAssign() {
    setFoundPatient({ name: form.name, phone: form.phone, age: form.age, gender: form.gender });
    setStep("assign");
  }

  async function assignToken() {
    if (!selectedDoctor) {
      toast.error("Select a doctor");
      return;
    }
    setLoading(true);
    try {
      const body: any = { patientPhone: phone || form.phone, doctorId: selectedDoctor, createPatientIfNotFound: isNew };
      if (isNew) {
        body.patientName = form.name;
        if (["Male", "Female", "Other"].includes(form.gender)) body.gender = form.gender;
        if (form.age) body.dateOfBirth = `${new Date().getFullYear() - parseInt(form.age)}-01-01`;
      }
      const res = await apiPost<any>("/tokens/walkin", body);
      setGeneratedToken(res.tokenNumber);
      setStep("done");
      toast.success(`Token #${res.tokenNumber} assigned to ${foundPatient?.name ?? form.name}` + (res.accountCreated ? " · account created (password = phone)" : ""));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not assign token");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("lookup"); setPhone(""); setFoundPatient(null); setIsNew(false);
    setForm({ name: "", phone: "", gender: "Male", age: "" });
    setGeneratedToken(null);
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#bf5af2]">Reception Desk</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Walk-in Dispatch</h1>
        <p className="text-[#8e8e93] text-xs font-medium mt-0.5">Quickly onboard walk-in patients and assign queue tokens</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["lookup", "details", "assign", "done"].filter((s) => isNew || s !== "details").map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
              s === step ? "bg-[#bf5af2] text-white shadow-[0_0_15px_rgba(191,90,242,0.4)]" :
              arr.indexOf(s) < arr.indexOf(step) ? "bg-[#32d74b]/15 text-[#32d74b] border border-[#32d74b]/30" :
              "bg-white/5 border border-white/10 text-[#8e8e93]"
            }`}>
              {arr.indexOf(s) < arr.indexOf(step) ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < arr.length - 1 && <div className="flex-1 h-0.5 bg-white/10" />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="apple-card p-6 md:p-8">

        {step === "lookup" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#bf5af2]/15 border border-[#bf5af2]/30 flex items-center justify-center">
                <Search className="w-5 h-5 text-[#bf5af2]" />
              </div>
              <div>
                <h3 className="text-white text-lg font-bold">Patient Lookup</h3>
                <p className="text-[#8e8e93] text-xs font-medium">Search by 10-digit mobile number</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
                <input
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && phone.length >= 10 && lookup()}
                  placeholder="Enter 10-digit phone" maxLength={10}
                  className="w-full apple-input rounded-2xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder:text-[#555]"
                />
              </div>
            </div>
            <div className="pt-2">
              <button onClick={lookup} disabled={phone.length < 10 || loading}
                className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-[#bf5af2] text-white hover:bg-[#a844dc] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(191,90,242,0.3)]">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Search className="w-4 h-4" /> Search Patient Record</>}
              </button>
            </div>
            <p className="text-[#8e8e93] text-xs text-center font-medium">New patients will automatically transition to rapid registration</p>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#32d74b]/15 border border-[#32d74b]/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#32d74b]" />
              </div>
              <div>
                <h3 className="text-white text-lg font-bold">New Patient Enrollment</h3>
                <p className="text-[#8e8e93] text-xs font-medium">No prior record found for this number</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patient full name"
                className="w-full apple-input rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none placeholder:text-[#555]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-1.5">Mobile</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} readOnly
                  className="w-full apple-input rounded-2xl px-4 py-2.5 text-white text-sm opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-1.5">Age</label>
                <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="e.g. 35" type="number"
                  className="w-full apple-input rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none placeholder:text-[#555]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-1.5">Gender</label>
              <div className="flex gap-2">
                {["Male", "Female", "Other"].map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${form.gender === g ? "bg-[#bf5af2] text-white" : "apple-glass text-[#8e8e93] border border-white/10 hover:text-white"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={registerAndAssign} disabled={!form.name || loading}
              className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 bg-[#bf5af2] hover:bg-[#a844dc] disabled:opacity-40 shadow-[0_0_20px_rgba(191,90,242,0.3)] mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continue to Specialist Assign <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === "assign" && foundPatient && (
          <div className="space-y-5">
            <div>
              <h3 className="text-white text-lg font-bold">Assign to Specialist</h3>
              <p className="text-[#8e8e93] text-xs font-medium">Select an on-duty clinician for immediate queuing</p>
            </div>
            
            {/* Patient summary */}
            <div className="apple-glass rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#bf5af2]/20 text-[#bf5af2] flex items-center justify-center text-sm font-black flex-shrink-0">
                {foundPatient.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-bold">{foundPatient.name}</p>
                <p className="text-[#8e8e93] text-xs font-medium">{foundPatient.phone} · {isNew ? "New patient" : `Age: ${foundPatient.age || "—"}`}</p>
              </div>
              <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isNew ? "bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20" : "bg-[#32d74b]/10 text-[#32d74b] border border-[#32d74b]/20"}`}>
                {isNew ? "New" : "Verified"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Available Doctors</label>
              <div className="space-y-2">
                {doctors.map((doc) => (
                  <button key={doc.id} onClick={() => setSelectedDoctor(doc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${selectedDoctor === doc.id ? "bg-[#bf5af2]/15 border-[#bf5af2]/40 shadow-[0_0_15px_rgba(191,90,242,0.15)]" : "apple-glass border-white/10 hover:border-white/20"}`}>
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {doc.name.replace("Dr. ", "").split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{doc.name}</p>
                      <p className="text-[#8e8e93] text-xs font-medium">{doc.specialization}</p>
                    </div>
                    {selectedDoctor === doc.id && <Check className="w-4 h-4 text-[#bf5af2]" />}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={assignToken} disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 bg-[#bf5af2] hover:bg-[#a844dc] shadow-[0_0_20px_rgba(191,90,242,0.3)]">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Issue Token & Queue Patient</>}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#32d74b]/15 border border-[#32d74b]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(50,215,75,0.25)]">
              <Check className="w-8 h-8 text-[#32d74b]" />
            </div>
            <div>
              <h3 className="text-white text-2xl font-black tracking-tight">Token Assigned</h3>
              <p className="text-[#8e8e93] text-xs font-medium mt-1">{foundPatient?.name}</p>
            </div>
            <div className="text-6xl font-black text-[#bf5af2] tracking-tighter shadow-sm">#{generatedToken}</div>
            <p className="text-[#8e8e93] text-xs font-medium">Patient is added to queue for {doctors.find((d) => d.id === selectedDoctor)?.name}</p>
            <button onClick={reset} className="w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider border border-white/10 text-white hover:bg-white/10 transition-colors">
              Register Next Walk-in
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
