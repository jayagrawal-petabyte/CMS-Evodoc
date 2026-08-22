import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion, AnimatePresence } from "motion/react";
import { ClipboardList, Calendar, BarChart3, UserCircle, LogOut, ChevronLeft, ChevronRight, Bell, Search, Activity } from "lucide-react";

const navItems = [
  { to: "/doctor", label: "Queue", icon: ClipboardList, end: true },
  { to: "/doctor/calendar", label: "Calendar", icon: Calendar },
  { to: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/doctor/profile", label: "Profile", icon: UserCircle },
];

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    const handleScroll = () => setScrolled(window.scrollY > 20);

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = currentNav?.label || "Clinical";

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "DR";

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* ── Mobile Dynamic Island ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-4 pointer-events-none">
        <motion.div
          layout
          onClick={() => setIslandExpanded(!islandExpanded)}
          animate={{
            width: islandExpanded ? "92%" : scrolled ? 160 : 200,
            height: islandExpanded ? 148 : 42,
            borderRadius: 28,
          }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          className="bg-[#1a1d23] shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden cursor-pointer pointer-events-auto flex flex-col relative"
        >
          <div className="h-[42px] px-4 flex items-center justify-between w-full flex-shrink-0 absolute top-0 left-0">
            <AnimatePresence mode="popLayout">
              {!islandExpanded && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white text-[13px] font-semibold">{pageTitle}</span>
                  </div>
                  <Bell className="w-4 h-4 text-gray-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {islandExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="p-5 pt-4 w-full h-full flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="avatar-chip bg-green-100 text-green-700 w-10 h-10 text-sm">{initials}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">Dr. {user?.name?.split(" ")[0]}</p>
                    <p className="text-gray-400 text-xs">Clinical Provider</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto bg-white/5 rounded-2xl p-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white text-xs font-medium">Accepting Patients</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); logout(); navigate("/"); }}
                    className="text-white text-xs flex items-center gap-1.5 font-semibold bg-red-500 px-3 py-1.5 rounded-xl"
                  >
                    Sign Out <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col bg-[#1a1d23] border-r border-white/5 overflow-hidden flex-shrink-0 z-40"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 h-[68px] border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                <p className="text-white font-bold text-base leading-none whitespace-nowrap">evodoc<span className="text-xs font-normal align-top ml-0.5 text-emerald-400">®</span></p>
                <p className="text-gray-400 text-[11px] mt-0.5 whitespace-nowrap">Clinical Provider</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav with consistent vertical rhythm */}
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group ${
                  isActive ? "sidebar-item-active" : "sidebar-item"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-emerald-400" : "text-gray-400 group-hover:text-gray-200"}`} strokeWidth={isActive ? 2.5 : 2} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13.5px] font-medium whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* Clinic Status Badge to eliminate dead space */}
        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-2xl bg-white/[0.04] border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-gray-300">OPD Console Ready</span>
            </div>
            <p className="text-[10px] text-gray-500">Live queue sync active</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5">
          <button
            onClick={() => { logout(); navigate("/"); }}
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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="hidden md:flex h-[68px] items-center justify-between px-8 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients in queue..."
              className="cms-input rounded-full pl-10 pr-4 py-2 text-sm w-72 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Consultation Ready</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="avatar-chip bg-gray-100 text-gray-700 text-xs">{initials}</div>
              <div>
                <p className="text-gray-800 font-semibold text-sm leading-none">Dr. {user?.name?.split(" ")[0] ?? "Doctor"}</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Clinical Provider</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-28 md:pb-0">
          <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-gray-900" : "text-gray-400"}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-semibold ${isActive ? "text-gray-900" : "text-gray-400"}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
