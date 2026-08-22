import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { FileText, ChevronRight, Activity, Download } from "lucide-react";
import { motion } from "motion/react";

interface RxRow {
  id: string;
  diagnosis: string;
  doctorName: string;
  createdAt: string;
  medicines: { name: string; dosage: string; duration: string }[];
}

export default function PrescriptionHistory() {
  const { user } = useAuth();
  const [myRx, setMyRx] = useState<RxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    api<any[]>(`/patients/${user.id}/prescriptions`)
      .then((rows) =>
        setMyRx(
          (rows ?? []).map((p) => ({
            id: p.id,
            diagnosis: p.diagnosis ?? "Prescription",
            doctorName: p.doctorName ? `Dr. ${p.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor",
            createdAt: p.signedAt ?? p.createdAt,
            medicines: (p.drugs ?? []).map((d: any) => ({
              name: d.name,
              dosage: d.dose ?? d.dosage ?? "",
              duration: d.duration ?? "",
            })),
          }))
        )
      )
      .catch(() => setMyRx([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      const { signedUrl } = await api<{ signedUrl: string }>(`/prescriptions/${id}/download`);
      window.open(signedUrl, "_blank");
    } catch {
      /* ignore */
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 text-foreground font-sans min-h-screen space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#2997ff]">Health Records</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Medical History</h1>
        <p className="text-[#8e8e93] font-medium text-sm mt-1">Access verified prescriptions, diagnoses, and pharmacy notes.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <FileText className="w-4 h-4 text-[#2997ff]" />
            <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Clinical Documents ({myRx.length})</h2>
          </div>

          {loading ? (
            <div className="apple-card p-10 text-center text-[#8e8e93] text-sm font-medium">Loading documents…</div>
          ) : myRx.length > 0 ? (
            <div className="space-y-4">
              {myRx.map((rx) => (
                <div key={rx.id} className="interactive-card p-6">
                  <div className="flex items-start justify-between mb-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#2997ff]/15 text-[#2997ff] flex items-center justify-center border border-[#2997ff]/30 shadow-md">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-white">{rx.diagnosis}</h3>
                        <p className="text-xs font-semibold text-[#8e8e93]">{rx.doctorName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#8e8e93] bg-white/5 px-3 py-1 rounded-full border border-white/5">
                      {rx.createdAt
                        ? new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : ""}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8e8e93]">Prescribed Medications</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {rx.medicines.map((m, i) => (
                        <div key={i} className="apple-glass p-3 rounded-xl flex items-center justify-between border border-white/5">
                          <div>
                            <p className="text-white font-bold text-xs">{m.name}</p>
                            <p className="text-[#8e8e93] text-[11px] font-medium">
                              {[m.dosage, m.duration].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      onClick={() => handleDownload(rx.id)}
                      disabled={downloading === rx.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#2997ff] text-xs font-bold uppercase tracking-wider transition-all border border-white/10 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" /> {downloading === rx.id ? "Generating PDF..." : "Download PDF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="apple-card p-10 text-center">
              <Activity className="w-12 h-12 text-[#8e8e93] mx-auto mb-3 opacity-40" />
              <h2 className="text-xl font-bold tracking-tight text-white mb-1">No records found</h2>
              <p className="text-[#8e8e93] font-medium text-xs">You don't have any clinical documents or prescriptions yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
