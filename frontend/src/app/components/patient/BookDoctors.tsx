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
            reviews: "Verified",
            roomNumber: d.roomNumber ?? "OPD 1",
            consultationFee: d.consultationFee ?? "500",
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
    <div className="max-w-6xl mx-auto py-8 space-y-8 text-foreground font-sans">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#2997ff]">Specialist Directory</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Find a Doctor</h1>
        <p className="text-[#8e8e93] font-medium text-sm max-w-xl">Browse expert physicians, review consultation details, and book instant appointment slots.</p>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
          <input
            type="text"
            placeholder="Search doctors, specializations, symptoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 apple-input text-white rounded-2xl pl-11 pr-4 text-sm focus:outline-none placeholder:text-[#666] transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSpec("all")}
            className={`flex-shrink-0 px-5 h-12 rounded-2xl font-bold text-xs transition-all ${selectedSpec === "all" ? "bg-white text-black shadow-lg" : "apple-glass text-[#8e8e93] hover:text-white border border-white/5"}`}
          >
            All Specializations
          </button>
          {specializations.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSpec(s.id)}
              className={`flex-shrink-0 px-5 h-12 rounded-2xl font-bold text-xs transition-all ${selectedSpec === s.id ? "bg-[#2997ff] text-white shadow-lg shadow-[#2997ff]/30" : "apple-glass text-[#8e8e93] hover:text-white border border-white/5"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/book/${d.id}`)}
            className="interactive-card p-6 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex gap-4 items-start mb-5">
                <div className="w-16 h-16 rounded-2xl bg-[#27272a] border border-white/10 overflow-hidden flex-shrink-0 shadow-md">
                  {d.imageUrl ? (
                    <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-black bg-gradient-to-br from-[#27272a] to-[#3f3f46]">
                      {d.name.replace("Dr. ", "").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold tracking-tight text-white truncate group-hover:text-[#2997ff] transition-colors">{d.name}</h3>
                  <p className="text-xs font-semibold text-[#2997ff] mt-0.5">{d.specialization}</p>
                  <div className="flex items-center gap-1.5 text-xs text-[#8e8e93] mt-2 font-medium">
                    <Star className="w-3.5 h-3.5 text-[#ff9f0a] fill-current" />
                    <span className="text-white font-bold">{d.rating}</span>
                    <span className="text-[#666]">({d.reviews})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 py-3 border-y border-white/5">
                <div className="flex items-center gap-2.5 text-[#8e8e93] text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#2997ff]" /> <span>Room: {d.roomNumber || "Consultation Suite"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#8e8e93] text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#32d74b]" /> <span>Accepting Appointments</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8e8e93] tracking-wider">Fee</p>
                <span className="text-white font-black text-base">₹{d.consultationFee}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center group-hover:scale-110 shadow-md transition-transform">
                <ChevronRight className="w-4 h-4 text-black" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center apple-card">
          <Activity className="w-12 h-12 text-[#8e8e93] mx-auto mb-3 opacity-50" />
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">No doctors found</h2>
          <p className="text-[#8e8e93] font-medium text-xs">Try adjusting your filters or search term.</p>
        </div>
      )}
    </div>
  );
}
