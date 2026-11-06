import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { num, round2 } from '../../lib/money.js'
import { toTransactionDto } from '../../lib/dto.js'
import { conflict, notFound } from '../../lib/errors.js'
import type { User } from '../../generated/prisma/client.js'
import { computeMrr, financeSummary } from './domain.js'
import type { transactionInputSchema } from './schemas.js'

const parseDate = (s: string, endOfDay = false) => new Date(s.length === 10 ? `${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : s)

export function resolveRange(r: { from?: string; to?: string }) {
  const now = new Date()
  const to = r.to ? parseDate(r.to, true) : now
  const from = r.from ? parseDate(r.from) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1))
  return { from, to }
}

export async function currentMrr() {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    select: { status: true, interval: true, amountEur: true },
  })
  return computeMrr(subs.map((s) => ({ status: s.status, interval: s.interval, amountEur: num(s.amountEur) })))
}

export async function summary(range: { from?: string; to?: string }) {
  const { from, to } = resolveRange(range)
  const [txs, mrr] = await Promise.all([
    prisma.transaction.findMany({ where: { date: { gte: from, lte: to } }, select: { date: true, type: true, category: true, amount: true } }),
    currentMrr(),
  ])
  return financeSummary(
    txs.map((t) => ({ date: t.date, type: t.type, category: t.category, amount: num(t.amount) })),
    from,
    to,
    mrr,
  )
}

export async function transactions(range: { from?: string; to?: string }) {
  const { from, to } = resolveRange(range)
  const rows = await prisma.transaction.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'desc' }, take: 5000 })
  return rows.map(toTransactionDto)
}

export async function addTransaction(actor: User, input: z.output<typeof transactionInputSchema>) {
  if (input.userId) {
    const u = await prisma.user.findUnique({ where: { id: input.userId } })
    if (!u) throw notFound('Utente non trovato')
  }
  const t = await prisma.transaction.create({
    data: {
      date: parseDate(input.date),
      type: input.type,
      category: input.category,
      amount: round2(input.amount),
      description: input.description,
      userId: input.userId ?? null,
      source: 'MANUAL',
      createdById: actor.id,
    },
  })
  return toTransactionDto(t)
}

export async function removeTransaction(id: string) {
  const t = await prisma.transaction.findUnique({ where: { id } })
  if (!t) throw notFound('Movimento non trovato')
  if (t.source === 'STRIPE') throw conflict('Movimento registrato da Stripe: gestisci rimborsi/rettifiche con un nuovo movimento', 'STRIPE_TRANSACTION')
  await prisma.transaction.delete({ where: { id } })
}
