// MOCK API (modalità demo): implementa l'intera interfaccia `Api` nel browser.
// - dati seed deterministici (./seed.ts) + modifiche persistite in localStorage ("tris.mock.*")
// - latenza simulata 120–300 ms, errori ApiError con messaggi in italiano
// - i documenti KYC restano nel browser: ObjectURL in memoria + anteprima compressa locale
import { COACHES } from '@/data/coaches'
import { COURSES } from '@/data/courses'
import { PLANS } from '@/data/plans'
import { cardOverall, cardRarity, clampAttr } from '@/lib/app-card'
import { XP_RULES, seasonOf, seasonXpAt, sessionXp, tierFromXp } from '@/lib/app-rank'
import { dealFigures, normalizeAmount, settlementPreview, sortLedger } from '@/lib/app-staking'
import { ApiError } from '../types'
import type {
  AdminOverview,
  Api,
  AuthResponse,
  Course,
  CourseProgress,
  DailySpot,
  DeepRun,
  Format,
  GamingEvent,
  GamingLeaderboardEntry,
  GroupLesson,
  KycSubmission,
  LedgerEntry,
  PlanId,
  PlayerCard,
  PlayerDetail,
  PlayerRow,
  RankInfo,
  RoastSpot,
  Session,
  StakingDeal,
  User,
  XpEvent,
} from '../types'
import { computeBadges, computeStats, financeSummary, leaderboard } from './calc'
import { DEMO_ADMIN_ID, DEMO_PASSWORD, DEMO_STUDENT_ID, PLAN_RANK, demoHash, generateSeed, spotIndexForDate } from './seed'
import { compressPreview, renderSpecimen } from './specimen'
import { SPOT_TEMPLATES } from './content'
import { buildDb, clearMockStorage, kv } from './store'
import type { Db, DbDeal, DbDeepRun, DbGaming, DbLesson, DbRoast, DbUser, DbXp } from './store'
import { DAY, HOUR, addDays, isoWeek, iso, startOfDay, startOfWeek, ym, ymd } from './time'

// ── Stato ────────────────────────────────────────────────────────────────────
let db: Db | null = null
let dbDay = ''
const objectUrls = new Map<string, string>() // fileId → blob: URL (solo questa sessione del browser)
const specimenCache = new Map<string, string>()

function D(): Db {
  const today = ymd(new Date())
  if (!db || dbDay !== today) {
    db = buildDb(generateSeed(new Date()))
    dbDay = today
  }
  return db
}

/** Ripristina la demo: cancella tutte le chiavi "tris.mock.*" e rigenera il seed. */
export function resetDemo() {
  clearMockStorage()
  objectUrls.forEach((u) => URL.revokeObjectURL(u))
  objectUrls.clear()
  specimenCache.clear()
  db = null
}

const sleep = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v))
async function run<T>(fn: () => T | Promise<T>): Promise<T> {
  await sleep()
  return clone(await fn())
}
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const r2 = (v: number) => Math.round(v * 100) / 100
const nowIso = () => new Date().toISOString()

const err = {
  unauth: () => new ApiError(401, 'UNAUTHENTICATED', 'Sessione scaduta: accedi di nuovo.'),
  forbidden: (m = 'Non hai i permessi per questa operazione.') => new ApiError(403, 'FORBIDDEN', m),
  notFound: (what: string) => new ApiError(404, 'NOT_FOUND', `${what} non trovato.`),
  invalid: (m: string, code = 'VALIDATION_ERROR') => new ApiError(422, code, m),
  conflict: (m: string, code = 'CONFLICT') => new ApiError(409, code, m),
}

// ── Auth ─────────────────────────────────────────────────────────────────────
interface AuthToken {
  userId: string
  accessToken: string
  refreshToken: string
}

function currentUser(): DbUser | null {
  const t = kv.get<AuthToken>('auth')
  if (!t) return null
  return D().users.get(t.userId) ?? null
}
function requireUser(): DbUser {
  const u = currentUser()
  if (!u) throw err.unauth()
  return u
}
function requireAdmin(): DbUser {
  const u = requireUser()
  if (u.role !== 'ADMIN') throw err.forbidden('Area riservata agli amministratori.')
  return u
}
function requireStaff(): DbUser {
  const u = requireUser()
  if (u.role === 'STUDENT') throw err.forbidden('Area riservata ai coach.')
  return u
}

export function toUser(u: DbUser): User {
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    avatarSeed: u.avatarSeed,
    formats: u.formats,
    mainLevel: u.mainLevel,
    kycStatus: u.kycStatus,
    plan: u.plan,
    planInterval: u.planInterval,
    coachId: u.coachId,
    discordHandle: u.discordHandle,
    gamingTag: u.gamingTag,
    bio: u.bio,
    shareResultsPublicly: u.shareResultsPublicly,
    roastOptIn: u.roastOptIn,
    createdAt: u.createdAt,
  }
}

function issue(u: DbUser): AuthResponse {
  const rnd = () => Math.random().toString(36).slice(2, 12)
  const tok: AuthToken = { userId: u.id, accessToken: `demo.${u.id}.${rnd()}`, refreshToken: `demo-r.${rnd()}` }
  kv.set('auth', tok)
  D().users.update(u.id, { lastSeenAt: nowIso() })
  return { user: toUser(D().users.get(u.id)!), accessToken: tok.accessToken, refreshToken: tok.refreshToken }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function ageOf(birth: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth)
  if (!m) return -1
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return -1
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--
  return age
}

// ── Helper di dominio ────────────────────────────────────────────────────────
const isStudent = (u: DbUser) => u.role === 'STUDENT'
function eventsByUser(): Map<string, DbXp[]> {
  const m = new Map<string, DbXp[]>()
  for (const e of D().xp.all()) {
    const a = m.get(e.userId)
    if (a) a.push(e)
    else m.set(e.userId, [e])
  }
  return m
}
function sessionsByUser(): Map<string, Session[]> {
  const m = new Map<string, Session[]>()
  for (const s of D().sessions.all()) {
    const a = m.get(s.userId)
    if (a) a.push(s)
    else m.set(s.userId, [s])
  }
  return m
}
function addXp(userId: string, type: DbXp['type'], xp: number, label: string, ref?: string, at = new Date()): DbXp {
  const e: DbXp = { id: uid('x'), userId, type, xp, label, createdAt: iso(at), ref }
  D().xp.upsert(e)
  return e
}
function removeXpByRef(userId: string, ref: string, type?: DbXp['type']) {
  for (const e of D().xp.where((x) => x.userId === userId && x.ref === ref && (!type || x.type === type))) D().xp.remove(e.id)
}

function lessonsBookedBy(userId: string) {
  const L = D().lessons
  return D()
    .bookings.where((b) => b.userId === userId)
    .map((b) => ({ startsAt: L.get(b.lessonId)?.startsAt ?? b.createdAt, attended: b.attended }))
}

function statsFor(userId: string, period: Parameters<Api['stats']['me']>[0], format: Format | 'ALL', sessions?: Session[]) {
  return computeStats({
    userId,
    period,
    format,
    now: new Date(),
    sessions: sessions ?? D().sessions.where((s) => s.userId === userId),
    studyEvents: D().xp.where((e) => e.userId === userId && e.type === 'STUDY_HOURS'),
    lessonsBooked: lessonsBookedBy(userId),
  })
}

function rankUsers(): DbUser[] {
  return D().users.where(isStudent)
}

function rankInfo(u: DbUser, evMap = eventsByUser()): RankInfo {
  const now = new Date()
  const ev = evMap.get(u.id) ?? []
  const xp = seasonXpAt(ev, now)
  const t = tierFromXp(xp)
  const pool = rankUsers()
  if (!pool.some((p) => p.id === u.id)) pool.push(u)
  const lb = leaderboard(pool, evMap, now)
  const season = seasonOf(now)
  const clown = D()
    .roast.where((r) => r.submittedByUserId === u.id && r.playedByMember)
    .sort((a, b) => b.votesWorst - a.votesWorst)[0]
  return {
    userId: u.id,
    seasonId: season.id,
    seasonName: season.name,
    seasonEndsAt: iso(season.endsAt),
    tier: t.tier,
    division: t.division,
    xp,
    xpForNextDivision: t.xpForNextDivision,
    xpIntoDivision: t.xpIntoDivision,
    position: lb.find((e) => e.userId === u.id)?.position ?? lb.length,
    badges: computeBadges({
      sessions: D().sessions.where((s) => s.userId === u.id),
      xp: ev,
      deepRuns: D().deepRuns.where((r) => r.userId === u.id),
      roastOptIn: u.roastOptIn,
      clownAt: clown && clown.votesWorst >= 30 ? clown.createdAt : null,
    }),
  }
}

function toCard(c: PlayerCard & { id: string }): PlayerCard {
  const { id: _id, ...card } = c
  void _id
  return card
}

function hasCourseAccess(u: DbUser, c: Course) {
  if (u.role !== 'STUDENT') return true
  if (u.plan && c.includedInPlans.includes(u.plan)) return true
  return D().purchases.all().some((p) => p.userId === u.id && p.courseId === c.id)
}

function progressOf(userId: string, courseId: string): CourseProgress {
  const c = COURSES.find((x) => x.id === courseId)
  const total = c ? c.chapters.reduce((a, ch) => a + ch.lessons.length, 0) : 0
  const p = D().progress.get(`${userId}:${courseId}`)
  const done = p?.completedLessonIds ?? []
  return { courseId, completedLessonIds: done, lastLessonId: p?.lastLessonId ?? null, percent: total ? Math.round((done.length / total) * 100) : 0 }
}

