import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { isoWeekId, startOfRomeWeek } from '../../lib/dates.js'
import { Prisma, type User } from '../../generated/prisma/client.js'
import { awardXp, countXpEvents } from '../rank/service.js'
import { XP, cappedXp } from '../rank/domain.js'
import type { roastSubmitSchema } from './schemas.js'

const include = { votes: { select: { userId: true, kind: true } } } as const
type SpotRow = Prisma.RoastSpotGetPayload<{ include: typeof include }>

function toDto(s: SpotRow, viewer: User) {
  const staff = viewer.role === 'ADMIN' || viewer.role === 'COACH'
  // l'autore resta anonimo salvo consenso (roastOptIn) o se a guardare è l'autore stesso/lo staff
  const showAuthor = s.playedByMember || staff || s.submittedByUserId === viewer.id
  return {
    id: s.id,
    weekId: s.weekId,
    title: s.title,
    description: s.description,
    format: s.format,
    heroCards: s.heroCards,
    board: s.board,
    submittedByUserId: showAuthor ? s.submittedByUserId : null,
    playedByMember: s.playedByMember,
    founderComment: s.founderComment,
    votesWorst: s.votes.filter((v) => v.kind === 'WORST').length,
    votesBest: s.votes.filter((v) => v.kind === 'BEST').length,
    myVote: s.votes.find((v) => v.userId === viewer.id)?.kind ?? null,
    createdAt: s.createdAt.toISOString(),
  }
}

export async function current(user: User) {
  let weekId = isoWeekId()
  const has = await prisma.roastSpot.count({ where: { weekId, hiddenAt: null } })
  if (!has) {
    const last = await prisma.roastSpot.findFirst({ where: { hiddenAt: null }, orderBy: { createdAt: 'desc' } })
    if (!last) return []
    weekId = last.weekId
  }
  const rows = await prisma.roastSpot.findMany({ where: { weekId, hiddenAt: null }, include, orderBy: { createdAt: 'asc' } })
  return rows.map((r) => toDto(r, user))
}

export async function vote(user: User, spotId: string, kind: 'WORST' | 'BEST') {
  const spot = await prisma.roastSpot.findFirst({ where: { id: spotId, hiddenAt: null } })
  if (!spot) throw notFound('Spot non trovato')
  try {
    await prisma.roastVote.create({ data: { spotId, userId: user.id, kind } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      throw conflict('Hai già votato questo spot', 'ALREADY_VOTED')
    throw err
  }
  const n = await countXpEvents(user.id, 'ROAST_VOTE', startOfRomeWeek())
  await awardXp(user.id, 'ROAST_VOTE', cappedXp(XP.ROAST_VOTE, n, XP.ROAST_VOTE_MAX_PER_WEEK), 'Voto al Roast della settimana', spotId)
  return toDto(await prisma.roastSpot.findUniqueOrThrow({ where: { id: spotId }, include }), user)
}

export async function submit(user: User, input: z.output<typeof roastSubmitSchema>) {
  if (!input.confirmAnonymized)
    throw badRequest('Conferma di aver rimosso nickname e avatar degli altri giocatori', 'ANONYMIZATION_REQUIRED')
  const spot = await prisma.roastSpot.create({
    data: {
      weekId: isoWeekId(),
      title: input.title,
      description: input.description,
      format: input.format,
      heroCards: input.heroCards,
      board: input.board,
      submittedByUserId: user.id,
      playedByMember: input.isMyOwnHand && user.roastOptIn,
    },
    include,
  })
  return toDto(spot, user)
}

export async function moderate(user: User, id: string, patch: { founderComment?: string | null; hidden?: boolean }) {
  const spot = await prisma.roastSpot.update({
    where: { id },
    data: {
      ...(patch.founderComment !== undefined ? { founderComment: patch.founderComment || null } : {}),
      ...(patch.hidden !== undefined ? { hiddenAt: patch.hidden ? new Date() : null } : {}),
    },
    include,
  })
  return toDto(spot, user)
}
