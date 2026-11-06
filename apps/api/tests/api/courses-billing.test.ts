import { beforeAll, describe, expect, it } from 'vitest'
import { api, auth, loginAdmin, prisma, registerStudent, resetDb, setPlan, type Session } from '../helpers.js'

let admin: Session
let s: Session

beforeAll(async () => {
  await resetDb()
  admin = await loginAdmin()
  s = await registerStudent()
})

describe('catalogo pubblico', () => {
  it('8 corsi con la forma del contratto, filtri e dettaglio per slug', async () => {
    const all = await api().get('/api/v1/courses')
    expect(all.status).toBe(200)
    expect(all.body).toHaveLength(8)
    const icm = all.body.find((c: { id: string }) => c.id === 'crs-icm')
    expect(icm).toMatchObject({ slug: 'icm-masterclass', priceEur: 199, includedInPlans: ['elite'], coachId: 'c-matteo', bestseller: true, durationMin: 243 })
    expect(icm.chapters[0].lessons[0]).toEqual({ id: 'icm-fon-1', title: 'Perché le chip non sono soldi', durationMin: 18, preview: true })
    const mtt = await api().get('/api/v1/courses?format=MTT&level=MID')
    expect(mtt.body.map((c: { id: string }) => c.id)).toEqual(['crs-icm'])
    const q = await api().get('/api/v1/courses?q=solver')
    expect(q.body.map((c: { id: string }) => c.id)).toContain('crs-solver')
    const one = await api().get('/api/v1/courses/deep-run-lab')
    const ids = one.body.chapters.flatMap((c: { lessons: { id: string }[] }) => c.lessons.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length) // id lezione univoci
    expect((await api().get('/api/v1/courses/non-esiste')).status).toBe(404)
  })

  it('piani da config (39/390, 89/890, 249/2490) e coach pubblici', async () => {
    const plans = await api().get('/api/v1/plans')
    expect(plans.body.map((p: { id: string; priceMonthly: number; priceYearly: number }) => [p.id, p.priceMonthly, p.priceYearly])).toEqual([
      ['base', 39, 390],
      ['pro', 89, 890],
      ['elite', 249, 2490],
    ])
    expect(plans.body[1].highlighted).toBe(true)
    const coaches = await api().get('/api/v1/public/coaches')
    expect(coaches.body.map((c: { id: string }) => c.id)).toEqual(['c-fabri', 'c-matteo', 'c-lorenzo', 'c-staff'])
    expect(coaches.body[0].stats[0]).toMatchObject({ placeholder: true })
    const stats = await api().get('/api/v1/public/stats')
    expect(stats.body).toMatchObject({ members: expect.any(Number), placeholder: false })
  })
})

describe('pagamenti senza Stripe', () => {
  it('checkout corso → 503 "Pagamenti non configurati"', async () => {
    const res = await api().post('/api/v1/courses/crs-icm/checkout').set(auth(s))
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Pagamenti non configurati' } })
  })

  it('abbonamento → 503, webhook → 503', async () => {
    const sub = await api().post('/api/v1/billing/subscribe').set(auth(s)).send({ planId: 'pro', interval: 'month' })
    expect(sub.status).toBe(503)
    expect(sub.body.error.code).toBe('PAYMENTS_NOT_CONFIGURED')
    const wh = await api().post('/api/v1/billing/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', 't=1,v1=x').send('{}')
    expect(wh.status).toBe(503)
  })

  it('checkout richiede login', async () => {
    expect((await api().post('/api/v1/courses/crs-icm/checkout')).status).toBe(401)
  })
})

