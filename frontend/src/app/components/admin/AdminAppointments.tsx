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
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase()) || a.doctorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchDoctor = doctorFilter === "all" || a.doctorId === doctorFilter;
    return matchSearch && matchStatus && matchDoctor;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-medium">Appointments</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or doctor..."
            className="bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring w-64" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Status</option>
          <option>Scheduled</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {["Patient", "Doctor", "Date & Time", "Source", "Status", ""].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-muted-foreground text-xs uppercase tracking-wider font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((appt) => {
              return (
                <tr key={appt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-foreground text-sm font-medium">{appt.patientName}</p>
                    {appt.notes && <p className="text-muted-foreground text-xs truncate max-w-[160px]">{appt.notes}</p>}
                  </td>
                  <td className="px-5 py-4 text-foreground text-sm">{appt.doctorName}</td>
                  <td className="px-5 py-4">
                    <p className="text-foreground text-sm">{new Date(appt.slotStart).toLocaleDateString("en-IN")}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(appt.slotStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-muted border border-border text-foreground text-xs">{appt.source}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      appt.status === "Scheduled" ? "bg-primary/10 text-primary border-primary/20" :
                      appt.status === "Completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      "bg-destructive/10 text-destructive border-destructive/20"
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {!["Completed", "Cancelled"].includes(appt.status) && (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setStatus(appt.id, "Completed")}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setStatus(appt.id, "Cancelled")}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No appointments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
