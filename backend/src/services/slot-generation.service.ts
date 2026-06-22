export interface TimeSlot {
  start: Date
  end: Date
}

export function generateSlots(
  date: Date,
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const startDate = new Date(date)
  startDate.setHours(startH, startM, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(endH, endM, 0, 0)

  let current = new Date(startDate)
  while (current < endDate) {
    const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60000)
    if (slotEnd > endDate) break
    slots.push({ start: new Date(current), end: new Date(slotEnd) })
    current = slotEnd
  }

  return slots
}
