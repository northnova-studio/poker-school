import { beforeAll, describe, expect, it } from 'vitest'
import { addDays, monthNameIt, romeMonthRange } from '../../src/lib/dates.js'
import { ensureCurrentSeason } from '../../src/modules/rank/service.js'
import { api, auth, prisma, registerStudent, resetDb } from '../helpers.js'

beforeAll(resetDb)

describe('stagioni mensili con soft reset', () => {
  it('a fine mese chiude la stagione e riparte dal 30% dell’XP finale', async () => {
    const s = await registerStudent()
    const other = await registerStudent()
    const prev = romeMonthRange(addDays(romeMonthRange().start, -1))
    const old = await prisma.season.create({
      data: { number: 1, name: 'Stagione 1 — test', startsAt: prev.start, endsAt: prev.end },
    })
    await prisma.xpEvent.createMany({
      data: [
        { userId: s.user.id, seasonId: old.id, type: 'SESSION_LOGGED', xp: 1000, label: 'test', createdAt: addDays(prev.end, -2) },
        { userId: other.user.id, seasonId: old.id, type: 'SESSION_LOGGED', xp: 2, label: 'test', createdAt: addDays(prev.end, -2) },
      ],
    })

    const current = await ensureCurrentSeason()
    const { year, month0 } = romeMonthRange()
    expect(current.number).toBe(2)
    expect(current.name).toBe(`Stagione 2 — ${monthNameIt(month0)} ${year}`)

    const closed = await prisma.season.findUniqueOrThrow({ where: { id: old.id }, include: { standings: true } })
    expect(closed.status).toBe('CLOSED')
    expect(closed.standings.find((x) => x.userId === s.user.id)).toMatchObject({ finalXp: 1000, finalPosition: 1 })

    const rank = await api().get('/api/v1/me/rank').set(auth(s))
    expect(rank.body).toMatchObject({ seasonId: current.id, xp: 300, tier: 'CALLING_STATION', division: 3, position: 1 })
    expect(new Date(rank.body.seasonEndsAt).toISOString()).toBe(romeMonthRange().end.toISOString())
    // 30% di 2 = 0 → nessun carryover
    const r2 = await api().get('/api/v1/me/rank').set(auth(other))
    expect(r2.body.xp).toBe(0)

    // idempotente: nessuna nuova stagione
    expect((await ensureCurrentSeason()).id).toBe(current.id)
    expect(await prisma.season.count()).toBe(2)
  })
})
