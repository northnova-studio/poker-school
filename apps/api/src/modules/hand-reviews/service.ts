import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { toHandReviewDto } from '../../lib/dto.js'
import { notFound } from '../../lib/errors.js'
import { startOfRomeWeek } from '../../lib/dates.js'
import type { User } from '../../generated/prisma/client.js'
import { awardXp, countXpEvents } from '../rank/service.js'
import { XP, cappedXp } from '../rank/domain.js'
import type { handReviewInputSchema } from './schemas.js'

const include = { user: { select: { nickname: true } } } as const

export async function mine(userId: string) {
  const rows = await prisma.handReview.findMany({ where: { userId }, include, orderBy: { createdAt: 'desc' } })
  return rows.map(toHandReviewDto)
}

export async function create(user: User, input: z.output<typeof handReviewInputSchema>) {
  const r = await prisma.handReview.create({ data: { userId: user.id, coachId: user.coachId, ...input }, include })
  const n = await countXpEvents(user.id, 'HAND_REVIEW_SUBMITTED', startOfRomeWeek())
  await awardXp(user.id, 'HAND_REVIEW_SUBMITTED', cappedXp(XP.HAND_REVIEW, n, XP.HAND_REVIEW_MAX_PER_WEEK), `Mano inviata in review: ${input.title}`, r.id)
  return toHandReviewDto(r)
}

export async function queue() {
  const rows = await prisma.handReview.findMany({ include, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }], take: 500 })
  return rows.map(toHandReviewDto)
}

export async function reply(actor: User, id: string, comment: string) {
  const exists = await prisma.handReview.findUnique({ where: { id } })
  if (!exists) throw notFound('Hand review non trovata')
  const r = await prisma.handReview.update({
    where: { id },
    data: { coachComment: comment, coachId: actor.id, status: 'REVIEWED', reviewedAt: new Date() },
    include,
  })
  return toHandReviewDto(r)
}
