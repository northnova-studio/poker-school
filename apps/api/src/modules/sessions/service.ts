import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { toSessionDto } from '../../lib/dto.js'
import { conflict, notFound } from '../../lib/errors.js'
import { round2 } from '../../lib/money.js'
import { startOfRomeDay } from '../../lib/dates.js'
import type { User } from '../../generated/prisma/client.js'
import { awardBadge, awardXp, countXpEvents, revokeXp } from '../rank/service.js'
import { sessionXp } from '../rank/domain.js'
import type { sessionInputSchema } from './schemas.js'

export async function listSessions(userId: string) {
  const rows = await prisma.session.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 2000 })
  return rows.map(toSessionDto)
}

export async function createSession(user: User, input: z.output<typeof sessionInputSchema>) {
  const date = new Date(input.date.length === 10 ? `${input.date}T12:00:00Z` : input.date)
  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.session.create({
      data: {
        userId: user.id,
        date,
        format: input.format,
        durationMin: input.durationMin,
        games: input.games,
        hands: input.hands ?? null,
        itmCount: input.itm != null ? Math.min(input.itm, input.games) : null,
        avgBuyIn: round2(input.avgBuyIn),
        totalBuyIns: round2(input.totalBuyIns),
        totalCashes: round2(input.totalCashes),
        profit: round2(input.profit),
        chipEvBb100: input.chipEvBb100 ?? null,
        bbWon: input.bbWon ?? null,
        tilt: input.tilt,
        badBeats: input.badBeats,
        bubbles: input.bubbles,
        deepRun: input.deepRun,
        notes: input.notes,
        staked: input.staked,
      },
    })
    // Sessione giocata con capitale della scuola → risultato nel ledger del deal attivo
    if (input.staked) {
      const deal = await tx.stakingDeal.findFirst({
        where: { userId: user.id, status: 'ACTIVE', format: input.format },
        orderBy: { startDate: 'desc' },
      })
      if (deal)
        await tx.ledgerEntry.create({
          data: {
            dealId: deal.id,
            date,
            type: 'SESSION_RESULT',
            amount: round2(input.profit),
            note: `Sessione ${input.format} (${input.games} giochi)`,
            createdById: user.id,
            sessionId: s.id,
          },
        })
    }
    return s
  })
  const already = await countXpEvents(user.id, 'SESSION_LOGGED', startOfRomeDay())
  await awardXp(user.id, 'SESSION_LOGGED', sessionXp(input.games, already), `Sessione registrata (${input.format}, ${input.games} giochi)`, session.id)
  await awardBadge(user.id, 'first-session')
  return toSessionDto(session)
}

export async function removeSession(user: User, id: string) {
  const s = await prisma.session.findFirst({ where: { id, userId: user.id }, include: { ledgerEntry: true } })
  if (!s) throw notFound('Sessione non trovata')
  if (s.ledgerEntry) {
    const settledAfter = await prisma.ledgerEntry.findFirst({
      where: { dealId: s.ledgerEntry.dealId, type: 'SETTLEMENT', createdAt: { gte: s.ledgerEntry.createdAt } },
    })
    if (settledAfter) throw conflict('Sessione già inclusa in un settlement di staking: chiedi a un admin', 'SESSION_SETTLED')
  }
  await prisma.$transaction([
    ...(s.ledgerEntry ? [prisma.ledgerEntry.delete({ where: { id: s.ledgerEntry.id } })] : []),
    prisma.session.delete({ where: { id } }),
  ])
  await revokeXp(user.id, 'SESSION_LOGGED', id)
}
