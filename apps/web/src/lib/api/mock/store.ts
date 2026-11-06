// Archivio del mock: tabelle "seed + overlay". Il seed è deterministico e rigenerato a ogni avvio;
// solo le modifiche (insert/update/delete) vengono salvate in localStorage sotto "tris.mock.t.<tabella>".
// Così il localStorage resta piccolo anche con migliaia di sessioni seed.
import type {
  DailySpot,
  DeepRun,
  GamingEvent,
  GroupLesson,
  HandReview,
  KycSubmission,
  LedgerEntry,
  PlayerCard,
  Purchase,
  RoastSpot,
  Session,
  StakingDeal,
  Transaction,
  User,
  XpEvent,
} from '../types'

export const LS_PREFIX = 'tris.mock.'

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(LS_PREFIX + key)
    else localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota piena o storage non disponibile: la demo continua in memoria */
  }
}

export const kv = {
  get: lsGet,
  set: lsSet,
}

interface Overlay<T> {
  up: Record<string, T>
  del: string[]
}

export class Table<T extends { id: string }> {
  readonly name: string
  private base: T[]
  private overlay: Overlay<T>
  private cache: T[] | null = null
  private index: Map<string, T> | null = null

  constructor(name: string, base: T[]) {
    this.name = name
    this.base = base
    this.overlay = lsGet<Overlay<T>>(`t.${name}`) ?? { up: {}, del: [] }
  }

  all(): T[] {
    if (this.cache) return this.cache
    const del = new Set(this.overlay.del)
    const out: T[] = []
    const seen = new Set<string>()
    for (const row of this.base) {
      if (del.has(row.id)) continue
      out.push(this.overlay.up[row.id] ?? row)
      seen.add(row.id)
    }
    for (const [id, row] of Object.entries(this.overlay.up)) if (!seen.has(id) && !del.has(id)) out.push(row)
    this.cache = out
    return out
  }

  get(id: string): T | undefined {
    if (!this.index) this.index = new Map(this.all().map((r) => [r.id, r]))
    return this.index.get(id)
  }

  where(pred: (row: T) => boolean): T[] {
    return this.all().filter(pred)
  }

  upsert(row: T): T {
    this.overlay.up[row.id] = row
    this.overlay.del = this.overlay.del.filter((d) => d !== row.id)
    this.touch()
    return row
  }

  update(id: string, patch: Partial<T>): T {
    const cur = this.get(id)
    if (!cur) throw new Error(`${this.name}: ${id} non trovato`)
    return this.upsert({ ...cur, ...patch })
  }

  remove(id: string) {
    delete this.overlay.up[id]
    if (!this.overlay.del.includes(id)) this.overlay.del.push(id)
    this.touch()
  }

  private touch() {
    this.cache = null
    this.index = null
    lsSet(`t.${this.name}`, this.overlay)
  }
}

// ── Righe interne (contratto + campi solo-mock) ─────────────────────────────
export interface DbUser extends User {
  passwordHash: string
  birthDate: string
  planStartedAt: string | null
  planEndedAt: string | null
  lastSeenAt: string
  marketingOptIn: boolean
}
export interface DbSession extends Session {
  itm?: number // tornei a premi (solo MTT), campo interno per ITM%
}
export interface DbXp extends XpEvent {
  ref?: string // collegamento all'entità che l'ha generato (sessione, lezione…)
}
export interface DbBooking {
  id: string // `${lessonId}:${userId}`
  lessonId: string
  userId: string
  attended: boolean | null
  createdAt: string
}
export type DbLesson = Omit<GroupLesson, 'bookedCount' | 'bookedByMe'>
export interface DbKycFile {
  id: string
  submissionId: string
  kind: 'FRONT' | 'BACK' | 'SELFIE'
  mime: string
  sizeBytes: number
  specimen: boolean // true = immagine finta generata via canvas
  preview: string | null // dataURL compressa (solo per i file caricati nel browser)
}
export interface DbDailySpot extends DailySpot {
  correctOptionId: string
  explanation: string
  baseVotes: Record<string, number>
}
export interface DbDailyAnswer {
  id: string // `${userId}:${date}`
  userId: string
  spotId: string
  date: string
  optionId: string
  correct: boolean
  createdAt: string
}
export type DbRoast = Omit<RoastSpot, 'myVote'>
export interface DbRoastVote {
  id: string // `${spotId}:${userId}`
  spotId: string
  userId: string
  kind: 'WORST' | 'BEST'
  createdAt: string
}
export interface DbDeepRun extends Omit<DeepRun, 'railedByMe'> {
  railers: string[]
}
export interface DbGaming extends Omit<GamingEvent, 'joinedByMe'> {
  winnerUserId: string | null
}
export interface DbNote {
  id: string
  userId: string
  authorId: string
  text: string
  createdAt: string
}
export interface DbProgress {
  id: string // `${userId}:${courseId}`
  userId: string
  courseId: string
  completedLessonIds: string[]
  lastLessonId: string | null
  completedAt: string | null
}
export interface DbLedger extends LedgerEntry {
  ref?: string
}
export type DbDeal = Pick<
  StakingDeal,
  'id' | 'userId' | 'format' | 'status' | 'startDate' | 'endDate' | 'schoolSharePct' | 'playerSharePct' | 'maxAbi' | 'notes'
>

export interface Db {
  users: Table<DbUser>
  sessions: Table<DbSession>
  xp: Table<DbXp>
  lessons: Table<DbLesson>
  bookings: Table<DbBooking>
  kyc: Table<KycSubmission>
  kycFiles: Table<DbKycFile>
  spots: Table<DbDailySpot>
  answers: Table<DbDailyAnswer>
  roast: Table<DbRoast>
  roastVotes: Table<DbRoastVote>
  deepRuns: Table<DbDeepRun>
  gaming: Table<DbGaming>
  handReviews: Table<HandReview>
  notes: Table<DbNote>
  purchases: Table<Purchase>
  progress: Table<DbProgress>
  cards: Table<PlayerCard & { id: string }>
  deals: Table<DbDeal>
  ledger: Table<DbLedger>
  transactions: Table<Transaction>
}

export type SeedData = { [K in keyof Db]: Db[K] extends Table<infer R> ? R[] : never }

export function buildDb(seed: SeedData): Db {
  const t = <K extends keyof Db>(k: K) => new Table(k, seed[k] as never) as Db[K]
  return {
    users: t('users'),
    sessions: t('sessions'),
    xp: t('xp'),
    lessons: t('lessons'),
    bookings: t('bookings'),
    kyc: t('kyc'),
    kycFiles: t('kycFiles'),
    spots: t('spots'),
    answers: t('answers'),
    roast: t('roast'),
    roastVotes: t('roastVotes'),
    deepRuns: t('deepRuns'),
    gaming: t('gaming'),
    handReviews: t('handReviews'),
    notes: t('notes'),
    purchases: t('purchases'),
    progress: t('progress'),
    cards: t('cards'),
    deals: t('deals'),
    ledger: t('ledger'),
    transactions: t('transactions'),
  }
}

/** Cancella tutte le chiavi "tris.mock.*". */
export function clearMockStorage() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(LS_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
