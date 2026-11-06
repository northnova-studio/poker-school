import { beforeAll, describe, expect, it } from 'vitest'
import { dateKeyToDbDate, romeDateKey, addDays } from '../../src/lib/dates.js'
import { api, auth, loginAdmin, prisma, registerStudent, resetDb, setPlan, type Session } from '../helpers.js'

let admin: Session
let a: Session
let b: Session

beforeAll(async () => {
  await resetDb()
  admin = await loginAdmin()
  a = await registerStudent()
  b = await registerStudent({ formats: ['SPIN'] })
})

const spotInput = (date: string) => ({
  date,
  format: 'MTT' as const,
  title: 'Bolla, big stack',
  situation: 'Folda fino a te in CO.',
  heroCards: 'KhJh',
  board: null,
  stacksBb: 'Hero 48bb CO',
  options: [
    { id: 'a', label: 'Fold' },
    { id: 'b', label: 'Open 2bb' },
    { id: 'c', label: 'Shove' },
  ],
  coachId: 'c-matteo',
  correctOptionId: 'b',
  explanation: 'Open standard con pressione sugli stack medi.',
})

describe('Daily Spot', () => {
  it('una sola risposta per utente, XP, streak e distribuzione', async () => {
    const today = romeDateKey()
    const yesterday = romeDateKey(addDays(new Date(), -1))
    const created = await api().post('/api/v1/admin/daily-spots').set(auth(admin)).send(spotInput(today))
    expect(created.status).toBe(201)
    expect(created.body.correctOptionId).toBe('b')
    await api().post('/api/v1/admin/daily-spots').set(auth(admin)).send(spotInput(today)).expect(409)
    const old = await api().post('/api/v1/admin/daily-spots').set(auth(admin)).send(spotInput(yesterday))

    // prima di rispondere la soluzione non è visibile
    const before = await api().get('/api/v1/daily-spot/today').set(auth(a))
    expect(before.status).toBe(200)
    expect(before.body.id).toBe(created.body.id)
    expect(before.body).not.toHaveProperty('correctOptionId')
    expect(before.body).not.toHaveProperty('explanation')

    const bad = await api().post(`/api/v1/daily-spot/${created.body.id}/answer`).set(auth(a)).send({ optionId: 'z' })
    expect(bad.status).toBe(400)

    const ans = await api().post(`/api/v1/daily-spot/${created.body.id}/answer`).set(auth(a)).send({ optionId: 'b' })
    expect(ans.status).toBe(200)
    expect(ans.body).toEqual({ correct: true, correctOptionId: 'b', explanation: expect.any(String), streak: 1, xpGained: 15, answerDistribution: { a: 0, b: 100, c: 0 } })

    const twice = await api().post(`/api/v1/daily-spot/${created.body.id}/answer`).set(auth(a)).send({ optionId: 'a' })
    expect(twice.status).toBe(409)
    expect(twice.body.error.code).toBe('ALREADY_ANSWERED')

    const wrong = await api().post(`/api/v1/daily-spot/${created.body.id}/answer`).set(auth(b)).send({ optionId: 'c' })
    expect(wrong.body).toMatchObject({ correct: false, xpGained: 5, answerDistribution: { a: 0, b: 50, c: 50 } })

    // lo spot di ieri non è più attivo
    const late = await api().post(`/api/v1/daily-spot/${old.body.id}/answer`).set(auth(a)).send({ optionId: 'b' })
    expect(late.status).toBe(409)

    const after = await api().get('/api/v1/daily-spot/today').set(auth(a))
    expect(after.body).toMatchObject({ answeredOptionId: 'b', correctOptionId: 'b', answerDistribution: { a: 0, b: 50, c: 50 } })

    const xp = await api().get('/api/v1/me/xp').set(auth(b))
    expect(xp.body[0]).toMatchObject({ type: 'DAILY_SPOT_CORRECT', xp: 5, label: 'Daily Spot — tentativo' })

    const streaks = await api().get('/api/v1/daily-spot/streaks').set(auth(a))
    expect(streaks.body[0]).toMatchObject({ userId: a.user.id, streak: 1, correctPct: 100 })
  })

  it('bonus streak al 7° giorno consecutivo', async () => {
    const s = await registerStudent()
    // 6 spot passati già risposti + quello di oggi
    const todaySpot = await prisma.dailySpot.findFirstOrThrow({ where: { date: dateKeyToDbDate(romeDateKey()) } })
    for (let i = 2; i <= 6; i++) {
      const key = romeDateKey(addDays(new Date(), -i))
      const spot = await prisma.dailySpot.create({ data: { ...spotInput(key), date: dateKeyToDbDate(key), options: spotInput(key).options } })
      await prisma.dailySpotAnswer.create({ data: { spotId: spot.id, userId: s.user.id, optionId: 'b', correct: true } })
    }
    const y = await prisma.dailySpot.findFirstOrThrow({ where: { date: dateKeyToDbDate(romeDateKey(addDays(new Date(), -1))) } })
    await prisma.dailySpotAnswer.create({ data: { spotId: y.id, userId: s.user.id, optionId: 'b', correct: true } })
    const ans = await api().post(`/api/v1/daily-spot/${todaySpot.id}/answer`).set(auth(s)).send({ optionId: 'b' })
    expect(ans.body.streak).toBe(7)
    expect(ans.body.xpGained).toBe(65) // 15 + 50 bonus streak
  })
})

