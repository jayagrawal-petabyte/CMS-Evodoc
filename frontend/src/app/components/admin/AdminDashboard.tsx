import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Clock, CheckCircle2, TrendingUp, AlertCircle, Activity, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

const PIE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea"];

// Helper: generate 2-letter initials from a name
function nameInitials(name: string) {
  return name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Pastel stat card colours keyed by meaning
const kpiMeta = [
  { label: "Total Tokens",  icon: Users,         tint: "stat-blue",   deltaColor: "text-blue-600" },
  { label: "Completed",     icon: CheckCircle2,  tint: "stat-green",  deltaColor: "text-green-600" },
  { label: "Revenue Today", icon: TrendingUp,    tint: "stat-green",  deltaColor: "text-green-600" },
  { label: "Waiting Now",   icon: Clock,         tint: "stat-yellow", deltaColor: "text-amber-600" },
  { label: "Registered",    icon: Activity,      tint: "stat-blue",   deltaColor: "text-blue-600" },
  { label: "Abandoned",     icon: AlertCircle,   tint: "stat-red",    deltaColor: "text-red-600" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [today, setToday] = useState({ totalTokens: 0, completed: 0, waiting: 0, revenue: 0, newPatients: 0, abandoned: 0 });
  const [revenueByDay, setRevenueByDay] = useState<any[]>([]);
  const [bySpecialization, setBySpecialization] = useState<any[]>([]);
  const [liveTokens, setLiveTokens] = useState<any[]>([]);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const todayKey = new Date().toISOString().split("T")[0];

    api<any>("/stats/dashboard")
      .then((s) => { if (!cancelled && s) setToday((p) => ({ ...p, totalTokens: s.todayTokens ?? 0, completed: s.completed ?? 0, waiting: s.waiting ?? 0, newPatients: s.totalPatients ?? 0 })); })
      .catch(() => {});

    api<any[]>("/tokens/queue")
      .then((rows) => { if (!cancelled) setLiveTokens((rows ?? []).filter((t) => ["Waiting", "Arrived", "Called"].includes(t.status))); })
      .catch(() => {});

    api<any[]>("/appointments")
      .then((rows) => { if (!cancelled) setTodayAppts((rows ?? []).filter((a) => (a.slotStart ?? "").split("T")[0] === todayKey).map((a) => ({ ...a, doctorName: a.doctorName ? `Dr. ${a.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor" }))); })
      .catch(() => {});

    api<any[]>("/invoices")
      .then((rows) => {
        if (cancelled) return;
        const paid = (rows ?? []).filter((i) => i.status === "Paid" && i.paidAt);
        const todayRev = paid.filter((i) => i.paidAt.split("T")[0] === todayKey).reduce((s, i) => s + (i.total ?? 0), 0);
        setToday((p) => ({ ...p, revenue: todayRev }));
        const days: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          days.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: paid.filter((p2) => p2.paidAt.split("T")[0] === key).reduce((s, p2) => s + (p2.total ?? 0), 0) });
        }
        setRevenueByDay(days);
      })
      .catch(() => {});

    Promise.all([api<any[]>("/doctors"), api<any[]>("/tokens/today")])
      .then(([docs, toks]) => {
        if (cancelled) return;
        const docList = docs ?? [];
        const specCount: Record<string, number> = {};
        for (const d of docList) { const s = d.specialization ?? "General"; specCount[s] = (specCount[s] ?? 0) + 1; }
        setBySpecialization(Object.entries(specCount).map(([name, value]) => ({ name, value })));
        const byDoc: Record<string, any> = {};
        for (const t of (toks ?? [])) {
          const did = t.appointment?.doctorId; if (!did) continue;
          byDoc[did] = byDoc[did] ?? { completed: 0, waiting: 0, total: 0 };
          byDoc[did].total++;
          if (t.status === "Completed") byDoc[did].completed++;
          if (["Waiting", "Arrived", "Called", "OnHold"].includes(t.status)) byDoc[did].waiting++;
        }
        setToday((p) => ({ ...p, abandoned: (toks ?? []).filter((t) => t.status === "Abandoned").length }));
        setDoctors(docList.map((d) => ({ id: d.id, name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."), specialization: d.specialization ?? "General", todayStats: byDoc[d.id] ?? { completed: 0, waiting: 0, total: 0 } })));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const kpis = [
    { label: "Total Tokens",  value: today.totalTokens, delta: `${today.waiting} waiting` },
    { label: "Completed",     value: today.completed,   delta: `${today.totalTokens ? Math.round((today.completed / today.totalTokens) * 100) : 0}% throughput` },
    { label: "Revenue Today", value: `₹${(today.revenue / 1000).toFixed(1)}k`, delta: "Paid invoices" },
    { label: "Waiting Now",   value: today.waiting,     delta: "In queue" },
    { label: "Registered",    value: today.newPatients, delta: "Total patients" },
    { label: "Abandoned",     value: today.abandoned,   delta: "LWBS count" },
  ];

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    color: "#111827",
    fontSize: "12px",
    fontWeight: "600",
  };

  return (
    <div className="space-y-6">
      {/* Page header: Single clear heading line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Clinic Operations & Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="cms-btn-secondary cursor-pointer">Filter</button>
          <button className="cms-btn-secondary cursor-pointer">Export</button>
          <button className="cms-btn-primary cursor-pointer" onClick={() => navigate("/admin/walkin")}>+ New Walk-in</button>
        </div>
      </div>

      {/* KPI grid — pastel tinted cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(({ label, value, delta }, i) => {
          const meta = kpiMeta[i];
          const Icon = meta.icon;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`cms-card p-5 ${meta.tint} border-0 rounded-2xl`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-gray-600 leading-tight">{label}</p>
                <Icon className="w-4 h-4 opacity-60 flex-shrink-0" />
              </div>
              <p className="text-2xl font-bold leading-none mb-1">{value}</p>
              <p className={`text-[11px] font-semibold ${meta.deltaColor}`}>{delta}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 cms-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Revenue Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 days · Paid invoices</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d97706" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#d97706" fill="url(#revGrad)" strokeWidth={2.5} dot={{ fill: "#d97706", r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Specialization breakdown */}
        <div className="cms-card p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Provider Mix</h3>
          <div className="flex justify-center">
            <PieChart width={130} height={130}>
              <Pie data={bySpecialization} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={4} dataKey="value">
                {bySpecialization.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2 pt-3">
            {bySpecialization.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-500 text-xs font-medium">{d.name}</span>
                </div>
                <span className="text-gray-800 text-xs font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Queue + Appointments */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Live queue */}
        <div className="cms-card overflow-hidden rounded-2xl">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">Live Queue</h3>
            </div>
            <button onClick={() => navigate("/admin/queue")} className="text-gray-500 text-xs font-semibold flex items-center gap-1 hover:text-gray-800 transition-colors cursor-pointer">
              Full Queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {liveTokens.slice(0, 5).map((t) => (
              <div key={t.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="avatar-chip bg-gray-100 text-gray-700 text-[11px] font-black w-9 h-9">
                  #{t.tokenNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-semibold truncate">{t.patientName}</p>
                  <p className="text-gray-400 text-xs truncate">{t.doctorName}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                  t.status === "Called"   ? "badge-confirmed" :
                  t.status === "Arrived"  ? "badge-inprogress" :
                  "badge-pending"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
            {liveTokens.length === 0 && (
              /* Reduced visual weight for empty queue */
              <div className="py-6 text-center text-gray-400 text-xs font-medium">No patients in live queue</div>
            )}
          </div>
        </div>

        {/* Today appointments */}
        <div className="cms-card overflow-hidden rounded-2xl">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Today's Appointments</h3>
            <button onClick={() => navigate("/admin/appointments")} className="text-gray-500 text-xs font-semibold flex items-center gap-1 hover:text-gray-800 transition-colors cursor-pointer">
              All Visits <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {todayAppts.slice(0, 5).map((a) => (
              <div key={a.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="avatar-chip text-xs font-bold" style={{ backgroundColor: "#eef4ff", color: "#2563eb" }}>
                  {(a.patientName ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-semibold truncate">{a.patientName}</p>
                  <p className="text-gray-400 text-xs">{a.doctorName} · {new Date(a.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                  a.status === "Completed" ? "badge-confirmed" :
                  a.status === "Cancelled" ? "badge-cancelled" :
                  "badge-scheduled"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
            {todayAppts.length === 0 && (
              /* Reduced visual weight for empty appointments */
              <div className="py-6 text-center text-gray-400 text-xs font-medium">No appointments today</div>
            )}
          </div>
        </div>
      </div>

      {/* Doctor activity */}
      <div className="cms-card p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Provider Activity Today</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="avatar-chip bg-gray-200 text-gray-700 text-xs">{nameInitials(doc.name)}</div>
                <div>
                  <p className="text-gray-800 text-xs font-bold">{doc.name}</p>
                  <p className="text-gray-400 text-[11px]">{doc.specialization}</p>
                </div>
              </div>
              <div className="flex gap-2 text-center text-xs">
                <div className="flex-1 bg-white py-2 rounded-lg border border-gray-100">
                  <p className="text-green-600 font-bold text-sm">{doc.todayStats.completed}</p>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Done</p>
                </div>
                <div className="flex-1 bg-white py-2 rounded-lg border border-gray-100">
                  <p className="text-amber-600 font-bold text-sm">{doc.todayStats.waiting}</p>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Waiting</p>
                </div>
                <div className="flex-1 bg-white py-2 rounded-lg border border-gray-100">
                  <p className="text-gray-800 font-bold text-sm">{doc.todayStats.total}</p>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Total</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${(doc.todayStats.total ? doc.todayStats.completed / doc.todayStats.total : 0) * 100}%` }} />
              </div>
            </div>
          ))}
          {doctors.length === 0 && <p className="text-gray-400 text-xs col-span-3">No doctor data available.</p>}
        </div>
      </div>
    </div>
  );
}
