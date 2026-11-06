// Stagioni, XP, classifica, badge (I/O su DB; le regole sono in ./domain.ts).
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { addDays, romeMonthRange } from '../../lib/dates.js'
import { notFound } from '../../lib/errors.js'
import { Prisma, type Format, type Season, type XpEventType } from '../../generated/prisma/client.js'
import { TIERS, buildLeaderboard, rankPositions, seasonName, softResetXp, tierForXp, type XpRow } from './domain.js'

// ── Stagioni ───────────────────────────────────────────────────────────────

/** XP stagionale per utente = carryover (soft reset) + XP degli eventi della stagione fino a `until`. */
export async function seasonXpRows(seasonId: string, until?: Date): Promise<Map<string, number>> {
  const [standings, sums] = await Promise.all([
    prisma.seasonStanding.findMany({ where: { seasonId }, select: { userId: true, carryoverXp: true } }),
    prisma.xpEvent.groupBy({
      by: ['userId'],
      where: { seasonId, ...(until ? { createdAt: { lte: until } } : {}) },
      _sum: { xp: true },
    }),
  ])
  const m = new Map<string, number>()
  for (const s of standings) m.set(s.userId, s.carryoverXp)
  for (const s of sums) m.set(s.userId, (m.get(s.userId) ?? 0) + (s._sum.xp ?? 0))
  return m
}

/** XP stagionale di un solo utente (carryover + eventi). */
export async function userSeasonXp(seasonId: string, userId: string) {
  const [standing, sum] = await Promise.all([
    prisma.seasonStanding.findUnique({ where: { seasonId_userId: { seasonId, userId } } }),
    prisma.xpEvent.aggregate({ where: { seasonId, userId }, _sum: { xp: true } }),
  ])
  return (standing?.carryoverXp ?? 0) + (sum._sum.xp ?? 0)
}

/** Chiude le stagioni scadute (XP/posizioni finali) e apre quella del mese corrente con soft reset. */
export async function ensureCurrentSeason(now = new Date()): Promise<Season> {
  const current = await prisma.season.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { number: 'desc' },
  })
  if (current) return current

  const expired = await prisma.season.findMany({ where: { status: 'ACTIVE', endsAt: { lt: now } }, orderBy: { number: 'asc' } })
  let lastFinal = new Map<string, number>()
  for (const s of expired) {
    const xp = await seasonXpRows(s.id)
    const pos = rankPositions([...xp.entries()].map(([userId, v]) => ({ userId, xp: v })))
    await prisma.$transaction([
      ...[...xp.entries()].map(([userId, v]) =>
        prisma.seasonStanding.upsert({
          where: { seasonId_userId: { seasonId: s.id, userId } },
          create: { seasonId: s.id, userId, carryoverXp: 0, finalXp: v, finalPosition: pos.get(userId) },
          update: { finalXp: v, finalPosition: pos.get(userId) },
        }),
      ),
      prisma.season.update({ where: { id: s.id }, data: { status: 'CLOSED', closedAt: now } }),
    ])
    lastFinal = xp
  }
  if (!expired.length) {
    const prev = await prisma.season.findFirst({ where: { endsAt: { lt: now } }, orderBy: { number: 'desc' } })
    if (prev) {
      const st = await prisma.seasonStanding.findMany({ where: { seasonId: prev.id } })
      lastFinal = new Map(st.map((s) => [s.userId, s.finalXp ?? 0]))
    }
  }

  const last = await prisma.season.findFirst({ orderBy: { number: 'desc' } })
  const number = (last?.number ?? 0) + 1
  const { start, end, year, month0 } = romeMonthRange(now)
  try {
    const season = await prisma.season.create({
      data: {
        number,
        name: seasonName(number, year, month0),
        startsAt: start,
        endsAt: end,
        standings: {
          create: [...lastFinal.entries()]
            .map(([userId, v]) => ({ userId, carryoverXp: softResetXp(v) }))
            .filter((x) => x.carryoverXp > 0),
        },
      },
    })
    logger.info({ season: season.name }, 'nuova stagione aperta')
    return season
  } catch (err) {
    // Creazione concorrente: rileggo la stagione appena creata da un'altra richiesta
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const s = await prisma.season.findFirst({ where: { startsAt: { lte: now }, endsAt: { gte: now } } })
      if (s) return s
    }
    throw err
  }
}

// ── XP ─────────────────────────────────────────────────────────────────────