describe('rank', () => {
  it('nuovo iscritto: FISH III, stagione mensile, badge elencati', async () => {
    const s = await registerStudent()
    const r = await api().get('/api/v1/me/rank').set(auth(s))
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ tier: 'FISH', division: 3, xp: 0, xpIntoDivision: 0, xpForNextDivision: 100 })
    expect(r.body.seasonName).toMatch(/^Stagione \d+ — [A-Z][a-z]+ \d{4}$/)
    expect(r.body.badges.length).toBeGreaterThan(0)
    expect(r.body.badges[0]).toHaveProperty('earnedAt', null)
  })

  it('sessioni: XP 20 + 1 ogni 10 giochi, massimo 3 sessioni al giorno', async () => {
    const s = await registerStudent()
    const sess = (games: number) => ({ date: new Date().toISOString(), format: 'MTT', durationMin: 120, games, hands: null, avgBuyIn: 10, totalBuyIns: games * 10, totalCashes: 0, profit: -games * 10, tilt: 2, badBeats: 0, bubbles: 0, deepRun: false, notes: null, staked: false })
    for (const g of [95, 10, 10, 10]) await api().post('/api/v1/me/sessions').set(auth(s)).send(sess(g)).expect(201)
    const xp = (await api().get('/api/v1/me/xp').set(auth(s))).body.filter((e: { type: string }) => e.type === 'SESSION_LOGGED')
    expect(xp.map((e: { xp: number }) => e.xp).sort()).toEqual([21, 21, 29])
    const rank = await api().get('/api/v1/me/rank').set(auth(s))
    expect(rank.body.xp).toBe(71)
    const lb = await api().get('/api/v1/leaderboard?limit=50').set(auth(s))
    const me = lb.body.find((e: { userId: string }) => e.userId === s.user.id)
    expect(me).toMatchObject({ position: expect.any(Number), tier: 'FISH', xp: 71, delta: expect.any(Number) })
  })

  it('leaderboard pubblica solo con consenso', async () => {
    const s = await registerStudent()
    let pub = await api().get('/api/v1/public/leaderboard?limit=100')
    expect(pub.body.some((e: { userId: string }) => e.userId === s.user.id)).toBe(false)
    await api().patch('/api/v1/me').set(auth(s)).send({ shareResultsPublicly: true }).expect(200)
    pub = await api().get('/api/v1/public/leaderboard?limit=100')
    expect(pub.body.some((e: { userId: string }) => e.userId === s.user.id)).toBe(true)
  })

  it('player card: default per i nuovi, aggiornata dal coach, fondatori ICON', async () => {
    const s = await registerStudent()
    const card = await api().get('/api/v1/me/card').set(auth(s))
    expect(card.body).toMatchObject({ rarity: 'BRONZE', mainFormat: 'MTT', updatedByCoachId: null })
    const upd = await api()
      .patch(`/api/v1/admin/players/${s.user.id}/card`)
      .set(auth(admin))
      .send({ attributes: { pre: 80, post: 78, icm: 76, agg: 75, men: 80, vol: 74 } })
    expect(upd.status).toBe(200)
    expect(upd.body).toMatchObject({ overall: 77, rarity: 'GOLD', updatedByCoachId: admin.user.id })
    const fabri = await api().get('/api/v1/cards/c-fabri').set(auth(s))
    expect(fabri.body.rarity).toBe('ICON')
    const out = await api().patch(`/api/v1/admin/players/${s.user.id}/card`).set(auth(admin)).send({ attributes: { pre: 100, post: 78, icm: 76, agg: 75, men: 80, vol: 74 } })
    expect(out.status).toBe(400)
  })
})

