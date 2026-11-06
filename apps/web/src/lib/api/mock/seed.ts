// Generatore deterministico dei dati demo (PRNG con seed fisso).
// Il calendario è ancorato a "oggi" così i grafici sono sempre pieni fino a ieri.
import { COURSES } from '@/data/courses'
import { PLANS } from '@/data/plans'
import { cardOverall, cardRarity, clampAttr, volumeAttr } from '@/lib/app-card'
import { XP_RULES, seasonXpAt, sessionXp } from '@/lib/app-rank'
import { normalizeAmount, dealFigures } from '@/lib/app-staking'
import type { DocumentType, Format, HandReview, KycSubmission, Level, PlanId, Purchase, Transaction, TxCategory } from '../types'
import {
  COACH_NOTES,
  DEEP_RUN_COMMENTS,
  HAND_REVIEW_SEEDS,
  ROAST_SEEDS,
  SPOT_TEMPLATES,
  STUDENTS,
  STUDY_LABELS,
  TOURNAMENT_NAMES,
} from './content'
import { createRng } from './prng'
import type {
  DbBooking,
  DbDailyAnswer,
  DbDailySpot,
  DbDeal,
  DbDeepRun,
  DbGaming,
  DbKycFile,
  DbLedger,
  DbLesson,
  DbNote,
  DbProgress,
  DbRoast,
  DbSession,
  DbUser,
  DbXp,
  SeedData,
} from './store'
import { DAY, HOUR, MIN, addDays, atTime, isoWeek, iso, startOfDay, startOfWeek, ym, ymd } from './time'

export const DEMO_STUDENT_ID = 'u-001'
export const DEMO_ADMIN_ID = 'c-lorenzo'
export const DEMO_PASSWORD = 'demo1234'
const DEMO_ROI = 0.22 // ROI "vero" dello studente demo (MTT)
export const PLAN_RANK: Record<PlanId, number> = { base: 1, pro: 2, elite: 3 }

/** Hash non crittografico (solo demo, resta nel browser): evita password in chiaro nel localStorage. */
export function demoHash(email: string, password: string): string {
  let h = 2166136261
  const s = `tris-demo:${email.toLowerCase()}:${password}`
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  let h2 = 5381
  for (let i = 0; i < s.length; i++) h2 = (Math.imul(h2, 33) ^ s.charCodeAt(i)) >>> 0
  return `fnv1a:${(h >>> 0).toString(16)}${h2.toString(16)}`
}

const r2 = (v: number) => Math.round(v * 100) / 100
const pad = (n: number, l = 3) => String(n).padStart(l, '0')
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export const FOUNDERS = [
  { id: 'c-lorenzo', first: 'Lorenzo', nick: 'Lollo', email: 'admin@demo.it', role: 'ADMIN' as const, formats: ['MTT'] as Format[], seed: 'lorenzo' },
  { id: 'c-matteo', first: 'Matteo', nick: 'Matte', email: 'matteo@demo.it', role: 'ADMIN' as const, formats: ['MTT', 'CASH'] as Format[], seed: 'matteo' },
  { id: 'c-fabri', first: 'Fabrizio', nick: 'Fabri', email: 'fabri@demo.it', role: 'COACH' as const, formats: ['SPIN'] as Format[], seed: 'fabri' },
]

interface Profile {
  userId: string
  activity: number
  mtt: number // ROI "vero"
  spin: number
  cash: number // bb/100 "vero"
  abi: Record<Format, number>
  tilt: number
  skill: number // 0..1
  prevPlan: PlanId | null
  staked: { format: Format; from: number; to: number } | null
}

const ABI: Record<Level, Record<Format, [number, number]>> = {
  MICRO: { MTT: [5, 11], SPIN: [5, 5], CASH: [0.05, 0.1] },
  LOW: { MTT: [15, 30], SPIN: [10, 15], CASH: [0.25, 0.5] },
  MID: { MTT: [40, 90], SPIN: [25, 50], CASH: [1, 2] },
  HIGH: { MTT: [100, 200], SPIN: [100, 100], CASH: [5, 5] },
}

