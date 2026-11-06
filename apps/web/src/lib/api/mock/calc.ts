// Calcoli puri del mock: statistiche giocatore, fun facts, badge, classifiche, finanze.
// Nessun accesso allo store: ricevono dati, restituiscono dati.
import { seasonXpAt, tierFromXp } from '@/lib/app-rank'
import type {
  Badge,
  FinanceSummary,
  Format,
  LeaderboardEntry,
  Period,
  PlayerStats,
  RankTier,
  SeriesPoint,
  Session,
  Transaction,
  TxCategory,
  XpEvent,
} from '../types'
import { DAY, addDays, iso, startOfDay, startOfWeek, ym, ymd } from './time'

const r1 = (v: number) => Math.round(v * 10) / 10
const r2 = (v: number) => Math.round(v * 100) / 100

export function periodStart(period: Period, now: Date, firstDate?: string): Date {
  const today = startOfDay(now)
  switch (period) {
    case '7d':
      return addDays(today, -6)
    case '30d':
      return addDays(today, -29)
    case '90d':
      return addDays(today, -89)
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1)
    case 'all':
      return firstDate ? startOfDay(new Date(firstDate)) : addDays(today, -365)
  }
}

type StatSession = Session & { itm?: number }

export function estimateItm(s: StatSession): number {
  if (s.format !== 'MTT') return 0
  if (typeof s.itm === 'number') return s.itm
  if (s.totalCashes <= 0 || s.avgBuyIn <= 0) return 0
  return Math.min(s.games, Math.max(1, Math.round(s.totalCashes / (s.avgBuyIn * 2.5))))
}