function toLesson(l: DbLesson, u: DbUser | null): GroupLesson {
  const bookings = D().bookings.where((b) => b.lessonId === l.id)
  const mine = !!u && bookings.some((b) => b.userId === u.id)
  const staff = !!u && u.role !== 'STUDENT'
  const planOk = !!u && (staff || (!!u.plan && PLAN_RANK[u.plan] >= PLAN_RANK[l.minPlan]))
  return {
    ...l,
    bookedCount: bookings.length,
    bookedByMe: mine,
    meetingUrl: mine || staff ? l.meetingUrl : null,
    recordingUrl: planOk ? l.recordingUrl : null,
  }
}

function toDeepRun(r: DbDeepRun, u: DbUser | null): DeepRun {
  const { railers, ...rest } = r
  return { ...rest, rails: railers.length, railedByMe: !!u && railers.includes(u.id) }
}

function toGaming(g: DbGaming, u: DbUser | null): GamingEvent {
  const { winnerUserId: _w, ...rest } = g
  void _w
  return { ...rest, joinedByMe: !!u && g.participants.some((p) => p.userId === u.id) }
}

function toRoast(r: DbRoast, u: DbUser | null): RoastSpot {
  const v = u ? D().roastVotes.get(`${r.id}:${u.id}`) : undefined
  return { ...r, myVote: v?.kind ?? null }
}

function spotDistribution(spotId: string): Record<string, number> {
  const s = D().spots.get(spotId)!
  const counts: Record<string, number> = {}
  for (const o of s.options) counts[o.id] = s.baseVotes[o.id] ?? 0
  for (const a of D().answers.where((x) => x.spotId === spotId)) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1
  const tot = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(counts)) out[k] = Math.round((v / tot) * 100)
  return out
}

function toSpot(s: ReturnType<Db['spots']['all']>[number], u: DbUser): DailySpot {
  const a = D().answers.get(`${u.id}:${s.date}`)
  const answered = a && a.spotId === s.id
  const { baseVotes: _b, correctOptionId, explanation, ...pub } = s
  void _b
  if (!answered) return pub
  return { ...pub, answeredOptionId: a.optionId, correctOptionId, explanation, answerDistribution: spotDistribution(s.id) }
}