/** Assegna XP nella stagione corrente. Con `refId` è idempotente (una sola volta per riferimento). */
export async function awardXp(userId: string, type: XpEventType, xp: number, label: string, refId?: string) {
  if (xp <= 0) return null
  const season = await ensureCurrentSeason()
  try {
    const ev = await prisma.xpEvent.create({ data: { userId, seasonId: season.id, type, xp, label, refId: refId ?? null } })
    if (type === 'BOUNTY_WON') await awardBadge(userId, 'bounty-hunter')
    if ((await userSeasonXp(season.id, userId)) >= TIERS[TIERS.length - 1].min) await awardBadge(userId, 'legend')
    return ev
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null
    throw err
  }
}

export async function countXpEvents(userId: string, type: XpEventType, since: Date, positiveOnly = true) {
  return prisma.xpEvent.count({ where: { userId, type, createdAt: { gte: since }, ...(positiveOnly ? { xp: { gt: 0 } } : {}) } })
}

export async function sumXp(userId: string, type: XpEventType, since: Date) {
  const r = await prisma.xpEvent.aggregate({ where: { userId, type, createdAt: { gte: since } }, _sum: { xp: true } })
  return r._sum.xp ?? 0
}

export async function revokeXp(userId: string, type: XpEventType, refId: string) {
  await prisma.xpEvent.deleteMany({ where: { userId, type, refId } })
}

export async function listXpEvents(userId: string, limit = 200) {
  const rows = await prisma.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit })
  return rows.map((e) => ({ id: e.id, userId: e.userId, type: e.type, xp: e.xp, label: e.label, createdAt: e.createdAt.toISOString() }))
}

// ── Badge ──────────────────────────────────────────────────────────────────

export async function awardBadge(userId: string, key: string) {
  const badge = await prisma.badge.findUnique({ where: { key } })
  if (!badge) return
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    create: { userId, badgeId: badge.id },
    update: {},
  })
}

async function badgesFor(userId: string) {
  const [badges, mine] = await Promise.all([
    prisma.badge.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.userBadge.findMany({ where: { userId } }),
  ])
  const earned = new Map(mine.map((b) => [b.badgeId, b.earnedAt]))
  return badges.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    earnedAt: earned.get(b.id)?.toISOString() ?? null,
    rarity: b.rarity,
  }))
}

// ── Rank e classifica ──────────────────────────────────────────────────────

async function ladderPopulation(opts: { format?: Format; publicOnly?: boolean; include?: string }) {
  return prisma.user.findMany({
    where: {
      disabledAt: null,
      OR: [
        {
          role: 'STUDENT',
          ...(opts.publicOnly ? { shareResultsPublicly: true } : {}),
          ...(opts.format ? { formats: { has: opts.format } } : {}),
        },
        ...(opts.include ? [{ id: opts.include }] : []),
      ],
    },
    select: { id: true, nickname: true, avatarSeed: true, formats: true },
  })
}

export async function rankInfo(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Utente non trovato')
  const season = await ensureCurrentSeason()
  const [xpMap, population, badges] = await Promise.all([
    seasonXpRows(season.id),
    ladderPopulation({ include: userId }),
    badgesFor(userId),
  ])
  const rows: XpRow[] = population.map((u) => ({ userId: u.id, xp: xpMap.get(u.id) ?? 0 }))
  const positions = rankPositions(rows)
  const xp = xpMap.get(userId) ?? 0
  return {
    userId,
    seasonId: season.id,
    seasonName: season.name,
    seasonEndsAt: season.endsAt.toISOString(),
    ...tierForXp(xp),
    xp,
    position: positions.get(userId) ?? rows.length,
    badges,
  }
}

export async function leaderboard(opts: { format?: Format; limit?: number; publicOnly?: boolean }) {
  const season = await ensureCurrentSeason()
  const weekAgo = addDays(new Date(), -7)
  const [population, now, before] = await Promise.all([
    ladderPopulation(opts),
    seasonXpRows(season.id),
    seasonXpRows(season.id, weekAgo),
  ])
  const byId = new Map(population.map((u) => [u.id, u]))
  const board = buildLeaderboard(
    population.map((u) => ({ userId: u.id, xp: now.get(u.id) ?? 0 })),
    population.map((u) => ({ userId: u.id, xp: before.get(u.id) ?? 0 })),
  )
  return board.slice(0, Math.min(Math.max(opts.limit ?? 50, 1), 500)).map((r) => {
    const u = byId.get(r.userId)!
    return {
      position: r.position,
      userId: r.userId,
      nickname: u.nickname,
      avatarSeed: u.avatarSeed,
      tier: r.tier,
      division: r.division,
      xp: r.xp,
      delta: r.delta,
      formats: u.formats,
    }
  })
}

/** Tier corrente per più utenti (lista giocatori admin). */
export async function tiersFor(userIds: string[]) {
  const season = await ensureCurrentSeason()
  const xp = await seasonXpRows(season.id)
  return new Map(userIds.map((id) => [id, tierForXp(xp.get(id) ?? 0).tier]))
}
