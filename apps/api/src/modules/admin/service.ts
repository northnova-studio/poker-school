// Gestionale: panoramica KPI e giocatori.
import type { z } from 'zod'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { num, round1, round2 } from '../../lib/money.js'
import { addDays } from '../../lib/dates.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { toKycDto, toPurchaseDto, toSessionDto, toUserDto } from '../../lib/dto.js'
import type { Format, Prisma, User } from '../../generated/prisma/client.js'
import { currentMrr } from '../finance/service.js'
import { deals as listDeals } from '../staking/service.js'
import { rankInfo, tiersFor } from '../rank/service.js'
import { getCard } from '../cards/service.js'
import { playerStats } from '../stats/service.js'
import type { playerFiltersSchema, playerPatchSchema } from './schemas.js'

const monthStart = (y: number, m0: number) => new Date(Date.UTC(y, m0, 1))

function last12Months(now = new Date()) {
  const out: { start: Date; end: Date }[] = []
  for (let i = 11; i >= 0; i--) {
    const start = monthStart(now.getUTCFullYear(), now.getUTCMonth() - i)
    const end = new Date(monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1).getTime() - 1)
    out.push({ start, end })
  }
  return out
}

// ── Overview ───────────────────────────────────────────────────────────────

export async function overview() {
  const now = new Date()
  const d30 = addDays(now, -30)
  const months = last12Months(now)
  const yearAgo = months[0].start

  const [
    activeMembers,
    byPlan,
    newMembers30d,
    canceled30,
    activeAtStart,
    mrr,
    revenue30,
    coursesSold30d,
    kycPending,
    kycOld,
    openReviewsOld,
    deals,
    stakingEntries,
    profit30,
    formats30,
    incomeTx,
    students,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', plan: { not: null }, disabledAt: null } }),
    prisma.user.groupBy({ by: ['plan'], where: { role: 'STUDENT', plan: { not: null }, disabledAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: d30 } } }),
    prisma.subscription.count({ where: { canceledAt: { gte: d30 } } }),
    prisma.subscription.count({ where: { createdAt: { lt: d30 }, OR: [{ canceledAt: null }, { canceledAt: { gte: d30 } }] } }),
    currentMrr(),
    prisma.transaction.aggregate({ where: { type: 'INCOME', category: { not: 'STAKING' }, date: { gte: d30 } }, _sum: { amount: true } }),
    prisma.purchase.count({ where: { createdAt: { gte: d30 } } }),
    prisma.kycSubmission.count({ where: { status: 'PENDING' } }),
    prisma.kycSubmission.count({ where: { status: 'PENDING', submittedAt: { lt: addDays(now, -2) } } }),
    prisma.handReview.count({ where: { status: { not: 'REVIEWED' }, createdAt: { lt: addDays(now, -3) } } }),
    listDeals(),
    prisma.ledgerEntry.findMany({ where: { type: { in: ['SESSION_RESULT', 'ADJUSTMENT'] } }, select: { date: true, amount: true } }),
    prisma.session.groupBy({ by: ['userId'], where: { date: { gte: d30 } }, _sum: { profit: true } }),
    prisma.session.groupBy({ by: ['userId', 'format'], where: { date: { gte: d30 } }, _count: { _all: true } }),
    prisma.transaction.findMany({ where: { type: 'INCOME', category: { not: 'STAKING' }, date: { gte: yearAgo } }, select: { date: true, amount: true } }),
    prisma.user.findMany({ where: { role: 'STUDENT' }, select: { createdAt: true } }),
  ])

  const membersByPlan = { base: 0, pro: 0, elite: 0 }
  for (const r of byPlan) if (r.plan) membersByPlan[r.plan] = r._count._all

  const stakingCapitalOut = round2(deals.filter((d) => d.status !== 'CLOSED').reduce((a, d) => a + Math.max(0, d.capitalAllocated - d.capitalReturned), 0))
  const stakingNet30d = round2(stakingEntries.filter((e) => e.date >= d30).reduce((a, e) => a + num(e.amount), 0))
  const stakingNetAll = round2(stakingEntries.reduce((a, e) => a + num(e.amount), 0))

  // formato principale (più giocato) negli ultimi 30 giorni
  const mainFormat = new Map<string, { format: Format; n: number }>()
  for (const r of formats30) {
    const cur = mainFormat.get(r.userId)
    if (!cur || r._count._all > cur.n) mainFormat.set(r.userId, { format: r.format, n: r._count._all })
  }
  const nick = new Map(
    (await prisma.user.findMany({ where: { id: { in: profit30.map((p) => p.userId) } }, select: { id: true, nickname: true } })).map((u) => [u.id, u.nickname]),
  )
  const ranked = profit30
    .map((p) => ({ userId: p.userId, nickname: nick.get(p.userId) ?? '?', profit: num(p._sum.profit), format: mainFormat.get(p.userId)?.format ?? ('MTT' as Format) }))
    .sort((a, b) => b.profit - a.profit)
  const topPlayers30d = ranked.filter((r) => r.profit > 0).slice(0, 5)
  const worstPlayers30d = [...ranked]
    .reverse()
    .filter((r) => r.profit < 0)
    .slice(0, 5)

  const revenueSeries = months.map((m) => ({
    date: m.start.toISOString(),
    value: round2(incomeTx.filter((t) => t.date >= m.start && t.date <= m.end).reduce((a, t) => a + num(t.amount), 0)),
  }))
  const stakingSeries = months.map((m) => ({
    date: m.start.toISOString(),
    value: round2(stakingEntries.filter((e) => e.date <= m.end).reduce((a, e) => a + num(e.amount), 0)),
  }))
  const membersSeries = months.map((m) => ({ date: m.start.toISOString(), value: students.filter((s) => s.createdAt <= m.end).length }))

  const alerts: { level: 'info' | 'warning' | 'danger'; text: string }[] = []
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  if (kycOld) alerts.push({ level: 'danger', text: `${n(kycOld, 'verifica identità', 'verifiche identità')} in attesa da più di 48 ore` })
  else if (kycPending) alerts.push({ level: 'warning', text: `${n(kycPending, 'verifica identità', 'verifiche identità')} da revisionare` })
  if (openReviewsOld) alerts.push({ level: 'warning', text: `${n(openReviewsOld, 'hand review aperta', 'hand review aperte')} da più di 3 giorni` })
  for (const d of deals)
    if (d.status === 'ACTIVE' && d.capitalAllocated > 0 && d.makeup > d.capitalAllocated * 0.5)
      alerts.push({ level: 'danger', text: `Makeup di ${d.nickname} oltre il 50% del capitale (€${d.makeup.toFixed(2)})` })
  if (!env.stripeEnabled) alerts.push({ level: 'info', text: 'Stripe non configurato: checkout di corsi e abbonamenti disattivato' })
  if (!env.bunnyEnabled) alerts.push({ level: 'info', text: 'Bunny Stream non configurato: i video mostrano un segnaposto' })
  if (env.isProd && env.STORAGE_DRIVER === 'local') alerts.push({ level: 'danger', text: 'Documenti KYC su disco locale in produzione: configura R2' })

  return {
    activeMembers,
    membersByPlan,
    newMembers30d,
    churn30dPct: activeAtStart ? round1((canceled30 / activeAtStart) * 100) : 0,
    mrr,
    revenue30d: num(revenue30._sum.amount),
    coursesSold30d,
    kycPending,
    stakingCapitalOut,
    stakingNet30d,
    stakingNetAll,
    topPlayers30d,
    worstPlayers30d,
    revenueSeries,
    stakingSeries,
    membersSeries,
    alerts,
  }
}

