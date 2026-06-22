import { useState, useEffect, useCallback } from "react";
import { api, apiPost, apiPut } from "../lib/api";
import { Plus, Edit3, Star, Award, Clock, CheckCircle2, XCircle, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function DoctorsManagement() {
  const [showAdd, setShowAdd] = useState(false);
  const [localDoctors, setLocalDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", specialization: "", fee: "", experience: "", qualification: "", bio: "" });

  const load = useCallback(() => {
    api<any[]>("/doctors")
      .then((rows) =>
        setLocalDoctors(
          (rows ?? []).map((d) => ({
            id: d.id,
            name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
            specialization: d.specializationName ?? "",
            isActive: d.isActive ?? true,
            qualification: d.qualification ?? "",
            experience: "—",
            consultationFee: d.consultationFee ?? "—",
          }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api<any[]>("/specializations").then((s) => {
      setSpecializations(s ?? []);
      setForm((f) => (f.specialization ? f : { ...f, specialization: s?.[0]?.id ?? "" }));
    }).catch(() => {});
  }, [load]);

  async function toggle(id: string) {
    const doc = localDoctors.find((d) => d.id === id);
    try {
      await apiPut(`/doctors/${id}`, { isActive: !doc?.isActive });
      toast.success(`${doc?.name} ${doc?.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function addDoctor() {
    const phone = "9" + Math.floor(100000000 + Math.random() * 899999999);
    try {
      await apiPost("/doctors", {
        fullName: form.name,
        phone,
        specializationId: form.specialization,
        qualification: form.qualification || undefined,
        bio: form.bio || undefined,
        password: "doctor123",
      });
      toast.success(`Dr. ${form.name} added · login ${phone} / doctor123`);
      setShowAdd(false);
      setForm({ name: "", specialization: specializations[0]?.id ?? "", fee: "", experience: "", qualification: "", bio: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add doctor");
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#daeeff]">Doctors</h1>
          <p className="text-[#4a7a94] text-sm">{localDoctors.filter((d) => d.isActive).length} active · {localDoctors.length} total</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      {/* Add Doctor form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[rgba(167,139,250,0.2)] bg-[#071428] p-5">
          <h3 className="text-[#daeeff] mb-4">New Doctor Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Name (without Dr.)", key: "name", placeholder: "e.g. Anil Kumar" },
              { label: "Consultation Fee (₹)", key: "fee", placeholder: "e.g. 700" },
              { label: "Years of Experience", key: "experience", placeholder: "e.g. 10" },
              { label: "Qualification", key: "qualification", placeholder: "MBBS, MD..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-[#7ec8e3] text-xs mb-1.5">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                  className="w-full bg-[#0a1930] border border-[rgba(167,139,250,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[rgba(167,139,250,0.35)] transition-colors" />
              </div>
            ))}
            <div>
              <label className="block text-[#7ec8e3] text-xs mb-1.5">Specialization</label>
              <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full bg-[#0a1930] border border-[rgba(167,139,250,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(167,139,250,0.35)] transition-colors">
                {specializations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[#7ec8e3] text-xs mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} placeholder="Brief professional bio..."
                className="w-full bg-[#0a1930] border border-[rgba(167,139,250,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[rgba(167,139,250,0.35)] transition-colors resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.12)] text-[#7ec8e3] text-sm hover:bg-[rgba(0,212,255,0.04)] transition-colors">Cancel</button>
            <button onClick={addDoctor} disabled={!form.name} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: form.name ? "linear-gradient(135deg, #a78bfa, #7c3aed)" : "#0a1930", color: form.name ? "white" : "#4a7a94" }}>
              Create Profile
            </button>
          </div>
        </motion.div>
      )}

      {/* Doctors grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {localDoctors.map((doc) => (
          <div key={doc.id} className={`rounded-xl border bg-[#071428] overflow-hidden transition-all ${doc.isActive ? "border-[rgba(0,212,255,0.1)]" : "border-[rgba(0,212,255,0.05)] opacity-60"}`}>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] flex items-center justify-center text-[#00d4ff] font-semibold">
                    {doc.name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-[#daeeff] font-medium">{doc.name}</p>
                    <p className="text-[#00d4ff] text-xs">{doc.specialization}</p>
                  </div>
                </div>
                <button onClick={() => toggle(doc.id)}
                  className={`p-1.5 rounded-lg transition-colors ${doc.isActive ? "text-[#00e5a0] hover:bg-[rgba(255,77,109,0.08)] hover:text-[#ff4d6d]" : "text-[#ff4d6d] hover:bg-[rgba(0,229,160,0.08)] hover:text-[#00e5a0]"}`}>
                  {doc.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[#4a7a94] text-xs">{doc.qualification}</p>

              <div className="flex gap-2 text-center">
                <div className="flex-1 py-2 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.08)]">
                  <p className="text-[#daeeff] text-sm font-semibold">{doc.experience}+</p>
                  <p className="text-[#4a7a94] text-xs">Years</p>
                </div>
                <div className="flex-1 py-2 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.08)]">
                  <p className="text-[#daeeff] text-sm font-semibold">₹{doc.consultationFee}</p>
                  <p className="text-[#4a7a94] text-xs">Fee</p>
                </div>
                <div className="flex-1 py-2 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.08)]">
                  <p className="text-[#daeeff] text-sm font-semibold flex items-center justify-center gap-0.5">4.8<Star className="w-3 h-3 text-[#fbbf24] fill-[#fbbf24]" /></p>
                  <p className="text-[#4a7a94] text-xs">Rating</p>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[rgba(0,212,255,0.12)] text-[#7ec8e3] text-sm hover:border-[rgba(0,212,255,0.25)] hover:text-[#00d4ff] transition-colors">
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