export function generateSeed(anchor: Date): SeedData {
  const rng = createRng(20261106)
  const today = startOfDay(anchor)
  const nowMs = anchor.getTime()
  const start = addDays(today, -365)
  const daysAgo = (n: number) => addDays(today, -n)

  // ── Utenti ────────────────────────────────────────────────────────────────
  const users: DbUser[] = []
  for (const f of FOUNDERS) {
    users.push({
      id: f.id,
      email: f.email,
      nickname: f.nick,
      firstName: f.first,
      lastName: '',
      role: f.role,
      avatarSeed: f.seed,
      formats: f.formats,
      mainLevel: 'HIGH',
      kycStatus: 'APPROVED',
      plan: null,
      planInterval: null,
      coachId: null,
      discordHandle: f.nick.toLowerCase(),
      gamingTag: `${f.nick}#TRIS`,
      bio: 'Fondatore della scuola.',
      shareResultsPublicly: true,
      roastOptIn: true,
      createdAt: iso(addDays(start, -30)),
      passwordHash: demoHash(f.email, DEMO_PASSWORD),
      birthDate: '1995-01-01',
      planStartedAt: null,
      planEndedAt: null,
      lastSeenAt: iso(nowMs - rng.int(1, 20) * HOUR),
      marketingOptIn: false,
    })
  }

  const profiles: Profile[] = []
  // KYC: i 6 iscritti più recenti (escluso il demo) restano in attesa
  const joinDays = STUDENTS.map((_, i) => (i === 0 ? 300 : Math.max(3, Math.floor(360 * Math.pow(rng(), 1.25)))))
  const pendingIdx = joinDays
    .map((d, i) => ({ d, i }))
    .filter((x) => x.i !== 0)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map((x) => x.i)
  const rejectedIdx = [12, 31]
  const noneIdx = [35]
  // 12 giocatori in staking: il demo + 11 iscritti da almeno 90 giorni, KYC ok e piano attivo
  const stakedIdx = [
    0,
    ...STUDENTS.map((p, i) => ({ p, i }))
      .filter(({ p, i }) => i !== 0 && p.plan && joinDays[i] >= 90 && !pendingIdx.includes(i) && !rejectedIdx.includes(i) && !noneIdx.includes(i))
      .sort((a, b) => (a.p.plan === 'elite' ? -1 : 0) - (b.p.plan === 'elite' ? -1 : 0) || a.i - b.i)
      .slice(0, 11)
      .map((x) => x.i),
  ]

  STUDENTS.forEach((p, i) => {
    const id = `u-${pad(i + 1)}`
    const demo = i === 0
    const created = atTime(daysAgo(joinDays[i]), rng.int(9, 22), rng.int(0, 59))
    const activity = demo ? 1 : clamp(rng.range(0.2, 1), 0.2, 0.95)
    const main = p.formats[0]
    const coachId = main === 'SPIN' ? 'c-fabri' : main === 'MTT' ? (rng.chance(0.3) ? 'c-lorenzo' : 'c-matteo') : 'c-matteo'
    const churned = p.plan === null
    const planEnded = churned ? iso(daysAgo(rng.int(6, 70))) : null
    const kycStatus = demo ? 'APPROVED' : pendingIdx.includes(i) ? 'PENDING' : rejectedIdx.includes(i) ? 'REJECTED' : noneIdx.includes(i) ? 'NONE' : 'APPROVED'
    const email = demo ? 'studente@demo.it' : `${p.nick.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.it`
    const age = demo ? 27 : rng.int(19, 44)
    const by = today.getFullYear() - age - 1
    users.push({
      id,
      email,
      nickname: p.nick,
      firstName: p.first,
      lastName: p.last,
      role: 'STUDENT',
      avatarSeed: p.nick.toLowerCase(),
      formats: p.formats,
      mainLevel: p.level,
      kycStatus,
      plan: p.plan,
      planInterval: p.plan ? (rng.chance(0.2) ? 'year' : 'month') : null,
      coachId: demo ? 'c-matteo' : coachId,
      discordHandle: rng.chance(0.85) || demo ? p.nick.toLowerCase() : null,
      gamingTag: demo ? 'Brigante#4471' : rng.chance(0.55) ? `${p.nick}#${rng.int(1000, 9999)}` : null,
      bio: demo ? 'MTT di giorno, Spin quando piove. Obiettivo 2027: ABI 50 € con ROI positivo.' : null,
      shareResultsPublicly: demo ? true : rng.chance(0.85),
      roastOptIn: demo ? true : rng.chance(0.5),
      createdAt: iso(created),
      passwordHash: demoHash(email, DEMO_PASSWORD),
      birthDate: `${by}-${pad(rng.int(1, 12), 2)}-${pad(rng.int(1, 28), 2)}`,
      planStartedAt: iso(created),
      planEndedAt: planEnded,
      lastSeenAt: iso(churned ? Date.parse(planEnded!) : nowMs - rng.int(1, 120) * HOUR * (1.2 - activity)),
      marketingOptIn: rng.chance(0.4),
    })
    const pick = (f: Format) => {
      const [a, b] = ABI[p.level][f]
      const v = rng.range(a, b)
      return f === 'CASH' ? Math.round(v * 100) / 100 : Math.round(v)
    }
    const mtt = demo ? DEMO_ROI : clamp(rng.normal(0.03, 0.13), -0.28, 0.4)
    const spin = demo ? 0.03 : clamp(rng.normal(0.008, 0.03), -0.08, 0.08)
    const cash = clamp(rng.normal(1.5, 3.5), -5, 11)
    const skill = clamp(main === 'MTT' ? (mtt + 0.2) / 0.6 : main === 'SPIN' ? (spin + 0.08) / 0.18 : (cash + 5) / 17, 0, 1)
    profiles.push({
      userId: id,
      activity,
      mtt,
      spin,
      cash,
      abi: { MTT: demo ? 22 : pick('MTT'), SPIN: demo ? 10 : pick('SPIN'), CASH: pick('CASH') },
      tilt: demo ? 1.9 : rng.range(1.2, 3.2),
      skill: demo ? 0.72 : skill,
      prevPlan: churned ? (rng.chance(0.6) ? 'base' : 'pro') : null,
      staked: null,
    })
  })
  const userById = new Map(users.map((u) => [u.id, u]))
  const studentUsers = users.filter((u) => u.role === 'STUDENT')

  // Accordi di staking (decisi prima delle sessioni per marcare le sessioni "staked")
  const dealPlans = stakedIdx.map((i, k) => {
    const prof = profiles[i]
    const u = userById.get(prof.userId)!
    const format = u.formats[0]
    const joined = Math.round((today.getTime() - Date.parse(u.createdAt)) / DAY)
    const startAgo = i === 0 ? 250 : Math.max(60, Math.min(joined - 10, rng.int(70, 300)))
    const status = k === 5 || k === 9 ? 'PAUSED' : k === 11 ? 'CLOSED' : 'ACTIVE'
    const endAgo = status === 'CLOSED' ? 38 : status === 'PAUSED' ? rng.int(15, 30) : 0
    prof.staked = { format, from: startAgo, to: endAgo }
    return { i, k, prof, u, format, startAgo, status: status as DbDeal['status'], endAgo }
  })

  // ── Sessioni ──────────────────────────────────────────────────────────────
  const sessions: DbSession[] = []
  const NOTES = [
    'Sessione solida, warm-up fatto.',
    'Troppi tavoli aperti verso la fine.',
    'Bolla scoppiata con AK contro QQ.',
    'Ottimo focus fino all’ultimo livello.',
    'Stanco nell’ultima ora: chiudere prima.',
    'Due cooler di fila, rimasto calmo.',
    'Provato a 3-bettare di più dal BB.',
  ]
  profiles.forEach((pr, ui) => {
    const u = userById.get(pr.userId)!
    const joined = startOfDay(new Date(u.createdAt))
    const from = joined > start ? joined : start
    const end = u.planEndedAt ? new Date(u.planEndedAt) : today
    const spw = 1 + 4.2 * pr.activity + (ui === 0 ? 1 : 0)
    let n = 0
    for (let d = new Date(from); d < end && d < today; d = addDays(d, 1)) {
      const dow = d.getDay()
      const weekendBoost = dow === 0 ? 1.7 : dow === 6 ? 1.2 : 1
      if (!rng.chance(clamp((spw / 7) * weekendBoost, 0, 0.95))) continue
      const format: Format = u.formats.length > 1 && rng.chance(0.28) ? u.formats[1] : u.formats[0]
      const when = atTime(d, rng.int(19, 23), rng.int(0, 59))
      const dAgo = Math.round((today.getTime() - startOfDay(d).getTime()) / DAY)
      const staked = !!pr.staked && pr.staked.format === format && dAgo <= pr.staked.from && dAgo > pr.staked.to
      const s = simulateSession(rng, pr, format)
      const tilt = clamp(Math.round(pr.tilt + (s.profit < 0 ? 0.6 + Math.min(1.4, Math.abs(s.profit) / (pr.abi[format] * (format === 'CASH' ? 300 : 12))) : -0.5) + rng.normal(0, 0.55)), 1, 5) as 1 | 2 | 3 | 4 | 5
      sessions.push({
        id: `s-${ui + 1}-${n++}`,
        userId: pr.userId,
        date: iso(when),
        format,
        ...s,
        tilt,
        notes: rng.chance(0.09) ? rng.pick(NOTES) : null,
        staked,
      })
    }
  })

  // ── XP ───────────────────────────────────────────────────────────────────
  const xp: DbXp[] = []
  let xpN = 0
  const addXp = (userId: string, type: DbXp['type'], amount: number, label: string, at: Date | string, ref?: string) => {
    xp.push({ id: `x-${xpN++}`, userId, type, xp: amount, label, createdAt: typeof at === 'string' ? at : iso(at), ref })
  }
  const fmtUnit = (f: Format, s: DbSession) => (f === 'CASH' ? `${(s.hands ?? 0).toLocaleString('it-IT')} mani` : `${s.games} ${f === 'MTT' ? 'tornei' : 'spin'}`)
  const FORMAT_SHORT: Record<Format, string> = { MTT: 'MTT', SPIN: 'Spin', CASH: 'Cash' }
  for (const s of sessions) addXp(s.userId, 'SESSION_LOGGED', sessionXp(s.games), `Sessione ${FORMAT_SHORT[s.format]} · ${fmtUnit(s.format, s)}`, s.date, s.id)

  // Studio
  profiles.forEach((pr, ui) => {
    const u = userById.get(pr.userId)!
    const joined = startOfDay(new Date(u.createdAt))
    const from = joined > start ? joined : start
    const end = u.planEndedAt ? new Date(u.planEndedAt) : today
    const demo = ui === 0
    for (let d = new Date(from); d < end && d <= today; d = addDays(d, 1)) {
      const isToday = d.getTime() === today.getTime()
      if (isToday && !demo) continue
      if (!rng.chance(demo ? 0.92 : 0.15 + 0.6 * pr.activity)) continue
      const h = demo ? (isToday ? 2 : rng.int(3, 4)) : Math.min(XP_RULES.studyHoursPerDayMax, rng.int(1, 1 + Math.round(3 * pr.activity)))
      const when = isToday ? new Date(nowMs - 90 * MIN) : atTime(d, rng.int(10, 17), rng.int(0, 59))
      addXp(pr.userId, 'STUDY_HOURS', h * XP_RULES.studyPerHour, `Studio: ${h} h · ${rng.pick(STUDY_LABELS)}`, when)
    }
  })

  // ── Lezioni di gruppo ────────────────────────────────────────────────────
  const LESSON_SLOTS = [
    { dow: 1, h: 21, m: 0, format: 'MTT' as const, level: 'LOW' as Level, coachId: 'c-matteo', minPlan: 'pro' as PlanId, capacity: 30, dur: 90, titles: ['Review mani della settimana', 'Bolla e pay jump', 'Difese del BB contro gli steal', '3-bet pot postflop', 'Late reg e stack corti'] },
    { dow: 2, h: 21, m: 30, format: 'SPIN' as const, level: 'LOW' as Level, coachId: 'c-fabri', minPlan: 'base' as PlanId, capacity: 40, dur: 75, titles: ['Spin lab: heads-up a stack corti', '3-handed: lo SB', 'Push/fold senza tabelle', 'Review spin degli studenti'] },
    { dow: 3, h: 21, m: 0, format: 'MENTAL' as const, level: 'LOW' as Level, coachId: 'c-lorenzo', minPlan: 'base' as PlanId, capacity: 50, dur: 60, titles: ['Routine pre-sessione', 'Tilt: riconoscere i trigger', 'Volume sostenibile', 'Downswing: come uscirne'] },
    { dow: 4, h: 21, m: 0, format: 'CASH' as const, level: 'LOW' as Level, coachId: 'c-matteo', minPlan: 'pro' as PlanId, capacity: 25, dur: 90, titles: ['Cash 6-max: linee di turn', 'Single raised pot OOP', 'River: thin value', 'Exploit sul pool NL25'] },
    { dow: 6, h: 17, m: 0, format: 'MTT' as const, level: 'MID' as Level, coachId: 'c-matteo', minPlan: 'elite' as PlanId, capacity: 12, dur: 120, titles: ['Final table lab', 'Deep run commentato', 'ICM avanzato in FT', 'Heads-up per il titolo'] },
  ]
  const lessons: DbLesson[] = []
  const bookings: DbBooking[] = []
  const firstWeek = addDays(startOfWeek(today), -7 * 8)
  let lN = 0
  for (let w = 0; w < 12; w++) {
    const ws = addDays(firstWeek, 7 * w)
    for (const slot of LESSON_SLOTS) {
      const day = addDays(ws, (slot.dow + 6) % 7)
      const startsAt = atTime(day, slot.h, slot.m)
      const id = `gl-${pad(++lN)}`
      // "passata" se precedente a oggi: le decisioni del PRNG dipendono solo dal giorno, non dall'ora
      const past = startsAt.getTime() + slot.dur * MIN < today.getTime()
      lessons.push({
        id,
        title: slot.titles[w % slot.titles.length],
        description:
          slot.format === 'MENTAL'
            ? 'Sessione di gruppo sul mental game: esercizi pratici, domande aperte, piano per la settimana.'
            : `Lezione live ${slot.format === 'SPIN' ? 'Spin & Go' : slot.format === 'CASH' ? 'cash game' : 'MTT'} con mani degli studenti e Q&A finale.`,
        format: slot.format,
        level: slot.level,
        coachId: slot.coachId,
        startsAt: iso(startsAt),
        durationMin: slot.dur,
        capacity: slot.capacity,
        minPlan: slot.minPlan,
        meetingUrl: `https://meet.tris.poker/${id}`,
        recordingUrl: past ? `demo://registrazione/${id}` : null,
      })
      let booked = 0
      for (const pr of profiles) {
        const u = userById.get(pr.userId)!
        if (!u.plan || PLAN_RANK[u.plan] < PLAN_RANK[slot.minPlan]) continue
        if (Date.parse(u.createdAt) > startsAt.getTime()) continue
        if (slot.format !== 'MENTAL' && !u.formats.includes(slot.format)) continue
        const isDemo = pr.userId === DEMO_STUDENT_ID
        const p = isDemo ? (past ? 0.85 : 0.6) : 0.15 + 0.5 * pr.activity
        if (booked >= slot.capacity - (past ? 0 : 2) || !rng.chance(p)) continue
        booked++
        const attended = past ? rng.chance(isDemo ? 0.9 : 0.82) : null
        bookings.push({ id: `${id}:${u.id}`, lessonId: id, userId: u.id, attended, createdAt: iso(startsAt.getTime() - rng.int(1, 6) * DAY) })
        if (attended) addXp(u.id, 'LESSON_ATTENDED', XP_RULES.lesson, `Lezione: ${lessons[lessons.length - 1].title}`, new Date(startsAt.getTime() + slot.dur * MIN), id)
      }
    }
  }

  // ── Hand review (ultimi 120 giorni) ───────────────────────────────────────
  const handReviews: HandReview[] = []
  let hrN = 0
  profiles.forEach((pr) => {
    const u = userById.get(pr.userId)!
    if (!u.plan) return
    const demo = pr.userId === DEMO_STUDENT_ID
    for (let w = 17; w >= 0; w--) {
      const p = demo ? 0.75 : 0.06 + 0.3 * pr.activity
      if (!rng.chance(p)) continue
      const created = atTime(addDays(today, -w * 7 - rng.int(0, 6)), rng.int(10, 23), rng.int(0, 59))
      if (created.getTime() < Date.parse(u.createdAt) || created.getTime() >= today.getTime()) continue
      const pool = HAND_REVIEW_SEEDS.filter((h) => u.formats.includes(h.format))
      const t = pool.length ? rng.pick(pool) : rng.pick(HAND_REVIEW_SEEDS)
      const ageDays = Math.round((today.getTime() - startOfDay(created).getTime()) / DAY)
      const status: HandReview['status'] = ageDays <= 1 ? 'OPEN' : ageDays <= 3 ? (rng.chance(0.5) ? 'IN_REVIEW' : 'OPEN') : 'REVIEWED'
      const id = `hr-${pad(++hrN)}`
      handReviews.push({
        id,
        userId: u.id,
        nickname: u.nickname,
        format: t.format,
        title: t.title,
        description: t.description,
        handHistory: t.hh,
        status,
        coachId: status === 'OPEN' ? null : u.coachId,
        coachComment: status === 'REVIEWED' ? t.comment : null,
        createdAt: iso(created),
        reviewedAt: status === 'REVIEWED' ? iso(created.getTime() + rng.int(10, 40) * HOUR) : null,
      })
      addXp(u.id, 'HAND_REVIEW_SUBMITTED', XP_RULES.handReview, `Mano in review: ${t.title}`, created, id)
    }
  })
  // lo studente demo ha sempre una mano aperta e una in revisione
  const demoHr = handReviews.filter((h) => h.userId === DEMO_STUDENT_ID)
  if (demoHr.length >= 2) {
    const last = demoHr[demoHr.length - 1]
    last.status = 'OPEN'
    last.coachComment = null
    last.reviewedAt = null
    last.coachId = null
    last.createdAt = iso(nowMs - 20 * HOUR)
  }

  // ── Daily Spot (ultimi 60 giorni + oggi) ─────────────────────────────────
  const spots: DbDailySpot[] = []
  const answers: DbDailyAnswer[] = []
  for (let k = 59; k >= 0; k--) {
    const d = addDays(today, -k)
    const date = ymd(d)
    const t = SPOT_TEMPLATES[spotIndexForDate(date)]
    const scale = rng.range(0.9, 1.7)
    const baseVotes: Record<string, number> = {}
    t.options.forEach((o, i) => (baseVotes[o.id] = Math.round(t.votes[i] * scale)))
    spots.push({
      id: `ds-${date}`,
      date,
      format: t.format,
      title: t.title,
      situation: t.situation,
      heroCards: t.heroCards,
      board: t.board,
      stacksBb: t.stacksBb,
      options: t.options,
      coachId: t.coachId,
      correctOptionId: t.correct,
      explanation: t.explanation,
      baseVotes,
    })
  }
  profiles.forEach((pr) => {
    const u = userById.get(pr.userId)!
    if (!u.plan) return
    const demo = pr.userId === DEMO_STUDENT_ID
    let streak = 0
    for (const s of spots) {
      const d = new Date(`${s.date}T12:00:00`)
      if (d.getTime() < Date.parse(u.createdAt)) continue
      const isToday = s.date === ymd(today)
      const daysBack = Math.round((today.getTime() - startOfDay(d).getTime()) / DAY)
      const answer = demo ? !isToday && (daysBack <= 9 || rng.chance(0.8)) : !isToday || rng.chance(0.3) ? rng.chance(0.25 + 0.65 * pr.activity) : false
      if (!answer) {
        streak = 0
        continue
      }
      const correct = rng.chance(0.45 + 0.4 * pr.skill)
      const wrong = s.options.filter((o) => o.id !== s.correctOptionId)
      const optionId = correct ? s.correctOptionId : rng.pick(wrong).id
      const at = isToday ? new Date(nowMs - rng.int(10, 180) * MIN) : atTime(d, rng.int(8, 23), rng.int(0, 59))
      answers.push({ id: `${u.id}:${s.date}`, userId: u.id, spotId: s.id, date: s.date, optionId, correct, createdAt: iso(at) })
      addXp(u.id, 'DAILY_SPOT_CORRECT', correct ? XP_RULES.dailyCorrect : XP_RULES.dailyAttempt, correct ? `Daily Spot — ${s.title}` : 'Daily Spot — tentativo', at, s.id)
      streak++
      if (streak % XP_RULES.dailyStreakEvery === 0) addXp(u.id, 'DAILY_SPOT_STREAK', XP_RULES.dailyStreak, `Streak di ${streak} giorni`, at, s.id)
    }
  })

  // ── Roast della settimana ────────────────────────────────────────────────
  const weekId = isoWeek(today)
  const weekStart = startOfWeek(today)
  const roast: DbRoast[] = ROAST_SEEDS.map((r, i) => {
    const submitter = r.playedByMember ? studentUsers.filter((u) => u.roastOptIn && u.id !== DEMO_STUDENT_ID)[i * 3]?.id ?? null : null
    return {
      id: `rs-${weekId}-${i + 1}`,
      weekId,
      title: r.title,
      description: r.description,
      format: r.format,
      heroCards: r.heroCards,
      board: r.board,
      submittedByUserId: submitter,
      playedByMember: r.playedByMember && !!submitter,
      founderComment: r.founderComment,
      votesWorst: r.worst,
      votesBest: r.best,
      createdAt: iso(Math.min(nowMs - HOUR, atTime(addDays(weekStart, Math.min(i, 3)), 11 + i).getTime())),
    }
  })

  // ── Deep run ──────────────────────────────────────────────────────────────
  const pickComments = (n: number, from: number) => {
    const out: DbDeepRun['comments'] = []
    for (let c = 0; c < n; c++) {
      const [who, text] = DEEP_RUN_COMMENTS[(from + c) % DEEP_RUN_COMMENTS.length]
      const author = who === 'peer' ? rng.pick(studentUsers) : userById.get(who)!
      out.push({ id: `drc-${from}-${c}`, userId: author.id, nickname: author.nickname, text, createdAt: iso(nowMs - (n - c) * rng.int(8, 25) * MIN) })
    }
    return out
  }
  const railers = (n: number) => rng.shuffle(studentUsers.filter((u) => u.id !== DEMO_STUDENT_ID).map((u) => u.id)).slice(0, n)
  const DR: { user: string; t: number; total: number; left: number; stack: number; status: DbDeepRun['status']; finish: number | null; ago: number; rails: number; comments: number }[] = [
    { user: 'u-005', t: 0, total: 2840, left: 41, stack: 38, status: 'LIVE', finish: null, ago: 0, rails: 23, comments: 4 },
    { user: 'u-018', t: 4, total: 486, left: 12, stack: 22, status: 'LIVE', finish: null, ago: 0, rails: 15, comments: 3 },
    { user: DEMO_STUDENT_ID, t: 2, total: 1840, left: 3, stack: 0, status: 'FINAL_TABLE', finish: 3, ago: 16, rails: 31, comments: 5 },
    { user: 'u-002', t: 5, total: 3210, left: 1, stack: 0, status: 'WON', finish: 1, ago: 9, rails: 44, comments: 6 },
    { user: 'u-033', t: 1, total: 905, left: 14, stack: 0, status: 'BUSTED', finish: 14, ago: 4, rails: 12, comments: 2 },
    { user: 'u-015', t: 6, total: 1320, left: 6, stack: 0, status: 'FINAL_TABLE', finish: 6, ago: 22, rails: 19, comments: 3 },
    { user: 'u-025', t: 3, total: 760, left: 27, stack: 0, status: 'BUSTED', finish: 27, ago: 30, rails: 8, comments: 1 },
  ]
  const deepRuns: DbDeepRun[] = DR.map((r, i) => {
    const u = userById.get(r.user)!
    const startedAt = r.ago === 0 ? nowMs - rng.int(4, 6) * HOUR : atTime(daysAgo(r.ago), 19, 0).getTime()
    const updatedAt = r.ago === 0 ? nowMs - rng.int(6, 18) * MIN : startedAt + rng.int(6, 9) * HOUR
    const rl = railers(r.rails)
    const name = TOURNAMENT_NAMES[r.t]
    const buyIn = Number(name.match(/([\d,]+) €/)?.[1].replace(',', '.') ?? 22)
    if (r.status === 'FINAL_TABLE' || r.status === 'WON') addXp(u.id, 'DEEP_RUN', XP_RULES.deepRun, `Deep run: ${name}`, new Date(updatedAt), `dr-${i + 1}`)
    return {
      id: `dr-${i + 1}`,
      userId: u.id,
      nickname: u.nickname,
      avatarSeed: u.avatarSeed,
      tournamentName: name,
      buyIn,
      playersLeft: r.left,
      totalPlayers: r.total,
      stackBb: r.stack,
      status: r.status,
      finishPosition: r.finish,
      rails: rl.length,
      railers: rl,
      comments: pickComments(r.comments, i),
      startedAt: iso(startedAt),
      updatedAt: iso(updatedAt),
    }
  })

  // ── Lobby gaming ─────────────────────────────────────────────────────────
  const founderNick = (id: string) => userById.get(id)!.nickname
  const GAMES = [
    { kind: 'NIGHT' as const, game: 'Warzone', title: 'Warzone: quad post-sessione', host: 'c-lorenzo', day: 0, h: 22, m: 30, max: 16, prize: null, desc: 'Squadre da 4 estratte a sorte. Chi finisce ultimo porta il meme della settimana su Discord.' },
    { kind: 'BOUNTY_1V1' as const, game: 'Warzone', title: 'Taglia su Lollo: 1v1 al Gulag', host: 'c-lorenzo', day: 1, h: 22, m: 0, max: 8, prize: 'Lezione 1:1 gratis', desc: 'Ex pro di Call of Duty contro chiunque abbia il coraggio. Batti Lollo al Gulag e vinci una lezione 1:1.' },
    { kind: 'TOURNAMENT' as const, game: 'EA FC', title: 'Coppa TRIS di EA FC', host: 'c-matteo', day: 2, h: 21, m: 0, max: 16, prize: 'Badge “Campione di lobby”', desc: 'Torneo a eliminazione diretta, partite da 6 minuti. Squadre libere, niente squadre leggendarie.' },
    { kind: 'BOUNTY_1V1' as const, game: 'EA FC', title: 'Taglia su Matte a EA FC', host: 'c-matteo', day: 4, h: 22, m: 0, max: 6, prize: 'Lezione 1:1 gratis', desc: 'Matte giura di essere imbattibile. Dimostragli il contrario e vinci una lezione 1:1.' },
    { kind: 'NIGHT' as const, game: 'Rocket League', title: 'Rocket League 2v2 a rotazione', host: 'c-fabri', day: 6, h: 22, m: 0, max: 12, prize: null, desc: 'Coppie che ruotano ogni partita. Classifica individuale a fine serata.' },
    { kind: 'BOUNTY_1V1' as const, game: 'Rocket League', title: 'Taglia su Fabri: 1v1 a Rocket League', host: 'c-fabri', day: 10, h: 21, m: 30, max: 8, prize: 'Lezione 1:1 gratis', desc: 'Fabri non ammette mai di aver perso. Fallo ammettere: in palio una lezione 1:1.' },
  ]
  const gaming: DbGaming[] = []
  const eligibleGamers = studentUsers.filter((u) => u.plan)
  GAMES.forEach((g, i) => {
    const at = atTime(addDays(today, g.day), g.h, g.m)
    const nPart = g.kind === 'BOUNTY_1V1' ? rng.int(2, 5) : rng.int(5, Math.min(11, (g.max ?? 12) - 3))
    const parts = rng.shuffle(eligibleGamers.filter((u) => u.id !== DEMO_STUDENT_ID)).slice(0, nPart)
    gaming.push({
      id: `ge-${i + 1}`,
      kind: g.kind,
      game: g.game,
      title: g.title,
      description: g.desc,
      startsAt: iso(at),
      hostUserId: g.host,
      hostNickname: founderNick(g.host),
      participants: parts.map((u) => ({ userId: u.id, nickname: u.nickname })),
      maxParticipants: g.max,
      prize: g.prize,
      winnerUserId: null,
    })
  })
  // serate passate (ultime 6 settimane) con vincitori
  for (let k = 0; k < 9; k++) {
    const tpl = GAMES[k % GAMES.length]
    const at = atTime(daysAgo(4 + k * 4 + rng.int(0, 2)), tpl.h, tpl.m)
    const nPart = tpl.kind === 'BOUNTY_1V1' ? rng.int(3, 6) : rng.int(6, 12)
    const pool = rng.shuffle(eligibleGamers.slice())
    const parts = pool.slice(0, nPart)
    if (k % 3 === 0 && !parts.some((p) => p.id === DEMO_STUDENT_ID)) parts[0] = userById.get(DEMO_STUDENT_ID)!
    const winnerStudent = tpl.kind === 'BOUNTY_1V1' ? (k === 1 || k === 5 ? parts[1] : null) : parts[rng.int(0, parts.length - 1)]
    const id = `ge-p${k + 1}`
    gaming.push({
      id,
      kind: tpl.kind,
      game: tpl.game,
      title: tpl.title,
      description: tpl.desc,
      startsAt: iso(at),
      hostUserId: tpl.host,
      hostNickname: founderNick(tpl.host),
      participants: parts.map((u) => ({ userId: u.id, nickname: u.nickname })),
      maxParticipants: tpl.max,
      prize: tpl.prize,
      winnerUserId: winnerStudent ? winnerStudent.id : tpl.host,
    })
    for (const p of parts) addXp(p.id, 'GAMING_NIGHT', XP_RULES.gaming, `Lobby: ${tpl.title}`, new Date(at.getTime() + 2 * HOUR), id)
    if (tpl.kind === 'BOUNTY_1V1' && winnerStudent) addXp(winnerStudent.id, 'BOUNTY_WON', XP_RULES.bounty, `Taglia riscossa su ${founderNick(tpl.host)}`, new Date(at.getTime() + 2 * HOUR), id)
  }

  // ── Corsi: acquisti e progressi ──────────────────────────────────────────
  const purchases: Purchase[] = []
  const progress: DbProgress[] = []
  let pN = 0
  const lessonIds = (cId: string) => COURSES.find((c) => c.id === cId)!.chapters.flatMap((ch) => ch.lessons.map((l) => l.id))
  const addProgress = (userId: string, courseId: string, frac: number, at: number) => {
    const ids = lessonIds(courseId)
    const n = Math.round(ids.length * frac)
    const done = ids.slice(0, n)
    const completedAt = n === ids.length ? iso(at) : null
    progress.push({ id: `${userId}:${courseId}`, userId, courseId, completedLessonIds: done, lastLessonId: done[done.length - 1] ?? null, completedAt })
    if (completedAt) addXp(userId, 'COURSE_COMPLETED', XP_RULES.course, `Corso completato: ${COURSES.find((c) => c.id === courseId)!.title}`, completedAt, courseId)
  }
  const demoBuys: [string, number, number][] = [
    ['crs-icm', 120, 0.56],
    ['crs-spin-method', 55, 0.38],
  ]
  for (const [cId, ago, frac] of demoBuys) {
    const c = COURSES.find((x) => x.id === cId)!
    const at = atTime(daysAgo(ago), 21, 14).getTime()
    purchases.push({ id: `pu-${pad(++pN)}`, userId: DEMO_STUDENT_ID, courseId: cId, amountEur: c.priceEur, provider: 'STRIPE', createdAt: iso(at) })
    addProgress(DEMO_STUDENT_ID, cId, frac, at)
  }
  addProgress(DEMO_STUDENT_ID, 'crs-mtt-found', 1, atTime(daysAgo(150), 22, 0).getTime())
  addProgress(DEMO_STUDENT_ID, 'crs-mental', 0.34, atTime(daysAgo(20), 22, 0).getTime())
  for (const u of studentUsers) {
    if (u.id === DEMO_STUDENT_ID) continue
    const pr = profiles.find((p) => p.userId === u.id)!
    const joinedAgo = Math.max(1, Math.round((today.getTime() - Date.parse(u.createdAt)) / DAY))
    for (const c of COURSES) {
      const relevant = c.format === 'ALL' || c.format === 'MENTAL' || u.formats.includes(c.format as Format)
      if (!relevant) continue
      const included = !!u.plan && c.includedInPlans.includes(u.plan)
      if (included) {
        if (rng.chance(0.6)) addProgress(u.id, c.id, rng.chance(0.3) ? 1 : rng.range(0.1, 0.9), nowMs - rng.int(1, joinedAgo) * DAY)
        continue
      }
      if (!rng.chance(0.1 + 0.25 * pr.activity)) continue
      const at = atTime(daysAgo(rng.int(1, joinedAgo)), rng.int(9, 23), rng.int(0, 59)).getTime()
      purchases.push({ id: `pu-${pad(++pN)}`, userId: u.id, courseId: c.id, amountEur: c.priceEur, provider: 'STRIPE', createdAt: iso(at) })
      addProgress(u.id, c.id, rng.chance(0.25) ? 1 : rng.range(0, 0.8), at + rng.int(2, 40) * DAY)
    }
  }

  // ── Rank: lo studente demo deve essere GRINDER, con due compagni davanti da inseguire.
  // Si aggiungono ore di studio (sempre entro il massimo di 4 h al giorno) finché si raggiunge l'obiettivo.
  const boost = (userId: string, target: number) => {
    const mine = xp.filter((e) => e.userId === userId)
    const studiedByDay = new Map<string, number>()
    for (const e of mine) if (e.type === 'STUDY_HOURS') studiedByDay.set(ymd(e.createdAt), (studiedByDay.get(ymd(e.createdAt)) ?? 0) + e.xp / XP_RULES.studyPerHour)
    for (let k = 0; k < 90 && seasonXpAt(mine, anchor) < target; k++) {
      const d = addDays(today, -k)
      const free = XP_RULES.studyHoursPerDayMax - (studiedByDay.get(ymd(d)) ?? 0)
      if (free <= 0) continue
      const when = Math.min(atTime(d, 8, 30).getTime(), nowMs - MIN)
      const label = `Studio: ${free} h · ${STUDY_LABELS[k % STUDY_LABELS.length]}`
      const e = { id: `x-${xpN++}`, userId, type: 'STUDY_HOURS' as const, xp: free * XP_RULES.studyPerHour, label, createdAt: iso(when) }
      xp.push(e)
      mine.push(e)
      studiedByDay.set(ymd(d), XP_RULES.studyHoursPerDayMax)
    }
  }
  boost(DEMO_STUDENT_ID, 2240)
  boost('u-017', 2400)
  boost('u-030', 2300)

  // ── KYC ───────────────────────────────────────────────────────────────────
  const kyc: KycSubmission[] = []
  const kycFiles: DbKycFile[] = []
  const REJECT = ['Foto del documento sfocata: carica un’immagine leggibile.', 'Il selfie non corrisponde alla foto del documento.']
  users.forEach((u, idx) => {
    if (u.kycStatus === 'NONE') return
    const docType: DocumentType = rng.weighted([
      ['ID_CARD', 6],
      ['PASSPORT', 2],
      ['DRIVING_LICENSE', 2],
    ] as const)
    const submitted = u.kycStatus === 'PENDING' ? nowMs - rng.int(2, 70) * HOUR : Date.parse(u.createdAt) + rng.int(1, 30) * HOUR
    const id = `kyc-${pad(idx + 1)}`
    const kinds: ('FRONT' | 'BACK' | 'SELFIE')[] = docType === 'PASSPORT' ? ['FRONT', 'SELFIE'] : ['FRONT', 'BACK', 'SELFIE']
    const files = kinds.map((kind) => ({ kind, fileId: `${id}-${kind.toLowerCase()}`, mime: 'image/jpeg', sizeBytes: rng.int(380, 2400) * 1000 }))
    files.forEach((f) => kycFiles.push({ id: f.fileId, submissionId: id, kind: f.kind, mime: f.mime, sizeBytes: f.sizeBytes, specimen: true, preview: null }))
    const reviewed = u.kycStatus !== 'PENDING'
    kyc.push({
      id,
      userId: u.id,
      documentType: docType,
      documentNumberLast4: String(rng.int(1000, 9999)),
      status: u.kycStatus as KycSubmission['status'],
      provider: 'MANUAL',
      files,
      submittedAt: iso(submitted),
      reviewedAt: reviewed ? iso(submitted + rng.int(2, 30) * HOUR) : null,
      reviewerId: reviewed ? DEMO_ADMIN_ID : null,
      rejectionReason: u.kycStatus === 'REJECTED' ? REJECT[idx % 2] : null,
    })
  })

  // ── Player Card ───────────────────────────────────────────────────────────
  const cards: SeedData['cards'] = []
  const FOUNDER_ATTR: Record<string, { pre: number; post: number; icm: number; agg: number; men: number; vol: number }> = {
    'c-fabri': { pre: 95, post: 86, icm: 88, agg: 93, men: 87, vol: 97 },
    'c-matteo': { pre: 91, post: 93, icm: 95, agg: 89, men: 88, vol: 90 },
    'c-lorenzo': { pre: 88, post: 87, icm: 89, agg: 90, men: 94, vol: 86 },
  }
  for (const u of users) {
    let attrs = FOUNDER_ATTR[u.id]
    if (!attrs) {
      const pr = profiles.find((p) => p.userId === u.id)!
      const main = u.formats[0]
      const vol90 = sessions
        .filter((s) => s.userId === u.id && s.format === main && Date.parse(s.date) > nowMs - 90 * DAY)
        .reduce((a, s) => a + (main === 'CASH' ? s.hands ?? 0 : s.games), 0)
      const s = pr.skill
      attrs =
        u.id === DEMO_STUDENT_ID
          ? { pre: 78, post: 74, icm: 80, agg: 72, men: 70, vol: volumeAttr(main, vol90) }
          : {
              pre: clampAttr(52 + 30 * s + rng.normal(0, 5)),
              post: clampAttr(48 + 32 * s + rng.normal(0, 5)),
              icm: clampAttr((main === 'MTT' ? 52 : 46) + 28 * s + rng.normal(0, 5)),
              agg: clampAttr(50 + rng.range(0, 30)),
              men: clampAttr(48 + 40 * (1 - (pr.tilt - 1) / 4) + rng.normal(0, 4)),
              vol: volumeAttr(main, vol90),
            }
    }
    const overall = cardOverall(attrs)
    cards.push({
      id: u.id,
      userId: u.id,
      nickname: u.nickname,
      avatarSeed: u.avatarSeed,
      mainFormat: u.formats[0],
      overall,
      rarity: u.role === 'STUDENT' ? cardRarity(overall) : 'ICON',
      attributes: attrs,
      updatedAt: iso(nowMs - rng.int(2, 40) * DAY),
      updatedByCoachId: u.role === 'STUDENT' ? u.coachId : null,
    })
  }

  // ── Staking: accordi e ledger ────────────────────────────────────────────
  const deals: DbDeal[] = []
  const ledger: DbLedger[] = []
  const transactions: Transaction[] = []
  let tN = 0
  const addTx = (date: Date | number, type: Transaction['type'], category: TxCategory, amount: number, description: string, userId: string | null = null) => {
    const t = typeof date === 'number' ? date : date.getTime()
    if (t > nowMs) return
    transactions.push({ id: `tx-${pad(++tN, 4)}`, date: iso(t), type, category, amount: r2(amount), description, userId })
  }
  let leN = 0
  for (const dp of dealPlans) {
    const { u, prof, format, startAgo, status, endAgo, k } = dp
    const id = `sd-${pad(k + 1, 2)}`
    const schoolPct = k % 3 === 2 ? 40 : 50
    const abi = prof.abi[format]
    const capital = format === 'MTT' ? Math.max(1500, Math.round((abi * 80) / 500) * 500) : format === 'SPIN' ? Math.max(1000, Math.round((abi * 120) / 500) * 500) : Math.max(1000, Math.round((abi * 100 * 30) / 500) * 500)
    const startDate = atTime(daysAgo(startAgo), 12, 0)
    const endDate = status === 'CLOSED' ? atTime(daysAgo(endAgo), 18, 0) : null
    deals.push({
      id,
      userId: u.id,
      format,
      status,
      startDate: iso(startDate),
      endDate: endDate ? iso(endDate) : null,
      schoolSharePct: schoolPct,
      playerSharePct: 100 - schoolPct,
      maxAbi: format === 'CASH' ? abi : Math.round(abi * 1.5),
      notes: k % 4 === 0 ? 'Rinnovo trimestrale. Report settimanale su Discord.' : status === 'PAUSED' ? 'In pausa: downswing, si riparte dopo la review con il coach.' : null,
    })
    const entries: DbLedger[] = []
    const push = (date: Date | number, type: DbLedger['type'], amount: number, note: string | null) => {
      entries.push({ id: `le-${pad(++leN, 4)}`, dealId: id, date: iso(date), type, amount: r2(normalizeAmount(type, amount)), note, createdBy: DEMO_ADMIN_ID })
    }
    push(startDate, 'TRANSFER_TO_PLAYER', capital, 'Capitale iniziale')
    const staked = sessions.filter((s) => s.userId === u.id && s.staked).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    let since = 0
    let bankroll = capital
    let weekKey = ''
    let weekSum = 0
    let weekCount = 0
    let weekLast = 0
    const flushWeek = () => {
      if (!weekCount) return
      push(weekLast + HOUR, 'SESSION_RESULT', weekSum, `Risultati settimana ${weekKey.slice(5)} (${weekCount} sessioni)`)
      since += weekSum
      bankroll += weekSum
      weekSum = 0
      weekCount = 0
      if (bankroll < capital * 0.35 && status !== 'CLOSED') {
        const top = Math.round((capital * 0.4) / 100) * 100
        push(weekLast + 2 * HOUR, 'TRANSFER_TO_PLAYER', top, 'Ricarica bankroll')
        bankroll += top
      }
    }
    let monthKey = ym(startDate)
    const settleMonth = (at: number) => {
      if (since <= 0) return
      const school = r2((since * schoolPct) / 100)
      push(at, 'SETTLEMENT', school, `Settlement ${monthKey}: netto ${r2(since)} € → scuola ${school} € (${schoolPct}%), giocatore ${r2(since - school)} €`)
      addTx(at, 'INCOME', 'STAKING', school, `Quota staking ${u.nickname} — ${monthKey}`, u.id)
      bankroll -= since // profitto diviso e prelevato: il bankroll torna al capitale
      since = 0
    }
    for (const s of staked) {
      const t = Date.parse(s.date)
      const m = ym(s.date)
      const wk = isoWeek(new Date(s.date))
      if (wk !== weekKey) {
        flushWeek()
        weekKey = wk
      }
      if (m !== monthKey) {
        flushWeek()
        const firstOfMonth = new Date(`${m}-01T10:00:00`).getTime()
        settleMonth(firstOfMonth)
        monthKey = m
        weekKey = wk
      }
      weekSum = r2(weekSum + s.profit)
      weekCount++
      weekLast = t
    }
    flushWeek()
    if (status === 'CLOSED' && endDate) {
      settleMonth(endDate.getTime() - HOUR)
      const fig = dealFigures(entries)
      const back = Math.max(0, fig.capitalAllocated - fig.capitalReturned - fig.makeup)
      push(endDate, 'RETURN_FROM_PLAYER', back, 'Chiusura accordo: restituzione capitale residuo')
    }
    ledger.push(...entries)
  }

  // ── Finanze della scuola ─────────────────────────────────────────────────
  const planPrice = (p: PlanId) => PLANS.find((x) => x.id === p)!
  const months: Date[] = []
  for (let m = 11; m >= 0; m--) months.push(new Date(today.getFullYear(), today.getMonth() - m, 1))
  const profileOf = new Map(profiles.map((p) => [p.userId, p]))
  for (const [mi, mStart] of months.entries()) {
    const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0, 23, 59)
    const label = mStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    const counts: Record<PlanId, number> = { base: 0, pro: 0, elite: 0 }
    let monthIncome = 0
    let newMembers = 0
    for (const u of studentUsers) {
      const created = Date.parse(u.createdAt)
      const ended = u.planEndedAt ? Date.parse(u.planEndedAt) : Infinity
      const plan = u.plan ?? profileOf.get(u.id)!.prevPlan
      if (!plan) continue
      if (created >= mStart.getTime() && created <= mEnd.getTime()) newMembers++
      if (created > mEnd.getTime() || ended < mStart.getTime()) continue
      if (u.planInterval === 'year') {
        const joinedMonth = new Date(created).getMonth() === mStart.getMonth() && new Date(created).getFullYear() === mStart.getFullYear()
        if (joinedMonth) {
          addTx(created, 'INCOME', 'MEMBERSHIP', planPrice(plan).priceYearly, `Abbonamento annuale ${planPrice(plan).name} — ${u.nickname}`, u.id)
          monthIncome += planPrice(plan).priceYearly
        }
      } else counts[plan]++
    }
    for (const p of ['base', 'pro', 'elite'] as PlanId[]) {
      if (!counts[p]) continue
      const amt = counts[p] * planPrice(p).priceMonthly
      monthIncome += amt
      addTx(new Date(mStart.getFullYear(), mStart.getMonth(), 1, 6, 0), 'INCOME', 'MEMBERSHIP', amt, `Abbonamenti ${planPrice(p).name} — ${label} (${counts[p]} iscritti)`)
    }
    const growth = 0.5 + mi / 11
    const extra = Math.round((120 + rng.range(0, 280)) * growth)
    addTx(new Date(mStart.getFullYear(), mStart.getMonth(), rng.int(10, 26), 21, 0), 'INCOME', 'GROUP_LESSON', extra, `Posti extra lezioni di gruppo — ${label}`)
    monthIncome += extra
    const n1 = Math.round(rng.int(2, 6) * growth + 1)
    for (let k = 0; k < n1; k++) {
      const elite = studentUsers.filter((u) => u.plan === 'elite' || u.plan === 'pro')
      const who = rng.pick(elite)
      addTx(new Date(mStart.getFullYear(), mStart.getMonth(), rng.int(1, 28), rng.int(15, 21), 0), 'INCOME', 'COACHING_1V1', 120, `Coaching 1:1 — ${who.nickname}`, who.id)
      monthIncome += 120
    }
    // costi
    const d = (day: number) => new Date(mStart.getFullYear(), mStart.getMonth(), day, 9, 0)
    addTx(d(3), 'EXPENSE', 'TOOLS', 189, 'Licenze software di studio (solver, tracker)')
    addTx(d(5), 'EXPENSE', 'HOSTING', Math.round(39 + 30 * growth), 'Hosting, database e CDN video')
    addTx(d(12), 'EXPENSE', 'VIDEO_PRODUCTION', Math.round(rng.range(380, 900)), 'Montaggio video corsi e contenuti')
    addTx(d(15), 'EXPENSE', 'MARKETING', Math.round(rng.range(250, 1100) * growth), 'Contenuti social formativi e newsletter')
    addTx(d(27), 'EXPENSE', 'COACH_PAYOUT', Math.round(650 + n1 * 120 * 0.4 + extra * 0.3), 'Compensi coach e assistenti')
    if (newMembers) addTx(d(28), 'EXPENSE', 'KYC', r2(newMembers * 1.8), `Verifiche identità (${newMembers} nuovi iscritti)`)
    addTx(d(28), 'EXPENSE', 'FEES', r2(monthIncome * 0.018 + 4), 'Commissioni pagamenti')
    if (mStart.getMonth() % 3 === 2) addTx(d(16), 'EXPENSE', 'TAXES', Math.round(rng.range(900, 1700)), 'F24 — acconto imposte (stima)')
    if (mi === 8) addTx(d(20), 'EXPENSE', 'TRAVEL', 1340, 'Trasferta live Cannes (vlog e contenuti)')
    if (mi === 4) addTx(d(9), 'EXPENSE', 'TRAVEL', 620, 'Trasferta live Nova Gorica (contenuti)')
    if (mi === 2) addTx(d(21), 'EXPENSE', 'OTHER', 280, 'Materiale studio di registrazione (microfoni, luci)')
  }
  for (const p of purchases) {
    const c = COURSES.find((x) => x.id === p.courseId)!
    addTx(Date.parse(p.createdAt), 'INCOME', 'COURSE', p.amountEur, `Corso “${c.title}” — ${userById.get(p.userId)!.nickname}`, p.userId)
  }
  transactions.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

  // ── Note dei coach ────────────────────────────────────────────────────────
  const notes: DbNote[] = []
  studentUsers.forEach((u, i) => {
    const n = u.id === DEMO_STUDENT_ID ? 3 : rng.chance(0.4) ? 1 : 0
    for (let k = 0; k < n; k++)
      notes.push({ id: `cn-${i}-${k}`, userId: u.id, authorId: u.coachId ?? 'c-matteo', text: COACH_NOTES[(i + k * 2) % COACH_NOTES.length], createdAt: iso(nowMs - rng.int(2, 80) * DAY) })
  })

  xp.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

  return {
    users,
    sessions,
    xp,
    lessons,
    bookings,
    kyc,
    kycFiles,
    spots,
    answers,
    roast,
    roastVotes: [],
    deepRuns,
    gaming,
    handReviews,
    notes,
    purchases,
    progress,
    cards,
    deals,
    ledger,
    transactions,
  }
}

