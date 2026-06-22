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
    // Creation actually happens on assign (/tokens/walkin find-or-create) — carry the form forward.
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
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-[#daeeff]">Walk-in Registration</h1>
        <p className="text-[#4a7a94] text-sm">Register walk-in patients and assign queue tokens</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["lookup", "details", "assign", "done"].filter((s) => isNew || s !== "details").map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              s === step ? "bg-[rgba(167,139,250,0.2)] border border-[rgba(167,139,250,0.4)] text-[#a78bfa]" :
              arr.indexOf(s) < arr.indexOf(step) ? "bg-[rgba(0,229,160,0.15)] border border-[rgba(0,229,160,0.3)] text-[#00e5a0]" :
              "bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)] text-[#4a7a94]"
            }`}>
              {arr.indexOf(s) < arr.indexOf(step) ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < arr.length - 1 && <div className="flex-1 h-px bg-[rgba(0,212,255,0.1)]" />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-[rgba(0,212,255,0.12)] bg-[#071428] p-6">

        {step === "lookup" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(167,139,250,0.1)] flex items-center justify-center">
                <Search className="w-5 h-5 text-[#a78bfa]" />
              </div>
              <div>
                <h3 className="text-[#daeeff]">Patient Lookup</h3>
                <p className="text-[#4a7a94] text-sm">Search by mobile number</p>
              </div>
            </div>
            <div>
              <label className="block text-[#7ec8e3] text-sm mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7a94]" />
                <input
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && phone.length >= 10 && lookup()}
                  placeholder="10-digit number" maxLength={10}
                  className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl pl-10 pr-4 py-3 text-[#daeeff] placeholder-[#4a7a94] focus:outline-none focus:border-[#00d4ff] transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={lookup} disabled={phone.length < 10 || loading}
                className="flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                style={{ background: phone.length >= 10 ? "linear-gradient(135deg, #a78bfa, #7c3aed)" : "#0a1930", color: phone.length >= 10 ? "white" : "#4a7a94" }}>
                {loading ? <div className="w-4 h-4 border-2 border-[#4a7a94] border-t-transparent rounded-full animate-spin" /> : <><Search className="w-4 h-4" /> Look Up</>}
              </button>
            </div>
            <p className="text-[#4a7a94] text-xs text-center">If patient isn't found, you'll be able to register them</p>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[rgba(0,229,160,0.1)] flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#00e5a0]" />
              </div>
              <div>
                <h3 className="text-[#daeeff]">New Patient</h3>
                <p className="text-[#4a7a94] text-sm">Not found — register them</p>
              </div>
            </div>
            <div>
              <label className="block text-[#7ec8e3] text-sm mb-1.5">Full Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patient's name"
                className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[#00d4ff] transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#7ec8e3] text-sm mb-1.5">Mobile</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} readOnly
                  className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.1)] rounded-xl px-4 py-2.5 text-[#daeeff] text-sm opacity-70" />
              </div>
              <div>
                <label className="block text-[#7ec8e3] text-sm mb-1.5">Age</label>
                <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="e.g. 35" type="number"
                  className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[#00d4ff] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[#7ec8e3] text-sm mb-1.5">Gender</label>
              <div className="flex gap-2">
                {["Male", "Female", "Other"].map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${form.gender === g ? "bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.3)] text-[#a78bfa]" : "border border-[rgba(0,212,255,0.1)] text-[#4a7a94] hover:text-[#7ec8e3]"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={registerAndAssign} disabled={!form.name || loading}
              className="w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{ background: form.name ? "linear-gradient(135deg, #a78bfa, #7c3aed)" : "#0a1930", color: form.name ? "white" : "#4a7a94" }}>
              {loading ? <div className="w-4 h-4 border-2 border-[#4a7a94] border-t-transparent rounded-full animate-spin" /> : <>Register & Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === "assign" && foundPatient && (
          <div className="space-y-5">
            <h3 className="text-[#daeeff]">Assign to Doctor</h3>
            {/* Patient summary */}
            <div className="rounded-xl p-3 border border-[rgba(0,229,160,0.15)] bg-[rgba(0,229,160,0.04)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(0,229,160,0.1)] flex items-center justify-center text-[#00e5a0] text-sm font-semibold flex-shrink-0">
                {foundPatient.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-[#daeeff] text-sm">{foundPatient.name}</p>
                <p className="text-[#4a7a94] text-xs">{foundPatient.phone} · {isNew ? "New patient" : `Age ${foundPatient.age}`}</p>
              </div>
              {!isNew && <span className="ml-auto px-2 py-0.5 rounded-full bg-[rgba(0,229,160,0.1)] text-[#00e5a0] text-xs">Existing</span>}
              {isNew && <span className="ml-auto px-2 py-0.5 rounded-full bg-[rgba(251,191,36,0.1)] text-[#fbbf24] text-xs">New</span>}
            </div>

            <div>
              <label className="block text-[#7ec8e3] text-sm mb-2">Select Doctor</label>
              <div className="space-y-2">
                {doctors.map((doc) => (
                  <button key={doc.id} onClick={() => setSelectedDoctor(doc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedDoctor === doc.id ? "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.3)]" : "border-[rgba(0,212,255,0.1)] hover:border-[rgba(0,212,255,0.2)]"}`}>
                    <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff] text-sm font-semibold flex-shrink-0">
                      {doc.name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#daeeff] text-sm">{doc.name}</p>
                      <p className="text-[#4a7a94] text-xs">{doc.specialization} · {doc.todayStats.waiting} waiting</p>
                    </div>
                    {selectedDoctor === doc.id && <Check className="w-4 h-4 text-[#a78bfa]" />}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={assignToken} disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
              {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-transparent rounded-full animate-spin" /> : <>Assign Token</>}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(0,229,160,0.1)] border border-[rgba(0,229,160,0.3)] flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-[#00e5a0]" />
            </div>
            <div>
              <h3 className="text-[#daeeff] text-xl">Token Assigned!</h3>
              <p className="text-[#4a7a94] mt-1">{foundPatient?.name}</p>
            </div>
            <div className="text-6xl font-bold text-[#a78bfa]">#{generatedToken}</div>
            <p className="text-[#4a7a94] text-sm">Patient added to queue for {doctors.find((d) => d.id === selectedDoctor)?.name}</p>
            <button onClick={reset} className="w-full py-3 rounded-xl text-sm border border-[rgba(167,139,250,0.2)] text-[#a78bfa] hover:bg-[rgba(167,139,250,0.05)] transition-colors">
              Register Another Patient
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
