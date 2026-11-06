import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { toGroupLessonDto } from '../../lib/dto.js'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js'
import { addDays } from '../../lib/dates.js'
import { planMeets, type PlanKey } from '../../config/plans.js'
import type { User } from '../../generated/prisma/client.js'
import { awardXp } from '../rank/service.js'
import { XP } from '../rank/domain.js'
import type { groupLessonInputSchema, groupLessonPatchSchema } from './schemas.js'

const withCount = { _count: { select: { bookings: true } } } as const

async function dto(lessonId: string, user: User | undefined) {
  const l = await prisma.groupLesson.findUnique({ where: { id: lessonId }, include: withCount })
  if (!l) throw notFound('Lezione non trovata')
  const booked = user ? Boolean(await prisma.booking.findUnique({ where: { lessonId_userId: { lessonId, userId: user.id } } })) : false
  const staff = user?.role === 'ADMIN' || user?.role === 'COACH'
  return toGroupLessonDto(l, { bookedByMe: user ? booked : undefined, canSeeMeeting: booked || staff })
}

export async function listLessons(user: User | undefined, range: { from?: string; to?: string }) {
  const from = range.from ? new Date(range.from) : addDays(new Date(), -30)
  const to = range.to ? new Date(range.to) : addDays(new Date(), 90)
  const rows = await prisma.groupLesson.findMany({
    where: { startsAt: { gte: from, lte: to } },
    include: withCount,
    orderBy: { startsAt: 'asc' },
  })
  const mine = user
    ? new Set((await prisma.booking.findMany({ where: { userId: user.id, lessonId: { in: rows.map((r) => r.id) } } })).map((b) => b.lessonId))
    : new Set<string>()
  const staff = user?.role === 'ADMIN' || user?.role === 'COACH'
  return rows.map((l) =>
    toGroupLessonDto(l, { bookedByMe: user ? mine.has(l.id) : undefined, canSeeMeeting: mine.has(l.id) || staff }),
  )
}

export async function book(user: User, lessonId: string) {
  const l = await prisma.groupLesson.findUnique({ where: { id: lessonId }, include: withCount })
  if (!l) throw notFound('Lezione non trovata')
  if (l.startsAt.getTime() < Date.now()) throw badRequest('La lezione è già iniziata', 'LESSON_STARTED')
  const staff = user.role === 'ADMIN' || user.role === 'COACH'
  if (!staff && !planMeets(user.plan as PlanKey | null, l.minPlan as PlanKey))
    throw forbidden(`Serve almeno il piano ${l.minPlan} per prenotare`, 'PLAN_REQUIRED')
  const existing = await prisma.booking.findUnique({ where: { lessonId_userId: { lessonId, userId: user.id } } })
  if (existing) return dto(lessonId, user)
  // controllo capienza atomico: conteggio + inserimento nella stessa transazione serializzabile
  await prisma.$transaction(
    async (tx) => {
      const n = await tx.booking.count({ where: { lessonId } })
      if (n >= l.capacity) throw conflict('Lezione al completo', 'LESSON_FULL')
      await tx.booking.create({ data: { lessonId, userId: user.id } })
    },
    { isolationLevel: 'Serializable' },
  )
  return dto(lessonId, user)
}

export async function cancel(user: User, lessonId: string) {
  const l = await prisma.groupLesson.findUnique({ where: { id: lessonId } })
  if (!l) throw notFound('Lezione non trovata')
  if (l.startsAt.getTime() < Date.now()) throw badRequest('Non puoi annullare una lezione già iniziata', 'LESSON_STARTED')
  await prisma.booking.deleteMany({ where: { lessonId, userId: user.id } })
  return dto(lessonId, user)
}

export async function createLesson(actor: User, input: z.output<typeof groupLessonInputSchema>) {
  const coach = await prisma.user.findUnique({ where: { id: input.coachId } })
  if (!coach || coach.role === 'STUDENT') throw badRequest('Coach non valido', 'INVALID_COACH')
  const l = await prisma.groupLesson.create({ data: { ...input, startsAt: new Date(input.startsAt) } })
  return dto(l.id, actor)
}

export async function updateLesson(actor: User, id: string, patch: z.output<typeof groupLessonPatchSchema>) {
  if (patch.coachId) {
    const coach = await prisma.user.findUnique({ where: { id: patch.coachId } })
    if (!coach || coach.role === 'STUDENT') throw badRequest('Coach non valido', 'INVALID_COACH')
  }
  await prisma.groupLesson.update({
    where: { id },
    data: { ...patch, ...(patch.startsAt ? { startsAt: new Date(patch.startsAt) } : {}) },
  })
  return dto(id, actor)
}

export async function removeLesson(id: string) {
  await prisma.groupLesson.delete({ where: { id } })
}

/** Extra: registra le presenze (XP LESSON_ATTENDED, una volta per lezione). */
export async function markAttendance(actor: User, lessonId: string, userIds: string[]) {
  const l = await prisma.groupLesson.findUnique({ where: { id: lessonId } })
  if (!l) throw notFound('Lezione non trovata')
  const bookings = await prisma.booking.findMany({ where: { lessonId, userId: { in: userIds } } })
  for (const b of bookings) {
    if (!b.attendedAt) await prisma.booking.update({ where: { id: b.id }, data: { attendedAt: new Date() } })
    await awardXp(b.userId, 'LESSON_ATTENDED', XP.LESSON_ATTENDED, `Lezione di gruppo: ${l.title}`, lessonId)
  }
  return dto(lessonId, actor)
}
