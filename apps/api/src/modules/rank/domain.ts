// Regole di rank/XP/stagioni — funzioni pure, identiche a docs/RANK.md.
import { monthNameIt } from '../../lib/dates.js'

export type RankTier = 'FISH' | 'CALLING_STATION' | 'REG' | 'GRINDER' | 'SHARK' | 'CRUSHER' | 'LEGEND'
export type Division = 1 | 2 | 3

export const TIERS: { tier: RankTier; min: number; max: number }[] = [
  { tier: 'FISH', min: 0, max: 300 },
  { tier: 'CALLING_STATION', min: 300, max: 900 },
  { tier: 'REG', min: 900, max: 2000 },
  { tier: 'GRINDER', min: 2000, max: 3800 },
  { tier: 'SHARK', min: 3800, max: 6500 },
  { tier: 'CRUSHER', min: 6500, max: 10000 },
  { tier: 'LEGEND', min: 10000, max: 14500 },
]

export interface TierInfo {
  tier: RankTier
  division: Division
  xpIntoDivision: number
  xpForNextDivision: number
}

/** Inizi delle tre divisioni (III, II, I) di un tier: l'intervallo è diviso in tre parti uguali (arrotondate). */
export function divisionStarts(min: number, max: number): [number, number, number] {
  const w = max - min
  return [min, min + Math.round(w / 3), min + Math.round((2 * w) / 3)]
}

/**
 * Tier e divisione per l'XP stagionale. Esempio REG (900–2000):
 * III 900–1266, II 1267–1632, I 1633–1999. Oltre 14500 resta LEGEND I.
 */
export function tierForXp(xpRaw: number): TierInfo {
  const xp = Math.max(0, Math.floor(xpRaw))
  const t = TIERS.find((x) => xp >= x.min && xp < x.max) ?? TIERS[TIERS.length - 1]
  const [s3, s2, s1] = divisionStarts(t.min, t.max)
  if (xp >= s1) return { tier: t.tier, division: 1, xpIntoDivision: xp - s1, xpForNextDivision: t.max - s1 }
  if (xp >= s2) return { tier: t.tier, division: 2, xpIntoDivision: xp - s2, xpForNextDivision: s1 - s2 }
  return { tier: t.tier, division: 3, xpIntoDivision: xp - s3, xpForNextDivision: s2 - s3 }
}

// ── XP per evento ──────────────────────────────────────────────────────────

export const XP = {
  SESSION_BASE: 20,
  SESSION_BONUS_MAX: 30,
  SESSION_MAX_PER_DAY: 3,
  STUDY_PER_HOUR: 15,
  STUDY_MAX_HOURS_PER_DAY: 4,
  LESSON_ATTENDED: 40,
  HAND_REVIEW: 25,
  HAND_REVIEW_MAX_PER_WEEK: 5,
  DAILY_SPOT_CORRECT: 15,
  DAILY_SPOT_ATTEMPT: 5,
  DAILY_SPOT_STREAK: 50,
  DAILY_SPOT_STREAK_EVERY: 7,
  DEEP_RUN: 60,
  ROAST_VOTE: 3,
  ROAST_VOTE_MAX_PER_WEEK: 10,
  GAMING_NIGHT: 20,
  COURSE_COMPLETED: 150,
  BOUNTY_WON: 200,
} as const

/** XP di una sessione: 20 + 1 ogni 10 giochi (max +30); 0 oltre la terza sessione del giorno. */
export function sessionXp(games: number, sessionsAlreadyRewardedToday: number): number {
  if (sessionsAlreadyRewardedToday >= XP.SESSION_MAX_PER_DAY) return 0
  return XP.SESSION_BASE + Math.min(XP.SESSION_BONUS_MAX, Math.floor(Math.max(0, games) / 10))
}

/** XP di studio: 15 per ora, massimo 4 ore (60 XP) al giorno. */
export function studyXp(minutes: number, studyXpAlreadyToday: number): number {
  const cap = XP.STUDY_PER_HOUR * XP.STUDY_MAX_HOURS_PER_DAY
  const raw = Math.round((Math.max(0, minutes) / 60) * XP.STUDY_PER_HOUR)
  return Math.max(0, Math.min(raw, cap - studyXpAlreadyToday))
}

/** XP con tetto per finestra (settimanale): restituisce 0 se il tetto è raggiunto. */
export function cappedXp(xp: number, countInWindow: number, maxInWindow: number): number {
  return countInWindow >= maxInWindow ? 0 : xp
}

export function dailySpotXp(correct: boolean): { xp: number; label: string } {
  return correct
    ? { xp: XP.DAILY_SPOT_CORRECT, label: 'Daily Spot — risposta corretta' }
    : { xp: XP.DAILY_SPOT_ATTEMPT, label: 'Daily Spot — tentativo' }
}

/** Bonus streak: ogni 7 giorni consecutivi. */
export function isStreakMilestone(streak: number): boolean {
  return streak > 0 && streak % XP.DAILY_SPOT_STREAK_EVERY === 0
}

// ── Stagioni ───────────────────────────────────────────────────────────────

/** Soft reset: si riparte dal 30% dell'XP finale della stagione precedente (per difetto). */
export function softResetXp(finalXp: number): number {
  return Math.floor(Math.max(0, finalXp) * 0.3)
}

export function seasonName(number: number, year: number, month0: number): string {
  return `Stagione ${number} — ${monthNameIt(month0)} ${year}`
}

// ── Classifica ─────────────────────────────────────────────────────────────

export interface XpRow {
  userId: string
  xp: number
}

/** Ordina per XP desc (a parità: userId per stabilità) e assegna le posizioni 1..n. */
export function rankPositions(rows: XpRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId))
  const m = new Map<string, number>()
  sorted.forEach((r, i) => m.set(r.userId, i + 1))
  return m
}

/**
 * Classifica con delta: `delta` = posizione di 7 giorni fa − posizione attuale
 * (positivo = posizioni guadagnate). Chi non era in classifica parte dall'ultima posizione.
 */
export function buildLeaderboard(now: XpRow[], weekAgo: XpRow[]) {
  const posNow = rankPositions(now)
  const posBefore = rankPositions(weekAgo.length ? weekAgo : now.map((r) => ({ userId: r.userId, xp: 0 })))
  const fallback = now.length
  return [...now]
    .sort((a, b) => posNow.get(a.userId)! - posNow.get(b.userId)!)
    .map((r) => {
      const p = posNow.get(r.userId)!
      const before = posBefore.get(r.userId) ?? fallback
      return { userId: r.userId, xp: r.xp, position: p, delta: before - p, ...tierForXp(r.xp) }
    })
}
