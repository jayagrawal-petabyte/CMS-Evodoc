import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Activity,
  Stethoscope,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  X,
  Search,
  CheckCircle2,
  HeartPulse,
  Users,
  FileText,
  Building2,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/book");
    } else {
      navigate("/book");
    }
  }

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setIsContactOpen(false);
      setContactForm({ name: "", email: "", message: "" });
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#111827] relative selection:bg-[#111827] selection:text-white overflow-x-hidden font-sans">
      {/* ── Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 md:px-14 z-40 bg-[#faf8f5]/85 backdrop-blur-md border-b border-[#eee8df]/70 transition-all">
        {/* Left: Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-bold text-2xl tracking-tight text-[#111827] flex items-center">
            evodoc<span className="text-xs font-normal align-top ml-0.5 opacity-80">®</span>
          </span>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-[13.5px] font-medium text-[#555048]">
          <a href="#features" className="hover:text-[#111827] transition-colors">Solutions</a>
          <a href="#specialties" className="hover:text-[#111827] transition-colors">Specialties</a>
          <Link to="/book" className="hover:text-[#111827] transition-colors">Book Doctor</Link>
          <button
            onClick={() => setIsContactOpen(true)}
            className="hover:text-[#111827] transition-colors cursor-pointer"
          >
            Contact Us
          </button>
        </nav>

        {/* Right: Auth Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            onClick={() => setIsContactOpen(true)}
            className="lg:hidden text-xs font-semibold px-3 py-1.5 text-[#555048] hover:text-[#111827]"
          >
            Contact
          </button>
          <Link
            to="/auth/doctor"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-[#44403c] hover:text-[#111827] hover:bg-[#efece6] transition-all"
          >
            <Stethoscope className="w-3.5 h-3.5" /> Doctor Login
          </Link>
          <Link
            to="/auth/admin"
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-[#44403c] hover:text-[#111827] hover:bg-[#efece6] transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Admin
          </Link>
          <Link
            to="/auth/patient"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs md:text-[13px] font-semibold bg-[#111827] text-white hover:bg-[#27272a] shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            Patient Login
          </Link>
        </div>
      </header>

      {/* ── Main Hero Section (Pic 1 Inspired) ── */}
      <main className="pt-32 md:pt-40 pb-20 px-6 md:px-12 max-w-[1240px] mx-auto flex flex-col items-center text-center relative z-10">
        {/* Subtle Announcement Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f1ede4] border border-[#e6dfd3] text-xs font-medium text-[#5c554b] mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#111827] animate-pulse" />
          <span>evodoc 2.0 is live · Next-Gen Clinical Management</span>
        </motion.div>

        {/* Hero Headline (Editorial Serif & Clean Sans) */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal tracking-tight text-[#111827] leading-[1.12] max-w-4xl mx-auto mb-6"
        >
          One clinical platform. Every workflow. Complete care.
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-[#6b645b] max-w-2xl mx-auto font-normal leading-relaxed mb-10"
        >
          Coordinate outpatient queues, streamline clinical EMR worksheets, and empower doctors, patients, and administrators with real-time operational intelligence.
        </motion.p>

        {/* Dual Primary Call-to-Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3.5 mb-16"
        >
          <Link
            to="/auth/patient"
            className="px-7 py-3.5 rounded-full bg-[#111827] text-white text-sm font-semibold hover:bg-black hover:shadow-lg transition-all flex items-center gap-2"
          >
            Patient Portal <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/auth/doctor"
            className="px-7 py-3.5 rounded-full bg-[#ede8df] hover:bg-[#e4ddd2] text-[#2c2824] text-sm font-semibold transition-all border border-[#dfd7c9] flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4 text-[#44403c]" /> Provider Access
          </Link>
          <Link
            to="/auth/admin"
            className="px-6 py-3.5 rounded-full bg-transparent hover:bg-[#ede8df]/60 text-[#555048] text-sm font-semibold transition-all"
          >
            Staff Admin Login
          </Link>
        </motion.div>

        {/* ── Interactive Feature Console Mockup (Bottom Card from Pic 1) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-3xl relative mx-auto"
        >
          {/* Main Card */}
          <div className="bg-[#fcfbf9] rounded-2xl md:rounded-3xl p-4 sm:p-6 border border-[#e6dfd3] shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative z-20 text-left">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symptoms, find specialists, or check OPD schedule..."
                  className="w-full bg-transparent border-none text-sm md:text-base text-[#111827] placeholder:text-[#8c8478] focus:outline-none py-2 pr-12 font-medium"
                />
              </div>

              <div className="pt-2 border-t border-[#ede7dc] flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Quick Quick Access Chips */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <Link
                    to="/book"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0ebe1] hover:bg-[#e6dfd3] text-[#44403c] font-medium transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#2563eb]" /> Book Visit
                  </Link>
                  <Link
                    to="/auth/patient"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0ebe1] hover:bg-[#e6dfd3] text-[#44403c] font-medium transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#d97706]" /> Live Queue
                  </Link>
                  <Link
                    to="/auth/doctor"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0ebe1] hover:bg-[#e6dfd3] text-[#44403c] font-medium transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#16a34a]" /> EMR Consult
                  </Link>
                </div>

                {/* Dropdown Chip & Submit Button */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#736c61] bg-[#efeae0] px-2.5 py-1 rounded-md">
                    evodoc Clinical v2.0
                  </span>
                  <button
                    type="submit"
                    className="w-9 h-9 rounded-full bg-[#111827] text-white flex items-center justify-center hover:bg-black transition-all shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ── Artistic Botanical / Medical Line Illustrations (Pic 1 Inspired) ── */}
          <div className="hidden md:block absolute -left-28 -bottom-10 w-52 h-52 pointer-events-none opacity-60 z-10">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#38332d]">
              <path d="M40 180 C40 120, 80 80, 140 40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M60 150 C70 130, 95 125, 110 135 C115 145, 95 160, 60 150 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M90 120 C100 95, 130 90, 145 105 C150 118, 128 135, 90 120 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M115 85 C120 65, 150 60, 165 75 C170 88, 148 102, 115 85 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <circle cx="140" cy="40" r="4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>

          <div className="hidden md:block absolute -right-28 -bottom-10 w-56 h-56 pointer-events-none opacity-60 z-10">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#38332d]">
              <path d="M160 180 C160 120, 120 80, 60 40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M140 150 C130 130, 105 125, 90 135 C85 145, 105 160, 140 150 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M110 120 C100 95, 70 90, 55 105 C50 118, 72 135, 110 120 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M85 85 C80 65, 50 60, 35 75 C30 88, 52 102, 85 85 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <circle cx="60" cy="40" r="4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
        </motion.div>
      </main>

      {/* ── Key Metrics & Highlights Bar ── */}
      <section className="py-14 border-y border-[#ede6da] bg-[#f5f1e8]/60 relative z-20">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-serif font-bold text-[#111827] mb-1">99.98%</p>
            <p className="text-xs font-semibold text-[#736c61] uppercase tracking-wider">Queue Reliability</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-serif font-bold text-[#111827] mb-1">4.2 min</p>
            <p className="text-xs font-semibold text-[#736c61] uppercase tracking-wider">Average Triage Time</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-serif font-bold text-[#111827] mb-1">100%</p>
            <p className="text-xs font-semibold text-[#736c61] uppercase tracking-wider">Digital EMR Records</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-serif font-bold text-[#111827] mb-1">24 / 7</p>
            <p className="text-xs font-semibold text-[#736c61] uppercase tracking-wider">Clinic Telemetry</p>
          </div>
        </div>
      </section>

      {/* ── 3 Role Portals Overview Section ── */}
      <section id="features" className="py-20 px-6 md:px-12 max-w-[1240px] mx-auto relative z-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#857b6d] bg-[#f0ebe0] px-3 py-1 rounded-full border border-[#e2dacb]">
            Unified Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#111827] mt-3 mb-3">
            Tailored experiences for every clinical stakeholder
          </h2>
          <p className="text-sm md:text-base text-[#6b645b]">
            Seamlessly interconnecting patients, consulting physicians, and administrative desks.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-7">
          {/* Patient Portal Card */}
          <div className="bg-[#fcfbf9] rounded-3xl p-8 border border-[#e6dfd3] hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#e8f1fd] text-[#2563eb] flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb] bg-[#eef4ff] px-2.5 py-0.5 rounded-full">
                For Patients
              </span>
              <h3 className="text-xl font-bold text-[#111827] mt-3 mb-2">Patient Portal</h3>
              <p className="text-sm text-[#666056] leading-relaxed mb-6">
                Book specialty appointments, track live OPD token numbers in real-time, and download verified digital prescriptions.
              </p>
            </div>
            <Link
              to="/auth/patient"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] group-hover:translate-x-1 transition-transform"
            >
              Sign In as Patient <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Doctor Portal Card */}
          <div className="bg-[#fcfbf9] rounded-3xl p-8 border border-[#e6dfd3] hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6ee] text-[#16a34a] flex items-center justify-center mb-6">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16a34a] bg-[#ecfdf5] px-2.5 py-0.5 rounded-full">
                For Doctors
              </span>
              <h3 className="text-xl font-bold text-[#111827] mt-3 mb-2">Doctor Clinical Suite</h3>
              <p className="text-sm text-[#666056] leading-relaxed mb-6">
                Rapid OPD queue management, structured diagnosis worksheets, fast medicine auto-complete, and patient medical history.
              </p>
            </div>
            <Link
              to="/auth/doctor"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#16a34a] group-hover:translate-x-1 transition-transform"
            >
              Sign In as Doctor <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-[#fcfbf9] rounded-3xl p-8 border border-[#e6dfd3] hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#f3effb] text-[#9333ea] flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9333ea] bg-[#f5f0ff] px-2.5 py-0.5 rounded-full">
                For Administration
              </span>
              <h3 className="text-xl font-bold text-[#111827] mt-3 mb-2">Staff & Operations</h3>
              <p className="text-sm text-[#666056] leading-relaxed mb-6">
                Comprehensive token generation, walk-in patient triage, doctor schedule management, invoice billing, and audit logs.
              </p>
            </div>
            <Link
              to="/auth/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#9333ea] group-hover:translate-x-1 transition-transform"
            >
              Sign In as Staff Admin <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#ede6da] bg-[#f5f1e8]/80 py-12 px-6 md:px-14 text-[#736c61]">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-[#111827]">evodoc®</span>
            <span className="text-[#8c8478]">· Intelligent Clinical Management System</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/auth/patient" className="hover:text-[#111827] transition-colors">Patient Login</Link>
            <Link to="/auth/doctor" className="hover:text-[#111827] transition-colors">Doctor Login</Link>
            <Link to="/auth/admin" className="hover:text-[#111827] transition-colors">Staff Admin</Link>
            <button onClick={() => setIsContactOpen(true)} className="hover:text-[#111827] transition-colors">
              Contact Desk
            </button>
          </div>
          <p>© {new Date().getFullYear()} evodoc CMS. All rights reserved.</p>
        </div>
      </footer>

      {/* ── Contact Us Modal ── */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#faf8f5] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#e6dfd3] shadow-2xl relative"
            >
              <button
                onClick={() => setIsContactOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#f0ebe1] hover:bg-[#e4ded2] text-[#44403c] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Support & Inquiries</span>
                <h3 className="text-2xl font-serif font-bold text-[#111827] mt-1">Get in touch with evodoc</h3>
                <p className="text-xs text-[#6b645b] mt-1">
                  Have a question about our clinic management system or need immediate assistance?
                </p>
              </div>

              {contactSubmitted ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-[#111827]">Message Received</h4>
                  <p className="text-xs text-[#6b645b]">Our clinical support desk will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Dr. Jane Smith or Maya"
                      className="w-full bg-white border border-[#ded7ca] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9c9488] focus:outline-none focus:border-[#111827] shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@clinic.com"
                      className="w-full bg-white border border-[#ded7ca] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9c9488] focus:outline-none focus:border-[#111827] shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1.5">Message / Inquiry</label>
                    <textarea
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Tell us how we can help..."
                      className="w-full bg-white border border-[#ded7ca] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9c9488] focus:outline-none focus:border-[#111827] shadow-sm resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div className="text-[11px] text-[#787165]">
                      <p className="font-semibold text-[#111827] flex items-center gap-1"><Phone className="w-3 h-3 text-[#2563eb]" /> 1800-EVO-CARE</p>
                      <p>support@evodoc.health</p>
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-[#111827] text-white text-xs font-bold hover:bg-black transition-all"
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
