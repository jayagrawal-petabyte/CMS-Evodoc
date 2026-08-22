import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { api, apiPost } from "../lib/api";
import { toast } from "sonner";
import { ChevronLeft, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function generateSlots(start: string, end: string, duration: number, taken: Set<string>) {
  const slots: { time: string; taken: boolean }[] = [];
  let [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  while (sh * 60 + sm < eh * 60 + em) {
    const timeStr = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
    slots.push({ time: timeStr, taken: taken.has(timeStr) });
    sm += duration;
    if (sm >= 60) { sh++; sm -= 60; }
  }
  return slots;
}

export default function BookSlot() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<any>(null);
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ time: string; taken: boolean }[]>([]);
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(false);

  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  useEffect(() => {
    if (!doctorId) return;
    api(`/doctors/${doctorId}`)
      .then((d: any) =>
        setDoctor({
          id: d.id,
          name: `Dr. ${d.fullName}`.replace(/^Dr\. Dr\./, "Dr."),
          specialization: d.specializationName ?? "",
          imageUrl: d.avatarUrl ?? null,
          consultationFee: d.consultationFee ?? "500",
          schedules: d.schedules ?? [],
        })
      )
      .catch(() => toast.error("Could not load doctor"));
  }, [doctorId]);

  const daySchedule = doctor?.schedules?.find((s: any) => s.dayOfWeek === selectedDate.getDay() && s.isActive);

  const loadSlots = useCallback(async () => {
    setSelectedSlot(null);
    if (!doctor || !daySchedule) {
      setSlots([]);
      return;
    }
    let taken = new Set<string>();
    try {
      const booked = await api<any[]>(`/appointments/booked?doctorId=${doctor.id}&date=${format(selectedDate, "yyyy-MM-dd")}`);
      taken = new Set((booked ?? []).map((b) => format(new Date(b.slotStart), "HH:mm")));
    } catch {
      /* ignore */
    }
    setSlots(generateSlots(daySchedule.startTime, daySchedule.endTime, daySchedule.slotDurationMinutes ?? 15, taken));
  }, [doctor, selectedDate, daySchedule]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const morningSlots = slots.filter((s) => Number(s.time.split(":")[0]) < 12);
  const afternoonSlots = slots.filter((s) => Number(s.time.split(":")[0]) >= 12 && Number(s.time.split(":")[0]) < 17);
  const eveningSlots = slots.filter((s) => Number(s.time.split(":")[0]) >= 17);

  async function confirmBooking() {
    if (!selectedSlot || !doctor) return;
    setBooking(true);
    const [h, m] = selectedSlot.split(":").map(Number);
    const start = new Date(selectedDate);
    start.setHours(h, m, 0, 0);
    const dur = daySchedule?.slotDurationMinutes ?? 15;
    const end = new Date(start.getTime() + dur * 60000);
    try {
      await apiPost("/appointments", { doctorId: doctor.id, slotStart: start.toISOString(), slotEnd: end.toISOString() });
      setStep(2);
      setTimeout(() => navigate("/patient/appointments"), 2500);
    } catch (e: any) {
      toast.error(e?.status === 409 ? "That slot was just taken — pick another." : e?.message ?? "Could not book this slot");
      loadSlots();
    } finally {
      setBooking(false);
    }
  }

  if (!doctor) {
    return <div className="max-w-3xl mx-auto py-16 text-[#8e8e93] font-sans">Loading doctor schedule…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-6 text-foreground font-sans min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2997ff] mb-6 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to specialists
      </button>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="form" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-8">
            <div className="apple-card p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#27272a] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                {doctor.imageUrl ? (
                  <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black bg-gradient-to-br from-[#27272a] to-[#3f3f46]">
                    {doctor.name.replace("Dr. ", "").charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{doctor.name}</h1>
                <p className="text-[#2997ff] text-sm font-semibold mt-0.5">{doctor.specialization}</p>
                <p className="text-xs text-[#8e8e93] font-medium mt-1">Consultation Fee: <span className="text-white font-bold">₹{doctor.consultationFee}</span></p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-white tracking-tight">Select Date</h2>
                <span className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wider">{format(selectedDate, "MMMM yyyy")}</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                {availableDates.map((date) => {
                  const isSelected = date.getTime() === selectedDate.getTime();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`snap-center flex-shrink-0 w-[68px] h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        isSelected 
                          ? "bg-white text-black shadow-xl scale-105 font-bold" 
                          : "apple-glass text-white border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className={`text-[11px] font-bold uppercase mb-0.5 ${isSelected ? "text-black/70" : "text-[#8e8e93]"}`}>{days[date.getDay()]}</span>
                      <span className="text-xl font-black">{format(date, "d")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-white tracking-tight mb-4 px-1">Available Slots</h2>
              {!daySchedule ? (
                <div className="text-[#8e8e93] font-medium apple-card p-8 text-center text-sm">
                  The doctor is not scheduled for consultations on this day. Please select another date.
                </div>
              ) : slots.length === 0 ? (
                <div className="text-[#8e8e93] font-medium apple-card p-8 text-center text-sm">
                  No slots currently available for this date.
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    { label: "Morning", data: morningSlots },
                    { label: "Afternoon", data: afternoonSlots },
                    { label: "Evening", data: eveningSlots },
                  ].map((section) => section.data.length > 0 && (
                    <div key={section.label}>
                      <h3 className="text-xs font-bold tracking-widest uppercase text-[#8e8e93] mb-3 px-1">{section.label}</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                        {section.data.map((slot) => {
                          const isSelected = selectedSlot === slot.time;
                          return (
                            <button
                              key={slot.time}
                              disabled={slot.taken}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                                slot.taken
                                  ? "bg-white/[0.02] text-[#555] opacity-40 cursor-not-allowed line-through border border-transparent"
                                  : isSelected
                                  ? "bg-[#2997ff] text-white shadow-[0_0_20px_rgba(41,151,255,0.4)] border border-[#2997ff]"
                                  : "apple-glass text-[#f5f5f7] border border-white/10 hover:border-white/30 hover:bg-white/5"
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-5 apple-glass border-t border-white/10 z-40 bg-black/70 backdrop-blur-2xl">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div>
                  <p className="text-[#8e8e93] text-xs font-semibold uppercase tracking-wider">Booking Selection</p>
                  <p className="text-white font-bold text-sm md:text-base">
                    {selectedSlot ? `${format(selectedDate, "MMM d")} · ${selectedSlot}` : "Please pick a slot"}
                  </p>
                </div>
                <button
                  disabled={!selectedSlot || booking}
                  onClick={confirmBooking}
                  className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                    selectedSlot && !booking 
                      ? "bg-[#2997ff] text-white shadow-lg shadow-[#2997ff]/40 hover:bg-[#0077ed] active:scale-95" 
                      : "bg-[#27272a] text-[#8e8e93] cursor-not-allowed"
                  }`}
                >
                  {booking ? "Scheduling..." : "Confirm Appointment"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-20" />
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-24 h-24 rounded-3xl bg-[#32d74b]/15 border border-[#32d74b]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(50,215,75,0.3)]">
              <CheckCircle2 className="w-12 h-12 text-[#32d74b]" />
            </motion.div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">Slot Confirmed</h2>
            <p className="text-[#8e8e93] text-sm font-medium max-w-md">
              Your appointment with {doctor.name} on {format(selectedDate, "MMMM d")} at {selectedSlot} is now confirmed.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
