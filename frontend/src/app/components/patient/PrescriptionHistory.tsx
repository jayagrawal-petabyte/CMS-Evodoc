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
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 text-foreground font-sans min-h-screen">
      <div className="mb-10">
        <h1 className="apple-hero-text text-4xl tracking-tight text-white">Records.</h1>
        <p className="text-[#86868b] font-medium text-lg mt-2">Your complete medical history and documents.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <FileText className="w-5 h-5 text-[#2997ff]" />
            <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Clinical Documents</h2>
          </div>

          {loading ? (
            <div className="apple-card p-12 text-center text-[#86868b]">Loading…</div>
          ) : myRx.length > 0 ? (
            <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
              {myRx.map((rx) => (
                <div key={rx.id} className="p-6 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#2997ff]/20 text-[#2997ff] flex items-center justify-center border border-[#2997ff]/30 shadow-lg">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-white">{rx.diagnosis}</h3>
                        <p className="text-[#86868b] text-[15px] font-medium">{rx.doctorName}</p>
                      </div>
                    </div>
                    <p className="text-[#86868b] font-medium text-sm">
                      {rx.createdAt
                        ? new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : ""}
                    </p>
                  </div>

                  <div className="pl-16 space-y-2">
                    {rx.medicines.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-white font-semibold text-[15px]">{m.name}</p>
                          <p className="text-[#86868b] text-[13px] font-medium">
                            {[m.dosage, m.duration].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pl-16 mt-4 flex items-center gap-4">
                    <button
                      onClick={() => handleDownload(rx.id)}
                      disabled={downloading === rx.id}
                      className="flex items-center gap-2 text-[#2997ff] text-[13px] font-bold uppercase tracking-widest hover:opacity-80 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> {downloading === rx.id ? "Loading…" : "Download PDF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="apple-card p-12 text-center">
              <Activity className="w-16 h-16 text-[#86868b] mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">No records found</h2>
              <p className="text-[#86868b] font-medium text-lg">You don't have any clinical documents yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
