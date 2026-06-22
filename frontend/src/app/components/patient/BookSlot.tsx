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
          consultationFee: d.consultationFee ?? "—",
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
    return <div className="max-w-3xl mx-auto px-4 py-16 text-[#86868b] font-sans">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-16 text-foreground font-sans min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-medium mb-8 hover:opacity-80 transition-opacity">
        <ChevronLeft className="w-5 h-5" /> Back to doctors
      </button>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-[#1c1c1e] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {doctor.imageUrl ? <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" /> : <Activity className="w-8 h-8 text-[#86868b]" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">{doctor.name}</h1>
                <p className="text-[#2997ff] text-lg font-medium">{doctor.specialization}</p>
                <p className="text-[#86868b] font-medium">Consultation Fee: <span className="text-white font-semibold">{doctor.consultationFee}</span></p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Select Date</h2>
                <span className="text-[#86868b] font-medium">{format(selectedDate, "MMMM yyyy")}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x">
                {availableDates.map((date) => {
                  const isSelected = date.getTime() === selectedDate.getTime();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`snap-center flex-shrink-0 w-[72px] h-24 rounded-3xl flex flex-col items-center justify-center transition-all ${isSelected ? "bg-white text-black shadow-lg scale-105" : "apple-input text-white"}`}
                    >
                      <span className={`text-xs font-semibold mb-1 ${isSelected ? "text-black/60" : "text-[#86868b]"}`}>{days[date.getDay()]}</span>
                      <span className="text-2xl font-bold">{format(date, "d")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-6">Available Time</h2>
              {!daySchedule ? (
                <p className="text-[#86868b] font-medium apple-card p-8 text-center">The doctor isn't available on this day. Try another date.</p>
              ) : slots.length === 0 ? (
                <p className="text-[#86868b] font-medium apple-card p-8 text-center">No open slots for this day.</p>
              ) : (
                <div className="space-y-8">
                  {[
                    { label: "Morning", data: morningSlots },
                    { label: "Afternoon", data: afternoonSlots },
                    { label: "Evening", data: eveningSlots },
                  ].map((section) => section.data.length > 0 && (
                    <div key={section.label}>
                      <h3 className="text-[13px] font-bold tracking-widest uppercase text-[#86868b] mb-4">{section.label}</h3>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {section.data.map((slot) => {
                          const isSelected = selectedSlot === slot.time;
                          return (
                            <button
                              key={slot.time}
                              disabled={slot.taken}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-3.5 rounded-2xl font-semibold text-[15px] transition-all flex items-center justify-center ${
                                slot.taken
                                  ? "apple-input text-[#86868b] opacity-50 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "bg-primary text-white shadow-[0_0_20px_rgba(41,151,255,0.4)] border border-primary"
                                  : "apple-input text-white hover:border-white/30"
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

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/10 z-40">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div>
                  <p className="text-[#86868b] text-sm font-medium">Selected Slot</p>
                  <p className="text-white font-bold text-xl">
                    {selectedSlot ? `${format(selectedDate, "MMM d")} at ${selectedSlot}` : "None selected"}
                  </p>
                </div>
                <button
                  disabled={!selectedSlot || booking}
                  onClick={confirmBooking}
                  className={`px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2 ${
                    selectedSlot && !booking ? "bg-white text-black hover:scale-[1.02]" : "bg-[#2c2c2e] text-[#86868b] cursor-not-allowed"
                  }`}
                >
                  {booking ? "Booking…" : "Book Appointment"} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="h-24" />
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-32 h-32 rounded-full bg-[#32d74b]/10 border border-[#32d74b]/30 flex items-center justify-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-[#32d74b]" />
            </motion.div>
            <h2 className="text-4xl font-bold tracking-tight text-white mb-4">Confirmed!</h2>
            <p className="text-[#86868b] text-xl font-medium max-w-md">
              Your appointment with {doctor.name} on {format(selectedDate, "MMMM d")} at {selectedSlot} has been scheduled.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
