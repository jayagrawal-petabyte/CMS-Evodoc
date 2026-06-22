import { useState, useEffect, useCallback } from "react";
import { api, apiPatch } from "../lib/api";
import { Wallet, CheckCircle2, Clock, Search, CreditCard, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

const PAY_METHODS = ["Cash", "UPI", "Card", "Insurance"];

export default function Billing() {
  const [bills, setBills] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payModal, setPayModal] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("Cash");

  const load = useCallback(() => {
    api<any[]>("/invoices")
      .then((rows) =>
        setBills(
          (rows ?? []).map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber ?? inv.id,
            patientName: inv.patient?.fullName ?? "—",
            doctorName: "—",
            total: inv.total ?? 0,
            status: inv.status === "Unpaid" ? "Pending" : inv.status,
            paymentMethod: inv.paymentMethod,
            createdAt: inv.createdAt,
            items: inv.items ?? [],
          }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bills.filter((inv) => {
    const matchSearch = inv.patientName.toLowerCase().includes(search.toLowerCase()) || String(inv.invoiceNumber).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = bills.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = bills.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + inv.total, 0);

  async function markPaid(id: string) {
    try {
      await apiPatch(`/invoices/${id}/pay`, { paymentMethod: payMethod });
      setPayModal(null);
      toast.success(`Invoice marked as Paid via ${payMethod}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record payment");
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-[#daeeff]">Billing</h1>
        <p className="text-[#4a7a94] text-sm">Invoice management and payments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "#00e5a0", icon: Wallet },
          { label: "Pending Amount", value: `₹${pendingAmount.toLocaleString()}`, color: "#fbbf24", icon: Clock },
          { label: "Paid Invoices", value: bills.filter((i) => i.status === "Paid").length, color: "#00d4ff", icon: CheckCircle2 },
          { label: "Pending Invoices", value: bills.filter((i) => i.status === "Pending").length, color: "#ff4d6d", icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4 border border-[rgba(0,212,255,0.07)] bg-[#071428]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#4a7a94] text-xs">{label}</span>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7a94]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or invoice..."
            className="w-full bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl pl-10 pr-4 py-2.5 text-[#daeeff] placeholder-[#4a7a94] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl px-4 py-2.5 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]">
          <option value="all">All</option>
          <option>Pending</option>
          <option>Paid</option>
        </select>
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(0,212,255,0.07)]">
              {["Invoice", "Patient", "Doctor", "Amount", "Status", "Action"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[#4a7a94] text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,212,255,0.05)]">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-[rgba(0,212,255,0.02)] transition-colors">
                <td className="px-5 py-4">
                  <p className="text-[#daeeff] text-sm font-mono">{inv.id}</p>
                  <p className="text-[#4a7a94] text-xs">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                </td>
                <td className="px-5 py-4 text-[#7ec8e3] text-sm">{inv.patientName}</td>
                <td className="px-5 py-4 text-[#4a7a94] text-xs">{inv.doctorName}</td>
                <td className="px-5 py-4">
                  <p className="text-[#daeeff] font-semibold">₹{inv.total.toLocaleString()}</p>
                  <p className="text-[#4a7a94] text-xs">{inv.items.length} item{inv.items.length > 1 ? "s" : ""}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${inv.status === "Paid" ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]" : "bg-[rgba(251,191,36,0.1)] text-[#fbbf24]"}`}>
                    {inv.status}
                    {inv.status === "Paid" && inv.paymentMethod && ` · ${inv.paymentMethod}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {inv.status === "Pending" && (
                    <button onClick={() => setPayModal(inv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[rgba(0,229,160,0.2)] text-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)] transition-colors">
                      <CreditCard className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[#4a7a94]">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No invoices found
          </div>
        )}
      </div>

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 bg-[rgba(4,13,26,0.85)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-[rgba(0,229,160,0.2)] bg-[#071428] p-6 space-y-5">
            <h3 className="text-[#daeeff]">Record Payment</h3>
            <div>
              <p className="text-[#7ec8e3] text-sm mb-3">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${payMethod === m ? "bg-[rgba(0,229,160,0.1)] border-[rgba(0,229,160,0.3)] text-[#00e5a0]" : "border-[rgba(0,212,255,0.1)] text-[#4a7a94] hover:text-[#7ec8e3]"}`}>
                    {m === "Cash" && <Banknote className="w-4 h-4" />}
                    {m === "UPI" && <Smartphone className="w-4 h-4" />}
                    {m === "Card" && <CreditCard className="w-4 h-4" />}
                    {m === "Insurance" && <CheckCircle2 className="w-4 h-4" />}
                    <span className="text-sm">{m}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)} className="flex-1 py-2.5 rounded-xl border border-[rgba(0,212,255,0.12)] text-[#7ec8e3] text-sm hover:bg-[rgba(0,212,255,0.04)] transition-colors">Cancel</button>
              <button onClick={() => markPaid(payModal)} className="flex-1 py-2.5 rounded-xl text-[#040d1a] text-sm font-medium" style={{ background: "linear-gradient(135deg, #00e5a0, #00a870)" }}>
                Confirm Payment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
