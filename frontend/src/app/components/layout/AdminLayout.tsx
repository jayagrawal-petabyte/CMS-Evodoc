import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Users, Calendar, Clock, Wallet, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Activity, ClipboardList,
  UserPlus, Stethoscope, Shield, Bell, Search, Menu
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/queue", label: "Live Queue", icon: Clock },
  { to: "/admin/walkin", label: "Walk-in", icon: UserPlus },
  { to: "/admin/appointments", label: "Appointments", icon: Calendar },
  { to: "/admin/patients", label: "Patients", icon: Users },
  { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/admin/schedule", label: "Schedules", icon: ClipboardList },
  { to: "/admin/billing", label: "Billing", icon: Wallet },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/audit", label: "Audit Log", icon: Shield },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleLogout() {
    logout();
    navigate("/auth/admin");
  }

  return (
    <div className="flex h-screen overflow-hidden text-[#f5f5f7] selection:bg-[#2997ff] selection:text-white font-sans">
      <div className="apple-bg" />
      <div className="apple-bg" />
      
      {/* Sidebar - macOS style frosted glass */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col border-r border-white/5 overflow-hidden flex-shrink-0 apple-glass z-40"
      >
        <div className="flex items-center gap-4 px-6 py-8 h-24">
          <div className="w-10 h-10 rounded-[0.85rem] flex items-center justify-center flex-shrink-0 bg-white">
            <Menu className="w-5 h-5 text-black" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <p className="text-white font-bold text-lg tracking-tight leading-none whitespace-nowrap">Workspace</p>
                <p className="text-[#86868b] text-xs font-medium mt-1 whitespace-nowrap">Administration</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-none pt-4 pb-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.end ? false : location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-[#86868b] hover:bg-white/5 hover:text-white"
                  }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#86868b]'}`} strokeWidth={isActive ? 2.5 : 2} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[15px] font-medium tracking-tight whitespace-nowrap flex-1">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className={`flex items-center gap-4 px-4 py-3 rounded-2xl text-[#86868b] hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors ${collapsed ? 'justify-center w-full' : 'w-full'}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-[15px] font-medium tracking-tight">Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="h-14 border-t border-white/5 text-[#86868b] hover:text-white transition-colors flex items-center justify-center">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 relative z-10 bg-transparent">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 apple-glass supports-[backdrop-filter]:bg-transparent">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input 
                type="text" 
                placeholder="Search database..." 
                className="apple-input rounded-full pl-10 pr-4 py-2 text-[15px] text-white placeholder:text-[#86868b] w-72 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#bf5af2] shadow-[0_0_10px_#bf5af2]" />
              <span className="text-[#86868b] text-sm font-medium tracking-tight">System Online</span>
            </div>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#86868b] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center text-white font-semibold text-sm border border-white/10">
              {user?.avatarInitials}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
