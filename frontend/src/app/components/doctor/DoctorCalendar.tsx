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
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="apple-hero-text text-5xl mb-2 text-white">Calendar.</h1>
          <p className="text-[#86868b] font-medium text-xl">{format(selectedDate, "MMMM yyyy")}</p>
        </div>
        <button className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-[15px] flex items-center gap-2 hover:scale-[1.02]">
          <CalendarIcon className="w-5 h-5" /> Today
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x">
        {availableDates.map((date) => {
          const isSelected = date.getTime() === selectedDate.getTime();
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`snap-center flex-shrink-0 w-20 h-[104px] rounded-3xl flex flex-col items-center justify-center transition-all ${isSelected ? "bg-white text-black shadow-lg scale-105" : "apple-input text-white hover:border-white/20"}`}
            >
              <span className={`text-sm font-semibold mb-1 ${isSelected ? "text-black/60" : "text-[#86868b]"}`}>{days[date.getDay()]}</span>
              <span className="text-3xl font-bold tracking-tight">{format(date, "d")}</span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 px-2">
          <Clock className="w-5 h-5 text-[#32d74b]" />
          <h2 className="text-[15px] font-semibold text-[#86868b] uppercase tracking-widest">Appointments</h2>
        </div>
        
        {dayApps.length > 0 ? (
          <div className="apple-card overflow-hidden divide-y divide-white/5 border border-white/10">
            {dayApps.map((appt) => (
              <div key={appt.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {format(new Date(appt.slotStart), "HH:mm")}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white mb-1">{appt.patientName}</h3>
                    <p className="text-[#86868b] text-[15px] font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#32d74b]" /> {appt.status}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-[#86868b] group-hover:text-white transition-colors hidden md:block" />
              </div>
            ))}
          </div>
        ) : (
          <div className="apple-card p-16 text-center border border-dashed border-white/10">
            <Users className="w-16 h-16 text-[#86868b] mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">No appointments</h2>
            <p className="text-[#86868b] font-medium text-lg">Your schedule is clear for this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
