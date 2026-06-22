import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Clock, Star } from "lucide-react";

const COLORS = ["#00d4ff", "#00e5a0", "#a78bfa", "#fbbf24"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorAnalytics() {
  const { user } = useAuth();
  const [daily, setDaily] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ appointments: 0, completed: 0, tokens: 0 });

  useEffect(() => {
    api<any>("/stats/analytics?days=7")
      .then((d) => {
        setDaily(d.daily ?? []);
        setTotals(d.totals ?? { appointments: 0, completed: 0, tokens: 0 });
      })
      .catch(() => {});
  }, []);

  const weeklyData = daily.map((d) => ({
    day: DOW[new Date(d.date).getDay()],
    patients: d.appointments ?? 0,
    revenue: (d.appointments ?? 0) * 500,
  }));
  const todayPatients = weeklyData.length ? weeklyData[weeklyData.length - 1].patients : 0;
  const todayRevenue = todayPatients * 500;

  const specialtyData = [
    { name: "Follow-up", value: 45 },
    { name: "New patients", value: 30 },
    { name: "Emergency", value: 15 },
    { name: "Check-up", value: 10 },
  ];

  const stats = [
    { label: "Patients (today)", value: todayPatients, delta: `${totals.appointments} this week`, icon: Users, color: "#00d4ff" },
    { label: "Est. Revenue", value: `₹${(todayRevenue / 1000).toFixed(1)}k`, delta: "approx", icon: TrendingUp, color: "#00e5a0" },
    { label: "Completed", value: totals.completed, delta: "this week", icon: Clock, color: "#a78bfa" },
    { label: "Patient Rating", value: "4.8★", delta: "Excellent", icon: Star, color: "#fbbf24" },
  ];

  const tooltipStyle = { backgroundColor: "#071428", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "8px", color: "#daeeff" };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[#daeeff]">Analytics</h1>
        <p className="text-[#4a7a94] text-sm">{user?.name} · Performance Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, delta, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 border border-[rgba(0,212,255,0.08)] bg-[#071428] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#4a7a94] text-sm">{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#daeeff]">{value}</p>
            <p className="text-xs" style={{ color }}>{delta} vs last week</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly patients chart */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Patients This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="patients" stroke="#00d4ff" fill="url(#pGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue chart */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Revenue This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a94", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#00e5a0" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Case mix */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider mb-4">Case Mix</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={specialtyData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {specialtyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {specialtyData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[#7ec8e3] text-xs">{d.name}</span>
                  </div>
                  <span className="text-[#daeeff] text-xs">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="rounded-xl border border-[rgba(0,212,255,0.08)] bg-[#071428] p-5 space-y-4">
          <h3 className="text-[#7ec8e3] text-sm uppercase tracking-wider">This Month</h3>
          {[
            { label: "Total Consultations", value: "312", bar: 75 },
            { label: "Prescriptions Issued", value: "298", bar: 70 },
            { label: "Investigations Ordered", value: "143", bar: 45 },
            { label: "Referrals", value: "18", bar: 12 },
          ].map(({ label, value, bar }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#4a7a94]">{label}</span>
                <span className="text-[#daeeff]">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(0,212,255,0.08)]">
                <div className="h-1.5 rounded-full" style={{ width: `${bar}%`, background: "linear-gradient(90deg, #00d4ff, #00e5a0)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
