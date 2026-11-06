import { beforeAll, describe, expect, it } from 'vitest'
import { api, auth, loginAdmin, registerStudent, resetDb, setRole, type Session } from '../helpers.js'

let student: Session
let coach: Session
let admin: Session

beforeAll(async () => {
  await resetDb()
  student = await registerStudent()
  coach = await registerStudent()
  await setRole(coach.user.id, 'COACH')
  admin = await loginAdmin()
})

const ADMIN_ONLY = [
  ['get', '/api/v1/admin/overview'],
  ['get', '/api/v1/admin/players'],
  ['get', '/api/v1/admin/kyc'],
  ['get', '/api/v1/admin/staking/deals'],
  ['get', '/api/v1/admin/finance/summary'],
  ['get', '/api/v1/admin/finance/transactions'],
  ['get', '/api/v1/admin/courses/sales'],
] as const

describe('autorizzazioni', () => {
  it.each(ADMIN_ONLY)('studente → 403 su %s %s', async (method, path) => {
    const res = await api()[method](path).set(auth(student))
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it.each(ADMIN_ONLY)('anonimo → 401 su %s %s', async (method, path) => {
    const res = await api()[method](path)
    expect(res.status).toBe(401)
  })

  it('coach: niente KYC/finanze, sì hand review e daily spot', async () => {
    expect((await api().get('/api/v1/admin/kyc').set(auth(coach))).status).toBe(403)
    expect((await api().get('/api/v1/admin/finance/summary').set(auth(coach))).status).toBe(403)
    expect((await api().get('/api/v1/admin/hand-reviews').set(auth(coach))).status).toBe(200)
  })

  it('studente non può scrivere nel gestionale', async () => {
    expect((await api().patch(`/api/v1/admin/players/${student.user.id}`).set(auth(student)).send({ role: 'ADMIN' })).status).toBe(403)
    expect((await api().post('/api/v1/admin/finance/transactions').set(auth(student)).send({})).status).toBe(403)
    expect((await api().post('/api/v1/admin/daily-spots').set(auth(student)).send({})).status).toBe(403)
  })

  it('admin: overview con la forma del contratto', async () => {
    const res = await api().get('/api/v1/admin/overview').set(auth(admin))
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'activeMembers',
        'membersByPlan',
        'newMembers30d',
        'churn30dPct',
        'mrr',
        'revenue30d',
        'coursesSold30d',
        'kycPending',
        'stakingCapitalOut',
        'stakingNet30d',
        'stakingNetAll',
        'topPlayers30d',
        'worstPlayers30d',
        'revenueSeries',
        'stakingSeries',
        'membersSeries',
        'alerts',
      ].sort(),
    )
    expect(res.body.membersByPlan).toEqual({ base: 0, pro: 0, elite: 0 })
    expect(res.body.revenueSeries).toHaveLength(12)
  })

  it('admin: lista giocatori paginata e aggiornamento ruolo/piano', async () => {
    const list = await api().get('/api/v1/admin/players?sort=nickname').set(auth(admin))
    expect(list.status).toBe(200)
    expect(list.body.total).toBeGreaterThanOrEqual(2)
    expect(list.body.items[0]).toHaveProperty('tier')
    const upd = await api().patch(`/api/v1/admin/players/${student.user.id}`).set(auth(admin)).send({ plan: 'pro', coachId: coach.user.id })
    expect(upd.status).toBe(200)
    expect(upd.body).toMatchObject({ plan: 'pro', planInterval: 'month', coachId: coach.user.id })
    const detail = await api().get(`/api/v1/admin/players/${student.user.id}`).set(auth(admin))
    expect(detail.status).toBe(200)
    expect(Object.keys(detail.body).sort()).toEqual(['card', 'coachNotes', 'kyc', 'purchases', 'rank', 'row', 'sessions', 'stakingDeals', 'stats', 'user'].sort())
  })

  it("l'ultimo admin non può essere declassato", async () => {
    // tutti gli ADMIN tranne quello loggato diventano COACH, poi prova a declassare sé stesso
    const { prisma } = await import('../helpers.js')
    await prisma.user.updateMany({ where: { role: 'ADMIN', id: { not: admin.user.id } }, data: { role: 'COACH' } })
    const res = await api().patch(`/api/v1/admin/players/${admin.user.id}`).set(auth(admin)).send({ role: 'STUDENT' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('LAST_ADMIN')
    await prisma.user.updateMany({ where: { id: { in: ['c-fabri', 'c-matteo', 'c-lorenzo'] } }, data: { role: 'ADMIN' } })
  })
})

describe('CORS ed errori', () => {
  it('consente il frontend su GitHub Pages', async () => {
    const res = await api().get('/api/v1/plans').set('Origin', 'https://northnova-studio.github.io')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://northnova-studio.github.io')
  })

  it('blocca origini non in allowlist', async () => {
    const res = await api().get('/api/v1/plans').set('Origin', 'https://evil.example')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CORS_NOT_ALLOWED')
  })

  it('formato errori {"error":{"code","message"}} anche su 404 e JSON malformato', async () => {
    const nf = await api().get('/api/v1/non-esiste')
    expect(nf.status).toBe(404)
    expect(nf.body.error).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) })
    const bad = await api().post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email":')
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('INVALID_JSON')
  })

  it('helmet: header di sicurezza', async () => {
    const res = await api().get('/api/v1/plans')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})
