// Statistiche giocatore per periodo/formato — funzioni pure.
import { addDays, romeDateKey, romeLocalToUtc, romeParts } from '../../lib/dates.js'
import { round1, round2 } from '../../lib/money.js'

export type Period = '7d' | '30d' | '90d' | 'ytd' | 'all'
export type FormatKey = 'MTT' | 'SPIN' | 'CASH'

export interface SessionLike {
  date: Date
  format: FormatKey
  durationMin: number
  games: number
  itmCount?: number | null // piazzamenti a premio (estensione facoltativa)
  hands: number | null
  avgBuyIn: number
  totalBuyIns: number
  totalCashes: number
  profit: number
  chipEvBb100?: number | null
  bbWon?: number | null
  tilt: number
  badBeats: number
  bubbles: number
  deepRun: boolean
}

export interface SeriesPoint {
  date: string
  value: number
}

/** Inizio del periodo (null = tutto lo storico). */
export function periodStart(period: Period, now = new Date()): Date | null {
  switch (period) {
    case '7d':
      return addDays(now, -7)
    case '30d':
      return addDays(now, -30)
    case '90d':
      return addDays(now, -90)
    case 'ytd':
      return romeLocalToUtc(romeParts(now).year, 1, 1)
    case 'all':
      return null
  }
}

