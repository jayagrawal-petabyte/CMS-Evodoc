import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { Search, Star, Clock, ChevronRight, Activity, Filter, MapPin } from "lucide-react";

export default function BookDoctors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("all");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/doctors?active=true")
      .then((rows) =>
        setDoctors(
          (rows ?? []).map((d) => ({
            id: d.id,
            name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
            specialization: d.specializationName ?? "",
            specializationId: d.specializationId,
            isActive: d.isActive ?? true,
            imageUrl: d.avatarUrl ?? null,
            rating: "4.9",
            reviews: "New",
            roomNumber: "",
            consultationFee: d.consultationFee ?? "—",
          }))
        )
      )
      .catch(() => setDoctors([]));
    api<any[]>("/specializations").then((s) => setSpecializations(s ?? [])).catch(() => {});
  }, []);

  const filtered = doctors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase());
    const matchSpec = selectedSpec === "all" || d.specializationId === selectedSpec;
    return matchSearch && matchSpec && d.isActive;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-16 space-y-10 text-foreground font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center md:text-left space-y-4">
        <h1 className="apple-hero-text text-[3rem] md:text-[4.5rem] tracking-tighter text-white">Find a Doctor.</h1>
        <p className="text-[#86868b] font-medium text-lg md:text-xl max-w-2xl">Browse our top specialists and schedule your consultation instantly.</p>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search doctors, conditions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 apple-input text-white rounded-full pl-12 pr-4 text-[17px] focus:outline-none focus:ring-2 focus:ring-[#2997ff]/50 placeholder:text-[#86868b] transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSpec("all")}
            className={`flex-shrink-0 px-6 h-14 rounded-full font-semibold text-[15px] transition-all ${selectedSpec === "all" ? "bg-white text-black" : "apple-input text-white border border-white/5"}`}
          >
            All
          </button>
          {specializations.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSpec(s.id)}
              className={`flex-shrink-0 px-6 h-14 rounded-full font-semibold text-[15px] transition-all ${selectedSpec === s.id ? "bg-white text-black" : "apple-input text-white border border-white/5"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/book/${d.id}`)}
            className="apple-card p-6 flex flex-col group cursor-pointer border border-transparent hover:border-white/10 transition-colors"
          >
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded-full bg-[#2c2c2e] border border-white/10 overflow-hidden flex-shrink-0">
                {d.imageUrl ? (
                  <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]">
                    {d.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white mb-1 group-hover:text-primary transition-colors">{d.name}</h3>
                <p className="text-[#2997ff] text-[15px] font-semibold tracking-tight mb-2">{d.specialization}</p>
                <div className="flex items-center gap-1 text-[#86868b] text-sm font-medium">
                  <Star className="w-4 h-4 text-[#ff9f0a] fill-current" />
                  <span className="text-white">{d.rating}</span>
                  <span>({d.reviews})</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-auto">
              <div className="flex items-center gap-3 text-[#86868b] text-[15px] font-medium">
                <MapPin className="w-5 h-5" /> <span>Clinic {d.roomNumber}</span>
              </div>
              <div className="flex items-center gap-3 text-[#86868b] text-[15px] font-medium">
                <Clock className="w-5 h-5" /> <span>Available Today</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
              <span className="text-white font-bold text-lg">${d.consultationFee}</span>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChevronRight className="w-5 h-5 text-black" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-24 text-center apple-card">
          <Activity className="w-16 h-16 text-[#86868b] mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">No doctors found</h2>
          <p className="text-[#86868b] font-medium text-lg">Try adjusting your filters or search term.</p>
        </div>
      )}
    </div>
  );
}
