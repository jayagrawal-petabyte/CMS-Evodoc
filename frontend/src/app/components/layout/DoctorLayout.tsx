import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";
import { motion, AnimatePresence } from "motion/react";
import { ClipboardList, Calendar, BarChart3, UserCircle, LogOut, ChevronLeft, ChevronRight, Bell, Search, Menu, Activity } from "lucide-react";

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
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const currentNav = navItems.find((item) => 
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = currentNav?.label || "Clinical";

  return (
    <div className="flex h-screen overflow-hidden text-[#f5f5f7] selection:bg-[#2997ff] selection:text-white font-sans relative">
      <div className="apple-bg" />

      {/* DYNAMIC ISLAND (Mobile Only) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-4 pointer-events-none">
        <motion.div
          layout
          onClick={() => setIslandExpanded(!islandExpanded)}
          initial={{ borderRadius: 32 }}
          animate={{
            width: islandExpanded ? "95%" : (scrolled ? 160 : 200),
            height: islandExpanded ? 140 : 40,
            borderRadius: islandExpanded ? 32 : 32,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-black border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden cursor-pointer pointer-events-auto flex flex-col relative"
        >
          <div className="h-[40px] px-4 flex items-center justify-between w-full flex-shrink-0 absolute top-0 left-0">
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
                    <span className="text-white text-xs font-semibold tracking-tight">{pageTitle}</span>
                  </div>
                  <Bell className="w-4 h-4 text-[#86868b]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {islandExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 w-full h-full flex flex-col justify-between pt-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#32d74b] flex items-center justify-center text-black font-bold">
                      {user?.avatarInitials}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Dr. {user?.name?.split(' ')[0]}</p>
                      <p className="text-[#86868b] text-xs">Clinical Portal</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto bg-white/5 rounded-2xl p-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#32d74b]" />
                    <span className="text-white text-xs font-medium">Accepting Patients</span>
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
                    layoutId="doctorActiveTab"
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
      
      {/* Sidebar - macOS style frosted glass (Desktop Only) */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col border-r border-white/5 overflow-hidden flex-shrink-0 apple-glass z-40"
      >
        <div className="flex items-center gap-4 px-6 py-8 h-24">
          <div className="w-10 h-10 rounded-[0.85rem] flex items-center justify-center flex-shrink-0 bg-[#32d74b] shadow-[0_0_20px_rgba(50,215,75,0.3)]">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <p className="text-white font-bold text-lg tracking-tight leading-none whitespace-nowrap">Clinical</p>
                <p className="text-[#86868b] text-xs font-medium mt-1 whitespace-nowrap">Provider Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-none pt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.end ? false : location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-[#86868b] hover:bg-white/5 hover:text-white"
                  }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#86868b]'}`} strokeWidth={isActive ? 2.5 : 2} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[15px] font-medium tracking-tight whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={() => { logout(); navigate("/auth/doctor"); }} className={`flex items-center gap-4 px-4 py-3 rounded-2xl text-[#86868b] hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors ${collapsed ? 'justify-center w-full' : 'w-full'}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-[15px] font-medium tracking-tight">Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="h-14 border-t border-white/5 text-[#86868b] hover:text-white transition-colors flex items-center justify-center">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 relative z-10 bg-transparent pb-32 md:pb-8 pt-16 md:pt-0">
        {/* Top Header - macOS style (Desktop Only) */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-white/5 apple-glass supports-[backdrop-filter]:bg-transparent">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input 
                type="text" 
                placeholder="Search patients..." 
                className="apple-input rounded-full pl-10 pr-4 py-2 text-[15px] text-white placeholder:text-[#86868b] w-72 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#32d74b] shadow-[0_0_10px_#32d74b]" />
              <span className="text-[#86868b] text-sm font-medium tracking-tight">Online</span>
            </div>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#86868b] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center text-white font-semibold text-sm border border-white/10">
              {user?.avatarInitials}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
