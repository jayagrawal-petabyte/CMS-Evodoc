import { useState, useEffect } from "react";
import { api, apiPut } from "../lib/api";
import { Calendar, Clock, Save } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ScheduleManagement() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/doctors").then((rows) => {
      const list = (rows ?? []).map((d) => ({
        id: d.id,
        name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
        specialization: d.specializationName || "General",
        schedule: (d.schedules ?? []).map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: (s.startTime ?? "09:00").slice(0, 5),
          endTime: (s.endTime ?? "17:00").slice(0, 5),
          slotDurationMinutes: s.slotDurationMinutes ?? 15,
          isActive: s.isActive ?? true,
        })),
      }));
      setDoctors(list);
      if (list.length) { setSelectedDoctor(list[0].id); setSchedule(list[0].schedule); }
    }).catch(() => {});
  }, []);

  const doctor = doctors.find((d) => d.id === selectedDoctor) ?? { id: "", name: "", schedule: [] };

  function toggleDay(dayOfWeek: number) {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.dayOfWeek === dayOfWeek);
      if (existing) return prev.map((s) => s.dayOfWeek === dayOfWeek ? { ...s, isActive: !s.isActive } : s);
      return [...prev, { dayOfWeek, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 15, isActive: true }];
    });
  }

  function updateSchedule(dayOfWeek: number, key: string, value: string | number) {
    setSchedule((prev) => prev.map((s) => s.dayOfWeek === dayOfWeek ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!selectedDoctor) return;
    try {
      await apiPut(`/doctors/${selectedDoctor}/schedule`, {
        schedules: schedule.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes,
          isActive: s.isActive,
        })),
      });
      toast.success("Schedule updated for " + doctor.name);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save schedule");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#daeeff]">Schedule Management</h1>
          <p className="text-[#4a7a94] text-sm">Set weekly availability for doctors</p>
        </div>
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#040d1a]" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", color: "white" }}>
          <Save className="w-4 h-4" /> Save Schedule
        </button>
      </div>

      <div>
        <label className="block text-[#7ec8e3] text-sm mb-2">Select Doctor</label>
        <select value={selectedDoctor} onChange={(e) => { setSelectedDoctor(e.target.value); setSchedule(doctors.find((d) => d.id === e.target.value)?.schedule ?? []); }}
          className="w-full bg-[#071428] border border-[rgba(0,212,255,0.12)] rounded-xl px-4 py-3 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]">
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, dayIdx) => {
          const daySchedule = schedule.find((s) => s.dayOfWeek === dayIdx);
          const isActive = daySchedule?.isActive ?? false;
          return (
            <div key={day} className={`rounded-xl border p-4 transition-all ${isActive ? "border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)]" : "border-[rgba(0,212,255,0.07)] bg-[#071428] opacity-60"}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 flex-shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? "bg-[rgba(0,212,255,0.3)]" : "bg-[rgba(0,212,255,0.08)]"}`}
                      onClick={() => toggleDay(dayIdx)}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${isActive ? "left-[calc(100%-18px)] bg-[#00d4ff]" : "left-0.5 bg-[#4a7a94]"}`} />
                    </div>
                  </label>
                </div>
                <span className={`text-sm font-medium w-10 ${isActive ? "text-[#daeeff]" : "text-[#4a7a94]"}`}>{day}</span>

                {isActive && daySchedule && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#4a7a94]" />
                      <input type="time" value={daySchedule.startTime}
                        onChange={(e) => updateSchedule(dayIdx, "startTime", e.target.value)}
                        className="bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-lg px-3 py-1.5 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]" />
                      <span className="text-[#4a7a94] text-sm">to</span>
                      <input type="time" value={daySchedule.endTime}
                        onChange={(e) => updateSchedule(dayIdx, "endTime", e.target.value)}
                        className="bg-[#0a1930] border border-[rgba(0,212,255,0.15)] rounded-lg px-3 py-1.5 text-[#daeeff] text-sm focus:outline-none focus:border-[rgba(0,212,255,0.3)]" />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[#4a7a94] text-xs">Slot:</span>
                      <select value={daySchedule.slotDurationMinutes}
                        onChange={(e) => updateSchedule(dayIdx, "slotDurationMinutes", parseInt(e.target.value))}
                        className="bg-[#0a1930] border border-[rgba(0,212,255,0.12)] rounded-lg px-2 py-1.5 text-[#daeeff] text-sm focus:outline-none">
                        {[10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {!isActive && <span className="text-[#4a7a94] text-sm">No availability</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
