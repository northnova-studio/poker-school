import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { addDays } from '../../lib/dates.js'
import type { Prisma, User } from '../../generated/prisma/client.js'
import { awardXp, revokeXp } from '../rank/service.js'
import { XP } from '../rank/domain.js'
import type { gamingEventInputSchema, gamingResultsSchema } from './schemas.js'

const include = {
  host: { select: { nickname: true } },
  participants: { orderBy: { joinedAt: 'asc' }, include: { user: { select: { nickname: true } } } },
} satisfies Prisma.GamingEventInclude

type Row = Prisma.GamingEventGetPayload<{ include: typeof include }>

function toDto(e: Row, viewerId: string) {
  return {
    id: e.id,
    kind: e.kind,
    game: e.game,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    hostUserId: e.hostUserId,
    hostNickname: e.host.nickname,
    participants: e.participants.map((p) => ({ userId: p.userId, nickname: p.user.nickname })),
    maxParticipants: e.maxParticipants,
    prize: e.prize,
    joinedByMe: e.participants.some((p) => p.userId === viewerId),
  }
}

async function load(id: string, viewerId: string) {
  const e = await prisma.gamingEvent.findUnique({ where: { id }, include })
  if (!e) throw notFound('Evento non trovato')
  return toDto(e, viewerId)
}

export async function events(user: User) {
  const rows = await prisma.gamingEvent.findMany({
    where: { startsAt: { gte: addDays(new Date(), -30) } },
    include,
    orderBy: { startsAt: 'asc' },
    take: 200,
  })
  return rows.map((e) => toDto(e, user.id))
}

export async function join(user: User, id: string) {
  const e = await prisma.gamingEvent.findUnique({ where: { id }, include: { _count: { select: { participants: true } } } })
  if (!e) throw notFound('Evento non trovato')
  if (e.startsAt.getTime() < Date.now() - 3 * 3600_000) throw badRequest('Evento già concluso', 'EVENT_ENDED')
  const already = await prisma.gamingParticipant.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } })
  if (!already) {
    if (e.maxParticipants && e._count.participants >= e.maxParticipants) throw conflict('Evento al completo', 'EVENT_FULL')
    await prisma.gamingParticipant.create({ data: { eventId: id, userId: user.id } })
    await awardXp(user.id, 'GAMING_NIGHT', XP.GAMING_NIGHT, `Lobby post-sessione: ${e.title}`, id)
  }
  return load(id, user.id)
}

export async function leave(user: User, id: string) {
  const e = await prisma.gamingEvent.findUnique({ where: { id } })
  if (!e) throw notFound('Evento non trovato')
  const deleted = await prisma.gamingParticipant.deleteMany({ where: { eventId: id, userId: user.id } })
  if (deleted.count && e.startsAt.getTime() > Date.now()) await revokeXp(user.id, 'GAMING_NIGHT', id)
  return load(id, user.id)
}

export async function leaderboard() {
  const rows = await prisma.gamingParticipant.groupBy({ by: ['userId'], _sum: { points: true } })
  const [wins, bounties, users] = await Promise.all([
    prisma.gamingParticipant.groupBy({ by: ['userId'], where: { won: true }, _count: { _all: true } }),
    prisma.gamingParticipant.groupBy({ by: ['userId'], where: { bountyClaimed: true }, _count: { _all: true } }),
    prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) }, disabledAt: null }, select: { id: true, nickname: true, avatarSeed: true } }),
  ])
  const w = new Map(wins.map((r) => [r.userId, r._count._all]))
  const b = new Map(bounties.map((r) => [r.userId, r._count._all]))
  const u = new Map(users.map((x) => [x.id, x]))
  return rows
    .filter((r) => u.has(r.userId))
    .map((r) => ({ userId: r.userId, points: r._sum.points ?? 0, wins: w.get(r.userId) ?? 0, bountiesClaimed: b.get(r.userId) ?? 0 }))
    .sort((x, y) => y.points - x.points || y.wins - x.wins || y.bountiesClaimed - x.bountiesClaimed)
    .map((r, i) => ({
      position: i + 1,
      userId: r.userId,
      nickname: u.get(r.userId)!.nickname,
      avatarSeed: u.get(r.userId)!.avatarSeed,
      points: r.points,
      wins: r.wins,
      bountiesClaimed: r.bountiesClaimed,
    }))
}

export async function createEvent(user: User, input: z.output<typeof gamingEventInputSchema>) {
  const host = await prisma.user.findUnique({ where: { id: input.hostUserId } })
  if (!host) throw badRequest('Host non valido', 'INVALID_HOST')
  const e = await prisma.gamingEvent.create({
    data: { ...input, startsAt: new Date(input.startsAt), maxParticipants: input.maxParticipants ?? null, prize: input.prize ?? null },
  })
  return load(e.id, user.id)
}

/** Risultati della serata: punti, vittorie, taglie sui fondatori (XP BOUNTY_WON). */
export async function recordResults(user: User, id: string, results: z.output<typeof gamingResultsSchema>['results']) {
  const e = await prisma.gamingEvent.findUnique({ where: { id } })
  if (!e) throw notFound('Evento non trovato')
  for (const r of results) {
    await prisma.gamingParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId: r.userId } },
      create: { eventId: id, userId: r.userId, points: r.points, won: r.won, bountyClaimed: r.bountyClaimed },
      update: { points: r.points, won: r.won, bountyClaimed: r.bountyClaimed },
    })
    await awardXp(r.userId, 'GAMING_NIGHT', XP.GAMING_NIGHT, `Lobby post-sessione: ${e.title}`, id)
    if (r.bountyClaimed && e.kind === 'BOUNTY_1V1')
      await awardXp(r.userId, 'BOUNTY_WON', XP.BOUNTY_WON, `Taglia sul fondatore: ${e.title}`, `bounty:${id}`)
  }
  return load(id, user.id)
}
