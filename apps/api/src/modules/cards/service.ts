import { prisma } from '../../lib/prisma.js'
import { addDays } from '../../lib/dates.js'
import { notFound } from '../../lib/errors.js'
import type { Format, User } from '../../generated/prisma/client.js'
import { DEFAULT_ATTRIBUTES, cardOverall, cardRarity, clampAttr, volumeAttribute, type CardAttributes } from './domain.js'

async function volume90d(userId: string, format: Format) {
  const r = await prisma.session.aggregate({
    where: { userId, format, date: { gte: addDays(new Date(), -90) } },
    _sum: { games: true, hands: true },
  })
  return format === 'CASH' ? (r._sum.hands ?? 0) : (r._sum.games ?? 0)
}

export async function getCard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { playerCard: true, coachProfile: true } })
  if (!user) throw notFound('Giocatore non trovato')
  const card = user.playerCard
  const mainFormat = card?.mainFormat ?? user.formats[0] ?? 'MTT'
  const attrs: CardAttributes = card
    ? { pre: card.pre, post: card.post, icm: card.icm, agg: card.agg, men: card.men, vol: card.vol }
    : { ...DEFAULT_ATTRIBUTES }
  if (!card || card.volAuto) attrs.vol = volumeAttribute(mainFormat, await volume90d(userId, mainFormat))
  const overall = cardOverall(attrs)
  return {
    userId: user.id,
    nickname: user.nickname,
    avatarSeed: user.avatarSeed,
    mainFormat,
    overall,
    rarity: cardRarity(overall, Boolean(user.coachProfile?.isFounder)),
    attributes: attrs,
    updatedAt: (card?.updatedAt ?? user.createdAt).toISOString(),
    updatedByCoachId: card?.updatedByCoachId ?? null,
  }
}

export async function updateCard(actor: User, userId: string, a: CardAttributes, mainFormat?: Format) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Giocatore non trovato')
  const attrs = { pre: clampAttr(a.pre), post: clampAttr(a.post), icm: clampAttr(a.icm), agg: clampAttr(a.agg), men: clampAttr(a.men), vol: clampAttr(a.vol) }
  const fmt = mainFormat ?? user.formats[0] ?? 'MTT'
  await prisma.playerCard.upsert({
    where: { userId },
    create: { userId, mainFormat: fmt, ...attrs, volAuto: false, updatedByCoachId: actor.id },
    update: { ...attrs, ...(mainFormat ? { mainFormat } : {}), volAuto: false, updatedByCoachId: actor.id },
  })
  return getCard(userId)
}
