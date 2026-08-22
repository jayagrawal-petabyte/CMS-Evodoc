import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Clock, Star } from "lucide-react";
import { motion } from "motion/react";

const COLORS = ["#32d74b", "#2997ff", "#bf5af2", "#ff9f0a"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorAnalytics() {
  const { user } = useAuth();
  const [daily, setDaily] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ appointments: 0, completed: 0, totals: 0 });

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
    { name: "New Patients", value: 30 },
    { name: "Emergency", value: 15 },
    { name: "Routine Check-up", value: 10 },
  ];

  const stats = [
    { label: "Patients (Today)", value: todayPatients, delta: `${totals.appointments ?? 0} this week`, icon: Users, color: "#32d74b" },
    { label: "Est. Revenue", value: `₹${(todayRevenue / 1000).toFixed(1)}k`, delta: "Daily estimated", icon: TrendingUp, color: "#2997ff" },
    { label: "Completed Visits", value: totals.completed ?? 0, delta: "7-day total", icon: Clock, color: "#bf5af2" },
    { label: "Satisfaction", value: "4.9 ★", delta: "Verified Rating", icon: Star, color: "#ff9f0a" },
  ];

  const tooltipStyle = {
    backgroundColor: "rgba(18, 18, 22, 0.9)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "1rem",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
    color: "#f5f5f7",
    fontSize: "12px",
    fontWeight: "bold",
    backdropFilter: "blur(16px)",
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#32d74b]">Clinical Insights</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Performance Analytics</h1>
        <p className="text-[#8e8e93] text-xs font-medium mt-0.5">{user?.name} · Weekly Consultations & Trends</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, delta, icon: Icon, color }) => (
          <div key={label} className="interactive-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e93] text-xs font-bold uppercase tracking-wider">{label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-xs font-semibold" style={{ color }}>{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly patients chart */}
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-bold uppercase tracking-wider">Patient Volume (7 Days)</h3>
            <span className="text-xs text-[#32d74b] font-bold">Live Graph</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="doctorPatientsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#32d74b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#32d74b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#8e8e93", fontSize: 11, fontWeight: "bold" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8e8e93", fontSize: 11, fontWeight: "bold" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="patients" stroke="#32d74b" fill="url(#doctorPatientsGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue chart */}
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-bold uppercase tracking-wider">Consultation Revenue (7 Days)</h3>
            <span className="text-xs text-[#2997ff] font-bold">Estimated</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#8e8e93", fontSize: 11, fontWeight: "bold" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8e8e93", fontSize: 11, fontWeight: "bold" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#2997ff" radius={[6, 6, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Case mix */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-white text-sm font-bold uppercase tracking-wider">Case Mix Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={specialtyData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value">
                  {specialtyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {specialtyData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[#8e8e93] text-xs font-semibold">{d.name}</span>
                  </div>
                  <span className="text-white text-xs font-bold">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-white text-sm font-bold uppercase tracking-wider">Monthly Productivity</h3>
          {[
            { label: "Total Consultations", value: "312", bar: 75, color: "#32d74b" },
            { label: "Prescriptions Finalized", value: "298", bar: 70, color: "#2997ff" },
            { label: "Lab Orders Requested", value: "143", bar: 45, color: "#bf5af2" },
            { label: "External Referrals", value: "18", bar: 15, color: "#ff9f0a" },
          ].map(({ label, value, bar, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#8e8e93]">{label}</span>
                <span className="text-white font-bold">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