describe('roast, deep run, gaming, hand review', () => {
  it('roast: un voto per utente per spot, autore anonimo senza consenso', async () => {
    const sub = await api()
      .post('/api/v1/roast')
      .set(auth(a))
      .send({ title: 'Hero call terribile', description: 'Nickname rimossi', format: 'CASH', heroCards: '8h8d', board: 'AsKdQc', isMyOwnHand: true, confirmAnonymized: true })
    expect(sub.status).toBe(201)
    expect(sub.body.playedByMember).toBe(false) // roastOptIn = false
    const noAnon = await api().post('/api/v1/roast').set(auth(a)).send({ title: 'xxx', description: 'yyy', format: 'CASH', heroCards: 'AA', board: null, isMyOwnHand: false, confirmAnonymized: false })
    expect(noAnon.status).toBe(400)
    const v = await api().post(`/api/v1/roast/${sub.body.id}/vote`).set(auth(b)).send({ kind: 'WORST' })
    expect(v.status).toBe(200)
    expect(v.body).toMatchObject({ votesWorst: 1, votesBest: 0, myVote: 'WORST', submittedByUserId: null })
    const again = await api().post(`/api/v1/roast/${sub.body.id}/vote`).set(auth(b)).send({ kind: 'BEST' })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('ALREADY_VOTED')
    const cur = await api().get('/api/v1/roast/current').set(auth(b))
    expect(cur.body.find((x: { id: string }) => x.id === sub.body.id).votesWorst).toBe(1)
  })

  it('deep run: rail unico per utente, XP al tavolo finale', async () => {
    const dr = await api().post('/api/v1/deep-runs').set(auth(a)).send({ tournamentName: 'Sunday €50', buyIn: 50, playersLeft: 80, totalPlayers: 2000, stackBb: 40 })
    expect(dr.status).toBe(201)
    await api().post(`/api/v1/deep-runs/${dr.body.id}/rail`).set(auth(b)).expect(200)
    const r2 = await api().post(`/api/v1/deep-runs/${dr.body.id}/rail`).set(auth(b))
    expect(r2.body).toMatchObject({ rails: 1, railedByMe: true })
    const c = await api().post(`/api/v1/deep-runs/${dr.body.id}/comments`).set(auth(b)).send({ text: 'Forza!' })
    expect(c.body.comments[0]).toMatchObject({ userId: b.user.id, nickname: b.user.nickname, text: 'Forza!' })
    expect((await api().patch(`/api/v1/deep-runs/${dr.body.id}`).set(auth(b)).send({ playersLeft: 9 })).status).toBe(403)
    const ft = await api().patch(`/api/v1/deep-runs/${dr.body.id}`).set(auth(a)).send({ playersLeft: 9, status: 'FINAL_TABLE' })
    expect(ft.body.status).toBe('FINAL_TABLE')
    await api().patch(`/api/v1/deep-runs/${dr.body.id}`).set(auth(a)).send({ status: 'WON', finishPosition: 1 }).expect(200)
    const xp = (await api().get('/api/v1/me/xp').set(auth(a))).body.filter((e: { type: string }) => e.type === 'DEEP_RUN')
    expect(xp).toHaveLength(1) // una sola volta per deep run
    expect(xp[0].xp).toBe(60)
    const active = await api().get('/api/v1/deep-runs?activeOnly=true').set(auth(a))
    expect(active.body.some((x: { id: string }) => x.id === dr.body.id)).toBe(false)
  })

  it('gaming: join/leave con XP e classifica', async () => {
    const ev = await api()
      .post('/api/v1/admin/gaming/events')
      .set(auth(admin))
      .send({ kind: 'BOUNTY_1V1', game: 'Warzone', title: 'Taglia su Lollo', description: '', startsAt: new Date(Date.now() + 86_400_000).toISOString(), hostUserId: 'c-lorenzo', maxParticipants: 1, prize: 'Lezione 1:1 gratis' })
    expect(ev.status).toBe(201)
    const money = await api()
      .post('/api/v1/admin/gaming/events')
      .set(auth(admin))
      .send({ kind: 'NIGHT', game: 'Warzone', title: 'Serata', startsAt: new Date().toISOString(), hostUserId: 'c-lorenzo', prize: '50 €' })
    expect(money.status).toBe(400)
    const j = await api().post(`/api/v1/gaming/events/${ev.body.id}/join`).set(auth(a))
    expect(j.body).toMatchObject({ joinedByMe: true, hostNickname: 'Lollo', participants: [{ userId: a.user.id, nickname: a.user.nickname }] })
    expect((await api().post(`/api/v1/gaming/events/${ev.body.id}/join`).set(auth(b))).status).toBe(409)
    const res = await api()
      .post(`/api/v1/admin/gaming/events/${ev.body.id}/results`)
      .set(auth(admin))
      .send({ results: [{ userId: a.user.id, points: 10, won: true, bountyClaimed: true }] })
    expect(res.status).toBe(200)
    const lb = await api().get('/api/v1/gaming/leaderboard').set(auth(b))
    expect(lb.body[0]).toMatchObject({ position: 1, userId: a.user.id, points: 10, wins: 1, bountiesClaimed: 1 })
    const xp = (await api().get('/api/v1/me/xp').set(auth(a))).body.map((e: { type: string }) => e.type)
    expect(xp).toEqual(expect.arrayContaining(['GAMING_NIGHT', 'BOUNTY_WON']))
  })

  it('hand review: invio, coda coach, risposta', async () => {
    const hr = await api().post('/api/v1/me/hand-reviews').set(auth(a)).send({ format: 'MTT', title: 'Squeeze in bolla', description: '', handHistory: 'Hero AJo, villain anonimo, flop ...' })
    expect(hr.status).toBe(201)
    expect(hr.body).toMatchObject({ status: 'OPEN', nickname: a.user.nickname, coachComment: null })
    const reply = await api().post(`/api/v1/admin/hand-reviews/${hr.body.id}/reply`).set(auth(admin)).send({ comment: 'Fold preflop.' })
    expect(reply.body).toMatchObject({ status: 'REVIEWED', coachComment: 'Fold preflop.', coachId: admin.user.id })
    const mine = await api().get('/api/v1/me/hand-reviews').set(auth(a))
    expect(mine.body[0].status).toBe('REVIEWED')
  })
})