/** Template del Daily Spot per una data: stabile (stessa data → stesso spot). */
export function spotIndexForDate(date: string): number {
  const days = Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY)
  return ((days % SPOT_TEMPLATES.length) + SPOT_TEMPLATES.length) % SPOT_TEMPLATES.length
}

function simulateSession(rng: ReturnType<typeof createRng>, pr: Profile, format: Format) {
  if (format === 'MTT') {
    const n = rng.int(4, 8 + Math.round(10 * pr.activity))
    const r = pr.mtt
    const k = Math.max(0.15, ((1 + r) / 0.17 - 3.775) / 2)
    let buyIns = 0
    let cashes = 0
    let itm = 0
    let bubbles = 0
    let deep = false
    for (let t = 0; t < n; t++) {
      const bi = Math.max(1, Math.round(pr.abi.MTT * Math.exp(rng.normal(0, 0.35)) * 2) / 2)
      buyIns += bi
      if (rng.chance(0.17)) {
        itm++
        const u = rng()
        const m = u < 0.75 ? rng.range(1.5, 3.5) : u < 0.95 ? rng.range(4, 15) : rng.range(20, 60) * k
        if (m >= 20) deep = true
        cashes += bi * m
      } else if (rng.chance(0.03)) bubbles++
    }
    buyIns = r2(buyIns)
    cashes = r2(cashes)
    return {
      durationMin: 180 + n * 16 + rng.int(0, 70),
      games: n,
      hands: null,
      avgBuyIn: r2(buyIns / n),
      totalBuyIns: buyIns,
      totalCashes: cashes,
      profit: r2(cashes - buyIns),
      chipEvBb100: null,
      bbWon: null,
      badBeats: rng.weighted([
        [0, 40],
        [1, 34],
        [2, 18],
        [3, 8],
      ] as const),
      bubbles,
      deepRun: deep,
      itm,
    }
  }
  if (format === 'SPIN') {
    const n = rng.int(25, 50 + Math.round(90 * pr.activity))
    const abi = pr.abi.SPIN
    let profit = rng.normal(n * pr.spin * abi, Math.sqrt(n) * 1.5 * abi)
    if (rng.chance(n * 0.0009)) profit += abi * rng.pick([8, 10, 18])
    const buyIns = r2(n * abi)
    const cashes = r2(Math.max(0, buyIns + profit))
    return {
      durationMin: Math.round(n * 1.3 + rng.int(10, 30)),
      games: n,
      hands: null,
      avgBuyIn: abi,
      totalBuyIns: buyIns,
      totalCashes: cashes,
      profit: r2(cashes - buyIns),
      chipEvBb100: Math.round(rng.normal(pr.spin * 160, 5) * 10) / 10,
      bbWon: null,
      badBeats: rng.weighted([
        [0, 30],
        [1, 35],
        [2, 22],
        [3, 13],
      ] as const),
      bubbles: 0,
      deepRun: false,
    }
  }
  const hands = rng.int(600, 1200 + Math.round(3000 * pr.activity))
  const bb = pr.abi.CASH
  const bbWon = Math.round((hands / 100) * pr.cash + Math.sqrt(hands / 100) * 90 * rng.normal())
  const profit = r2(bbWon * bb)
  const tables = rng.int(2, 6)
  return {
    durationMin: Math.round((hands / (tables * 75)) * 60),
    games: Math.round((tables * hands) / (tables * 75)),
    hands,
    avgBuyIn: bb,
    totalBuyIns: 0,
    totalCashes: Math.max(0, profit),
    profit,
    chipEvBb100: null,
    bbWon,
    badBeats: rng.weighted([
      [0, 35],
      [1, 35],
      [2, 20],
      [3, 10],
    ] as const),
    bubbles: 0,
    deepRun: false,
  }
}