export function sessionStreak(sessions: Session[], now: Date): number {
  const days = new Set(sessions.map((s) => ymd(s.date)))
  let d = startOfDay(now)
  if (!days.has(ymd(d))) d = addDays(d, -1)
  let n = 0
  while (days.has(ymd(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function computeStats(input: {
  userId: string
  period: Period
  format: Format | 'ALL'
  now: Date
  sessions: StatSession[]
  studyEvents: XpEvent[]
  lessonsBooked: { startsAt: string; attended: boolean | null }[]
}): PlayerStats {
  const { userId, period, format, now, sessions, studyEvents, lessonsBooked } = input
  const sorted = sessions.slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const first = sorted[0]?.date
  const from = periodStart(period, now, first)
  const fromMs = from.getTime()
  const inP = sorted.filter((s) => Date.parse(s.date) >= fromMs && (format === 'ALL' || s.format === format))

  const tour = inP.filter((s) => s.format !== 'CASH')
  const cash = inP.filter((s) => s.format === 'CASH')
  const mtt = inP.filter((s) => s.format === 'MTT')
  const buyIns = tour.reduce((a, s) => a + s.totalBuyIns, 0)
  const tourGames = tour.reduce((a, s) => a + s.games, 0)
  const tourProfit = tour.reduce((a, s) => a + s.profit, 0)
  const cashHands = cash.reduce((a, s) => a + (s.hands ?? 0), 0)
  const cashBb = cash.reduce((a, s) => a + (s.bbWon ?? (s.avgBuyIn > 0 ? s.profit / s.avgBuyIn : 0)), 0)
  const mttGames = mtt.reduce((a, s) => a + s.games, 0)
  const mttItm = mtt.reduce((a, s) => a + estimateItm(s), 0)

  const study = studyEvents.filter((e) => Date.parse(e.createdAt) >= fromMs).reduce((a, e) => a + e.xp / 15, 0)
  const pastBooked = lessonsBooked.filter((l) => l.attended !== null && Date.parse(l.startsAt) >= fromMs)
  const attended = pastBooked.filter((l) => l.attended).length

  // serie: giornaliera fino a 90 giorni, settimanale oltre
  const spanDays = Math.max(1, Math.round((startOfDay(now).getTime() - fromMs) / DAY) + 1)
  const weekly = spanDays > 92
  const bucketKey = (d: Date) => ymd(weekly ? startOfWeek(d) : startOfDay(d))
  const buckets: string[] = []
  for (let d = weekly ? startOfWeek(from) : new Date(from); d <= now; d = addDays(d, weekly ? 7 : 1)) buckets.push(ymd(d))
  const pBy = new Map<string, number>()
  const vBy = new Map<string, number>()
  for (const s of inP) {
    const k = bucketKey(new Date(s.date))
    pBy.set(k, (pBy.get(k) ?? 0) + s.profit)
    vBy.set(k, (vBy.get(k) ?? 0) + (s.format === 'CASH' ? (format === 'CASH' ? s.hands ?? 0 : s.games) : s.games))
  }
  let cum = 0
  const profitSeries: SeriesPoint[] = buckets.map((k) => {
    cum += pBy.get(k) ?? 0
    return { date: iso(new Date(`${k}T12:00:00`)), value: r2(cum) }
  })
  const volumeSeries: SeriesPoint[] = buckets.map((k) => ({ date: iso(new Date(`${k}T12:00:00`)), value: vBy.get(k) ?? 0 }))

  const stats: PlayerStats = {
    userId,
    period,
    format,
    profit: r2(inP.reduce((a, s) => a + s.profit, 0)),
    roi: buyIns > 0 ? r1((tourProfit / buyIns) * 100) : null,
    abi: tourGames > 0 ? r2(buyIns / tourGames) : null,
    bb100: cashHands > 0 ? r2((cashBb / cashHands) * 100) : null,
    games: inP.reduce((a, s) => a + s.games, 0),
    hands: cashHands,
    itmPct: mttGames > 0 ? r1((mttItm / mttGames) * 100) : null,
    sessionsCount: inP.length,
    hoursPlayed: r1(inP.reduce((a, s) => a + s.durationMin, 0) / 60),
    hoursStudied: r1(study),
    sessionStreakDays: sessionStreak(sessions, now),
    tiltIndex: inP.length ? r1(inP.reduce((a, s) => a + s.tilt, 0) / inP.length) : 0,
    badBeats: inP.reduce((a, s) => a + s.badBeats, 0),
    bubbles: inP.reduce((a, s) => a + s.bubbles, 0),
    deepRuns: inP.filter((s) => s.deepRun).length,
    riverSuckouts: inP.reduce((a, s) => a + s.badBeats, 0),
    attendancePct: pastBooked.length ? Math.round((attended / pastBooked.length) * 100) : 0,
    profitSeries,
    volumeSeries,
    funFacts: [],
  }
  stats.funFacts = funFacts(stats, inP, sorted, now)
  return stats
}

const PERIOD_TXT: Record<Period, string> = { '7d': 'questa settimana', '30d': 'questo mese', '90d': 'negli ultimi 3 mesi', ytd: "quest'anno", all: 'da quando sei qui' }
const eur = (v: number) => `${v < 0 ? '−' : '+'}${Math.abs(Math.round(v)).toLocaleString('it-IT')} €`

/** 2–4 frasi generate dai dati (tono autoironico della scuola). */
export function funFacts(st: PlayerStats, inPeriod: Session[], all: Session[], now: Date): string[] {
  const out: string[] = []
  const when = PERIOD_TXT[st.period]
  if (st.bubbles >= 2) {
    // record personale = massimo di bolle in un mese
    const byMonth = new Map<string, number>()
    for (const s of all) byMonth.set(ym(s.date), (byMonth.get(ym(s.date)) ?? 0) + s.bubbles)
    const thisMonth = byMonth.get(ym(now)) ?? 0
    const record = Math.max(...byMonth.values())
    out.push(
      st.period === '30d' && thisMonth >= record && thisMonth > 1
        ? `${st.bubbles} bolle scoppiate ${when}: nuovo record personale`
        : `${st.bubbles} bolle scoppiate ${when}: Matteo sta preparando una lezione di ICM solo per te`,
    )
  }
  if (st.sessionStreakDays >= 5) out.push(`Streak di ${st.sessionStreakDays} giorni: Fabri è preoccupato`)
  if (st.sessionsCount >= 3 && st.tiltIndex > 0 && st.tiltIndex < 1.8) out.push(`Tilt medio ${String(st.tiltIndex).replace('.', ',')}: monaco tibetano`)
  if (st.tiltIndex >= 3) out.push(`Tilt medio ${String(st.tiltIndex).replace('.', ',')}: il corso di mental game ti aspetta`)
  if (st.badBeats >= 8) out.push(`${st.badBeats} river subiti ${when}: il mazzo ce l’ha con te (statisticamente no)`)
  if (st.deepRuns >= 1) out.push(`${st.deepRuns} ${st.deepRuns === 1 ? 'deep run' : 'deep run'} ${when}: la lobby ti guarda`)
  if (st.hoursStudied >= 20) out.push(`${Math.round(st.hoursStudied)} ore di studio ${when}: più di uno studente di medicina in sessione`)
  if (inPeriod.length) {
    const best = inPeriod.reduce((a, s) => (s.profit > a.profit ? s : a), inPeriod[0])
    if (best.profit > 0)
      out.push(`Sessione migliore: ${eur(best.profit)} il ${new Date(best.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`)
  }
  if (out.length < 2) out.push(st.sessionsCount ? `${st.sessionsCount} sessioni registrate ${when}` : `Nessuna sessione ${when}: il tavolo ti manca?`)
  if (out.length < 2) out.push(`${Math.round(st.hoursStudied)} ore di studio ${when}`)
  return out.slice(0, 4)
}

// ── Rank ─────────────────────────────────────────────────────────────────────
export interface RankUser {
  id: string
  nickname: string
  avatarSeed: string
  formats: Format[]
}

export function leaderboard(users: RankUser[], eventsByUser: Map<string, XpEvent[]>, now: Date): LeaderboardEntry[] {
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const rows = users.map((u) => {
    const ev = eventsByUser.get(u.id) ?? []
    return { u, xp: seasonXpAt(ev, now), xpPrev: seasonXpAt(ev, weekAgo) }
  })
  const prevPos = new Map(
    rows
      .slice()
      .sort((a, b) => b.xpPrev - a.xpPrev || a.u.nickname.localeCompare(b.u.nickname))
      .map((r, i) => [r.u.id, i + 1]),
  )
  return rows
    .sort((a, b) => b.xp - a.xp || a.u.nickname.localeCompare(b.u.nickname))
    .map((r, i) => {
      const t = tierFromXp(r.xp)
      return {
        position: i + 1,
        userId: r.u.id,
        nickname: r.u.nickname,
        avatarSeed: r.u.avatarSeed,
        tier: t.tier as RankTier,
        division: t.division,
        xp: r.xp,
        delta: (prevPos.get(r.u.id) ?? i + 1) - (i + 1),
        formats: r.u.formats,
      }
    })
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function computeBadges(d: {
  sessions: Session[]
  xp: XpEvent[]
  deepRuns: { status: string; updatedAt: string }[]
  roastOptIn: boolean
  clownAt: string | null
}): Badge[] {
  const sess = d.sessions.slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const ev = d.xp.slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const nth = <T,>(arr: T[], n: number) => (arr.length >= n ? arr[n - 1] : undefined)
  const ofType = (t: XpEvent['type']) => ev.filter((e) => e.type === t)
  let study = 0
  let studyAt: string | null = null
  for (const e of ofType('STUDY_HOURS')) {
    study += e.xp / 15
    if (study >= 50) {
      studyAt = e.createdAt
      break
    }
  }
  const streak30 = ofType('DAILY_SPOT_STREAK').find((e) => Number(e.label.match(/\d+/)?.[0] ?? 0) >= 28)
  const last30 = sess.slice(-30)
  const calm = last30.length >= 20 && last30.reduce((a, s) => a + s.tilt, 0) / last30.length < 1.9
  const ft = d.deepRuns.filter((r) => r.status === 'FINAL_TABLE' || r.status === 'WON').sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
  const won = ft.filter((r) => r.status === 'WON')
  const b = (id: string, name: string, description: string, icon: string, rarity: Badge['rarity'], earnedAt: string | null | undefined): Badge => ({
    id,
    name,
    description,
    icon,
    rarity,
    earnedAt: earnedAt ?? null,
  })
  const list: Badge[] = [
    b('first-session', 'Prima sessione', 'Hai registrato la tua prima sessione.', 'Play', 'COMMON', sess[0]?.date),
    b('grinder-100', 'Cento sessioni', '100 sessioni registrate nel tracker.', 'Dumbbell', 'RARE', nth(sess, 100)?.date),
    b('study-50', 'Studioso', '50 ore di studio registrate.', 'BookOpen', 'RARE', studyAt),
    b('streak-7', 'Settimana perfetta', '7 Daily Spot di fila.', 'Flame', 'COMMON', ofType('DAILY_SPOT_STREAK')[0]?.createdAt),
    b('streak-30', 'Mese perfetto', '28 Daily Spot di fila.', 'Sparkles', 'EPIC', streak30?.createdAt),
    b('present-10', 'Presente!', '10 lezioni di gruppo frequentate.', 'CalendarCheck', 'COMMON', nth(ofType('LESSON_ATTENDED'), 10)?.createdAt),
    b('reviewer-10', 'Mani sul tavolo', '10 mani inviate in hand review.', 'FileSearch', 'COMMON', nth(ofType('HAND_REVIEW_SUBMITTED'), 10)?.createdAt),
    b('course', 'Diplomato', 'Hai completato un corso.', 'GraduationCap', 'RARE', ofType('COURSE_COMPLETED')[0]?.createdAt),
    b('deep-run', 'Deep run', 'Il tuo primo deep run segnalato alla community.', 'Mountain', 'RARE', ofType('DEEP_RUN')[0]?.createdAt),
    b('final-table', 'Final table', 'Sei arrivato al tavolo finale con la lobby a railarti.', 'Trophy', 'EPIC', ft[0]?.updatedAt),
    b('winner', 'Campione', 'Hai vinto un torneo con un deep run alert attivo.', 'Crown', 'LEGENDARY', won[0]?.updatedAt),
    b('monk', 'Monaco tibetano', 'Tilt medio sotto 1,9 nelle ultime 30 sessioni.', 'Leaf', 'RARE', calm ? last30[last30.length - 1].date : null),
    b('lobby-5', 'Lobby rat', '5 serate gaming con la scuola.', 'Gamepad2', 'COMMON', nth(ofType('GAMING_NIGHT'), 5)?.createdAt),
    b('bounty', 'Taglia riscossa', 'Hai battuto un fondatore in un 1v1.', 'Crosshair', 'LEGENDARY', ofType('BOUNTY_WON')[0]?.createdAt),
  ]
  if (d.roastOptIn) list.push(b('clown', 'Clown della settimana', 'Lo spot più votato del Roast (solo per chi ha dato il consenso).', 'Laugh', 'EPIC', d.clownAt))
  return list
}

// ── Finanze ──────────────────────────────────────────────────────────────────
export function financeSummary(txs: Transaction[], from: string, to: string, mrr: number): FinanceSummary {
  const f = Date.parse(from)
  const t = Date.parse(to)
  const inR = txs.filter((x) => {
    const d = Date.parse(x.date)
    return d >= f && d <= t
  })
  let income = 0
  let expenses = 0
  const cat = new Map<string, { category: TxCategory; type: Transaction['type']; amount: number }>()
  const months = new Map<string, { month: string; income: number; expenses: number; net: number }>()
  // mesi del range (anche vuoti)
  for (let d = new Date(new Date(from).getFullYear(), new Date(from).getMonth(), 1); d.getTime() <= t; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const k = ym(d)
    months.set(k, { month: k, income: 0, expenses: 0, net: 0 })
  }
  for (const x of inR) {
    const k = `${x.type}:${x.category}`
    const c = cat.get(k) ?? { category: x.category, type: x.type, amount: 0 }
    c.amount += x.amount
    cat.set(k, c)
    const m = months.get(ym(x.date)) ?? { month: ym(x.date), income: 0, expenses: 0, net: 0 }
    if (x.type === 'INCOME') {
      income += x.amount
      m.income += x.amount
    } else {
      expenses += x.amount
      m.expenses += x.amount
    }
    m.net = m.income - m.expenses
    months.set(m.month, m)
  }
  return {
    from,
    to,
    income: r2(income),
    expenses: r2(expenses),
    net: r2(income - expenses),
    mrr: r2(mrr),
    byCategory: [...cat.values()].map((c) => ({ ...c, amount: r2(c.amount) })).sort((a, b) => b.amount - a.amount),
    monthly: [...months.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ month: m.month, income: r2(m.income), expenses: r2(m.expenses), net: r2(m.net) })),
  }
}
