// ─────────────────────────────────────────────────────────────────────────────
// CONTRATTO API — unica fonte di verità tra frontend (mock + http) e backend.
// Il backend (apps/api) espone gli endpoint REST elencati in ./http.ts e
// restituisce JSON con esattamente queste forme. Date: stringhe ISO 8601.
// Importi: numeri in EURO (2 decimali), mai centesimi lato contratto.
// ─────────────────────────────────────────────────────────────────────────────

export type ID = string
export type ISODate = string

export type Format = 'MTT' | 'SPIN' | 'CASH'
export type CourseFormat = Format | 'MENTAL' | 'ALL'
export type Level = 'MICRO' | 'LOW' | 'MID' | 'HIGH'
export type Role = 'STUDENT' | 'COACH' | 'ADMIN'
export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type PlanId = 'base' | 'pro' | 'elite'
export type BillingInterval = 'month' | 'year'

// ── Utenti ───────────────────────────────────────────────────────────────────
export interface User {
  id: ID
  email: string
  nickname: string
  firstName: string
  lastName: string
  role: Role
  avatarSeed: string // per avatar generativo, niente foto obbligatorie
  formats: Format[]
  mainLevel: Level
  kycStatus: KycStatus
  plan: PlanId | null
  planInterval: BillingInterval | null
  coachId: ID | null
  discordHandle: string | null
  gamingTag: string | null // es. Activision ID / PSN
  bio: string | null
  shareResultsPublicly: boolean // consenso a comparire in leaderboard pubbliche
  roastOptIn: boolean // consenso a comparire nel Roast della settimana
  createdAt: ISODate
}

