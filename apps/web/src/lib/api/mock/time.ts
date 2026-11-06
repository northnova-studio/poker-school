// Helper di tempo per il mock. Il seed è ancorato al giorno corrente (mezzanotte locale),
// così la demo resta "fresca" (ultimi 30 giorni sempre pieni) e deterministica nello stesso giorno.
export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

export const now = () => new Date()

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const iso = (d: Date | number) => new Date(d).toISOString()

/** YYYY-MM-DD in ora locale */
export function ymd(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export const ym = (d: Date | string) => ymd(d).slice(0, 7)

/** Settimana ISO "2026-W45" */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / DAY + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
}

/** Lunedì della settimana (00:00 locale) */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay() || 7
  return addDays(x, 1 - day)
}

export const daysBetween = (a: Date | string, b: Date | string) =>
  Math.round((startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime()) / DAY)

export function atTime(d: Date, h: number, m = 0): Date {
  const x = new Date(d)
  x.setHours(h, m, 0, 0)
  return x
}

export function ageFrom(birthDate: string, at = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  if (!y || !m || !d) return -1
  let age = at.getFullYear() - y
  if (at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d)) age -= 1
  return age
}
