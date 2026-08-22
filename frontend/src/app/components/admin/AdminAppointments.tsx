import { useState, useEffect, useCallback } from "react";
import { api, apiPatch } from "../lib/api";
import { Calendar, Clock, Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminAppointments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const load = useCallback(() => {
    api<any[]>("/appointments")
      .then((rows) => setAppointments((rows ?? []).map((a) => ({
        ...a,
        doctorName: a.doctorName ? `Dr. ${a.doctorName}`.replace(/^Dr\. Dr\./, "Dr.") : "Doctor",
      }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api<any[]>("/doctors")
      .then((rows) => setDoctors((rows ?? []).map((d) => ({ id: d.id, name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr.") }))))
      .catch(() => {});
  }, [load]);

  async function setStatus(id: string, status: string) {
    try {
      await apiPatch(`/appointments/${id}/status`, { status });
      toast.success(status === "Completed" ? "Appointment marked complete" : "Appointment cancelled");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update appointment");
    }
  }

  const filtered = appointments.filter((a) => {
    const matchSearch = (a.patientName ?? "").toLowerCase().includes(search.toLowerCase()) || (a.doctorName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchDoctor = doctorFilter === "all" || a.doctorId === doctorFilter;
    return matchSearch && matchStatus && matchDoctor;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#bf5af2]">Bookings Master</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Appointments</h1>
          <p className="text-[#8e8e93] text-xs font-medium mt-0.5">{filtered.length} total scheduled consultations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or doctor..."
            className="w-full apple-input rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder:text-[#555] text-xs focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="apple-glass border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer">
          <option value="all" className="bg-[#121216]">All Statuses</option>
          <option value="Scheduled" className="bg-[#121216]">Scheduled</option>
          <option value="Completed" className="bg-[#121216]">Completed</option>
          <option value="Cancelled" className="bg-[#121216]">Cancelled</option>
        </select>
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
          className="apple-glass border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer">
          <option value="all" className="bg-[#121216]">All Specialists</option>
          {doctors.map((d) => <option key={d.id} value={d.id} className="bg-[#121216]">{d.name}</option>)}
        </select>
      </div>

      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {["Patient", "Doctor", "Date & Time", "Source", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[#8e8e93] text-xs uppercase tracking-wider font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((appt) => {
                return (
                  <tr key={appt.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white text-sm font-bold">{appt.patientName}</p>
                      {appt.notes && <p className="text-[#8e8e93] text-xs truncate max-w-[180px] font-medium">{appt.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-white text-sm font-medium">{appt.doctorName}</td>
                    <td className="px-6 py-4">
                      <p className="text-white text-xs font-bold">{new Date(appt.slotStart).toLocaleDateString("en-IN")}</p>
                      <p className="text-[#8e8e93] text-xs flex items-center gap-1.5 mt-0.5 font-medium">
                        <Clock className="w-3 h-3 text-[#bf5af2]" />
                        {new Date(appt.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full apple-glass border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">{appt.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        appt.status === "Scheduled" ? "bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20" :
                        appt.status === "Completed" ? "bg-[#32d74b]/10 text-[#32d74b] border-[#32d74b]/20" :
                        "bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20"
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {!["Completed", "Cancelled"].includes(appt.status) && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setStatus(appt.id, "Completed")} title="Mark Complete"
                            className="p-2 rounded-xl text-[#8e8e93] hover:text-[#32d74b] hover:bg-[#32d74b]/10 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setStatus(appt.id, "Cancelled")} title="Cancel"
                            className="p-2 rounded-xl text-[#8e8e93] hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[#8e8e93]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold text-white mb-0.5">No appointments found</p>
            <p className="text-xs">Adjust your search parameters to view more records.</p>
          </div>
        )}
      </div>
    </div>
  );
}
