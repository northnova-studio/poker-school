import { prisma } from '../../lib/prisma.js'
import { toSessionLike } from '../../lib/dto.js'
import { romeDateKey } from '../../lib/dates.js'
import type { Format } from '../../generated/prisma/client.js'
import { computePlayerStats, periodStart, type Period } from './domain.js'

export async function playerStats(userId: string, period: Period, format: Format | 'ALL', now = new Date()) {
  const from = periodStart(period, now)
  const fmt = format === 'ALL' ? {} : { format }
  const range = from ? { gte: from, lte: now } : { lte: now }
  const [sessions, allDates, lessonsDone, bookings] = await Promise.all([
    prisma.session.findMany({ where: { userId, ...fmt, date: range } }),
    prisma.session.findMany({ where: { userId, ...fmt }, select: { date: true } }),
    prisma.lessonProgress.findMany({ where: { userId, completedAt: range }, include: { lesson: { select: { durationMin: true } } } }),
    prisma.booking.findMany({
      where: { userId, lesson: { startsAt: range } },
      include: { lesson: { select: { durationMin: true } } },
    }),
  ])
  const studyMin =
    lessonsDone.reduce((a, l) => a + l.lesson.durationMin, 0) +
    bookings.filter((b) => b.attendedAt).reduce((a, b) => a + b.lesson.durationMin, 0)
  return computePlayerStats(userId, period, format, sessions.map(toSessionLike), {
    hoursStudied: studyMin / 60,
    lessonsBooked: bookings.length,
    lessonsAttended: bookings.filter((b) => b.attendedAt).length,
    allSessionDateKeys: allDates.map((d) => romeDateKey(d.date)),
    now,
  })
}