export interface RegisterInput {
  email: string
  password: string
  nickname: string
  firstName: string
  lastName: string
  birthDate: string // YYYY-MM-DD, deve risultare maggiorenne
  formats: Format[]
  mainLevel: Level
  discordHandle?: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  marketingOptIn?: boolean
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export type ProfilePatch = Partial<
  Pick<User, 'nickname' | 'formats' | 'mainLevel' | 'discordHandle' | 'gamingTag' | 'bio' | 'shareResultsPublicly' | 'roastOptIn'>
>

// ── Verifica identità (KYC) ──────────────────────────────────────────────────
export type DocumentType = 'ID_CARD' | 'PASSPORT' | 'DRIVING_LICENSE'
export type KycProvider = 'MANUAL' | 'VERIFF' | 'SUMSUB' | 'DIDIT' | 'ONFIDO'

export interface KycSubmitInput {
  documentType: DocumentType
  documentNumberLast4: string // solo le ultime 4 cifre, minimizzazione dati
  front: File
  back?: File
  selfie: File
  consent: boolean
}

export interface KycSubmission {
  id: ID
  userId: ID
  documentType: DocumentType
  documentNumberLast4: string
  status: Exclude<KycStatus, 'NONE'>
  provider: KycProvider
  files: { kind: 'FRONT' | 'BACK' | 'SELFIE'; fileId: ID; mime: string; sizeBytes: number }[]
  submittedAt: ISODate
  reviewedAt: ISODate | null
  reviewerId: ID | null
  rejectionReason: string | null
}

// ── Coach / contenuti pubblici ───────────────────────────────────────────────
export interface StatValue {
  label: string
  value: string
  placeholder?: boolean // true = dato di esempio, DA SOSTITUIRE
}

export interface Coach {
  id: ID
  name: string
  nickname: string
  role: string
  formats: Format[]
  bio: string
  avatarSeed: string
  stats: StatValue[]
}

export interface PublicStats {
  members: number
  handsReviewed: number
  studyHours: number
  deepRunsThisMonth: number
  placeholder: boolean
}

// ── Piani e corsi ────────────────────────────────────────────────────────────
export interface Plan {
  id: PlanId
  name: string
  priceMonthly: number
  priceYearly: number
  tagline: string
  features: string[]
  highlighted?: boolean
}

export interface CourseLesson {
  id: ID
  title: string
  durationMin: number
  preview: boolean // visibile gratis
}

export interface CourseChapter {
  title: string
  lessons: CourseLesson[]
}

export interface Course {
  id: ID
  slug: string
  title: string
  subtitle: string
  description: string
  format: CourseFormat
  level: Level
  coachId: ID
  priceEur: number
  includedInPlans: PlanId[] // incluso gratis per questi piani
  durationMin: number
  chapters: CourseChapter[]
  tags: string[]
  coverSeed: string // per copertina generativa
  bestseller?: boolean
  isNew?: boolean
}

export interface CourseFilters {
  format?: CourseFormat
  level?: Level
  q?: string
}

export interface Purchase {
  id: ID
  userId: ID
  courseId: ID
  amountEur: number
  provider: 'STRIPE' | 'MANUAL' | 'DEMO'
  createdAt: ISODate
}

export interface CourseProgress {
  courseId: ID
  completedLessonIds: ID[]
  lastLessonId: ID | null
  percent: number
}

export interface CheckoutResult {
  // con Stripe configurato: redirect a checkoutUrl; in demo/manuale: acquisto immediato
  checkoutUrl: string | null
  purchase: Purchase | null
}

export interface VideoAccess {
  lessonId: ID
  url: string // URL firmato a scadenza (Bunny/Mux/Vimeo) o demo
  expiresAt: ISODate
}

// ── Lezioni di gruppo ────────────────────────────────────────────────────────
export interface GroupLesson {
  id: ID
  title: string
  description: string
  format: Format | 'MENTAL'
  level: Level
  coachId: ID
  startsAt: ISODate
  durationMin: number
  capacity: number
  bookedCount: number
  minPlan: PlanId // piano minimo per prenotare
  meetingUrl: string | null // visibile solo ai prenotati
  recordingUrl: string | null
  bookedByMe?: boolean
}

export type GroupLessonInput = Omit<GroupLesson, 'id' | 'bookedCount' | 'bookedByMe' | 'recordingUrl'>

// ── Sessioni di gioco (log risultati) ────────────────────────────────────────
export interface Session {
  id: ID
  userId: ID
  date: ISODate
  format: Format
  durationMin: number
  games: number // tornei / spin giocati, per cash = numero tavoli*ore indicativo
  hands: number | null // cash
  avgBuyIn: number // ABI per MTT/Spin, stake big blind in € per cash
  totalBuyIns: number // € spesi in buy-in (MTT/Spin); per cash 0
  totalCashes: number // € incassati (MTT/Spin); per cash = risultato netto se positivo
  profit: number // € netto (può essere negativo)
  chipEvBb100?: number | null // spin: chip EV
  bbWon?: number | null // cash: big blind vinti
  tilt: 1 | 2 | 3 | 4 | 5 // 1 zen, 5 tilt totale
  badBeats: number
  bubbles: number
  deepRun: boolean
  notes: string | null
  staked: boolean // giocata con capitale della scuola
}

export type SessionInput = Omit<Session, 'id' | 'userId'>

// ── Statistiche giocatore ────────────────────────────────────────────────────
export type Period = '7d' | '30d' | '90d' | 'ytd' | 'all'

export interface SeriesPoint {
  date: ISODate
  value: number
}

export interface PlayerStats {
  userId: ID
  period: Period
  format: Format | 'ALL'
  profit: number
  roi: number | null // % per MTT/Spin
  abi: number | null
  bb100: number | null // cash
  games: number
  hands: number
  itmPct: number | null
  sessionsCount: number
  hoursPlayed: number
  hoursStudied: number
  sessionStreakDays: number
  // statistiche "simpatiche"
  tiltIndex: number // media tilt 1-5
  badBeats: number
  bubbles: number
  deepRuns: number
  riverSuckouts: number // "river subiti del mese"
  attendancePct: number // presenze alle lezioni
  profitSeries: SeriesPoint[] // cumulato
  volumeSeries: SeriesPoint[]
  funFacts: string[] // frasi generate, es. "Hai scoppiato 3 bolle: record del mese"
}

// ── Rank / ladder ────────────────────────────────────────────────────────────
export type RankTier = 'FISH' | 'CALLING_STATION' | 'REG' | 'GRINDER' | 'SHARK' | 'CRUSHER' | 'LEGEND'

export interface RankInfo {
  userId: ID
  seasonId: ID
  seasonName: string // es. "Stagione 1 — Novembre 2026"
  seasonEndsAt: ISODate
  tier: RankTier
  division: 1 | 2 | 3 // III → II → I (3 = più bassa)
  xp: number
  xpForNextDivision: number
  xpIntoDivision: number
  position: number
  badges: Badge[]
}

export interface Badge {
  id: ID
  name: string
  description: string
  icon: string // nome icona lucide
  earnedAt: ISODate | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
}

export type XpEventType =
  | 'SESSION_LOGGED'
  | 'STUDY_HOURS'
  | 'LESSON_ATTENDED'
  | 'HAND_REVIEW_SUBMITTED'
  | 'DAILY_SPOT_CORRECT'
  | 'DAILY_SPOT_STREAK'
  | 'DEEP_RUN'
  | 'ROAST_VOTE'
  | 'GAMING_NIGHT'
  | 'COURSE_COMPLETED'
  | 'BOUNTY_WON'

export interface XpEvent {
  id: ID
  userId: ID
  type: XpEventType
  xp: number
  label: string
  createdAt: ISODate
}

export interface LeaderboardEntry {
  position: number
  userId: ID
  nickname: string
  avatarSeed: string
  tier: RankTier
  division: 1 | 2 | 3
  xp: number
  delta: number // posizioni guadagnate/perse nella settimana
  formats: Format[]
}

// ── Player Card (stile FIFA Ultimate Team) ───────────────────────────────────
export interface PlayerCard {
  userId: ID
  nickname: string
  avatarSeed: string
  mainFormat: Format
  overall: number // 40-99
  rarity: 'BRONZE' | 'SILVER' | 'GOLD' | 'ICON'
  attributes: { pre: number; post: number; icm: number; agg: number; men: number; vol: number }
  updatedAt: ISODate
  updatedByCoachId: ID | null
}

// ── Daily Spot (quiz quotidiano stile Wordle) ────────────────────────────────
export interface DailySpot {
  id: ID
  date: string // YYYY-MM-DD
  format: Format
  title: string
  situation: string // descrizione dello spot
  heroCards: string // es. "AhQd"
  board: string | null // es. "Ks7d2c" o null preflop
  stacksBb: string // es. "Hero 22bb BTN vs BB 30bb"
  options: { id: ID; label: string }[]
  coachId: ID
  // presenti solo dopo aver risposto:
  answeredOptionId?: ID | null
  correctOptionId?: ID | null
  explanation?: string | null
  answerDistribution?: Record<ID, number> | null // % per opzione
}

export interface DailySpotResult {
  correct: boolean
  correctOptionId: ID
  explanation: string
  streak: number
  xpGained: number
  answerDistribution: Record<ID, number>
}

export interface DailySpotStreakEntry {
  userId: ID
  nickname: string
  avatarSeed: string
  streak: number
  correctPct: number
}

// ── Roast della settimana ────────────────────────────────────────────────────
export interface RoastSpot {
  id: ID
  weekId: string // es. "2026-W45"
  title: string
  description: string // mano anonimizzata: nickname e avatar rimossi
  format: Format
  heroCards: string
  board: string | null
  submittedByUserId: ID | null
  playedByMember: boolean // true solo se il membro ha dato consenso (roastOptIn)
  founderComment: string | null
  votesWorst: number
  votesBest: number
  myVote: 'WORST' | 'BEST' | null
  createdAt: ISODate
}

export interface RoastSubmitInput {
  title: string
  description: string
  format: Format
  heroCards: string
  board: string | null
  isMyOwnHand: boolean
  confirmAnonymized: boolean
}

// ── Deep Run Alert / Rail ────────────────────────────────────────────────────
export type DeepRunStatus = 'LIVE' | 'FINAL_TABLE' | 'BUSTED' | 'WON'

export interface DeepRunComment {
  id: ID
  userId: ID
  nickname: string
  text: string
  createdAt: ISODate
}

export interface DeepRun {
  id: ID
  userId: ID
  nickname: string
  avatarSeed: string
  tournamentName: string // nome generico, nessuna poker room citata
  buyIn: number
  playersLeft: number
  totalPlayers: number
  stackBb: number
  status: DeepRunStatus
  finishPosition: number | null
  rails: number
  railedByMe: boolean
  comments: DeepRunComment[]
  startedAt: ISODate
  updatedAt: ISODate
}

export type DeepRunInput = Pick<DeepRun, 'tournamentName' | 'buyIn' | 'playersLeft' | 'totalPlayers' | 'stackBb'>
export type DeepRunPatch = Partial<Pick<DeepRun, 'playersLeft' | 'stackBb' | 'status' | 'finishPosition'>>

// ── Lobby post-sessione (gaming) ─────────────────────────────────────────────
export type GamingEventKind = 'NIGHT' | 'BOUNTY_1V1' | 'TOURNAMENT'

export interface GamingEvent {
  id: ID
  kind: GamingEventKind
  game: string // es. "Warzone", "EA FC", "Rocket League"
  title: string
  description: string
  startsAt: ISODate
  hostUserId: ID // spesso un fondatore
  hostNickname: string
  participants: { userId: ID; nickname: string }[]
  maxParticipants: number | null
  prize: string | null // es. "Lezione 1:1 gratis" (mai premi in denaro)
  joinedByMe: boolean
}

export interface GamingLeaderboardEntry {
  position: number
  userId: ID
  nickname: string
  avatarSeed: string
  points: number
  wins: number
  bountiesClaimed: number // fondatori battuti
}

// ── Hand review ──────────────────────────────────────────────────────────────
export interface HandReview {
  id: ID
  userId: ID
  nickname: string
  format: Format
  title: string
  description: string
  handHistory: string // testo HH incollato (anonimizzare i villain)
  status: 'OPEN' | 'IN_REVIEW' | 'REVIEWED'
  coachId: ID | null
  coachComment: string | null
  createdAt: ISODate
  reviewedAt: ISODate | null
}

export type HandReviewInput = Pick<HandReview, 'format' | 'title' | 'description' | 'handHistory'>

// ── ADMIN: staking / investimenti ────────────────────────────────────────────
export type StakingStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED'
export type LedgerType =
  | 'TRANSFER_TO_PLAYER' // la scuola manda capitale al giocatore
  | 'RETURN_FROM_PLAYER' // il giocatore restituisce capitale/profitti
  | 'SESSION_RESULT' // risultato di una sessione giocata con capitale della scuola
  | 'SETTLEMENT' // chiusura periodo: divisione profitti
  | 'ADJUSTMENT'

export interface StakingDeal {
  id: ID
  userId: ID
  nickname: string
  format: Format
  status: StakingStatus
  startDate: ISODate
  endDate: ISODate | null
  capitalAllocated: number // capitale messo dalla scuola (cumulato)
  capitalReturned: number
  schoolSharePct: number // es. 50
  playerSharePct: number // es. 50
  makeup: number // makeup corrente (>= 0)
  netResult: number // somma risultati sessioni staked
  schoolProfit: number // profitti già spettanti alla scuola dopo settlement
  maxAbi: number | null // limite buy-in medio (MTT/Spin) o stake (cash)
  notes: string | null
}

export type StakingDealInput = Pick<
  StakingDeal,
  'userId' | 'format' | 'startDate' | 'schoolSharePct' | 'playerSharePct' | 'maxAbi' | 'notes'
> & { initialCapital: number }

export interface LedgerEntry {
  id: ID
  dealId: ID
  date: ISODate
  type: LedgerType
  amount: number // positivo = verso la scuola / risultato positivo
  note: string | null
  createdBy: ID
}

export type LedgerEntryInput = Pick<LedgerEntry, 'date' | 'type' | 'amount' | 'note'>

// ── ADMIN: finanze scuola ────────────────────────────────────────────────────
export type TxType = 'INCOME' | 'EXPENSE'
export type TxCategory =
  | 'MEMBERSHIP'
  | 'COURSE'
  | 'GROUP_LESSON'
  | 'COACHING_1V1'
  | 'STAKING'
  | 'SPONSOR'
  | 'TOOLS'
  | 'HOSTING'
  | 'MARKETING'
  | 'VIDEO_PRODUCTION'
  | 'COACH_PAYOUT'
  | 'TRAVEL'
  | 'KYC'
  | 'FEES'
  | 'TAXES'
  | 'OTHER'

export interface Transaction {
  id: ID
  date: ISODate
  type: TxType
  category: TxCategory
  amount: number // sempre positivo; il segno lo dà `type`
  description: string
  userId: ID | null
}

export type TransactionInput = Omit<Transaction, 'id'>

export interface FinanceSummary {
  from: ISODate
  to: ISODate
  income: number
  expenses: number
  net: number
  mrr: number
  byCategory: { category: TxCategory; type: TxType; amount: number }[]
  monthly: { month: string; income: number; expenses: number; net: number }[] // "2026-11"
}

// ── ADMIN: panoramica e giocatori ────────────────────────────────────────────
export interface AdminOverview {
  activeMembers: number
  membersByPlan: Record<PlanId, number>
  newMembers30d: number
  churn30dPct: number
  mrr: number
  revenue30d: number
  coursesSold30d: number
  kycPending: number
  stakingCapitalOut: number // capitale attualmente fuori sui giocatori
  stakingNet30d: number
  stakingNetAll: number
  topPlayers30d: { userId: ID; nickname: string; profit: number; format: Format }[]
  worstPlayers30d: { userId: ID; nickname: string; profit: number; format: Format }[]
  revenueSeries: SeriesPoint[] // ricavi mensili
  stakingSeries: SeriesPoint[] // P&L staking cumulato
  membersSeries: SeriesPoint[]
  alerts: { level: 'info' | 'warning' | 'danger'; text: string }[]
}

export interface PlayerRow {
  userId: ID
  nickname: string
  fullName: string
  email: string
  avatarSeed: string
  role: Role
  formats: Format[]
  mainLevel: Level
  plan: PlanId | null
  kycStatus: KycStatus
  coachId: ID | null
  tier: RankTier
  staked: boolean
  profit30d: number
  profitAll: number
  volume30d: number
  roi30d: number | null
  bb100_30d: number | null
  lastSessionAt: ISODate | null
  joinedAt: ISODate
}

export interface PlayerFilters {
  q?: string
  format?: Format
  plan?: PlanId
  kycStatus?: KycStatus
  staked?: boolean
  sort?: 'profit30d' | 'profitAll' | 'volume30d' | 'joinedAt' | 'nickname'
}

export interface PlayerDetail {
  user: User
  row: PlayerRow
  stats: PlayerStats
  rank: RankInfo
  card: PlayerCard
  stakingDeals: StakingDeal[]
  sessions: Session[]
  purchases: Purchase[]
  kyc: KycSubmission | null
  coachNotes: { id: ID; authorId: ID; text: string; createdAt: ISODate }[]
}

export interface CourseSalesRow {
  courseId: ID
  title: string
  units: number
  revenue: number
  last30dUnits: number
}

export interface Paginated<T> {
  items: T[]
  total: number
}

// ── Interfaccia client: implementata da mock (demo) e da http (backend) ─────
export interface Api {
  mode: 'demo' | 'live'

