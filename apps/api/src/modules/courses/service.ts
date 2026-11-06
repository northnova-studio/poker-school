import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { num, round2 } from '../../lib/money.js'
import { toPurchaseDto } from '../../lib/dto.js'
import { conflict, forbidden, notFound } from '../../lib/errors.js'
import { startOfRomeDay } from '../../lib/dates.js'
import { stripe } from '../../lib/stripe.js'
import type { Prisma, User } from '../../generated/prisma/client.js'
import { awardBadge, awardXp, sumXp } from '../rank/service.js'
import { XP, studyXp } from '../rank/domain.js'
import { videoUrlFor } from './video.js'

const courseInclude = {
  chapters: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } },
} satisfies Prisma.CourseInclude

type CourseFull = Prisma.CourseGetPayload<{ include: typeof courseInclude }>

export function toCourseDto(c: CourseFull) {
  const chapters = c.chapters.map((ch) => ({
    title: ch.title,
    lessons: ch.lessons.map((l) => ({ id: l.id, title: l.title, durationMin: l.durationMin, preview: l.preview })),
  }))
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    format: c.format,
    level: c.level,
    coachId: c.coachId,
    priceEur: num(c.priceEur),
    includedInPlans: c.includedInPlans,
    durationMin: chapters.reduce((a, ch) => a + ch.lessons.reduce((b, l) => b + l.durationMin, 0), 0),
    chapters,
    tags: c.tags,
    coverSeed: c.coverSeed,
    ...(c.bestseller ? { bestseller: true } : {}),
    ...(c.isNew ? { isNew: true } : {}),
  }
}

export async function listCourses(f: { format?: string; level?: string; q?: string }) {
  const q = f.q?.trim()
  const rows = await prisma.course.findMany({
    where: {
      published: true,
      ...(f.format ? { format: f.format as CourseFull['format'] } : {}),
      ...(f.level ? { level: f.level as CourseFull['level'] } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { subtitle: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    include: courseInclude,
    orderBy: [{ bestseller: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map(toCourseDto)
}

export async function getCourseBySlug(slug: string) {
  const c = await prisma.course.findFirst({ where: { slug, published: true }, include: courseInclude })
  if (!c) throw notFound('Corso non trovato')
  return toCourseDto(c)
}

async function getCourse(courseId: string) {
  const c = await prisma.course.findUnique({ where: { id: courseId }, include: courseInclude })
  if (!c || !c.published) throw notFound('Corso non trovato')
  return c
}

/** Accesso: staff, acquisto, oppure piano attivo incluso nel corso. */
export async function hasCourseAccess(user: User, course: { id: string; includedInPlans: string[] }) {
  if (user.role === 'ADMIN' || user.role === 'COACH') return true
  if (user.plan && course.includedInPlans.includes(user.plan)) return true
  const p = await prisma.purchase.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } })
  return Boolean(p)
}

export async function checkout(user: User, courseId: string) {
  const course = await getCourse(courseId)
  if (await hasCourseAccess(user, course)) throw conflict('Hai già accesso a questo corso', 'ALREADY_OWNED')
  const s = stripe() // 503 PAYMENTS_NOT_CONFIGURED se Stripe non è configurato
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      course.stripePriceId
        ? { price: course.stripePriceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(num(course.priceEur) * 100),
              product_data: { name: course.title, description: course.subtitle },
            },
          },
    ],
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email, customer_creation: 'always' as const }),
    client_reference_id: user.id,
    metadata: { kind: 'course', userId: user.id, courseId: course.id },
    locale: 'it',
    success_url: `${env.FRONTEND_URL}/app/corsi/${course.slug}?checkout=success`,
    cancel_url: `${env.FRONTEND_URL}/corsi/${course.slug}?checkout=cancel`,
  })
  return { checkoutUrl: session.url, purchase: null }
}

export async function myPurchases(userId: string) {
  const rows = await prisma.purchase.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toPurchaseDto)
}

