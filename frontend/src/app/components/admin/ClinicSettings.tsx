import { useState, useEffect, useRef } from "react";
import { api, apiPut, getApiUrl, getAccessToken } from "../lib/api";
import { Settings, Upload, Save, Palette, Globe, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

const TOGGLE_PREFS = [
  { label: "Enable walk-in registration", defaultOn: true },
  { label: "Allow online booking", defaultOn: true },
  { label: "Send SMS notifications", defaultOn: false },
  { label: "Auto-call next token", defaultOn: false },
  { label: "Require prescription for completion", defaultOn: true },
];

function SettingsToggles() {
  const [states, setStates] = useState(TOGGLE_PREFS.map((p) => p.defaultOn));
  return (
    <>
      {TOGGLE_PREFS.map(({ label }, i) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-[#7ec8e3] text-sm">{label}</span>
          <button onClick={() => setStates((prev) => prev.map((v, j) => j === i ? !v : v))}
            className={`w-10 h-5 rounded-full relative transition-colors ${states[i] ? "bg-[rgba(0,212,255,0.3)]" : "bg-[rgba(0,212,255,0.08)]"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${states[i] ? "left-[calc(100%-18px)] bg-[#00d4ff]" : "left-0.5 bg-[#4a7a94]"}`} />
          </button>
        </div>
      ))}
    </>
  );
}

export default function ClinicSettings() {
  const [form, setForm] = useState({ name: "", tagline: "", phone: "", email: "", address: "" });
  const [accentColor, setAccentColor] = useState("#00d4ff");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<any>("/clinic/theme").then((t) => {
      if (!t) return;
      setForm((f) => ({ ...f, name: t.clinicDisplayName ?? f.name }));
      if (t.accentColor) setAccentColor(t.accentColor);
      if (t.primaryColor) setPrimaryColor(t.primaryColor);
      if (t.secondaryColor) setSecondaryColor(t.secondaryColor);
      if (t.fontFamily) setFontFamily(t.fontFamily);
      setLogoUrl(t.logoUrl ?? null);
    }).catch(() => {});
  }, []);

  async function save() {
    try {
      await apiPut("/clinic/theme", {
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
        clinicDisplayName: form.name || "CareDesk Clinic",
      });
      toast.success("Clinic settings updated successfully");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save settings");
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${getApiUrl()}/clinic/theme/logo`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLogoUrl(data.logoUrl ?? null);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Logo upload failed");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h1 className="text-[#daeeff]">Clinic Settings</h1>
          <p className="text-[#4a7a94] text-sm">Branding, contact info, and system preferences</p>
        </div>
      </div>

      {/* Branding */}
      <div className="rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#071428] overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(0,212,255,0.07)] bg-[rgba(0,212,255,0.03)]">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider">Branding</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-[#7ec8e3] text-sm mb-2">Clinic Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[rgba(0,212,255,0.08)] border border-dashed border-[rgba(0,212,255,0.3)] flex items-center justify-center text-[#00d4ff] text-xl font-bold overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : (form.name ? form.name.slice(0, 2).toUpperCase() : "M+")}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={uploadLogo} />
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.2)] text-[#7ec8e3] text-sm hover:border-[rgba(0,212,255,0.35)] transition-colors">
                  <Upload className="w-4 h-4" /> Upload Logo
                </button>
                <p className="text-[#4a7a94] text-xs mt-1">PNG, JPG up to 5MB · Public bucket</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#7ec8e3] text-sm mb-2">Clinic Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-3 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.35)] transition-colors" />
          </div>

          <div>
            <label className="block text-[#7ec8e3] text-sm mb-2">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-3 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.35)] transition-colors" />
          </div>

          <div>
            <label className="block text-[#7ec8e3] text-sm mb-2 flex items-center gap-2"><Palette className="w-4 h-4" /> Primary Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-[rgba(0,212,255,0.15)] bg-[#0a1930] cursor-pointer" />
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-2.5 text-[#daeeff] text-sm font-mono focus:outline-none focus:border-[rgba(0,212,255,0.35)] transition-colors" />
              {["#00d4ff", "#a78bfa", "#00e5a0", "#ff4d6d"].map((c) => (
                <button key={c} onClick={() => setAccentColor(c)} className="w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.1)]" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#071428] overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(0,212,255,0.07)] bg-[rgba(0,212,255,0.03)]">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider">Contact Information</h3>
        </div>
        <div className="p-5 space-y-4">
          {[
            { icon: Phone, label: "Phone", key: "phone" },
            { icon: Mail, label: "Email", key: "email" },
            { icon: MapPin, label: "Address", key: "address" },
          ].map(({ icon: Icon, label, key }) => (
            <div key={key}>
              <label className="block text-[#7ec8e3] text-sm mb-2 flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#4a7a94]" /> {label}
              </label>
              <input value={form[key as keyof typeof form] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-xl px-4 py-3 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.35)] transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* System preferences */}
      <div className="rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#071428] overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(0,212,255,0.07)] bg-[rgba(0,212,255,0.03)]">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider">System Preferences</h3>
        </div>
        <div className="p-5 space-y-4">
          <SettingsToggles />
        </div>
      </div>

      <button onClick={save} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-[#040d1a]" style={{ background: "linear-gradient(135deg, #00d4ff, #0099cc)" }}>
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}
