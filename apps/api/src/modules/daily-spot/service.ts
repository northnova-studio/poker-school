import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { addDays, dateKeyToDbDate, dbDateToKey, romeDateKey } from '../../lib/dates.js'
import { round1 } from '../../lib/money.js'
import { Prisma, type DailySpot as SpotRow, type User } from '../../generated/prisma/client.js'
import { awardBadge, awardXp } from '../rank/service.js'
import { XP, dailySpotXp, isStreakMilestone } from '../rank/domain.js'
import { answerDistribution, computeStreak } from './domain.js'
import type { dailySpotCreateSchema } from './schemas.js'

type Option = { id: string; label: string }
const optionsOf = (s: SpotRow) => s.options as unknown as Option[]

function baseDto(s: SpotRow) {
  return {
    id: s.id,
    date: dbDateToKey(s.date),
    format: s.format,
    title: s.title,
    situation: s.situation,
    heroCards: s.heroCards,
    board: s.board,
    stacksBb: s.stacksBb,
    options: optionsOf(s).map((o) => ({ id: o.id, label: o.label })),
    coachId: s.coachId,
  }
}

async function distribution(s: SpotRow) {
  const answers = await prisma.dailySpotAnswer.findMany({ where: { spotId: s.id }, select: { optionId: true } })
  return answerDistribution(optionsOf(s).map((o) => o.id), answers)
}

/** Spot corrente = il più recente con data ≤ oggi (Europe/Rome). */
async function currentSpot() {
  return prisma.dailySpot.findFirst({ where: { date: { lte: dateKeyToDbDate(romeDateKey()) } }, orderBy: { date: 'desc' } })
}

export async function today(user: User) {
  const s = await currentSpot()
  if (!s) throw notFound('Nessun Daily Spot pubblicato', 'NO_DAILY_SPOT')
  const mine = await prisma.dailySpotAnswer.findUnique({ where: { spotId_userId: { spotId: s.id, userId: user.id } } })
  if (!mine) return baseDto(s)
  return {
    ...baseDto(s),
    answeredOptionId: mine.optionId,
    correctOptionId: s.correctOptionId,
    explanation: s.explanation,
    answerDistribution: await distribution(s),
  }
}

export async function userStreak(userId: string) {
  const todayKey = romeDateKey()
  const since = addDays(new Date(), -400)
  const [spots, answers] = await Promise.all([
    prisma.dailySpot.findMany({ where: { date: { lte: dateKeyToDbDate(todayKey), gte: since } }, orderBy: { date: 'desc' }, select: { date: true } }),
    prisma.dailySpotAnswer.findMany({ where: { userId, spot: { date: { gte: since } } }, select: { spot: { select: { date: true } } } }),
  ])
  return computeStreak(
    spots.map((s) => dbDateToKey(s.date)),
    new Set(answers.map((a) => dbDateToKey(a.spot.date))),
    todayKey,
  )
}

export async function answer(user: User, spotId: string, optionId: string) {
  const s = await prisma.dailySpot.findUnique({ where: { id: spotId } })
  if (!s) throw notFound('Daily Spot non trovato')
  const current = await currentSpot()
  if (!current || current.id !== s.id) throw conflict('Questo Daily Spot non è più (o non ancora) attivo', 'SPOT_NOT_ACTIVE')
  if (!optionsOf(s).some((o) => o.id === optionId)) throw badRequest('Opzione non valida', 'INVALID_OPTION')
  const correct = optionId === s.correctOptionId
  try {
    await prisma.dailySpotAnswer.create({ data: { spotId, userId: user.id, optionId, correct } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      throw conflict('Hai già risposto al Daily Spot di oggi', 'ALREADY_ANSWERED')
    throw err
  }
  const { xp, label } = dailySpotXp(correct)
  let xpGained = (await awardXp(user.id, 'DAILY_SPOT_CORRECT', xp, label, spotId))?.xp ?? 0
  const streak = await userStreak(user.id)
  if (isStreakMilestone(streak)) {
    const ev = await awardXp(user.id, 'DAILY_SPOT_STREAK', XP.DAILY_SPOT_STREAK, `Streak Daily Spot: ${streak} giorni`, `streak:${spotId}`)
    xpGained += ev?.xp ?? 0
    await awardBadge(user.id, 'streak-7')
  }
  return {
    correct,
    correctOptionId: s.correctOptionId,
    explanation: s.explanation,
    streak,
    xpGained,
    answerDistribution: await distribution(s),
  }
}

export async function streaks(limit = 50) {
  const todayKey = romeDateKey()
  const since = addDays(new Date(), -400)
  const [spots, answers] = await Promise.all([
    prisma.dailySpot.findMany({ where: { date: { lte: dateKeyToDbDate(todayKey), gte: since } }, orderBy: { date: 'desc' }, select: { date: true } }),
    prisma.dailySpotAnswer.findMany({
      where: { spot: { date: { gte: since } }, user: { disabledAt: null } },
      select: { userId: true, correct: true, spot: { select: { date: true } }, user: { select: { nickname: true, avatarSeed: true } } },
    }),
  ])
  const spotKeys = spots.map((s) => dbDateToKey(s.date))
  const byUser = new Map<string, { nickname: string; avatarSeed: string; dates: Set<string>; total: number; correct: number }>()
  for (const a of answers) {
    const u = byUser.get(a.userId) ?? { nickname: a.user.nickname, avatarSeed: a.user.avatarSeed, dates: new Set<string>(), total: 0, correct: 0 }
    u.dates.add(dbDateToKey(a.spot.date))
    u.total++
    if (a.correct) u.correct++
    byUser.set(a.userId, u)
  }
  return [...byUser.entries()]
    .map(([userId, u]) => ({
      userId,
      nickname: u.nickname,
      avatarSeed: u.avatarSeed,
      streak: computeStreak(spotKeys, u.dates, todayKey),
      correctPct: u.total ? round1((u.correct / u.total) * 100) : 0,
    }))
    .sort((a, b) => b.streak - a.streak || b.correctPct - a.correctPct || a.nickname.localeCompare(b.nickname))
    .slice(0, limit)
}

export async function createSpot(input: z.output<typeof dailySpotCreateSchema>) {
  const coach = await prisma.user.findUnique({ where: { id: input.coachId } })
  if (!coach || coach.role === 'STUDENT') throw badRequest('Coach non valido', 'INVALID_COACH')
  try {
    const s = await prisma.dailySpot.create({
      data: {
        date: dateKeyToDbDate(input.date),
        format: input.format,
        title: input.title,
        situation: input.situation,
        heroCards: input.heroCards,
        board: input.board,
        stacksBb: input.stacksBb,
        options: input.options,
        correctOptionId: input.correctOptionId,
        explanation: input.explanation,
        coachId: input.coachId,
      },
    })
    return { ...baseDto(s), correctOptionId: s.correctOptionId, explanation: s.explanation }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      throw conflict(`Esiste già un Daily Spot per il ${input.date}`, 'SPOT_DATE_TAKEN')
    throw err
  }
}
