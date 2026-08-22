import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Users, Calendar, Clock, Wallet, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Activity, ClipboardList,
  UserPlus, Stethoscope, Shield, Bell, Search
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/queue", label: "Live Queue", icon: Clock },
      { to: "/admin/walkin", label: "Walk-in", icon: UserPlus },
      { to: "/admin/appointments", label: "Appointments", icon: Calendar },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/admin/patients", label: "Patients", icon: Users },
      { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
      { to: "/admin/schedule", label: "Schedules", icon: ClipboardList },
    ],
  },
  {
    label: "Finance & Analytics",
    items: [
      { to: "/admin/billing", label: "Billing", icon: Wallet },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/audit", label: "Audit Log", icon: Shield },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Flat list for active detection
const allNavItems = navGroups.flatMap((g) => g.items);

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleLogout() {
    logout();
    navigate("/auth/admin");
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col bg-[#1a1d23] border-r border-white/5 overflow-hidden flex-shrink-0 z-40"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 h-[68px] border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.35)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                <p className="text-white font-bold text-base leading-none whitespace-nowrap">evodoc<span className="text-xs font-normal align-top ml-0.5 text-purple-400">®</span></p>
                <p className="text-gray-400 text-[11px] mt-0.5 whitespace-nowrap">Admin Workspace</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav groups with consistent vertical rhythm */}
        <nav className="flex-1 px-3 pt-3 pb-4 overflow-y-auto space-y-1">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="cms-section-label"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.to || (item.end ? false : location.pathname.startsWith(item.to));
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                        isActive ? "sidebar-item-active" : "sidebar-item"
                      } ${collapsed ? "justify-center" : ""}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={`w-[17px] h-[17px] flex-shrink-0 ${isActive ? "text-purple-400" : "text-gray-400 group-hover:text-gray-200"}`} strokeWidth={isActive ? 2.5 : 2} />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] font-medium whitespace-nowrap">
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Clinic Status Badge to eliminate dead space */}
        {!collapsed && (
          <div className="mx-3 mb-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-gray-300">Operations Live</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 mx-3 mb-2 mt-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-[calc(100%-24px)] cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-[13px] font-medium">Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-9 w-full border-t border-white/5 text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[68px] flex items-center justify-between px-8 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, token, doctor..."
              className="cms-input rounded-full pl-10 pr-4 py-2 text-sm w-72 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-600">Live Clinic Ops</span>
            </div>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="avatar-chip bg-gray-800 text-white text-xs">{initials}</div>
              <div>
                <p className="text-gray-800 font-semibold text-sm leading-none">{user?.name ?? "Admin"}</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