// ── Giocatori ──────────────────────────────────────────────────────────────

async function buildRows(users: User[]) {
  const ids = users.map((u) => u.id)
  const d30 = addDays(new Date(), -30)
  const [s30, allProfit, lastSession, activeDeals, tiers] = await Promise.all([
    prisma.session.findMany({
      where: { userId: { in: ids }, date: { gte: d30 } },
      select: { userId: true, format: true, games: true, hands: true, profit: true, totalBuyIns: true, bbWon: true, avgBuyIn: true },
    }),
    prisma.session.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _sum: { profit: true } }),
    prisma.session.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _max: { date: true } }),
    prisma.stakingDeal.findMany({ where: { userId: { in: ids }, status: 'ACTIVE' }, select: { userId: true } }),
    tiersFor(ids),
  ])
  const all = new Map(allProfit.map((r) => [r.userId, num(r._sum.profit)]))
  const last = new Map(lastSession.map((r) => [r.userId, r._max.date]))
  const staked = new Set(activeDeals.map((d) => d.userId))
  return users.map((u) => {
    const mine = s30.filter((s) => s.userId === u.id)
    const t = mine.filter((s) => s.format !== 'CASH')
    const c = mine.filter((s) => s.format === 'CASH')
    const tBuy = t.reduce((a, s) => a + num(s.totalBuyIns), 0)
    const cHands = c.reduce((a, s) => a + (s.hands ?? 0), 0)
    const cBb = c.reduce((a, s) => a + (s.bbWon ?? (num(s.avgBuyIn) > 0 ? num(s.profit) / num(s.avgBuyIn) : 0)), 0)
    return {
      userId: u.id,
      nickname: u.nickname,
      fullName: `${u.firstName} ${u.lastName}`,
      email: u.email,
      avatarSeed: u.avatarSeed,
      role: u.role,
      formats: u.formats,
      mainLevel: u.mainLevel,
      plan: u.plan,
      kycStatus: u.kycStatus,
      coachId: u.coachId,
      tier: tiers.get(u.id) ?? 'FISH',
      staked: staked.has(u.id),
      profit30d: round2(mine.reduce((a, s) => a + num(s.profit), 0)),
      profitAll: all.get(u.id) ?? 0,
      volume30d: mine.reduce((a, s) => a + s.games, 0),
      roi30d: tBuy > 0 ? round1((t.reduce((a, s) => a + num(s.profit), 0) / tBuy) * 100) : null,
      bb100_30d: cHands > 0 ? round2((cBb / cHands) * 100) : null,
      lastSessionAt: last.get(u.id)?.toISOString() ?? null,
      joinedAt: u.createdAt.toISOString(),
    }
  })
}

