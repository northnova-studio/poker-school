import { prisma } from '../../lib/prisma.js'
import { romeMonthRange } from '../../lib/dates.js'
import { round1 } from '../../lib/money.js'

type StatValue = { label: string; value: string; placeholder?: boolean }

export async function coaches() {
  const rows = await prisma.coachProfile.findMany({
    where: { isPublic: true, user: { disabledAt: null } },
    include: { user: true },
    orderBy: { displayOrder: 'asc' },
  })
  return rows.map((c) => ({
    id: c.userId,
    name: c.user.firstName,
    nickname: c.user.nickname,
    role: c.title,
    formats: c.user.formats,
    bio: c.user.bio ?? '',
    avatarSeed: c.user.avatarSeed,
    stats: (Array.isArray(c.stats) ? (c.stats as unknown as StatValue[]) : []).map((s) => ({
      label: s.label,
      value: s.value,
      ...(s.placeholder ? { placeholder: true } : {}),
    })),
  }))
}

/** Numeri reali della community (aggregati, nessun dato personale). */
export async function stats() {
  const { start } = romeMonthRange()
  const [members, handsReviewed, lessons, attended, deepRunsThisMonth] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', disabledAt: null } }),
    prisma.handReview.count({ where: { status: 'REVIEWED' } }),
    prisma.lessonProgress.findMany({ select: { lesson: { select: { durationMin: true } } } }),
    prisma.booking.findMany({ where: { attendedAt: { not: null } }, select: { lesson: { select: { durationMin: true } } } }),
    prisma.deepRun.count({ where: { startedAt: { gte: start } } }),
  ])
  const minutes = lessons.reduce((a, l) => a + l.lesson.durationMin, 0) + attended.reduce((a, b) => a + b.lesson.durationMin, 0)
  return { members, handsReviewed, studyHours: round1(minutes / 60), deepRunsThisMonth, placeholder: false }
}