  auth: {
    register(input: RegisterInput): Promise<AuthResponse>
    login(email: string, password: string): Promise<AuthResponse>
    logout(): Promise<void>
    me(): Promise<User | null>
    updateProfile(patch: ProfilePatch): Promise<User>
    /** solo demo: entra al volo come studente/admin per esplorare */
    demoLogin?(as: 'STUDENT' | 'ADMIN'): Promise<AuthResponse>
  }

  kyc: {
    submit(input: KycSubmitInput): Promise<KycSubmission>
    mine(): Promise<KycSubmission | null>
  }

  public: {
    coaches(): Promise<Coach[]>
    stats(): Promise<PublicStats>
    leaderboard(limit?: number): Promise<LeaderboardEntry[]>
  }

  plans: {
    list(): Promise<Plan[]>
    subscribe(planId: PlanId, interval: BillingInterval): Promise<{ checkoutUrl: string | null; user: User | null }>
  }

  courses: {
    list(filters?: CourseFilters): Promise<Course[]>
    get(slug: string): Promise<Course>
    checkout(courseId: ID): Promise<CheckoutResult>
    myPurchases(): Promise<Purchase[]>
    progress(courseId: ID): Promise<CourseProgress>
    completeLesson(courseId: ID, lessonId: ID): Promise<CourseProgress>
    videoAccess(courseId: ID, lessonId: ID): Promise<VideoAccess>
  }