export async function listPlayers(f: z.output<typeof playerFiltersSchema>) {
  const where: Prisma.UserWhereInput = {
    ...(f.q
      ? {
          OR: [
            { nickname: { contains: f.q, mode: 'insensitive' } },
            { email: { contains: f.q, mode: 'insensitive' } },
            { firstName: { contains: f.q, mode: 'insensitive' } },
            { lastName: { contains: f.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(f.format ? { formats: { has: f.format } } : {}),
    ...(f.plan ? { plan: f.plan } : {}),
    ...(f.kycStatus ? { kycStatus: f.kycStatus } : {}),
    ...(f.staked === true ? { stakingDeals: { some: { status: 'ACTIVE' } } } : {}),
    ...(f.staked === false ? { stakingDeals: { none: { status: 'ACTIVE' } } } : {}),
  }
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 })
  const rows = await buildRows(users)
  const sort = f.sort ?? 'joinedAt'
  rows.sort((a, b) => {
    switch (sort) {
      case 'profit30d':
        return b.profit30d - a.profit30d
      case 'profitAll':
        return b.profitAll - a.profitAll
      case 'volume30d':
        return b.volume30d - a.volume30d
      case 'nickname':
        return a.nickname.localeCompare(b.nickname)
      default:
        return b.joinedAt.localeCompare(a.joinedAt)
    }
  })
  const offset = f.offset ?? 0
  const items = f.limit ? rows.slice(offset, offset + f.limit) : rows.slice(offset)
  return { items, total: rows.length }
}

export async function playerDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Giocatore non trovato')
  const [[row], stats, rank, card, stakingDeals, sessions, purchases, kyc, notes] = await Promise.all([
    buildRows([user]),
    playerStats(userId, 'all', 'ALL'),
    rankInfo(userId),
    getCard(userId),
    listDeals({ userId }),
    prisma.session.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 200 }),
    prisma.purchase.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.kycSubmission.findFirst({ where: { userId }, orderBy: { submittedAt: 'desc' }, include: { files: true } }),
    prisma.coachNote.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ])
  return {
    user: toUserDto(user),
    row,
    stats,
    rank,
    card,
    stakingDeals,
    sessions: sessions.map(toSessionDto),
    purchases: purchases.map(toPurchaseDto),
    kyc: kyc ? toKycDto(kyc) : null,
    coachNotes: notes.map((n) => ({ id: n.id, authorId: n.authorId, text: n.text, createdAt: n.createdAt.toISOString() })),
  }
}

export async function updatePlayer(actor: User, userId: string, patch: z.output<typeof playerPatchSchema>) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Giocatore non trovato')
  if (patch.role && patch.role !== 'ADMIN' && user.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', disabledAt: null } })
    if (admins <= 1) throw conflict("Non puoi rimuovere l'ultimo admin", 'LAST_ADMIN')
  }
  if (patch.coachId) {
    if (patch.coachId === userId) throw badRequest('Un giocatore non può essere coach di sé stesso', 'INVALID_COACH')
    const coach = await prisma.user.findUnique({ where: { id: patch.coachId } })
    if (!coach || coach.role === 'STUDENT') throw badRequest('Coach non valido', 'INVALID_COACH')
  }
  const data: Prisma.UserUpdateInput = {
    ...(patch.role ? { role: patch.role } : {}),
    ...(patch.mainLevel ? { mainLevel: patch.mainLevel } : {}),
    ...(patch.coachId !== undefined ? { coach: patch.coachId ? { connect: { id: patch.coachId } } : { disconnect: true } } : {}),
    ...(patch.plan !== undefined ? { plan: patch.plan, planInterval: patch.plan ? (user.planInterval ?? 'month') : null } : {}),
  }
  const updated = await prisma.user.update({ where: { id: userId }, data })
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'user.update', entity: 'User', entityId: userId, meta: patch } })
  return toUserDto(updated)
}

export async function addNote(actor: User, userId: string, text: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Giocatore non trovato')
  const n = await prisma.coachNote.create({ data: { userId, authorId: actor.id, text } })
  return { id: n.id, authorId: n.authorId, text: n.text, createdAt: n.createdAt.toISOString() }
}