function dailyStreak(userId: string, today = new Date()): number {
  const days = new Set(D().answers.where((a) => a.userId === userId).map((a) => a.date))
  let d = startOfDay(today)
  if (!days.has(ymd(d))) d = addDays(d, -1)
  let n = 0
  while (days.has(ymd(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

function todaySpot() {
  const today = ymd(new Date())
  const list = D().spots.where((s) => s.date === today)
  if (list.length) return list[list.length - 1] // eventuale spot creato dall'admin ha la precedenza
  // fallback: genera dal template (es. demo aperta a cavallo di mezzanotte)
  const t = SPOT_TEMPLATES[spotIndexForDate(today)]
  const baseVotes: Record<string, number> = {}
  t.options.forEach((o, i) => (baseVotes[o.id] = t.votes[i]))
  return D().spots.upsert({
    id: `ds-${today}`,
    date: today,
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

function dealView(d: DbDeal): StakingDeal {
  const entries = D().ledger.where((e) => e.dealId === d.id)
  const f = dealFigures(entries)
  const u = D().users.get(d.userId)
  return {
    ...d,
    nickname: u?.nickname ?? '—',
    capitalAllocated: f.capitalAllocated,
    capitalReturned: f.capitalReturned,
    makeup: f.makeup,
    netResult: f.netResult,
    schoolProfit: f.schoolProfit,
  }
}

function activeDeal(userId: string, format: Format) {
  return D().deals.all().find((d) => d.userId === userId && d.format === format && d.status === 'ACTIVE')
}

function mrrOf(users: DbUser[]) {
  return r2(
    users
      .filter((u) => isStudent(u) && u.plan)
      .reduce((a, u) => {
        const p = PLANS.find((x) => x.id === u.plan)!
        return a + (u.planInterval === 'year' ? p.priceYearly / 12 : p.priceMonthly)
      }, 0),
  )
}

const ROOM_NAMES = /(pokerstars|gg ?poker|ggnetwork|sisal|snai|lottomatica|888|party ?poker|bwin|eurobet|goldbet|betflag|william ?hill|winamax|unibet|ipoker|betsson|starcasin)/i

function playerRow(u: DbUser, sess: Session[], tierCache: Map<string, RankInfo['tier']>): PlayerRow {
  const now = Date.now()
  const s30 = sess.filter((s) => Date.parse(s.date) >= now - 30 * DAY)
  const main = u.formats[0] ?? 'MTT'
  const tour30 = s30.filter((s) => s.format !== 'CASH')
  const bi30 = tour30.reduce((a, s) => a + s.totalBuyIns, 0)
  const cash30 = s30.filter((s) => s.format === 'CASH')
  const hands30 = cash30.reduce((a, s) => a + (s.hands ?? 0), 0)
  const last = sess.reduce<string | null>((a, s) => (!a || s.date > a ? s.date : a), null)
  return {
    userId: u.id,
    nickname: u.nickname,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    avatarSeed: u.avatarSeed,
    role: u.role,
    formats: u.formats,
    mainLevel: u.mainLevel,
    plan: u.plan,
    kycStatus: u.kycStatus,
    coachId: u.coachId,
    tier: tierCache.get(u.id) ?? 'FISH',
    staked: D().deals.all().some((d) => d.userId === u.id && d.status !== 'CLOSED'),
    profit30d: r2(s30.reduce((a, s) => a + s.profit, 0)),
    profitAll: r2(sess.reduce((a, s) => a + s.profit, 0)),
    volume30d: main === 'CASH' ? hands30 : s30.filter((s) => s.format === main).reduce((a, s) => a + s.games, 0),
    roi30d: bi30 > 0 ? Math.round((tour30.reduce((a, s) => a + s.profit, 0) / bi30) * 1000) / 10 : null,
    bb100_30d: hands30 > 0 ? r2((cash30.reduce((a, s) => a + (s.bbWon ?? 0), 0) / hands30) * 100) : null,
    lastSessionAt: last,
    joinedAt: u.createdAt,
  }
}

function tierMap(): Map<string, RankInfo['tier']> {
  const ev = eventsByUser()
  const now = new Date()
  const m = new Map<string, RankInfo['tier']>()
  for (const u of D().users.all()) m.set(u.id, tierFromXp(seasonXpAt(ev.get(u.id) ?? [], now)).tier)
  return m
}

// ── Implementazione ──────────────────────────────────────────────────────────
export const mockApi: Api = {
  mode: 'demo',

  auth: {
    register: (input) =>
      run(() => {
        const email = input.email.trim().toLowerCase()
        if (!EMAIL_RE.test(email)) throw err.invalid('Inserisci un indirizzo email valido.', 'INVALID_EMAIL')
        if (D().users.all().some((u) => u.email.toLowerCase() === email)) throw err.conflict('Esiste già un account con questa email.', 'EMAIL_TAKEN')
        if ((input.password ?? '').length < 8) throw err.invalid('La password deve avere almeno 8 caratteri.', 'WEAK_PASSWORD')
        const nick = input.nickname.trim()
        if (nick.length < 3 || nick.length > 20) throw err.invalid('Il nickname deve avere tra 3 e 20 caratteri.', 'INVALID_NICKNAME')
        if (D().users.all().some((u) => u.nickname.toLowerCase() === nick.toLowerCase())) throw err.conflict('Nickname già in uso.', 'NICKNAME_TAKEN')
        if (!input.firstName.trim() || !input.lastName.trim()) throw err.invalid('Nome e cognome sono obbligatori.')
        const age = ageOf(input.birthDate)
        if (age < 0) throw err.invalid('Data di nascita non valida.', 'INVALID_BIRTHDATE')
        if (age < 18) throw err.invalid('Devi essere maggiorenne per iscriverti alla scuola.', 'UNDERAGE')
        if (!input.acceptTerms || !input.acceptPrivacy) throw err.invalid('Per continuare accetta termini e informativa privacy.', 'CONSENT_REQUIRED')
        if (!input.formats?.length) throw err.invalid('Scegli almeno un formato.')
        const id = uid('u')
        const main = input.formats[0]
        const u: DbUser = {
          id,
          email,
          nickname: nick,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: 'STUDENT',
          avatarSeed: nick.toLowerCase(),
          formats: input.formats,
          mainLevel: input.mainLevel,
          kycStatus: 'NONE',
          plan: null,
          planInterval: null,
          coachId: main === 'SPIN' ? 'c-fabri' : 'c-matteo',
          discordHandle: input.discordHandle?.trim() || null,
          gamingTag: null,
          bio: null,
          shareResultsPublicly: false,
          roastOptIn: false,
          createdAt: nowIso(),
          passwordHash: demoHash(email, input.password),
          birthDate: input.birthDate,
          planStartedAt: null,
          planEndedAt: null,
          lastSeenAt: nowIso(),
          marketingOptIn: !!input.marketingOptIn,
        }
        D().users.upsert(u)
        const attributes = { pre: 50, post: 50, icm: 50, agg: 50, men: 50, vol: 40 }
        const overall = cardOverall(attributes)
        D().cards.upsert({ id, userId: id, nickname: nick, avatarSeed: u.avatarSeed, mainFormat: main, overall, rarity: cardRarity(overall), attributes, updatedAt: nowIso(), updatedByCoachId: null })
        return issue(u)
      }),
    login: (email, password) =>
      run(() => {
        const e = email.trim().toLowerCase()
        const u = D().users.all().find((x) => x.email.toLowerCase() === e)
        if (!u || u.passwordHash !== demoHash(e, password)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email o password non corretti.')
        return issue(u)
      }),
    logout: () =>
      run(() => {
        kv.set('auth', null)
      }),
    me: () =>
      run(() => {
        const u = currentUser()
        return u ? toUser(u) : null
      }),
    updateProfile: (patch) =>
      run(() => {
        const u = requireUser()
        const next: Partial<DbUser> = {}
        if (patch.nickname !== undefined) {
          const n = patch.nickname.trim()
          if (n.length < 3 || n.length > 20) throw err.invalid('Il nickname deve avere tra 3 e 20 caratteri.', 'INVALID_NICKNAME')
          if (D().users.all().some((x) => x.id !== u.id && x.nickname.toLowerCase() === n.toLowerCase())) throw err.conflict('Nickname già in uso.', 'NICKNAME_TAKEN')
          next.nickname = n
        }
        if (patch.formats !== undefined) {
          if (!patch.formats.length) throw err.invalid('Scegli almeno un formato.')
          next.formats = patch.formats
        }
        if (patch.mainLevel) next.mainLevel = patch.mainLevel
        if (patch.discordHandle !== undefined) next.discordHandle = patch.discordHandle?.trim() || null
        if (patch.gamingTag !== undefined) next.gamingTag = patch.gamingTag?.trim() || null
        if (patch.bio !== undefined) next.bio = patch.bio?.trim().slice(0, 280) || null
        if (patch.shareResultsPublicly !== undefined) next.shareResultsPublicly = patch.shareResultsPublicly
        if (patch.roastOptIn !== undefined) next.roastOptIn = patch.roastOptIn
        const saved = D().users.update(u.id, next)
        const card = D().cards.get(u.id)
        if (card && (next.nickname || next.formats)) D().cards.update(u.id, { nickname: saved.nickname, mainFormat: saved.formats[0] })
        return toUser(saved)
      }),
    demoLogin: (as) =>
      run(() => {
        const u = D().users.get(as === 'ADMIN' ? DEMO_ADMIN_ID : DEMO_STUDENT_ID)
        if (!u) throw err.notFound('Utente demo')
        return issue(u)
      }),
  },

  kyc: {
    submit: async (input) => {
      await sleep()
      const u = requireUser()
      if (!input.consent) throw err.invalid('Serve il consenso esplicito al trattamento dei dati per la verifica.', 'CONSENT_REQUIRED')
      if (!/^[A-Za-z0-9]{4}$/.test(input.documentNumberLast4 ?? '')) throw err.invalid('Inserisci le ultime 4 cifre (o caratteri) del documento.', 'INVALID_LAST4')
      if (!input.front || !input.selfie) throw err.invalid('Carica il fronte del documento e il selfie.', 'FILES_REQUIRED')
      if (input.documentType !== 'PASSPORT' && !input.back) throw err.invalid('Carica anche il retro del documento.', 'FILES_REQUIRED')
      const files = [
        ['FRONT', input.front],
        ['BACK', input.back],
        ['SELFIE', input.selfie],
      ].filter((x): x is ['FRONT' | 'BACK' | 'SELFIE', File] => !!x[1])
      for (const [, f] of files) {
        if (f.size > 10 * 1024 * 1024) throw new ApiError(413, 'FILE_TOO_LARGE', `Il file “${f.name}” supera i 10 MB.`)
        if (!f.type.startsWith('image/') && f.type !== 'application/pdf') throw err.invalid(`Formato non supportato per “${f.name}”: usa JPG, PNG o PDF.`, 'UNSUPPORTED_FILE')
      }
      const prev = D().kyc.where((k) => k.userId === u.id)
      if (prev.some((k) => k.status === 'PENDING')) throw err.conflict('Hai già una verifica in corso.', 'ALREADY_PENDING')
      if (prev.some((k) => k.status === 'APPROVED')) throw err.conflict('La tua identità è già verificata.', 'ALREADY_APPROVED')
      const id = uid('kyc')
      const meta: KycSubmission['files'] = []
      for (const [kind, f] of files) {
        const fileId = `${id}-${kind.toLowerCase()}`
        objectUrls.set(fileId, URL.createObjectURL(f))
        const preview = await compressPreview(f, kind === 'SELFIE' ? 420 : 560)
        D().kycFiles.upsert({ id: fileId, submissionId: id, kind, mime: f.type || 'application/octet-stream', sizeBytes: f.size, specimen: false, preview })
        meta.push({ kind, fileId, mime: f.type || 'application/octet-stream', sizeBytes: f.size })
      }
      const sub: KycSubmission = {
        id,
        userId: u.id,
        documentType: input.documentType,
        documentNumberLast4: input.documentNumberLast4.toUpperCase(),
        status: 'PENDING',
        provider: 'MANUAL',
        files: meta,
        submittedAt: nowIso(),
        reviewedAt: null,
        reviewerId: null,
        rejectionReason: null,
      }
      D().kyc.upsert(sub)
      D().users.update(u.id, { kycStatus: 'PENDING' })
      return clone(sub)
    },
    mine: () =>
      run(() => {
        const u = requireUser()
        return D().kyc.where((k) => k.userId === u.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null
      }),
  },

  public: {
    coaches: () => run(() => COACHES),
    stats: () =>
      run(() => {
        const month = ym(new Date())
        return {
          members: D().users.where((u) => isStudent(u) && !!u.plan).length,
          handsReviewed: D().handReviews.where((h) => h.status === 'REVIEWED').length,
          studyHours: Math.round(D().xp.where((e) => e.type === 'STUDY_HOURS').reduce((a, e) => a + e.xp / XP_RULES.studyPerHour, 0)),
          deepRunsThisMonth: D().deepRuns.where((r) => ym(r.startedAt) === month).length,
          placeholder: true,
        }
      }),
    leaderboard: (limit = 10) =>
      run(() => {
        const pool = rankUsers().filter((u) => u.shareResultsPublicly)
        return leaderboard(pool, eventsByUser(), new Date()).slice(0, limit)
      }),
  },

  plans: {
    list: () => run(() => PLANS),
    subscribe: (planId, interval) =>
      run(() => {
        const u = requireUser()
        const plan = PLANS.find((p) => p.id === planId)
        if (!plan) throw err.notFound('Piano')
        const saved = D().users.update(u.id, { plan: planId, planInterval: interval, planStartedAt: u.planStartedAt ?? nowIso(), planEndedAt: null })
        D().transactions.upsert({
          id: uid('tx'),
          date: nowIso(),
          type: 'INCOME',
          category: 'MEMBERSHIP',
          amount: interval === 'year' ? plan.priceYearly : plan.priceMonthly,
          description: `Abbonamento ${plan.name} (${interval === 'year' ? 'annuale' : 'mensile'}) — ${u.nickname} · demo`,
          userId: u.id,
        })
        return { checkoutUrl: null, user: toUser(saved) }
      }),
  },

  courses: {
    list: (f) =>
      run(() => {
        const q = f?.q?.trim().toLowerCase()
        return COURSES.filter(
          (c) =>
            (!f?.format || c.format === f.format) &&
            (!f?.level || c.level === f.level) &&
            (!q || [c.title, c.subtitle, ...c.tags].some((x) => x.toLowerCase().includes(q))),
        )
      }),
    get: (slug) =>
      run(() => {
        const c = COURSES.find((x) => x.slug === slug)
        if (!c) throw err.notFound('Corso')
        return c
      }),
    checkout: (courseId) =>
      run(() => {
        const u = requireUser()
        const c = COURSES.find((x) => x.id === courseId)
        if (!c) throw err.notFound('Corso')
        if (D().purchases.all().some((p) => p.userId === u.id && p.courseId === c.id)) throw err.conflict('Hai già acquistato questo corso.', 'ALREADY_OWNED')
        if (u.plan && c.includedInPlans.includes(u.plan)) throw err.conflict('Il corso è già incluso nel tuo piano.', 'INCLUDED_IN_PLAN')
        const purchase = { id: uid('pu'), userId: u.id, courseId: c.id, amountEur: c.priceEur, provider: 'DEMO' as const, createdAt: nowIso() }
        D().purchases.upsert(purchase)
        D().transactions.upsert({ id: uid('tx'), date: nowIso(), type: 'INCOME', category: 'COURSE', amount: c.priceEur, description: `Corso “${c.title}” — ${u.nickname} · demo`, userId: u.id })
        return { checkoutUrl: null, purchase }
      }),
    myPurchases: () =>
      run(() => {
        const u = requireUser()
        return D().purchases.where((p) => p.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),
    progress: (courseId) =>
      run(() => {
        const u = requireUser()
        return progressOf(u.id, courseId)
      }),
    completeLesson: (courseId, lessonId) =>
      run(() => {
        const u = requireUser()
        const c = COURSES.find((x) => x.id === courseId)
        if (!c) throw err.notFound('Corso')
        const all = c.chapters.flatMap((ch) => ch.lessons)
        const lesson = all.find((l) => l.id === lessonId)
        if (!lesson) throw err.notFound('Lezione')
        if (!lesson.preview && !hasCourseAccess(u, c)) throw err.forbidden('Acquista il corso o passa a un piano che lo include.')
        const key = `${u.id}:${courseId}`
        const cur = D().progress.get(key)
        const done = Array.from(new Set([...(cur?.completedLessonIds ?? []), lessonId]))
        const complete = all.every((l) => done.includes(l.id))
        const completedAt = cur?.completedAt ?? (complete ? nowIso() : null)
        D().progress.upsert({ id: key, userId: u.id, courseId, completedLessonIds: done, lastLessonId: lessonId, completedAt })
        if (complete && !cur?.completedAt) addXp(u.id, 'COURSE_COMPLETED', XP_RULES.course, `Corso completato: ${c.title}`, courseId)
        return progressOf(u.id, courseId)
      }),
    videoAccess: (courseId, lessonId) =>
      run(() => {
        const u = requireUser()
        const c = COURSES.find((x) => x.id === courseId)
        if (!c) throw err.notFound('Corso')
        const lesson = c.chapters.flatMap((ch) => ch.lessons).find((l) => l.id === lessonId)
        if (!lesson) throw err.notFound('Lezione')
        if (!lesson.preview && !hasCourseAccess(u, c)) throw err.forbidden('Acquista il corso o passa a un piano che lo include.')
        return { lessonId, url: `demo://video/${courseId}/${lessonId}`, expiresAt: iso(Date.now() + HOUR) }
      }),
  },

  lessons: {
    list: (range) =>
      run(() => {
        const u = currentUser()
        const from = range?.from ? Date.parse(range.from) : -Infinity
        const to = range?.to ? Date.parse(range.to) : Infinity
        return D()
          .lessons.where((l) => Date.parse(l.startsAt) >= from && Date.parse(l.startsAt) <= to)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((l) => toLesson(l, u))
      }),
    book: (id) =>
      run(() => {
        const u = requireUser()
        const l = D().lessons.get(id)
        if (!l) throw err.notFound('Lezione')
        if (Date.parse(l.startsAt) < Date.now()) throw err.conflict('La lezione è già iniziata.', 'LESSON_STARTED')
        if (u.role === 'STUDENT' && (!u.plan || PLAN_RANK[u.plan] < PLAN_RANK[l.minPlan]))
          throw err.forbidden(`Per prenotare serve il piano ${PLANS.find((p) => p.id === l.minPlan)!.name} o superiore.`)
        const key = `${l.id}:${u.id}`
        if (D().bookings.get(key)) throw err.conflict('Hai già prenotato questa lezione.', 'ALREADY_BOOKED')
        if (D().bookings.where((b) => b.lessonId === l.id).length >= l.capacity) throw err.conflict('Posti esauriti per questa lezione.', 'LESSON_FULL')
        D().bookings.upsert({ id: key, lessonId: l.id, userId: u.id, attended: null, createdAt: nowIso() })
        return toLesson(l, u)
      }),
    cancel: (id) =>
      run(() => {
        const u = requireUser()
        const l = D().lessons.get(id)
        if (!l) throw err.notFound('Lezione')
        const key = `${l.id}:${u.id}`
        if (!D().bookings.get(key)) throw err.conflict('Non risulti prenotato a questa lezione.', 'NOT_BOOKED')
        if (Date.parse(l.startsAt) < Date.now()) throw err.conflict('La lezione è già iniziata: non puoi più annullare.', 'LESSON_STARTED')
        D().bookings.remove(key)
        return toLesson(l, u)
      }),
  },

  sessions: {
    list: () =>
      run(() => {
        const u = requireUser()
        return D()
          .sessions.where((s) => s.userId === u.id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((s) => {
            const { itm: _i, ...rest } = s
            void _i
            return rest
          })
      }),
    create: (input) =>
      run(() => {
        const u = requireUser()
        const when = Date.parse(input.date)
        if (!Number.isFinite(when)) throw err.invalid('Data della sessione non valida.')
        if (when > Date.now() + HOUR) throw err.invalid('La data della sessione non può essere nel futuro.', 'FUTURE_DATE')
        if (!['MTT', 'SPIN', 'CASH'].includes(input.format)) throw err.invalid('Formato non valido.')
        if (!(input.durationMin > 0) || input.durationMin > 24 * 60) throw err.invalid('Durata non valida (minuti tra 1 e 1440).')
        if (!(input.games >= 0)) throw err.invalid('Numero di giochi non valido.')
        if (input.tilt < 1 || input.tilt > 5) throw err.invalid('Il tilt va da 1 a 5.')
        const cash = input.format === 'CASH'
        if (cash && !(input.hands && input.hands > 0)) throw err.invalid('Per il cash indica le mani giocate.')
        if (!(input.avgBuyIn > 0)) throw err.invalid(cash ? 'Indica il valore del big blind in €.' : 'Indica il buy-in medio.')
        if (input.staked && !activeDeal(u.id, input.format)) throw err.invalid('Non hai un accordo di staking attivo per questo formato.', 'NO_STAKING_DEAL')
        const profit = cash ? r2(input.profit) : r2(input.totalCashes - input.totalBuyIns)
        const s: Session = {
          ...input,
          id: uid('s'),
          userId: u.id,
          games: Math.round(input.games),
          hands: cash ? Math.round(input.hands ?? 0) : null,
          totalBuyIns: cash ? 0 : r2(input.totalBuyIns),
          totalCashes: cash ? Math.max(0, profit) : r2(input.totalCashes),
          profit,
          bbWon: cash ? (input.bbWon ?? Math.round(profit / input.avgBuyIn)) : null,
          chipEvBb100: input.format === 'SPIN' ? (input.chipEvBb100 ?? null) : null,
          notes: input.notes?.trim() || null,
        }
        D().sessions.upsert(s)
        // XP: max 3 sessioni al giorno (giorno di registrazione)
        const today = ymd(new Date())
        const logged = D().xp.where((e) => e.userId === u.id && e.type === 'SESSION_LOGGED' && ymd(e.createdAt) === today).length
        if (logged < XP_RULES.sessionsPerDayMax) addXp(u.id, 'SESSION_LOGGED', sessionXp(s.games), `Sessione ${s.format === 'SPIN' ? 'Spin' : s.format === 'CASH' ? 'Cash' : 'MTT'} · ${cash ? `${s.hands} mani` : `${s.games} giochi`}`, s.id)
        if (s.staked) {
          const deal = activeDeal(u.id, s.format)!
          D().ledger.upsert({ id: uid('le'), dealId: deal.id, date: s.date, type: 'SESSION_RESULT', amount: profit, note: `Sessione del ${new Date(s.date).toLocaleDateString('it-IT')} (tracker)`, createdBy: u.id, ref: s.id })
        }
        return s
      }),
    remove: (id) =>
      run(() => {
        const u = requireUser()
        const s = D().sessions.get(id)
        if (!s || s.userId !== u.id) throw err.notFound('Sessione')
        D().sessions.remove(id)
        removeXpByRef(u.id, id, 'SESSION_LOGGED')
        for (const e of D().ledger.where((x) => x.ref === id)) D().ledger.remove(e.id)
      }),
  },

  stats: {
    me: (period, format = 'ALL') =>
      run(() => {
        const u = requireUser()
        return statsFor(u.id, period, format)
      }),
  },

  rank: {
    me: () => run(() => rankInfo(requireUser())),
    leaderboard: (opts) =>
      run(() => {
        requireUser()
        const pool = rankUsers().filter((u) => !opts?.format || u.formats.includes(opts.format))
        return leaderboard(pool, eventsByUser(), new Date()).slice(0, opts?.limit ?? 50)
      }),
    xpEvents: () =>
      run(() => {
        const u = requireUser()
        return D()
          .xp.where((e) => e.userId === u.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 40)
          .map(({ ref: _r, ...e }): XpEvent => {
            void _r
            return e
          })
      }),
  },

  card: {
    me: () =>
      run(() => {
        const u = requireUser()
        const c = D().cards.get(u.id)
        if (!c) throw err.notFound('Player Card')
        return toCard(c)
      }),
    get: (userId) =>
      run(() => {
        requireUser()
        const c = D().cards.get(userId)
        if (!c) throw err.notFound('Player Card')
        return toCard(c)
      }),
  },

  dailySpot: {
    today: () =>
      run(() => {
        const u = requireUser()
        return toSpot(todaySpot(), u)
      }),
    answer: (spotId, optionId) =>
      run(() => {
        const u = requireUser()
        const s = D().spots.get(spotId)
        if (!s) throw err.notFound('Daily Spot')
        const today = ymd(new Date())
        if (s.date !== today) throw err.conflict('Questo spot è chiuso: torna domani per il prossimo.', 'SPOT_CLOSED')
        if (D().answers.get(`${u.id}:${today}`)) throw err.conflict('Hai già risposto allo spot di oggi.', 'ALREADY_ANSWERED')
        if (!s.options.some((o) => o.id === optionId)) throw err.invalid('Opzione non valida.')
        const correct = optionId === s.correctOptionId
        D().answers.upsert({ id: `${u.id}:${today}`, userId: u.id, spotId, date: today, optionId, correct, createdAt: nowIso() })
        let xpGained = correct ? XP_RULES.dailyCorrect : XP_RULES.dailyAttempt
        addXp(u.id, 'DAILY_SPOT_CORRECT', xpGained, correct ? `Daily Spot — ${s.title}` : 'Daily Spot — tentativo', spotId)
        const streak = dailyStreak(u.id)
        if (streak > 0 && streak % XP_RULES.dailyStreakEvery === 0) {
          addXp(u.id, 'DAILY_SPOT_STREAK', XP_RULES.dailyStreak, `Streak di ${streak} giorni`, spotId)
          xpGained += XP_RULES.dailyStreak
        }
        return { correct, correctOptionId: s.correctOptionId, explanation: s.explanation, streak, xpGained, answerDistribution: spotDistribution(spotId) }
      }),
    streaks: () =>
      run(() => {
        requireUser()
        const out = rankUsers()
          .map((u) => {
            const ans = D()
              .answers.where((a) => a.userId === u.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 30)
            return {
              userId: u.id,
              nickname: u.nickname,
              avatarSeed: u.avatarSeed,
              streak: dailyStreak(u.id),
              correctPct: ans.length ? Math.round((ans.filter((a) => a.correct).length / ans.length) * 100) : 0,
            }
          })
          .filter((x) => x.streak > 0)
        return out.sort((a, b) => b.streak - a.streak || b.correctPct - a.correctPct).slice(0, 15)
      }),
  },

  roast: {
    current: () =>
      run(() => {
        const u = requireUser()
        const week = isoWeek(new Date())
        let list = D().roast.where((r) => r.weekId === week)
        if (!list.length) {
          const last = D().roast.all().reduce((a, r) => (r.weekId > a ? r.weekId : a), '')
          list = D().roast.where((r) => r.weekId === last)
        }
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => toRoast(r, u))
      }),
    vote: (spotId, kind) =>
      run(() => {
        const u = requireUser()
        const r = D().roast.get(spotId)
        if (!r) throw err.notFound('Spot')
        const key = `${spotId}:${u.id}`
        const prev = D().roastVotes.get(key)
        if (prev?.kind === kind) return toRoast(r, u)
        const patch: Partial<DbRoast> = {}
        if (prev) {
          if (prev.kind === 'WORST') patch.votesWorst = Math.max(0, r.votesWorst - 1)
          else patch.votesBest = Math.max(0, r.votesBest - 1)
        }
        if (kind === 'WORST') patch.votesWorst = (patch.votesWorst ?? r.votesWorst) + 1
        else patch.votesBest = (patch.votesBest ?? r.votesBest) + 1
        const saved = D().roast.update(spotId, patch)
        D().roastVotes.upsert({ id: key, spotId, userId: u.id, kind, createdAt: nowIso() })
        if (!prev) {
          const weekStart = startOfWeek(new Date()).getTime()
          const n = D().xp.where((e) => e.userId === u.id && e.type === 'ROAST_VOTE' && Date.parse(e.createdAt) >= weekStart).length
          if (n < XP_RULES.roastVotesPerWeekMax) addXp(u.id, 'ROAST_VOTE', XP_RULES.roastVote, `Voto al Roast: ${r.title}`, spotId)
        }
        return toRoast(saved, u)
      }),
    submit: (input) =>
      run(() => {
        const u = requireUser()
        if (!input.confirmAnonymized) throw err.invalid('Conferma di aver anonimizzato nickname e avatar prima di inviare.', 'ANONYMIZATION_REQUIRED')
        if (input.title.trim().length < 4) throw err.invalid('Dai un titolo allo spot (almeno 4 caratteri).')
        if (input.description.trim().length < 20) throw err.invalid('Descrivi la mano in almeno 20 caratteri.')
        if (ROOM_NAMES.test(`${input.title} ${input.description}`)) throw err.invalid('Togli i nomi delle poker room: usa descrizioni generiche (Decreto Dignità).', 'ROOM_NAME')
        const r: DbRoast = {
          id: uid('rs'),
          weekId: isoWeek(new Date()),
          title: input.title.trim(),
          description: input.description.trim(),
          format: input.format,
          heroCards: input.heroCards.trim(),
          board: input.board?.trim() || null,
          submittedByUserId: u.id,
          playedByMember: input.isMyOwnHand && u.roastOptIn,
          founderComment: null,
          votesWorst: 0,
          votesBest: 0,
          createdAt: nowIso(),
        }
        D().roast.upsert(r)
        return toRoast(r, u)
      }),
  },

  deepRuns: {
    list: (opts) =>
      run(() => {
        const u = currentUser()
        const active = (r: DbDeepRun) => r.status === 'LIVE' || (r.status === 'FINAL_TABLE' && r.finishPosition === null)
        return D()
          .deepRuns.where((r) => !opts?.activeOnly || active(r))
          .sort((a, b) => Number(active(b)) - Number(active(a)) || b.updatedAt.localeCompare(a.updatedAt))
          .map((r) => toDeepRun(r, u))
      }),
    create: (input) =>
      run(() => {
        const u = requireUser()
        const name = input.tournamentName.trim()
        if (name.length < 3) throw err.invalid('Dai un nome al torneo (es. “Main domenicale 109 €”).')
        if (ROOM_NAMES.test(name)) throw err.invalid('Usa un nome generico: niente nomi di poker room (Decreto Dignità).', 'ROOM_NAME')
        if (!(input.totalPlayers > 1) || !(input.playersLeft >= 1) || input.playersLeft > input.totalPlayers) throw err.invalid('Controlla iscritti e giocatori rimasti.')
        if (!(input.stackBb > 0)) throw err.invalid('Indica il tuo stack in big blind.')
        if (D().deepRuns.all().some((r) => r.userId === u.id && (r.status === 'LIVE' || (r.status === 'FINAL_TABLE' && r.finishPosition === null))))
          throw err.conflict('Hai già un deep run attivo: aggiorna quello.', 'RUN_ACTIVE')
        const r: DbDeepRun = {
          id: uid('dr'),
          userId: u.id,
          nickname: u.nickname,
          avatarSeed: u.avatarSeed,
          tournamentName: name,
          buyIn: r2(input.buyIn),
          playersLeft: Math.round(input.playersLeft),
          totalPlayers: Math.round(input.totalPlayers),
          stackBb: Math.round(input.stackBb),
          status: input.playersLeft <= 9 ? 'FINAL_TABLE' : 'LIVE',
          finishPosition: null,
          rails: 0,
          railers: [],
          comments: [],
          startedAt: nowIso(),
          updatedAt: nowIso(),
        }
        D().deepRuns.upsert(r)
        if (r.status === 'FINAL_TABLE') addXp(u.id, 'DEEP_RUN', XP_RULES.deepRun, `Deep run: ${name}`, r.id)
        return toDeepRun(r, u)
      }),
    update: (id, patch) =>
      run(() => {
        const u = requireUser()
        const r = D().deepRuns.get(id)
        if (!r) throw err.notFound('Deep run')
        if (r.userId !== u.id && u.role === 'STUDENT') throw err.forbidden('Puoi aggiornare solo i tuoi deep run.')
        const next: Partial<DbDeepRun> = { updatedAt: nowIso() }
        if (patch.playersLeft !== undefined) {
          if (!(patch.playersLeft >= 1) || patch.playersLeft > r.totalPlayers) throw err.invalid('Giocatori rimasti non validi.')
          next.playersLeft = Math.round(patch.playersLeft)
        }
        if (patch.stackBb !== undefined) next.stackBb = Math.max(0, Math.round(patch.stackBb))
        let status = patch.status ?? r.status
        if (!patch.status && next.playersLeft !== undefined && next.playersLeft <= 9 && r.status === 'LIVE') status = 'FINAL_TABLE'
        next.status = status
        if (status === 'WON') {
          next.finishPosition = 1
          next.playersLeft = 1
        } else if (patch.finishPosition !== undefined) next.finishPosition = patch.finishPosition
        else if (status === 'BUSTED' && r.finishPosition === null) next.finishPosition = next.playersLeft ?? r.playersLeft
        const saved = D().deepRuns.update(id, next)
        const hasXp = D().xp.all().some((e) => e.userId === r.userId && e.type === 'DEEP_RUN' && e.ref === id)
        if ((status === 'FINAL_TABLE' || status === 'WON') && !hasXp) addXp(r.userId, 'DEEP_RUN', XP_RULES.deepRun, `Deep run: ${r.tournamentName}`, id)
        return toDeepRun(saved, u)
      }),
    rail: (id) =>
      run(() => {
        const u = requireUser()
        const r = D().deepRuns.get(id)
        if (!r) throw err.notFound('Deep run')
        if (r.userId === u.id) throw err.conflict('Non puoi railarti da solo: chiedi alla lobby!', 'SELF_RAIL')
        if (r.railers.includes(u.id)) return toDeepRun(r, u)
        const saved = D().deepRuns.update(id, { railers: [...r.railers, u.id], rails: r.railers.length + 1 })
        return toDeepRun(saved, u)
      }),
    comment: (id, text) =>
      run(() => {
        const u = requireUser()
        const r = D().deepRuns.get(id)
        if (!r) throw err.notFound('Deep run')
        const t = text.trim()
        if (!t) throw err.invalid('Il commento è vuoto.')
        if (t.length > 280) throw err.invalid('Massimo 280 caratteri.')
        const saved = D().deepRuns.update(id, { comments: [...r.comments, { id: uid('drc'), userId: u.id, nickname: u.nickname, text: t, createdAt: nowIso() }] })
        return toDeepRun(saved, u)
      }),
  },

  gaming: {
    events: () =>
      run(() => {
        const u = currentUser()
        const from = Date.now() - 21 * DAY
        return D()
          .gaming.where((g) => Date.parse(g.startsAt) >= from)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((g) => toGaming(g, u))
      }),
    join: (id) =>
      run(() => {
        const u = requireUser()
        const g = D().gaming.get(id)
        if (!g) throw err.notFound('Evento')
        if (Date.parse(g.startsAt) < Date.now() - 2 * HOUR) throw err.conflict('L’evento è già concluso.', 'EVENT_PAST')
        if (g.participants.some((p) => p.userId === u.id)) return toGaming(g, u)
        if (g.hostUserId === u.id) throw err.conflict('Sei tu l’host di questo evento.', 'HOST')
        if (g.maxParticipants && g.participants.length >= g.maxParticipants) throw err.conflict('Lobby piena: prova con il prossimo evento.', 'EVENT_FULL')
        const saved = D().gaming.update(id, { participants: [...g.participants, { userId: u.id, nickname: u.nickname }] })
        if (!D().xp.all().some((e) => e.userId === u.id && e.type === 'GAMING_NIGHT' && e.ref === id)) addXp(u.id, 'GAMING_NIGHT', XP_RULES.gaming, `Lobby: ${g.title}`, id)
        return toGaming(saved, u)
      }),
    leave: (id) =>
      run(() => {
        const u = requireUser()
        const g = D().gaming.get(id)
        if (!g) throw err.notFound('Evento')
        if (Date.parse(g.startsAt) < Date.now()) throw err.conflict('L’evento è già iniziato.', 'EVENT_PAST')
        const saved = D().gaming.update(id, { participants: g.participants.filter((p) => p.userId !== u.id) })
        removeXpByRef(u.id, id, 'GAMING_NIGHT')
        return toGaming(saved, u)
      }),
    leaderboard: () =>
      run(() => {
        requireUser()
        const pts = new Map<string, { points: number; wins: number; bounties: number }>()
        const get = (id: string) => pts.get(id) ?? pts.set(id, { points: 0, wins: 0, bounties: 0 }).get(id)!
        for (const g of D().gaming.where((x) => !!x.winnerUserId && Date.parse(x.startsAt) < Date.now())) {
          for (const p of g.participants) get(p.userId).points += 10
          const w = get(g.winnerUserId!)
          w.wins++
          const studentWonBounty = g.kind === 'BOUNTY_1V1' && g.winnerUserId !== g.hostUserId
          w.points += studentWonBounty ? 50 : 30
          if (studentWonBounty) w.bounties++
        }
        const out: GamingLeaderboardEntry[] = [...pts.entries()]
          .map(([userId, v]) => {
            const u = D().users.get(userId)
            return { position: 0, userId, nickname: u?.nickname ?? '—', avatarSeed: u?.avatarSeed ?? userId, points: v.points, wins: v.wins, bountiesClaimed: v.bounties }
          })
          .sort((a, b) => b.points - a.points || b.wins - a.wins || a.nickname.localeCompare(b.nickname))
        out.forEach((e, i) => (e.position = i + 1))
        return out.slice(0, 20)
      }),
  },

  handReviews: {
    mine: () =>
      run(() => {
        const u = requireUser()
        return D().handReviews.where((h) => h.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),
    create: (input) =>
      run(() => {
        const u = requireUser()
        if (input.title.trim().length < 4) throw err.invalid('Dai un titolo alla mano (almeno 4 caratteri).')
        if (input.handHistory.trim().length < 20) throw err.invalid('Incolla la hand history (almeno qualche riga).')
        if (input.handHistory.length > 20000) throw err.invalid('Hand history troppo lunga: massimo 20.000 caratteri.')
        const h = {
          id: uid('hr'),
          userId: u.id,
          nickname: u.nickname,
          format: input.format,
          title: input.title.trim(),
          description: input.description.trim(),
          handHistory: input.handHistory.trim(),
          status: 'OPEN' as const,
          coachId: null,
          coachComment: null,
          createdAt: nowIso(),
          reviewedAt: null,
        }
        D().handReviews.upsert(h)
        const weekStart = startOfWeek(new Date()).getTime()
        const n = D().xp.where((e) => e.userId === u.id && e.type === 'HAND_REVIEW_SUBMITTED' && Date.parse(e.createdAt) >= weekStart).length
        if (n < XP_RULES.handReviewsPerWeekMax) addXp(u.id, 'HAND_REVIEW_SUBMITTED', XP_RULES.handReview, `Mano in review: ${h.title}`, h.id)
        return h
      }),
  },

  admin: {
    overview: () =>
      run((): AdminOverview => {
        requireAdmin()
        const now = Date.now()
        const d30 = now - 30 * DAY
        const users = D().users.all()
        const students = users.filter(isStudent)
        const active = students.filter((u) => u.plan)
        const membersByPlan: Record<PlanId, number> = { base: 0, pro: 0, elite: 0 }
        active.forEach((u) => membersByPlan[u.plan!]++)
        const churned30 = students.filter((u) => !u.plan && u.planEndedAt && Date.parse(u.planEndedAt) >= d30).length
        const txs = D().transactions.all()
        // ricavi operativi: esclusa la quota staking (che ha il suo P&L)
        const isRevenue = (t: (typeof txs)[number]) => t.type === 'INCOME' && t.category !== 'STAKING'
        const revenue30d = r2(txs.filter((t) => isRevenue(t) && Date.parse(t.date) >= d30).reduce((a, t) => a + t.amount, 0))
        const deals = D().deals.all().map(dealView)
        const ledger = D().ledger.all()
        const results = ledger.filter((e) => e.type === 'SESSION_RESULT' || e.type === 'ADJUSTMENT')
        const byUser = sessionsByUser()
        const perf = students
          .map((u) => {
            const s = (byUser.get(u.id) ?? []).filter((x) => Date.parse(x.date) >= d30)
            return { userId: u.id, nickname: u.nickname, profit: r2(s.reduce((a, x) => a + x.profit, 0)), format: u.formats[0], n: s.length }
          })
          .filter((p) => p.n > 0)
          .sort((a, b) => b.profit - a.profit)
        // serie mensili (12 mesi)
        const months: Date[] = []
        const t0 = new Date()
        for (let m = 11; m >= 0; m--) months.push(new Date(t0.getFullYear(), t0.getMonth() - m, 1))
        const revenueSeries = months.map((m) => ({
          date: iso(m),
          value: r2(txs.filter((t) => isRevenue(t) && ym(t.date) === ym(m)).reduce((a, t) => a + t.amount, 0)),
        }))
        const membersSeries = months.map((m) => {
          const end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59).getTime()
          const at = Math.min(end, now)
          return {
            date: iso(m),
            value: students.filter((u) => Date.parse(u.createdAt) <= at && (u.plan ? true : u.planEndedAt ? Date.parse(u.planEndedAt) > at : false)).length,
          }
        })
        const weeks: Date[] = []
        for (let w = 52; w >= 0; w--) weeks.push(addDays(startOfWeek(t0), -7 * w))
        const sortedRes = sortLedger(results)
        let cum = 0
        let idx = 0
        const stakingSeries = weeks.map((w) => {
          const end = addDays(w, 7).getTime()
          while (idx < sortedRes.length && Date.parse(sortedRes[idx].date) < end) cum += sortedRes[idx++].amount
          return { date: iso(w), value: r2(cum) }
        })
        // alert
        const alerts: AdminOverview['alerts'] = []
        const pending = D().kyc.where((k) => k.status === 'PENDING')
        const oldPending = pending.filter((k) => Date.parse(k.submittedAt) < now - 24 * HOUR).length
        if (pending.length) alerts.push({ level: oldPending ? 'warning' : 'info', text: `${pending.length} verifiche d’identità in coda${oldPending ? `, ${oldPending} da più di 24 ore` : ''}.` })
        for (const d of deals.filter((x) => x.status === 'ACTIVE' && x.makeup > 0.5 * Math.max(1, x.capitalAllocated - x.capitalReturned)))
          alerts.push({ level: 'danger', text: `${d.nickname}: makeup di ${Math.round(d.makeup).toLocaleString('it-IT')} € oltre metà del capitale in gioco.` })
        const openHr = D().handReviews.where((h) => h.status !== 'REVIEWED' && Date.parse(h.createdAt) < now - 48 * HOUR).length
        if (openHr) alerts.push({ level: 'warning', text: `${openHr} hand review aspettano risposta da più di 48 ore.` })
        for (const u of active) {
          const s = (byUser.get(u.id) ?? []).filter((x) => Date.parse(x.date) >= d30)
          if (s.length >= 5) {
            const tilt = s.reduce((a, x) => a + x.tilt, 0) / s.length
            if (tilt >= 3) alerts.push({ level: 'info', text: `${u.nickname}: tilt medio ${tilt.toFixed(1).replace('.', ',')} negli ultimi 30 giorni. Una call di mental?` })
          }
        }
        const idle = active.filter((u) => {
          const last = (byUser.get(u.id) ?? []).reduce((a, x) => Math.max(a, Date.parse(x.date)), 0)
          return last && last < now - 21 * DAY
        })
        if (idle.length) alerts.push({ level: 'info', text: `${idle.length} iscritti attivi senza sessioni da 3 settimane: ${idle.slice(0, 3).map((u) => u.nickname).join(', ')}${idle.length > 3 ? '…' : ''}` })
        return {
          activeMembers: active.length,
          membersByPlan,
          newMembers30d: students.filter((u) => Date.parse(u.createdAt) >= d30).length,
          churn30dPct: Math.round((churned30 / Math.max(1, active.length + churned30)) * 1000) / 10,
          mrr: mrrOf(users),
          revenue30d,
          coursesSold30d: D().purchases.where((p) => Date.parse(p.createdAt) >= d30).length,
          kycPending: pending.length,
          stakingCapitalOut: r2(deals.filter((d) => d.status !== 'CLOSED').reduce((a, d) => a + d.capitalAllocated - d.capitalReturned, 0)),
          stakingNet30d: r2(results.filter((e) => Date.parse(e.date) >= d30).reduce((a, e) => a + e.amount, 0)),
          stakingNetAll: r2(results.reduce((a, e) => a + e.amount, 0)),
          topPlayers30d: perf.slice(0, 5).map(({ n: _n, ...p }) => (void _n, p)),
          worstPlayers30d: perf
            .slice(-5)
            .reverse()
            .filter((p) => p.profit < 0)
            .map(({ n: _n, ...p }) => (void _n, p)),
          revenueSeries,
          stakingSeries,
          membersSeries,
          alerts: alerts.slice(0, 8),
        }
      }),
    players: {
      list: (f) =>
        run(() => {
          requireAdmin()
          const byUser = sessionsByUser()
          const tiers = tierMap()
          const q = f?.q?.trim().toLowerCase()
          let rows = D()
            .users.all()
            .map((u) => playerRow(u, byUser.get(u.id) ?? [], tiers))
            .filter(
              (r) =>
                (!q || [r.nickname, r.fullName, r.email].some((x) => x.toLowerCase().includes(q))) &&
                (!f?.format || r.formats.includes(f.format)) &&
                (!f?.plan || r.plan === f.plan) &&
                (!f?.kycStatus || r.kycStatus === f.kycStatus) &&
                (f?.staked === undefined || r.staked === f.staked),
            )
          const sort = f?.sort ?? 'profit30d'
          rows = rows.sort((a, b) => {
            switch (sort) {
              case 'nickname':
                return a.nickname.localeCompare(b.nickname)
              case 'joinedAt':
                return b.joinedAt.localeCompare(a.joinedAt)
              default:
                return (b[sort] as number) - (a[sort] as number)
            }
          })
          return { items: rows, total: rows.length }
        }),
      get: (userId) =>
        run((): PlayerDetail => {
          requireAdmin()
          const u = D().users.get(userId)
          if (!u) throw err.notFound('Giocatore')
          const sess = D().sessions.where((s) => s.userId === userId)
          const card = D().cards.get(userId)
          return {
            user: toUser(u),
            row: playerRow(u, sess, tierMap()),
            stats: statsFor(userId, '90d', 'ALL', sess),
            rank: rankInfo(u),
            card: card ? toCard(card) : { userId, nickname: u.nickname, avatarSeed: u.avatarSeed, mainFormat: u.formats[0], overall: 49, rarity: 'BRONZE', attributes: { pre: 50, post: 50, icm: 50, agg: 50, men: 50, vol: 40 }, updatedAt: u.createdAt, updatedByCoachId: null },
            stakingDeals: D().deals.where((d) => d.userId === userId).map(dealView),
            sessions: sess.sort((a, b) => b.date.localeCompare(a.date)).map(({ itm: _i, ...s }) => (void _i, s)),
            purchases: D().purchases.where((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            kyc: D().kyc.where((k) => k.userId === userId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null,
            coachNotes: D()
              .notes.where((n) => n.userId === userId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map(({ userId: _u, ...n }) => (void _u, n)),
          }
        }),
      update: (userId, patch) =>
        run(() => {
          const admin = requireAdmin()
          const u = D().users.get(userId)
          if (!u) throw err.notFound('Giocatore')
          const next: Partial<DbUser> = {}
          if (patch.role) {
            if (u.id === admin.id && patch.role !== 'ADMIN') throw err.conflict('Non puoi togliere a te stesso il ruolo di admin.', 'SELF_DEMOTE')
            next.role = patch.role
          }
          if (patch.plan !== undefined) {
            next.plan = patch.plan
            if (patch.plan && !u.plan) {
              next.planStartedAt = nowIso()
              next.planEndedAt = null
              next.planInterval = u.planInterval ?? 'month'
            }
            if (!patch.plan && u.plan) {
              next.planEndedAt = nowIso()
              next.planInterval = null
            }
          }
          if (patch.coachId !== undefined) {
            if (patch.coachId && !COACHES.some((c) => c.id === patch.coachId)) throw err.invalid('Coach non valido.')
            next.coachId = patch.coachId
          }
          if (patch.mainLevel) next.mainLevel = patch.mainLevel
          return toUser(D().users.update(userId, next))
        }),
      addNote: (userId, text) =>
        run(() => {
          const admin = requireAdmin()
          if (!D().users.get(userId)) throw err.notFound('Giocatore')
          const t = text.trim()
          if (t.length < 2) throw err.invalid('La nota è vuota.')
          const n = { id: uid('cn'), userId, authorId: admin.id, text: t.slice(0, 2000), createdAt: nowIso() }
          D().notes.upsert(n)
          return { id: n.id, authorId: n.authorId, text: n.text, createdAt: n.createdAt }
        }),
      updateCard: (userId, attributes) =>
        run(() => {
          const admin = requireAdmin()
          const u = D().users.get(userId)
          if (!u) throw err.notFound('Giocatore')
          const a = {
            pre: clampAttr(attributes.pre),
            post: clampAttr(attributes.post),
            icm: clampAttr(attributes.icm),
            agg: clampAttr(attributes.agg),
            men: clampAttr(attributes.men),
            vol: clampAttr(attributes.vol),
          }
          const overall = cardOverall(a)
          const card = { id: userId, userId, nickname: u.nickname, avatarSeed: u.avatarSeed, mainFormat: u.formats[0], overall, rarity: u.role === 'STUDENT' ? cardRarity(overall) : ('ICON' as const), attributes: a, updatedAt: nowIso(), updatedByCoachId: admin.id }
          D().cards.upsert(card)
          return toCard(card)
        }),
    },
    kyc: {
      queue: (status) =>
        run(() => {
          requireAdmin()
          const order = { PENDING: 0, REJECTED: 1, APPROVED: 2 }
          return D()
            .kyc.where((k) => !status || k.status === status)
            .sort((a, b) => order[a.status] - order[b.status] || (a.status === 'PENDING' ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)))
            .map((k) => {
              const u = D().users.get(k.userId)
              return { ...k, user: { id: k.userId, nickname: u?.nickname ?? '—', firstName: u?.firstName ?? '', lastName: u?.lastName ?? '', email: u?.email ?? '' } }
            })
        }),
      fileUrl: (submissionId, fileId) =>
        run(() => {
          const admin = requireAdmin()
          const sub = D().kyc.get(submissionId)
          if (!sub) throw err.notFound('Verifica')
          const meta = sub.files.find((f) => f.fileId === fileId)
          if (!meta) throw err.notFound('File')
          if (sub.status !== 'PENDING') throw new ApiError(410, 'FILE_PURGED', 'Documento eliminato dopo l’esito della verifica (policy di conservazione).')
          // registro accessi (solo locale): chi ha aperto quale file e quando
          const log = kv.get<{ submissionId: string; fileId: string; by: string; at: string }[]>('kyc.audit') ?? []
          log.push({ submissionId, fileId, by: admin.id, at: nowIso() })
          kv.set('kyc.audit', log.slice(-200))
          const live = objectUrls.get(fileId)
          if (live) return live
          const f = D().kycFiles.get(fileId)
          if (f?.preview) return f.preview
          if (f?.specimen) {
            let url = specimenCache.get(fileId)
            if (!url) {
              const u = D().users.get(sub.userId)
              url = renderSpecimen(meta.kind, {
                firstName: u?.firstName ?? '',
                lastName: u?.lastName ?? '',
                documentType: sub.documentType,
                last4: sub.documentNumberLast4,
                seed: [...fileId].reduce((a, c) => a + c.charCodeAt(0) * 7, 0),
              })
              specimenCache.set(fileId, url)
            }
            return url
          }
          throw err.notFound('File (resta solo nella sessione del browser in cui è stato caricato)')
        }),
      review: (submissionId, decision, reason) =>
        run(() => {
          const admin = requireAdmin()
          const sub = D().kyc.get(submissionId)
          if (!sub) throw err.notFound('Verifica')
          if (sub.status !== 'PENDING') throw err.conflict('Questa verifica è già stata esaminata.', 'ALREADY_REVIEWED')
          if (decision === 'REJECTED' && (reason ?? '').trim().length < 5) throw err.invalid('Indica il motivo del rifiuto: lo vedrà il giocatore.', 'REASON_REQUIRED')
          const saved = D().kyc.update(submissionId, {
            status: decision,
            reviewedAt: nowIso(),
            reviewerId: admin.id,
            rejectionReason: decision === 'REJECTED' ? reason!.trim() : null,
          })
          D().users.update(sub.userId, { kycStatus: decision })
          // retention: i file vengono eliminati dopo l'esito
          for (const f of sub.files) {
            const url = objectUrls.get(f.fileId)
            if (url) URL.revokeObjectURL(url)
            objectUrls.delete(f.fileId)
            specimenCache.delete(f.fileId)
            if (D().kycFiles.get(f.fileId)) D().kycFiles.remove(f.fileId)
          }
          return saved
        }),
    },
    staking: {
      deals: () =>
        run(() => {
          requireAdmin()
          const order = { ACTIVE: 0, PAUSED: 1, CLOSED: 2 }
          return D()
            .deals.all()
            .map(dealView)
            .sort((a, b) => order[a.status] - order[b.status] || b.capitalAllocated - a.capitalAllocated)
        }),
      create: (input) =>
        run(() => {
          const admin = requireAdmin()
          const u = D().users.get(input.userId)
          if (!u) throw err.notFound('Giocatore')
          if (input.schoolSharePct + input.playerSharePct !== 100) throw err.invalid('Le quote scuola e giocatore devono sommare 100%.')
          if (!(input.initialCapital > 0)) throw err.invalid('Il capitale iniziale deve essere maggiore di zero.')
          if (D().deals.all().some((d) => d.userId === u.id && d.format === input.format && d.status !== 'CLOSED'))
            throw err.conflict(`${u.nickname} ha già un accordo ${input.format} aperto.`, 'DEAL_EXISTS')
          const id = uid('sd')
          const deal: DbDeal = {
            id,
            userId: u.id,
            format: input.format,
            status: 'ACTIVE',
            startDate: input.startDate,
            endDate: null,
            schoolSharePct: input.schoolSharePct,
            playerSharePct: input.playerSharePct,
            maxAbi: input.maxAbi,
            notes: input.notes?.trim() || null,
          }
          D().deals.upsert(deal)
          D().ledger.upsert({ id: uid('le'), dealId: id, date: input.startDate, type: 'TRANSFER_TO_PLAYER', amount: -Math.abs(input.initialCapital), note: 'Capitale iniziale', createdBy: admin.id })
          return dealView(deal)
        }),
      update: (id, patch) =>
        run(() => {
          requireAdmin()
          const d = D().deals.get(id)
          if (!d) throw err.notFound('Accordo')
          const school = patch.schoolSharePct ?? d.schoolSharePct
          const player = patch.playerSharePct ?? d.playerSharePct
          if (school + player !== 100) throw err.invalid('Le quote scuola e giocatore devono sommare 100%.')
          const next: Partial<DbDeal> = { ...patch }
          if (patch.status === 'CLOSED' && d.status !== 'CLOSED') next.endDate = nowIso()
          if (patch.status && patch.status !== 'CLOSED') next.endDate = null
          return dealView(D().deals.update(id, next))
        }),
      ledger: (dealId) =>
        run(() => {
          requireAdmin()
          if (!D().deals.get(dealId)) throw err.notFound('Accordo')
          return sortLedger(D().ledger.where((e) => e.dealId === dealId)).map(({ ref: _r, ...e }): LedgerEntry => (void _r, e))
        }),
      addEntry: (dealId, input) =>
        run(() => {
          const admin = requireAdmin()
          const d = D().deals.get(dealId)
          if (!d) throw err.notFound('Accordo')
          if (input.type === 'SETTLEMENT') throw err.invalid('Per il settlement usa il pulsante dedicato: calcola la divisione in automatico.')
          if (!Number.isFinite(input.amount) || input.amount === 0) throw err.invalid('Importo non valido.')
          if (!Number.isFinite(Date.parse(input.date))) throw err.invalid('Data non valida.')
          const entry: LedgerEntry = { id: uid('le'), dealId, date: input.date, type: input.type, amount: r2(normalizeAmount(input.type, input.amount)), note: input.note?.trim() || null, createdBy: admin.id }
          D().ledger.upsert(entry)
          return { deal: dealView(d), entry }
        }),
      settle: (dealId) =>
        run(() => {
          const admin = requireAdmin()
          const d = D().deals.get(dealId)
          if (!d) throw err.notFound('Accordo')
          const pv = settlementPreview(D().ledger.where((e) => e.dealId === dealId), d.schoolSharePct, d.playerSharePct)
          if (!pv.canSettle)
            throw err.conflict(
              pv.makeup > 0 ? `Niente da dividere: il giocatore è in makeup di ${pv.makeup.toLocaleString('it-IT')} €, che resta da recuperare.` : 'Niente da dividere dall’ultimo settlement.',
              'NOTHING_TO_SETTLE',
            )
          const u = D().users.get(d.userId)
          const entry: LedgerEntry = {
            id: uid('le'),
            dealId,
            date: nowIso(),
            type: 'SETTLEMENT',
            amount: pv.school,
            note: `Settlement: netto ${pv.net} € → scuola ${pv.school} € (${d.schoolSharePct}%), giocatore ${pv.player} € (${d.playerSharePct}%)`,
            createdBy: admin.id,
          }
          D().ledger.upsert(entry)
          D().transactions.upsert({ id: uid('tx'), date: entry.date, type: 'INCOME', category: 'STAKING', amount: pv.school, description: `Quota staking ${u?.nickname ?? ''} — settlement`, userId: d.userId })
          return { deal: dealView(d), entry }
        }),
    },
    finance: {
      summary: (range) =>
        run(() => {
          requireAdmin()
          return financeSummary(D().transactions.all(), range.from, range.to, mrrOf(D().users.all()))
        }),
      transactions: (range) =>
        run(() => {
          requireAdmin()
          const f = Date.parse(range.from)
          const t = Date.parse(range.to)
          return D()
            .transactions.where((x) => Date.parse(x.date) >= f && Date.parse(x.date) <= t)
            .sort((a, b) => b.date.localeCompare(a.date))
        }),
      addTransaction: (input) =>
        run(() => {
          requireAdmin()
          if (!(input.amount > 0)) throw err.invalid('L’importo deve essere positivo: il segno lo dà il tipo (entrata/uscita).')
          if (!input.description.trim()) throw err.invalid('Aggiungi una descrizione.')
          if (!Number.isFinite(Date.parse(input.date))) throw err.invalid('Data non valida.')
          const tx = { ...input, id: uid('tx'), amount: r2(input.amount), description: input.description.trim() }
          D().transactions.upsert(tx)
          return tx
        }),
      removeTransaction: (id) =>
        run(() => {
          requireAdmin()
          if (!D().transactions.get(id)) throw err.notFound('Transazione')
          D().transactions.remove(id)
        }),
    },
    courses: {
      sales: () =>
        run(() => {
          requireAdmin()
          const d30 = Date.now() - 30 * DAY
          const ps = D().purchases.all()
          return COURSES.map((c) => {
            const mine = ps.filter((p) => p.courseId === c.id)
            return {
              courseId: c.id,
              title: c.title,
              units: mine.length,
              revenue: r2(mine.reduce((a, p) => a + p.amountEur, 0)),
              last30dUnits: mine.filter((p) => Date.parse(p.createdAt) >= d30).length,
            }
          }).sort((a, b) => b.revenue - a.revenue)
        }),
    },
    lessons: {
      create: (input) =>
        run(() => {
          requireAdmin()
          validateLesson(input)
          const l: DbLesson = { ...input, id: uid('gl'), recordingUrl: null, meetingUrl: input.meetingUrl?.trim() || null }
          D().lessons.upsert(l)
          return toLesson(l, currentUser())
        }),
      update: (id, patch) =>
        run(() => {
          requireAdmin()
          const l = D().lessons.get(id)
          if (!l) throw err.notFound('Lezione')
          const next = { ...l, ...patch }
          validateLesson(next)
          const booked = D().bookings.where((b) => b.lessonId === id).length
          if (next.capacity < booked) throw err.invalid(`Ci sono già ${booked} prenotati: la capienza non può essere inferiore.`)
          return toLesson(D().lessons.upsert(next), currentUser())
        }),
      remove: (id) =>
        run(() => {
          requireAdmin()
          if (!D().lessons.get(id)) throw err.notFound('Lezione')
          for (const b of D().bookings.where((x) => x.lessonId === id)) D().bookings.remove(b.id)
          D().lessons.remove(id)
        }),
    },
    handReviews: {
      queue: () =>
        run(() => {
          requireStaff()
          const all = D().handReviews.all()
          const open = all.filter((h) => h.status !== 'REVIEWED').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          const done = all
            .filter((h) => h.status === 'REVIEWED')
            .sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''))
            .slice(0, 12)
          return [...open, ...done]
        }),
      reply: (id, comment) =>
        run(() => {
          const staff = requireStaff()
          const h = D().handReviews.get(id)
          if (!h) throw err.notFound('Hand review')
          if (comment.trim().length < 10) throw err.invalid('Scrivi una risposta di almeno 10 caratteri.')
          return D().handReviews.update(id, { status: 'REVIEWED', coachId: staff.id, coachComment: comment.trim(), reviewedAt: nowIso() })
        }),
    },
    dailySpots: {
      create: (input) =>
        run(() => {
          requireStaff()
          if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw err.invalid('Data non valida (AAAA-MM-GG).')
          if (input.title.trim().length < 3 || input.situation.trim().length < 10) throw err.invalid('Titolo e situazione sono obbligatori.')
          if (input.options.length < 2) throw err.invalid('Servono almeno due opzioni.')
          if (!input.options.some((o) => o.id === input.correctOptionId)) throw err.invalid('Scegli la risposta corretta tra le opzioni.')
          if (input.explanation.trim().length < 20) throw err.invalid('La spiegazione del coach deve avere almeno 20 caratteri.')
          const baseVotes: Record<string, number> = {}
          input.options.forEach((o) => (baseVotes[o.id] = 0))
          const s = { ...input, id: `ds-${input.date}-c${Date.now().toString(36)}`, baseVotes }
          D().spots.upsert(s)
          const { baseVotes: _b, ...pub } = s
          void _b
          return pub
        }),
    },
  },
}

function validateLesson(l: Omit<GroupLesson, 'id' | 'bookedCount' | 'bookedByMe' | 'recordingUrl'>) {
  if (l.title.trim().length < 3) throw err.invalid('Il titolo deve avere almeno 3 caratteri.')
  if (!Number.isFinite(Date.parse(l.startsAt))) throw err.invalid('Data e ora non valide.')
  if (!(l.capacity >= 1)) throw err.invalid('La capienza deve essere almeno 1.')
  if (!(l.durationMin >= 15)) throw err.invalid('La durata minima è 15 minuti.')
  if (!COACHES.some((c) => c.id === l.coachId)) throw err.invalid('Coach non valido.')
}

// password demo esportata solo per i suggerimenti nella pagina di accesso
export const DEMO_CREDENTIALS = {
  student: { email: 'studente@demo.it', password: DEMO_PASSWORD },
  admin: { email: 'admin@demo.it', password: DEMO_PASSWORD },
}