/** Acquisto MANUAL (solo admin): accesso a un corso senza Stripe, con eventuale entrata in cassa. */
export async function grantPurchase(userId: string, courseId: string, amountEur = 0, provider: 'MANUAL' | 'DEMO' = 'MANUAL') {
  const course = await getCourse(courseId)
  const existing = await prisma.purchase.findUnique({ where: { userId_courseId: { userId, courseId } } })
  if (existing) throw conflict("L'utente ha già questo corso", 'ALREADY_OWNED')
  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({ data: { userId, courseId, amountEur: round2(amountEur), provider } })
    if (amountEur > 0)
      await tx.transaction.create({
        data: {
          date: new Date(),
          type: 'INCOME',
          category: 'COURSE',
          amount: round2(amountEur),
          description: `Corso "${course.title}" (manuale)`,
          userId,
          source: 'MANUAL',
          externalRef: `purchase:${p.id}`,
        },
      })
    return p
  })
  return toPurchaseDto(purchase)
}

async function progressDto(userId: string, course: CourseFull) {
  const lessonIds = course.chapters.flatMap((c) => c.lessons.map((l) => l.id))
  const done = await prisma.lessonProgress.findMany({ where: { userId, courseId: course.id }, orderBy: { completedAt: 'desc' } })
  const completed = done.map((d) => d.lessonId).filter((id) => lessonIds.includes(id))
  return {
    courseId: course.id,
    completedLessonIds: completed,
    lastLessonId: completed[0] ?? null,
    percent: lessonIds.length ? Math.round((completed.length / lessonIds.length) * 100) : 0,
  }
}

export async function progress(user: User, courseId: string) {
  return progressDto(user.id, await getCourse(courseId))
}

function findLesson(course: CourseFull, lessonId: string) {
  const lesson = course.chapters.flatMap((c) => c.lessons).find((l) => l.id === lessonId)
  if (!lesson) throw notFound('Lezione non trovata')
  return lesson
}

export async function completeLesson(user: User, courseId: string, lessonId: string) {
  const course = await getCourse(courseId)
  const lesson = findLesson(course, lessonId)
  if (!lesson.preview && !(await hasCourseAccess(user, course))) throw forbidden('Corso non acquistato', 'COURSE_LOCKED')
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } })
  if (!existing) {
    await prisma.lessonProgress.create({ data: { userId: user.id, courseId, lessonId } })
    // XP di studio: 15/ora, max 4 ore al giorno
    const already = await sumXp(user.id, 'STUDY_HOURS', startOfRomeDay())
    await awardXp(user.id, 'STUDY_HOURS', studyXp(lesson.durationMin, already), `Studio: ${lesson.title} (${lesson.durationMin} min)`)
  }
  const p = await progressDto(user.id, course)
  if (p.percent === 100) {
    const ev = await awardXp(user.id, 'COURSE_COMPLETED', XP.COURSE_COMPLETED, `Corso completato: ${course.title}`, course.id)
    if (ev) await awardBadge(user.id, 'course-complete')
  }
  return p
}

export async function videoAccess(user: User, courseId: string, lessonId: string, apiBaseUrl: string) {
  const course = await getCourse(courseId)
  const lesson = findLesson(course, lessonId)
  if (!lesson.preview && !(await hasCourseAccess(user, course))) throw forbidden('Corso non acquistato', 'COURSE_LOCKED')
  return videoUrlFor(lesson, apiBaseUrl)
}

export async function courseSales() {
  const since = new Date(Date.now() - 30 * 86_400_000)
  const [courses, all, recent] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { createdAt: 'asc' } }),
    prisma.purchase.groupBy({ by: ['courseId'], _count: { _all: true }, _sum: { amountEur: true } }),
    prisma.purchase.groupBy({ by: ['courseId'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ])
  const a = new Map(all.map((r) => [r.courseId, r]))
  const r30 = new Map(recent.map((r) => [r.courseId, r._count._all]))
  return courses
    .map((c) => ({
      courseId: c.id,
      title: c.title,
      units: a.get(c.id)?._count._all ?? 0,
      revenue: num(a.get(c.id)?._sum.amountEur ?? 0),
      last30dUnits: r30.get(c.id) ?? 0,
    }))
    .sort((x, y) => y.revenue - x.revenue)
}