  lessons: {
    list(range?: { from?: ISODate; to?: ISODate }): Promise<GroupLesson[]>
    book(id: ID): Promise<GroupLesson>
    cancel(id: ID): Promise<GroupLesson>
  }

  sessions: {
    list(): Promise<Session[]>
    create(input: SessionInput): Promise<Session>
    remove(id: ID): Promise<void>
  }

  stats: {
    me(period: Period, format?: Format | 'ALL'): Promise<PlayerStats>
  }

  rank: {
    me(): Promise<RankInfo>
    leaderboard(opts?: { format?: Format; limit?: number }): Promise<LeaderboardEntry[]>
    xpEvents(): Promise<XpEvent[]>
  }

  card: {
    me(): Promise<PlayerCard>
    get(userId: ID): Promise<PlayerCard>
  }

  dailySpot: {
    today(): Promise<DailySpot>
    answer(spotId: ID, optionId: ID): Promise<DailySpotResult>
    streaks(): Promise<DailySpotStreakEntry[]>
  }

  roast: {
    current(): Promise<RoastSpot[]>
    vote(spotId: ID, kind: 'WORST' | 'BEST'): Promise<RoastSpot>
    submit(input: RoastSubmitInput): Promise<RoastSpot>
  }

  deepRuns: {
    list(opts?: { activeOnly?: boolean }): Promise<DeepRun[]>
    create(input: DeepRunInput): Promise<DeepRun>
    update(id: ID, patch: DeepRunPatch): Promise<DeepRun>
    rail(id: ID): Promise<DeepRun>
    comment(id: ID, text: string): Promise<DeepRun>
  }

