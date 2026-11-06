import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { num, numOrNull, round2 } from '../../lib/money.js'
import { toLedgerDto } from '../../lib/dto.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import type { LedgerEntry, Prisma, User } from '../../generated/prisma/client.js'
import { normalizeAmount, planSettlement, summarizeDeal, validShares, type LedgerLike } from './domain.js'
import type { dealInputSchema, dealPatchSchema, ledgerInputSchema } from './schemas.js'

const include = { user: { select: { nickname: true } }, entries: true } satisfies Prisma.StakingDealInclude
type DealRow = Prisma.StakingDealGetPayload<{ include: typeof include }>

const toLike = (e: LedgerEntry): LedgerLike => ({ type: e.type, amount: num(e.amount), date: e.date, createdAt: e.createdAt })
const toDate = (s: string) => new Date(s.length === 10 ? `${s}T12:00:00Z` : s)

export function toDealDto(d: DealRow) {
  const s = summarizeDeal(d.entries.map(toLike))
  return {
    id: d.id,
    userId: d.userId,
    nickname: d.user.nickname,
    format: d.format,
    status: d.status,
    startDate: d.startDate.toISOString(),
    endDate: d.endDate?.toISOString() ?? null,
    capitalAllocated: s.capitalAllocated,
    capitalReturned: s.capitalReturned,
    schoolSharePct: num(d.schoolSharePct),
    playerSharePct: num(d.playerSharePct),
    makeup: s.makeup,
    netResult: s.netResult,
    schoolProfit: s.schoolProfit,
    maxAbi: numOrNull(d.maxAbi),
    notes: d.notes,
  }
}

async function loadDeal(id: string) {
  const d = await prisma.stakingDeal.findUnique({ where: { id }, include })
  if (!d) throw notFound('Accordo di staking non trovato')
  return d
}

export async function deals(where: Prisma.StakingDealWhereInput = {}) {
  const rows = await prisma.stakingDeal.findMany({ where, include, orderBy: [{ status: 'asc' }, { startDate: 'desc' }] })
  return rows.map(toDealDto)
}

export async function createDeal(actor: User, input: z.output<typeof dealInputSchema>) {
  if (!validShares(input.schoolSharePct, input.playerSharePct)) throw badRequest('Le quote devono sommare 100', 'INVALID_SHARES')
  const player = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!player) throw notFound('Giocatore non trovato')
  const startDate = toDate(input.startDate)
  const deal = await prisma.stakingDeal.create({
    data: {
      userId: input.userId,
      format: input.format,
      startDate,
      schoolSharePct: input.schoolSharePct,
      playerSharePct: input.playerSharePct,
      maxAbi: input.maxAbi ?? null,
      notes: input.notes ?? null,
      createdById: actor.id,
      ...(input.initialCapital > 0
        ? {
            entries: {
              create: {
                date: startDate,
                type: 'TRANSFER_TO_PLAYER',
                amount: normalizeAmount('TRANSFER_TO_PLAYER', input.initialCapital),
                note: 'Capitale iniziale',
                createdById: actor.id,
              },
            },
          }
        : {}),
    },
  })
  return toDealDto(await loadDeal(deal.id))
}

export async function updateDeal(id: string, patch: z.output<typeof dealPatchSchema>) {
  const d = await loadDeal(id)
  const school = patch.schoolSharePct ?? num(d.schoolSharePct)
  const player = patch.playerSharePct ?? num(d.playerSharePct)
  if (!validShares(school, player)) throw badRequest('Le quote devono sommare 100', 'INVALID_SHARES')
  await prisma.stakingDeal.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status, endDate: patch.status === 'CLOSED' ? (d.endDate ?? new Date()) : null } : {}),
      schoolSharePct: school,
      playerSharePct: player,
      ...(patch.maxAbi !== undefined ? { maxAbi: patch.maxAbi } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  })
  return toDealDto(await loadDeal(id))
}

export async function ledger(dealId: string) {
  await loadDeal(dealId)
  const rows = await prisma.ledgerEntry.findMany({ where: { dealId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] })
  return rows.map(toLedgerDto)
}

export async function addEntry(actor: User, dealId: string, input: z.output<typeof ledgerInputSchema>) {
  if (input.type === 'SETTLEMENT') throw badRequest('Per il settlement usa POST /admin/staking/deals/:id/settle', 'USE_SETTLE')
  const d = await loadDeal(dealId)
  if (d.status === 'CLOSED') throw conflict('Accordo chiuso', 'DEAL_CLOSED')
  const entry = await prisma.ledgerEntry.create({
    data: {
      dealId,
      date: toDate(input.date),
      type: input.type,
      amount: normalizeAmount(input.type, input.amount),
      note: input.note ?? null,
      createdById: actor.id,
    },
  })
  return { deal: toDealDto(await loadDeal(dealId)), entry: toLedgerDto(entry) }
}

/**
 * Settlement: divide il netto positivo maturato dall'ultimo settlement secondo le quote,
 * registra una entry SETTLEMENT (amount = quota scuola) e una Transaction INCOME/STAKING.
 */
export async function settle(actor: User, dealId: string) {
  const d = await loadDeal(dealId)
  const plan = planSettlement(d.entries.map(toLike), num(d.schoolSharePct))
  if (!plan) {
    const s = summarizeDeal(d.entries.map(toLike))
    throw conflict(
      s.makeup > 0 ? `Makeup attivo (€${s.makeup.toFixed(2)}): niente da dividere` : 'Nessun profitto da dividere dall\'ultimo settlement',
      'NOTHING_TO_SETTLE',
    )
  }
  const now = new Date()
  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.ledgerEntry.create({
      data: {
        dealId,
        date: now,
        type: 'SETTLEMENT',
        amount: plan.schoolShare,
        settledNet: plan.net,
        playerShare: plan.playerShare,
        note: `Settlement: netto €${plan.net.toFixed(2)} → scuola €${plan.schoolShare.toFixed(2)}, giocatore €${plan.playerShare.toFixed(2)}`,
        createdById: actor.id,
      },
    })
    if (plan.schoolShare > 0)
      await tx.transaction.create({
        data: {
          date: now,
          type: 'INCOME',
          category: 'STAKING',
          amount: round2(plan.schoolShare),
          description: `Staking ${d.user.nickname} — quota scuola settlement`,
          userId: d.userId,
          source: 'SYSTEM',
          externalRef: `settlement:${e.id}`,
          createdById: actor.id,
        },
      })
    await tx.auditLog.create({
      data: { actorId: actor.id, action: 'staking.settle', entity: 'StakingDeal', entityId: dealId, meta: { ...plan } },
    })
    return e
  })
  return { deal: toDealDto(await loadDeal(dealId)), entry: toLedgerDto(entry) }
}
