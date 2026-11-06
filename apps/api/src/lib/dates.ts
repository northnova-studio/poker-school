// Date e fuso orario Europe/Rome (stagioni, Daily Spot, limiti giornalieri/settimanali XP).
export const TZ = 'Europe/Rome'
const DAY = 86_400_000

const MONTHS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

export const monthNameIt = (m0: number) => MONTHS_IT[m0]

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Componenti di data/ora locali a Roma per un istante. */
export function romeParts(d: Date) {
  const p: Record<string, number> = {}
  for (const part of partsFmt.formatToParts(d)) if (part.type !== 'literal') p[part.type] = Number(part.value)
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second }
}

/** Offset (ms) di Roma rispetto a UTC in un dato istante. */
function romeOffsetMs(d: Date): number {
  const p = romeParts(d)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(d.getTime() / 1000) * 1000
}

/** Istante UTC corrispondente a un'ora locale di Roma (gestisce l'ora legale). */
export function romeLocalToUtc(year: number, month1: number, day: number, h = 0, mi = 0, s = 0, ms = 0): Date {
  const guess = Date.UTC(year, month1 - 1, day, h, mi, s, ms)
  let res = guess - romeOffsetMs(new Date(guess))
  const off2 = romeOffsetMs(new Date(res))
  if (guess - off2 !== res) res = guess - off2
  return new Date(res)
}

/** "YYYY-MM-DD" della data locale a Roma. */
export function romeDateKey(d: Date = new Date()): string {
  const p = romeParts(d)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Mezzanotte (inizio giornata) a Roma, come istante UTC. */
export function startOfRomeDay(d: Date = new Date()): Date {
  const p = romeParts(d)
  return romeLocalToUtc(p.year, p.month, p.day)
}

/** Inizio della settimana ISO (lunedì 00:00) a Roma. */
export function startOfRomeWeek(d: Date = new Date()): Date {
  const p = romeParts(d)
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() // 0 = domenica
  const back = (dow + 6) % 7
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day) - back * DAY)
  return romeLocalToUtc(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
}

/** Settimana ISO "2026-W45" (data locale a Roma). */
export function isoWeekId(d: Date = new Date()): string {
  const p = romeParts(d)
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum) // giovedì della stessa settimana ISO
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Inizio e fine (23:59:59.999) del mese locale a Roma che contiene `d`. */
export function romeMonthRange(d: Date = new Date()) {
  const p = romeParts(d)
  const start = romeLocalToUtc(p.year, p.month, 1)
  const nextY = p.month === 12 ? p.year + 1 : p.year
  const nextM = p.month === 12 ? 1 : p.month + 1
  const end = new Date(romeLocalToUtc(nextY, nextM, 1).getTime() - 1)
  return { start, end, year: p.year, month0: p.month - 1 }
}

/** Data "YYYY-MM-DD" → Date a mezzanotte UTC (per colonne @db.Date). */
export function dateKeyToDbDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

/** Colonna @db.Date → "YYYY-MM-DD". */
export function dbDateToKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY)
}

/** Età in anni compiuti alla data `today` ("YYYY-MM-DD"). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age
}

/** Mese "YYYY-MM" (UTC) di una data. */
export const monthKey = (d: Date) => d.toISOString().slice(0, 7)

export const DAY_MS = DAY
