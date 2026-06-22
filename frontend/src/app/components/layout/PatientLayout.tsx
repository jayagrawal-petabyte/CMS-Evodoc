import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";
import { Home, Calendar, Clock, FileText, UserCircle, Activity, Bell, ChevronRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { to: "/patient", label: "Home", icon: Home, end: true },
  { to: "/patient/appointments", label: "Visits", icon: Calendar },
  { to: "/patient/queue", label: "Queue", icon: Clock },
  { to: "/patient/history", label: "Records", icon: FileText },
  { to: "/patient/profile", label: "Profile", icon: UserCircle },
];

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine current page title for the island
  const currentNav = navItems.find((item) => 
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = currentNav?.label || "MediCare";

  return (
    <div className="min-h-screen flex flex-col relative text-foreground selection:bg-primary selection:text-white font-sans overflow-x-hidden">
      <div className="apple-bg" />

      {/* DYNAMIC ISLAND (Global Top Nav) */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 md:pt-4 px-4 pointer-events-none">
        <motion.div
          layout
          onClick={() => setIslandExpanded(!islandExpanded)}
          initial={{ borderRadius: 32 }}
          animate={{
            width: islandExpanded ? (window.innerWidth < 768 ? "95%" : 400) : (scrolled ? 180 : 220),
            height: islandExpanded ? 160 : 44,
            borderRadius: islandExpanded ? 32 : 32,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-black border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden cursor-pointer pointer-events-auto flex flex-col relative"
        >
          {/* Default Compact State */}
          <div className="h-[44px] px-4 flex items-center justify-between w-full flex-shrink-0 absolute top-0 left-0">
            <AnimatePresence mode="popLayout">
              {!islandExpanded && (
                <motion.div
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#32d74b] animate-pulse" />
                    <span className="text-white text-[13px] font-semibold tracking-tight">{pageTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-[#86868b]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Expanded State */}
          <AnimatePresence>
            {islandExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 pt-4 w-full h-full flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center text-white font-bold border border-white/10">
                      {user?.avatarInitials}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Hello, {user?.name?.split(' ')[0]}</p>
                      <p className="text-[#86868b] text-xs">No active alerts</p>
                    </div>
                  </div>
                  <Bell className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex items-center justify-between mt-auto bg-white/5 rounded-2xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#32d74b]" />
                    <span className="text-white text-xs font-medium">System Online</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); logout(); navigate("/"); }} 
                    className="text-white text-sm flex items-center gap-1.5 font-bold bg-[#ff453a] px-4 py-2 rounded-xl shadow-lg shadow-[#ff453a]/30 hover:bg-[#ff6961] transition-all"
                  >
                    Sign Out <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <main className="flex-1 pb-32 md:pb-8 pt-16 md:pt-20">
        <Outlet />
      </main>

      {/* APPLE iOS DOCK / TAB BAR (Mobile Only) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="apple-glass rounded-[2rem] border border-white/10 p-2 flex justify-between items-center shadow-2xl backdrop-blur-2xl bg-black/40">
          {navItems.map((item) => {
            const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="relative flex-1 py-2 flex flex-col items-center justify-center group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/10 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-[22px] h-[22px] mb-1 transition-all ${isActive ? "text-white scale-110" : "text-[#86868b] group-hover:text-white"}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-semibold tracking-tight transition-colors ${isActive ? "text-white" : "text-[#86868b]"}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDE NAV OR FLOATING DOCK (Optional, currently desktop uses no nav except island? Let's add a floating dock for desktop too for that clean look) */}
      <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="apple-glass rounded-full border border-white/10 p-2 flex gap-2 items-center shadow-2xl backdrop-blur-2xl bg-black/40">
          {navItems.map((item) => {
            const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="relative px-6 py-3 flex items-center gap-2 group transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopActiveTab"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-[#86868b] group-hover:text-white"}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm font-semibold tracking-tight transition-colors ${isActive ? "text-white" : "text-[#86868b]"}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
