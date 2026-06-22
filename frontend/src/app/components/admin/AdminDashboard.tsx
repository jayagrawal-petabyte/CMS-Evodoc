import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Clock, CheckCircle2, TrendingUp, AlertCircle, Activity, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

// Professional dark theme chart colors
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

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
    { label: "Total Tokens Today", value: today.totalTokens, icon: Users, color: "text-primary", bg: "bg-primary/10", delta: `${today.waiting} waiting` },
    { label: "Completed", value: today.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", delta: `${today.totalTokens ? Math.round((today.completed / today.totalTokens) * 100) : 0}% throughput` },
    { label: "Revenue Today", value: `₹${(today.revenue / 1000).toFixed(1)}k`, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", delta: "Paid invoices today" },
    { label: "Waiting Now", value: today.waiting, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", delta: "In queue" },
    { label: "Patients", value: today.newPatients, icon: Activity, color: "text-primary", bg: "bg-primary/10", delta: "Total registered" },
    { label: "Abandoned", value: today.abandoned, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", delta: "LWBS today" },
  ];

  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", color: "hsl(var(--foreground))" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-medium">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-500 text-sm font-medium">Live Dashboard</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, delta }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-md p-4 border border-border bg-card space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs leading-tight">{label}</p>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className={`text-xs ${color}`}>{delta}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-medium text-sm">Weekly Revenue</h3>
            <span className="text-muted-foreground text-xs">Last 6 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-3))" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Specialization breakdown */}
        <div className="rounded-md border border-border bg-card p-5">
          <h3 className="text-foreground font-medium text-sm mb-4">By Specialization</h3>
          <div className="flex justify-center mb-4">
            <PieChart width={140} height={140}>
              <Pie data={bySpecialization} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {bySpecialization.map((d, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2 mt-6">
            {bySpecialization.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground text-xs">{d.name}</span>
                </div>
                <span className="text-foreground text-xs font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live queue snapshot */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-foreground font-medium text-sm">Live Queue Snapshot</h3>
            </div>
            <button onClick={() => navigate("/admin/queue")} className="text-primary text-xs flex items-center gap-1 hover:underline">
              Full view <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {liveTokens.slice(0, 5).map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center text-foreground text-sm font-semibold">
                  {t.tokenNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm truncate font-medium">{t.patientName}</p>
                  <p className="text-muted-foreground text-xs truncate">{t.doctorName}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md border ${
                  t.status === "Called" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                  t.status === "Arrived" ? "bg-primary/10 text-primary border-primary/20" :
                  "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's appointments */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-foreground font-medium text-sm">Today's Appointments</h3>
            <button onClick={() => navigate("/admin/appointments")} className="text-primary text-xs flex items-center gap-1 hover:underline">
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {todayAppts.slice(0, 5).map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm truncate font-medium">{a.patientName}</p>
                  <p className="text-muted-foreground text-xs">{a.doctorName} · {new Date(a.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md border ${
                  a.status === "Completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                  a.status === "Cancelled" ? "bg-destructive/10 text-destructive border-destructive/20" :
                  "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Doctor performance row */}
      <div className="rounded-md border border-border bg-card p-5">
        <h3 className="text-foreground font-medium text-sm mb-4">Doctor Performance Today</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="rounded-md p-4 border border-border bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-foreground text-sm font-semibold">
                  {doc.name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">{doc.name}</p>
                  <p className="text-muted-foreground text-xs">{doc.specialization}</p>
                </div>
              </div>
              <div className="flex gap-3 text-center text-xs">
                <div className="flex-1">
                  <p className="text-emerald-500 font-semibold">{doc.todayStats.completed}</p>
                  <p className="text-muted-foreground">Done</p>
                </div>
                <div className="flex-1">
                  <p className="text-amber-500 font-semibold">{doc.todayStats.waiting}</p>
                  <p className="text-muted-foreground">Waiting</p>
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-semibold">{doc.todayStats.total}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(doc.todayStats.total ? doc.todayStats.completed / doc.todayStats.total : 0) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