describe('lezioni di gruppo', () => {
  it('prenotazione con piano minimo, capienza e link visibile solo ai prenotati', async () => {
    const startsAt = new Date(Date.now() + 2 * 86_400_000).toISOString()
    const l = await api()
      .post('/api/v1/admin/lessons')
      .set(auth(admin))
      .send({ title: 'ICM live', description: 'Review', format: 'MTT', level: 'MID', coachId: 'c-matteo', startsAt, durationMin: 90, capacity: 1, minPlan: 'pro', meetingUrl: 'https://meet.example.com/x' })
    expect(l.status).toBe(201)
    const noPlan = await api().post(`/api/v1/lessons/${l.body.id}/book`).set(auth(a))
    expect(noPlan.status).toBe(403)
    expect(noPlan.body.error.code).toBe('PLAN_REQUIRED')
    await setPlan(a.user.id, 'pro')
    await setPlan(b.user.id, 'elite')
    const ok = await api().post(`/api/v1/lessons/${l.body.id}/book`).set(auth(a))
    expect(ok.body).toMatchObject({ bookedByMe: true, bookedCount: 1, meetingUrl: 'https://meet.example.com/x' })
    const full = await api().post(`/api/v1/lessons/${l.body.id}/book`).set(auth(b))
    expect(full.status).toBe(409)
    const list = await api().get('/api/v1/lessons').set(auth(b))
    expect(list.body.find((x: { id: string }) => x.id === l.body.id)).toMatchObject({ bookedByMe: false, meetingUrl: null })
    const pub = await api().get('/api/v1/lessons')
    expect(pub.body.find((x: { id: string }) => x.id === l.body.id)).not.toHaveProperty('bookedByMe')
    const cancel = await api().delete(`/api/v1/lessons/${l.body.id}/book`).set(auth(a))
    expect(cancel.body).toMatchObject({ bookedByMe: false, bookedCount: 0 })
  })
})

describe('statistiche', () => {
  it('GET /me/stats con la forma del contratto', async () => {
    const res = await api().get('/api/v1/me/stats?period=30d&format=ALL').set(auth(a))
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'userId', 'period', 'format', 'profit', 'roi', 'abi', 'bb100', 'games', 'hands', 'itmPct', 'sessionsCount', 'hoursPlayed', 'hoursStudied',
        'sessionStreakDays', 'tiltIndex', 'badBeats', 'bubbles', 'deepRuns', 'riverSuckouts', 'attendancePct', 'profitSeries', 'volumeSeries', 'funFacts',
      ].sort(),
    )
    expect((await api().get('/api/v1/me/stats?period=1y').set(auth(a))).status).toBe(400)
  })
})