  gaming: {
    events(): Promise<GamingEvent[]>
    join(id: ID): Promise<GamingEvent>
    leave(id: ID): Promise<GamingEvent>
    leaderboard(): Promise<GamingLeaderboardEntry[]>
  }

  handReviews: {
    mine(): Promise<HandReview[]>
    create(input: HandReviewInput): Promise<HandReview>
  }

  admin: {
    overview(): Promise<AdminOverview>
    players: {
      list(filters?: PlayerFilters): Promise<Paginated<PlayerRow>>
      get(userId: ID): Promise<PlayerDetail>
      update(userId: ID, patch: Partial<Pick<User, 'role' | 'plan' | 'coachId' | 'mainLevel'>>): Promise<User>
      addNote(userId: ID, text: string): Promise<PlayerDetail['coachNotes'][number]>
      updateCard(userId: ID, attributes: PlayerCard['attributes']): Promise<PlayerCard>
    }
    kyc: {
      queue(status?: KycSubmission['status']): Promise<(KycSubmission & { user: Pick<User, 'id' | 'nickname' | 'firstName' | 'lastName' | 'email'> })[]>
      fileUrl(submissionId: ID, fileId: ID): Promise<string> // URL temporaneo (blob in demo)
      review(submissionId: ID, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<KycSubmission>
    }
    staking: {
      deals(): Promise<StakingDeal[]>
      create(input: StakingDealInput): Promise<StakingDeal>
      update(id: ID, patch: Partial<Pick<StakingDeal, 'status' | 'schoolSharePct' | 'playerSharePct' | 'maxAbi' | 'notes'>>): Promise<StakingDeal>
      ledger(dealId: ID): Promise<LedgerEntry[]>
      addEntry(dealId: ID, input: LedgerEntryInput): Promise<{ deal: StakingDeal; entry: LedgerEntry }>
      settle(dealId: ID): Promise<{ deal: StakingDeal; entry: LedgerEntry }>
    }
    finance: {
      summary(range: { from: ISODate; to: ISODate }): Promise<FinanceSummary>
      transactions(range: { from: ISODate; to: ISODate }): Promise<Transaction[]>
      addTransaction(input: TransactionInput): Promise<Transaction>
      removeTransaction(id: ID): Promise<void>
    }
    courses: {
      sales(): Promise<CourseSalesRow[]>
    }
    lessons: {
      create(input: GroupLessonInput): Promise<GroupLesson>
      update(id: ID, patch: Partial<GroupLessonInput>): Promise<GroupLesson>
      remove(id: ID): Promise<void>
    }
    handReviews: {
      queue(): Promise<HandReview[]>
      reply(id: ID, comment: string): Promise<HandReview>
    }
    dailySpots: {
      create(input: Omit<DailySpot, 'id' | 'answeredOptionId' | 'answerDistribution'> & { correctOptionId: ID; explanation: string }): Promise<DailySpot>
    }
  }
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}
