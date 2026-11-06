// Regole di Rank / XP / stagioni — implementazione fedele di docs/RANK.md.
// Funzioni pure, usate sia dal mock API sia dalla UI (ladder, barre di progresso).
import type { RankTier, XpEventType } from './api/types'

export const TIER_RANGES: { tier: RankTier; min: number; max: number }[] = [
  { tier: 'FISH', min: 0, max: 300 },
  { tier: 'CALLING_STATION', min: 300, max: 900 },
  { tier: 'REG', min: 900, max: 2000 },
  { tier: 'GRINDER', min: 2000, max: 3800 },
  { tier: 'SHARK', min: 3800, max: 6500 },
  { tier: 'CRUSHER', min: 6500, max: 10000 },
  { tier: 'LEGEND', min: 10000, max: 14500 },
]

/** XP per evento (RANK.md) */
export const XP_RULES = {
  sessionBase: 20,
  sessionBonusMax: 30, // +1 ogni 10 giochi
  sessionsPerDayMax: 3,
  studyPerHour: 15,
  studyHoursPerDayMax: 4,
  lesson: 40,
  handReview: 25,
  handReviewsPerWeekMax: 5,
  dailyCorrect: 15,
  dailyAttempt: 5,
  dailyStreak: 50,
  dailyStreakEvery: 7,
  deepRun: 60,
  roastVote: 3,
  roastVotesPerWeekMax: 10,
  gaming: 20,
  course: 150,
  bounty: 200,
} as const

export const XP_TYPE_LABEL: Record<XpEventType, string> = {
  SESSION_LOGGED: 'Sessione registrata',
  STUDY_HOURS: 'Ore di studio',
  LESSON_ATTENDED: 'Lezione di gruppo',
  HAND_REVIEW_SUBMITTED: 'Mano in review',
  DAILY_SPOT_CORRECT: 'Daily Spot',
  DAILY_SPOT_STREAK: 'Streak Daily Spot',
  DEEP_RUN: 'Deep run',
  ROAST_VOTE: 'Voto al Roast',
  GAMING_NIGHT: 'Serata in lobby',
  COURSE_COMPLETED: 'Corso completato',
  BOUNTY_WON: 'Taglia riscossa',
}

export const sessionXp = (games: number) =>
  XP_RULES.sessionBase + Math.min(XP_RULES.sessionBonusMax, Math.floor(Math.max(0, games) / 10))

export interface TierPosition {
  tier: RankTier
  division: 1 | 2 | 3
  tierMin: number
  tierMax: number
  divisionStart: number
  divisionEnd: number
  xpIntoDivision: number
  xpForNextDivision: number
  /** prossima divisione (null se LEGEND I) */
  next: { tier: RankTier; division: 1 | 2 | 3; atXp: number } | null
}

/** Inizi delle tre divisioni del tier: [III, II, I] (arrotondamento come nell'esempio di RANK.md). */
export function divisionStarts(min: number, max: number): [number, number, number] {
  const w = max - min
  return [min, min + Math.round(w / 3), min + Math.round((2 * w) / 3)]
}

export function tierFromXp(xpRaw: number): TierPosition {
  const xp = Math.max(0, Math.floor(xpRaw))
  let idx = TIER_RANGES.findIndex((t) => xp >= t.min && xp < t.max)
  if (idx === -1) idx = TIER_RANGES.length - 1 // oltre 14500: resta LEGEND I
  const t = TIER_RANGES[idx]
  const starts = divisionStarts(t.min, t.max)
  let d = 0
  if (xp >= starts[2]) d = 2
  else if (xp >= starts[1]) d = 1
  const division = (3 - d) as 1 | 2 | 3
  const divisionStart = starts[d]
  const divisionEnd = d < 2 ? starts[d + 1] : t.max
  const size = divisionEnd - divisionStart
  let next: TierPosition['next'] = null
  if (d < 2) next = { tier: t.tier, division: (division - 1) as 1 | 2, atXp: divisionEnd }
  else if (idx < TIER_RANGES.length - 1) next = { tier: TIER_RANGES[idx + 1].tier, division: 3, atXp: TIER_RANGES[idx + 1].min }
  return {
    tier: t.tier,
    division,
    tierMin: t.min,
    tierMax: t.max,
    divisionStart,
    divisionEnd,
    xpIntoDivision: Math.min(xp - divisionStart, size),
    xpForNextDivision: size,
    next,
  }
}

