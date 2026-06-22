import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download } from "lucide-react";

const tooltipStyle = { backgroundColor: "#071428", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "8px", color: "#daeeff" };

export default function Reports() {
  const [summary, setSummary] = useState({ patients: 0, revenue: 0 });
  const [daily, setDaily] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [docRows, setDocRows] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<any>("/stats/analytics?days=7"),
      api<any[]>("/invoices"),
      api<any[]>("/tokens/today"),
      api<any>("/stats/dashboard"),
    ]).then(([analytics, invoices, toks, dash]) => {
      if (cancelled) return;
      const paid = (invoices ?? []).filter((i) => i.status === "Paid" && i.paidAt);
      const revByDay: Record<string, number> = {};
      for (const p of paid) { const k = p.paidAt.split("T")[0]; revByDay[k] = (revByDay[k] ?? 0) + (p.total ?? 0); }
      setDaily((analytics?.daily ?? []).map((d: any) => ({
        month: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        patients: d.appointments,
        revenue: revByDay[d.date] ?? 0,
      })));
      setSummary({ patients: dash?.totalPatients ?? 0, revenue: paid.reduce((s, p) => s + (p.total ?? 0), 0) });
      const hours: Record<number, number> = {};
      for (let h = 8; h <= 20; h++) hours[h] = 0;
      for (const t of (toks ?? [])) { const h = new Date(t.createdAt).getHours(); if (hours[h] !== undefined) hours[h]++; }
      setHourly(Object.entries(hours).map(([h, tokens]) => ({ hour: `${h}:00`, tokens })));
      setDocRows((analytics?.doctorBreakdown ?? []).map((d: any) => ({ doctor: `Dr. ${d.doctorName}`.replace(/^Dr\. Dr\./, "Dr."), patients: d.count, revenue: 0 })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#daeeff]">Reports & Analytics</h1>
          <p className="text-[#4a7a94] text-sm">Clinic performance overview</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.15)] text-[#7ec8e3] text-sm hover:border-[rgba(0,212,255,0.3)] transition-colors">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Patients", value: summary.patients.toLocaleString(), delta: "Registered", color: "#00d4ff" },
          { label: "Revenue (Paid)", value: `₹${(summary.revenue / 1000).toFixed(1)}k`, delta: "All paid invoices", color: "#00e5a0" },
          { label: "Avg Wait Time", value: "—", delta: "Not tracked", color: "#a78bfa" },
          { label: "Patient Satisfaction", value: "—", delta: "Not tracked", color: "#fbbf24" },
        ].map(({ label, value, delta, color }) => (
          <div key={label} className="rounded-xl p-4 border border-[rgba(0,212,255,0.08)] bg-[#071428]">
            <p className="text-[#4a7a94] text-xs mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color }}>{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly patients trend */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Patient Volume (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="patients" fill="#00d4ff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly revenue */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Revenue — Last 7 Days (₹)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a94", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${(v / 1000).toFixed(0)}k`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#a78bfa" fill="url(#revGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly distribution */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Today's Hourly Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="tokens" stroke="#00e5a0" strokeWidth={2.5} dot={{ fill: "#00e5a0", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Doctor performance table */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Doctor Performance (Today)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,212,255,0.07)]">
                {["Doctor", "Appointments"].map((h) => (
                  <th key={h} className="text-left text-[#4a7a94] text-xs py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,212,255,0.05)]">
              {docRows.map((d) => (
                <tr key={d.doctor}>
                  <td className="py-2.5 pr-4 text-[#daeeff]">{d.doctor}</td>
                  <td className="py-2.5 pr-4 text-[#00d4ff]">{d.patients}</td>
                </tr>
              ))}
              {docRows.length === 0 && (
                <tr><td colSpan={2} className="py-4 text-center text-[#4a7a94] text-xs">No data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
