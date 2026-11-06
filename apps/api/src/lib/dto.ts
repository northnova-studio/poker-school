// Mappatura record Prisma → forme JSON del contratto (apps/web/src/lib/api/types.ts).
import type {
  GroupLesson as GroupLessonRow,
  HandReview as HandReviewRow,
  KycFile,
  KycSubmission as KycRow,
  LedgerEntry as LedgerRow,
  Purchase as PurchaseRow,
  Session as SessionRow,
  Transaction as TxRow,
  User,
} from '../generated/prisma/client.js'
import { num, numOrNull } from './money.js'

export function toUserDto(u: User) {
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
    createdAt: u.createdAt.toISOString(),
  }
}
export type UserDto = ReturnType<typeof toUserDto>

export function toKycDto(k: KycRow & { files?: KycFile[] }) {
  const order = { FRONT: 0, BACK: 1, SELFIE: 2 } as const
  return {
    id: k.id,
    userId: k.userId,
    documentType: k.documentType,
    documentNumberLast4: k.documentNumberLast4,
    status: k.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    provider: k.provider,
    files: (k.files ?? [])
      .slice()
      .sort((a, b) => order[a.kind] - order[b.kind])
      .map((f) => ({ kind: f.kind, fileId: f.id, mime: f.mime, sizeBytes: f.sizeBytes })),
    submittedAt: k.submittedAt.toISOString(),
    reviewedAt: k.reviewedAt?.toISOString() ?? null,
    reviewerId: k.reviewerId,
    rejectionReason: k.rejectionReason,
  }
}

export function toPurchaseDto(p: PurchaseRow) {
  return {
    id: p.id,
    userId: p.userId,
    courseId: p.courseId,
    amountEur: num(p.amountEur),
    provider: p.provider,
    createdAt: p.createdAt.toISOString(),
  }
}

export function toSessionDto(s: SessionRow) {
  return {
    id: s.id,
    userId: s.userId,
    date: s.date.toISOString(),
    format: s.format,
    durationMin: s.durationMin,
    games: s.games,
    hands: s.hands,
    avgBuyIn: num(s.avgBuyIn),
    totalBuyIns: num(s.totalBuyIns),
    totalCashes: num(s.totalCashes),
    profit: num(s.profit),
    chipEvBb100: s.chipEvBb100,
    bbWon: s.bbWon,
    tilt: s.tilt as 1 | 2 | 3 | 4 | 5,
    badBeats: s.badBeats,
    bubbles: s.bubbles,
    deepRun: s.deepRun,
    notes: s.notes,
    staked: s.staked,
    ...(s.itmCount !== null ? { itm: s.itmCount } : {}),
  }
}

/** Sessione → input delle funzioni pure di statistica. */
export function toSessionLike(s: SessionRow) {
  return {
    date: s.date,
    format: s.format,
    durationMin: s.durationMin,
    games: s.games,
    itmCount: s.itmCount,
    hands: s.hands,
    avgBuyIn: num(s.avgBuyIn),
    totalBuyIns: num(s.totalBuyIns),
    totalCashes: num(s.totalCashes),
    profit: num(s.profit),
    chipEvBb100: s.chipEvBb100,
    bbWon: s.bbWon,
    tilt: s.tilt,
    badBeats: s.badBeats,
    bubbles: s.bubbles,
    deepRun: s.deepRun,
  }
}

export function toGroupLessonDto(
  l: GroupLessonRow & { _count?: { bookings: number } },
  opts: { bookedByMe?: boolean; canSeeMeeting: boolean },
) {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    format: l.format,
    level: l.level,
    coachId: l.coachId,
    startsAt: l.startsAt.toISOString(),
    durationMin: l.durationMin,
    capacity: l.capacity,
    bookedCount: l._count?.bookings ?? 0,
    minPlan: l.minPlan,
    meetingUrl: opts.canSeeMeeting ? l.meetingUrl : null,
    recordingUrl: opts.canSeeMeeting ? l.recordingUrl : null,
    ...(opts.bookedByMe !== undefined ? { bookedByMe: opts.bookedByMe } : {}),
  }
}

export function toHandReviewDto(h: HandReviewRow & { user: { nickname: string } }) {
  return {
    id: h.id,
    userId: h.userId,
    nickname: h.user.nickname,
    format: h.format,
    title: h.title,
    description: h.description,
    handHistory: h.handHistory,
    status: h.status,
    coachId: h.coachId,
    coachComment: h.coachComment,
    createdAt: h.createdAt.toISOString(),
    reviewedAt: h.reviewedAt?.toISOString() ?? null,
  }
}

export function toTransactionDto(t: TxRow) {
  return {
    id: t.id,
    date: t.date.toISOString(),
    type: t.type,
    category: t.category,
    amount: num(t.amount),
    description: t.description,
    userId: t.userId,
  }
}

export function toLedgerDto(e: LedgerRow) {
  return {
    id: e.id,
    dealId: e.dealId,
    date: e.date.toISOString(),
    type: e.type,
    amount: num(e.amount),
    note: e.note,
    createdBy: e.createdById,
  }
}

export { num, numOrNull }