/** Posizione assoluta (0..20) nella ladder 7×3, utile per la UI. */
export const ladderIndex = (tier: RankTier, division: 1 | 2 | 3) =>
  TIER_RANGES.findIndex((t) => t.tier === tier) * 3 + (3 - division)

// ── Stagioni mensili (Europe/Rome) ──────────────────────────────────────────
/** Stagione 1 = dicembre 2025 (primo mese pieno della scuola nella demo). */
export const SEASON_EPOCH = { year: 2025, month: 12 }
export const SOFT_RESET = 0.3

const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const romeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function romeParts(d: Date) {
  const p: Record<string, number> = {}
  for (const x of romeFmt.formatToParts(d)) if (x.type !== 'literal') p[x.type] = Number(x.value)
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second }
}

/** Converte un orario "da muro" di Roma in Date UTC. */
export function romeWallToDate(y: number, m: number, d: number, h = 0, mi = 0, s = 0): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  let t = guess
  for (let i = 0; i < 3; i++) {
    const p = romeParts(new Date(t))
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    t += guess - asUtc
  }
  return new Date(t)
}

export interface SeasonInfo {
  id: string // "2026-11"
  index: number // 1-based
  name: string
  year: number
  month: number
  startsAt: Date
  endsAt: Date // ultimo giorno del mese, 23:59:59 Europe/Rome
}

export function seasonOf(date: Date): SeasonInfo {
  const { year, month } = romeParts(date)
  return seasonFromYm(year, month)
}

// Cache per ora UTC: l'offset di Roma cambia solo allo scoccare dell'ora, quindi è esatto.
const keyCache = new Map<number, string>()
/** Id della stagione ("2026-11") per un timestamp, veloce (usato su migliaia di eventi XP). */
export function seasonKeyAt(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  let k = keyCache.get(h)
  if (!k) {
    const p = romeParts(new Date(h * 3_600_000))
    k = `${p.year}-${String(p.month).padStart(2, '0')}`
    if (keyCache.size > 50_000) keyCache.clear()
    keyCache.set(h, k)
  }
  return k
}

export function seasonFromYm(year: number, month: number): SeasonInfo {
  const index = (year - SEASON_EPOCH.year) * 12 + (month - SEASON_EPOCH.month) + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    index,
    name: `Stagione ${index} — ${MONTHS_IT[month - 1]} ${year}`,
    year,
    month,
    startsAt: romeWallToDate(year, month, 1, 0, 0, 0),
    endsAt: romeWallToDate(year, month, lastDay, 23, 59, 59),
  }
}

/**
 * XP stagionale alla data `at`: per ogni stagione xp = floor(0,3 · xp finale precedente) + XP degli eventi.
 * Gli eventi successivi ad `at` sono ignorati (serve per il delta "7 giorni fa").
 */
export function seasonXpAt(events: { xp: number; createdAt: string }[], at: Date): number {
  const atMs = at.getTime()
  const bySeason = new Map<string, number>()
  let first: string | null = null
  for (const e of events) {
    const t = Date.parse(e.createdAt)
    if (t > atMs) continue
    const s = seasonKeyAt(t)
    bySeason.set(s, (bySeason.get(s) ?? 0) + e.xp)
    if (first === null || s < first) first = s
  }
  const cur = seasonOf(at)
  if (first === null) return 0
  let [y, m] = first.split('-').map(Number)
  let xp = 0
  for (;;) {
    const id = `${y}-${String(m).padStart(2, '0')}`
    xp = Math.floor(SOFT_RESET * xp) + (bySeason.get(id) ?? 0)
    if (id === cur.id) break
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    if (y > cur.year + 1) break
  }
  return xp
}
