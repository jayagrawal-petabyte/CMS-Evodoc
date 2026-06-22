/**
 * Returns the LOCAL calendar date as a YYYY-MM-DD string.
 *
 * IMPORTANT: do NOT use `new Date().toISOString().split('T')[0]` for queueDate —
 * that yields the UTC date, and `new Date().setHours(0,0,0,0).toISOString()` yields
 * the *previous* UTC day for positive-offset timezones (e.g. IST +5:30). Those two
 * approaches disagree, which silently breaks the token queue (inserts and reads land
 * on different dates). This helper derives the date from local calendar components so
 * every read and write agrees on what "today" means.
 */
export function getQueueDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