describe('accesso ai contenuti e video', () => {
  it('lezione in anteprima sì, il resto solo dopo acquisto o piano', async () => {
    const preview = await api().get('/api/v1/courses/crs-icm/lessons/icm-fon-1/video').set(auth(s))
    expect(preview.status).toBe(200)
    expect(preview.body).toMatchObject({ lessonId: 'icm-fon-1', url: expect.stringContaining('/api/v1/video/placeholder') })
    expect(new Date(preview.body.expiresAt).getTime()).toBeGreaterThan(Date.now())

    const locked = await api().get('/api/v1/courses/crs-icm/lessons/icm-fon-2/video').set(auth(s))
    expect(locked.status).toBe(403)
    expect(locked.body.error.code).toBe('COURSE_LOCKED')
    expect((await api().get('/api/v1/courses/crs-icm/lessons/icm-fon-2/video')).status).toBe(401)
    expect((await api().get('/api/v1/courses/crs-icm/lessons/mf-pre-1/video').set(auth(s))).status).toBe(404)
  })

  it('acquisto MANUAL da admin (extra) → accesso, progressi, XP, vendite', async () => {
    expect((await api().post(`/api/v1/admin/players/${s.user.id}/purchases`).set(auth(s)).send({ courseId: 'crs-mental' })).status).toBe(403)
    const p = await api().post(`/api/v1/admin/players/${s.user.id}/purchases`).set(auth(admin)).send({ courseId: 'crs-mental', amountEur: 59 })
    expect(p.status).toBe(201)
    expect(p.body).toMatchObject({ userId: s.user.id, courseId: 'crs-mental', amountEur: 59, provider: 'MANUAL' })
    expect((await api().post('/api/v1/courses/crs-mental/checkout').set(auth(s))).body.error.code).toBe('ALREADY_OWNED')

    const purchases = await api().get('/api/v1/me/purchases').set(auth(s))
    expect(purchases.body).toHaveLength(1)
    await api().get('/api/v1/courses/crs-mental/lessons/mg-rou-2/video').set(auth(s)).expect(200)

    const course = (await api().get('/api/v1/courses/mental-game-da-atleta')).body
    const lessonIds: string[] = course.chapters.flatMap((c: { lessons: { id: string }[] }) => c.lessons.map((l) => l.id))
    let progress
    for (const id of lessonIds) progress = (await api().post(`/api/v1/courses/crs-mental/lessons/${id}/complete`).set(auth(s))).body
    expect(progress).toMatchObject({ courseId: 'crs-mental', percent: 100, completedLessonIds: expect.arrayContaining(lessonIds) })
    const xp = (await api().get('/api/v1/me/xp').set(auth(s))).body
    expect(xp.filter((e: { type: string }) => e.type === 'COURSE_COMPLETED')).toHaveLength(1)
    const study = xp.filter((e: { type: string }) => e.type === 'STUDY_HOURS').reduce((a: number, e: { xp: number }) => a + e.xp, 0)
    expect(study).toBeLessThanOrEqual(60) // tetto 4 ore al giorno

    const sales = await api().get('/api/v1/admin/courses/sales').set(auth(admin))
    expect(sales.body.find((r: { courseId: string }) => r.courseId === 'crs-mental')).toEqual({ courseId: 'crs-mental', title: 'Mental game da atleta', units: 1, revenue: 59, last30dUnits: 1 })
    const tx = await prisma.transaction.findMany({ where: { category: 'COURSE' } })
    expect(tx.map((t) => Number(t.amount))).toEqual([59])
  })

  it('corso incluso nel piano', async () => {
    const pro = await registerStudent()
    await setPlan(pro.user.id, 'pro')
    await api().get('/api/v1/courses/crs-mtt-found/lessons/mf-pos-1/video').set(auth(pro)).expect(200)
    await api().get('/api/v1/courses/crs-icm/lessons/icm-fon-2/video').set(auth(pro)).expect(403)
    expect((await api().post('/api/v1/courses/crs-mtt-found/checkout').set(auth(pro))).body.error.code).toBe('ALREADY_OWNED')
  })

  it('pagina segnaposto video servita in HTML', async () => {
    const res = await api().get('/api/v1/video/placeholder?lesson=icm-fon-1')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.text).toContain('Perché le chip non sono soldi')
  })
})
