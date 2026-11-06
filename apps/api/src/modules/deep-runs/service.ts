import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { num } from '../../lib/money.js'
import { badRequest, forbidden, notFound } from '../../lib/errors.js'
import type { Prisma, User } from '../../generated/prisma/client.js'
import { awardBadge, awardXp } from '../rank/service.js'
import { XP } from '../rank/domain.js'
import type { deepRunInputSchema, deepRunPatchSchema } from './schemas.js'

const include = {
  user: { select: { nickname: true, avatarSeed: true } },
  rails: { select: { userId: true } },
  comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { nickname: true } } } },
} satisfies Prisma.DeepRunInclude

type Row = Prisma.DeepRunGetPayload<{ include: typeof include }>

function toDto(r: Row, viewerId: string) {
  return {
    id: r.id,
    userId: r.userId,
    nickname: r.user.nickname,
    avatarSeed: r.user.avatarSeed,
    tournamentName: r.tournamentName,
    buyIn: num(r.buyIn),
    playersLeft: r.playersLeft,
    totalPlayers: r.totalPlayers,
    stackBb: r.stackBb,
    status: r.status,
    finishPosition: r.finishPosition,
    rails: r.rails.length,
    railedByMe: r.rails.some((x) => x.userId === viewerId),
    comments: r.comments.map((c) => ({ id: c.id, userId: c.userId, nickname: c.user.nickname, text: c.text, createdAt: c.createdAt.toISOString() })),
    startedAt: r.startedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

async function load(id: string, viewerId: string) {
  const r = await prisma.deepRun.findUnique({ where: { id }, include })
  if (!r) throw notFound('Deep run non trovato')
  return toDto(r, viewerId)
}

export async function list(user: User, activeOnly: boolean) {
  const rows = await prisma.deepRun.findMany({
    where: activeOnly ? { status: { in: ['LIVE', 'FINAL_TABLE'] } } : {},
    include,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  return rows.map((r) => toDto(r, user.id))
}

export async function create(user: User, input: z.output<typeof deepRunInputSchema>) {
  const r = await prisma.deepRun.create({ data: { userId: user.id, ...input } })
  return load(r.id, user.id)
}

export async function update(user: User, id: string, patch: z.output<typeof deepRunPatchSchema>) {
  const r = await prisma.deepRun.findUnique({ where: { id } })
  if (!r) throw notFound('Deep run non trovato')
  const staff = user.role === 'ADMIN' || user.role === 'COACH'
  if (r.userId !== user.id && !staff) throw forbidden('Puoi aggiornare solo i tuoi deep run')
  if (patch.playersLeft && patch.playersLeft > r.totalPlayers) throw badRequest('playersLeft non può superare totalPlayers', 'VALIDATION_ERROR')
  await prisma.deepRun.update({ where: { id }, data: patch })
  // XP quando il deep run arriva al tavolo finale o viene vinto (una sola volta)
  if (patch.status === 'FINAL_TABLE' || patch.status === 'WON') {
    await awardXp(r.userId, 'DEEP_RUN', XP.DEEP_RUN, `Deep run: ${r.tournamentName}`, id)
    await awardBadge(r.userId, 'deep-run')
  }
  return load(id, user.id)
}

/** Rail unico per utente (idempotente). */
export async function rail(user: User, id: string) {
  const r = await prisma.deepRun.findUnique({ where: { id } })
  if (!r) throw notFound('Deep run non trovato')
  await prisma.deepRunRail.upsert({
    where: { deepRunId_userId: { deepRunId: id, userId: user.id } },
    create: { deepRunId: id, userId: user.id },
    update: {},
  })
  return load(id, user.id)
}

export async function comment(user: User, id: string, text: string) {
  const r = await prisma.deepRun.findUnique({ where: { id } })
  if (!r) throw notFound('Deep run non trovato')
  await prisma.deepRunComment.create({ data: { deepRunId: id, userId: user.id, text } })
  return load(id, user.id)
}