/** Streak di giorni consecutivi con almeno una sessione, che termina oggi o ieri (date locali Roma). */
export function sessionStreak(dateKeys: Iterable<string>, now = new Date()): number {
  const days = new Set(dateKeys)
  let cursor = now
  if (!days.has(romeDateKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (days.has(romeDateKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

const fmtIt = (n: number, digits = 0) => n.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export interface StatsExtras {
  hoursStudied: number
  lessonsBooked: number // lezioni di gruppo prenotate già svolte nel periodo
  lessonsAttended: number
  allSessionDateKeys?: string[] // per lo streak (indipendente dal periodo)
  now?: Date
}

export function computePlayerStats(userId: string, period: Period, format: FormatKey | 'ALL', sessions: SessionLike[], extras: StatsExtras) {
  const now = extras.now ?? new Date()
  const s = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime())
  const tourney = s.filter((x) => x.format === 'MTT' || x.format === 'SPIN')
  const cash = s.filter((x) => x.format === 'CASH')

  const sum = <T>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)

  const profit = round2(sum(s, (x) => x.profit))
  const tBuyIns = sum(tourney, (x) => x.totalBuyIns)
  const tGames = sum(tourney, (x) => x.games)
  const roi = tourney.length && tBuyIns > 0 ? round1((sum(tourney, (x) => x.profit) / tBuyIns) * 100) : null
  const abi = tourney.length && tGames > 0 ? round2(tBuyIns / tGames) : null
  // ITM% reale solo dove la sessione riporta i piazzamenti a premio (itmCount): il contratto
  // non li prevede, quindi senza dato si restituisce null invece di una stima fuorviante.
  // Solo MTT (negli Spin & Go l'ITM non è una metrica significativa), come nel mock.
  const withItm = tourney.filter((x) => x.format === 'MTT' && x.itmCount !== null && x.itmCount !== undefined && x.games > 0)
  const itmGames = sum(withItm, (x) => x.games)
  const itmPct = itmGames > 0 ? round1((sum(withItm, (x) => x.itmCount as number) / itmGames) * 100) : null

  const cashHands = sum(cash, (x) => x.hands ?? 0)
  const cashBb = sum(cash, (x) => (x.bbWon ?? null) !== null ? (x.bbWon as number) : x.avgBuyIn > 0 ? x.profit / x.avgBuyIn : 0)
  const bb100 = cash.length && cashHands > 0 ? round2((cashBb / cashHands) * 100) : null

  const games = sum(s, (x) => x.games)
  const hands = sum(s, (x) => x.hands ?? 0)
  const hoursPlayed = round1(sum(s, (x) => x.durationMin) / 60)
  const tiltIndex = s.length ? round2(sum(s, (x) => x.tilt) / s.length) : 0
  const badBeats = sum(s, (x) => x.badBeats)
  const bubbles = sum(s, (x) => x.bubbles)
  const deepRuns = s.filter((x) => x.deepRun).length
  const attendancePct = extras.lessonsBooked > 0 ? round1((extras.lessonsAttended / extras.lessonsBooked) * 100) : 0
  const sessionStreakDays = sessionStreak(extras.allSessionDateKeys ?? s.map((x) => romeDateKey(x.date)), now)

  // Serie giornaliere (giorno locale Roma)
  const byDay = new Map<string, { profit: number; volume: number }>()
  for (const x of s) {
    const k = romeDateKey(x.date)
    const cur = byDay.get(k) ?? { profit: 0, volume: 0 }
    cur.profit += x.profit
    cur.volume += format === 'CASH' ? (x.hands ?? 0) : x.games
    byDay.set(k, cur)
  }
  let cum = 0
  const profitSeries: SeriesPoint[] = []
  const volumeSeries: SeriesPoint[] = []
  for (const [k, v] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    cum += v.profit
    const date = `${k}T00:00:00.000Z`
    profitSeries.push({ date, value: round2(cum) })
    volumeSeries.push({ date, value: v.volume })
  }

  const hoursStudied = round1(extras.hoursStudied)
  const funFacts = buildFunFacts({ sessions: s.length, games, tiltIndex, badBeats, bubbles, deepRuns, sessionStreakDays, hoursStudied, period })

  return {
    userId,
    period,
    format,
    profit,
    roi,
    abi,
    bb100,
    games,
    hands,
    itmPct,
    sessionsCount: s.length,
    hoursPlayed,
    hoursStudied,
    sessionStreakDays,
    tiltIndex,
    badBeats,
    bubbles,
    deepRuns,
    riverSuckouts: badBeats,
    attendancePct,
    profitSeries,
    volumeSeries,
    funFacts,
  }
}

const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'questa settimana',
  '30d': 'questo mese',
  '90d': 'negli ultimi 3 mesi',
  ytd: "quest'anno",
  all: 'in totale',
}

/** 2–4 frasi "simpatiche" generate dai dati (mai promesse di vincita). */
export function buildFunFacts(d: {
  sessions: number
  games: number
  tiltIndex: number
  badBeats: number
  bubbles: number
  deepRuns: number
  sessionStreakDays: number
  hoursStudied: number
  period: Period
}): string[] {
  const p = PERIOD_LABEL[d.period]
  const facts: string[] = []
  if (d.sessions === 0) facts.push(`Nessuna sessione registrata ${p}: il grinder che è in te sta dormendo`)
  if (d.bubbles >= 3) facts.push(`${d.bubbles} bolle scoppiate ${p}: la bolla ti ha preso in simpatia`)
  else if (d.bubbles > 0) facts.push(`${d.bubbles} ${d.bubbles === 1 ? 'bolla scoppiata' : 'bolle scoppiate'} ${p}: succede anche ai migliori`)
  if (d.sessionStreakDays >= 5) facts.push(`Streak di ${d.sessionStreakDays} giorni: Fabri è preoccupato`)
  if (d.sessions > 0 && d.tiltIndex <= 1.5) facts.push(`Tilt medio ${fmtIt(d.tiltIndex, 1)}: monaco tibetano`)
  else if (d.sessions > 0 && d.tiltIndex >= 3.5) facts.push(`Tilt medio ${fmtIt(d.tiltIndex, 1)}: oggi niente chat al tavolo`)
  if (d.badBeats >= 5) facts.push(`${d.badBeats} bad beat ${p}: il river ce l'ha con te`)
  if (d.deepRuns > 0) facts.push(`${d.deepRuns} deep run ${p}: il rail è già pronto`)
  if (d.games >= 500) facts.push(`${fmtIt(d.games)} giochi ${p}: volume da atleta`)
  if (facts.length < 2) facts.push(`${fmtIt(d.hoursStudied, 1)} ore di studio ${p}: ogni ora conta per il rank`)
  if (facts.length < 2) facts.push(`${d.sessions} ${d.sessions === 1 ? 'sessione registrata' : 'sessioni registrate'} ${p}`)
  return facts.slice(0, 4)
}
