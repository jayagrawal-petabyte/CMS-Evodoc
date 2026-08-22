import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { Calendar as CalendarIcon, Clock, ChevronRight, Activity, Users } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorCalendar() {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [myApps, setMyApps] = useState<any[]>([]);

  const availableDates = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

  useEffect(() => {
    const start = startOfDay(new Date());
    const end = addDays(start, 8);
    api<any[]>(`/appointments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then((rows) => setMyApps(rows ?? []))
      .catch(() => setMyApps([]));
  }, []);

  const dayApps = myApps.filter((a) => {
    const d = new Date(a.slotStart);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#32d74b]">Schedule Planner</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Doctor Calendar</h1>
          <p className="text-[#8e8e93] font-medium text-xs mt-0.5">{format(selectedDate, "MMMM yyyy")}</p>
        </div>
        <button onClick={() => setSelectedDate(today)} className="bg-[#32d74b] text-black px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#2bc242] transition-all shadow-md shadow-[#32d74b]/20">
          <CalendarIcon className="w-4 h-4" /> Today
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
        {availableDates.map((date) => {
          const isSelected = date.getTime() === selectedDate.getTime();
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`snap-center flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center transition-all ${
                isSelected 
                  ? "bg-white text-black shadow-xl scale-105 font-bold" 
                  : "apple-glass text-white border border-white/10 hover:border-white/20"
              }`}
            >
              <span className={`text-[11px] font-bold uppercase mb-0.5 ${isSelected ? "text-black/70" : "text-[#8e8e93]"}`}>{days[date.getDay()]}</span>
              <span className="text-2xl font-black">{format(date, "d")}</span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Clock className="w-4 h-4 text-[#32d74b]" />
          <h2 className="text-xs font-bold text-[#8e8e93] uppercase tracking-widest">Scheduled Consultations ({dayApps.length})</h2>
        </div>
        
        {dayApps.length > 0 ? (
          <div className="space-y-3">
            {dayApps.map((appt) => (
              <div key={appt.id} className="interactive-card p-4 md:p-5 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {format(new Date(appt.slotStart), "HH:mm")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white mb-0.5">{appt.patientName}</h3>
                    <p className="text-[#8e8e93] text-xs font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#32d74b]" /> {appt.status}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8e8e93] group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          <div className="apple-card p-12 text-center">
            <Users className="w-12 h-12 text-[#8e8e93] mx-auto mb-3 opacity-40" />
            <h2 className="text-lg font-bold tracking-tight text-white mb-1">No appointments scheduled</h2>
            <p className="text-[#8e8e93] font-medium text-xs">Your calendar is completely open for this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
