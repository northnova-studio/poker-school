import { beforeAll, describe, expect, it } from 'vitest'
import { api, auth, prisma, registerInput, registerStudent, resetDb, yearsAgo } from '../helpers.js'

beforeAll(resetDb)

const USER_KEYS = [
  'id',
  'email',
  'nickname',
  'firstName',
  'lastName',
  'role',
  'avatarSeed',
  'formats',
  'mainLevel',
  'kycStatus',
  'plan',
  'planInterval',
  'coachId',
  'discordHandle',
  'gamingTag',
  'bio',
  'shareResultsPublicly',
  'roastOptIn',
  'createdAt',
].sort()

describe('registrazione', () => {
  it('crea lo studente, restituisce AuthResponse e registra i consensi', async () => {
    const input = registerInput({ marketingOptIn: true, email: 'Mario.Rossi@Test.local' })
    const res = await api().post('/api/v1/auth/register').send(input)
    expect(res.status).toBe(201)
    expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'refreshToken', 'user'])
    expect(Object.keys(res.body.user).sort()).toEqual(USER_KEYS)
    expect(res.body.user).toMatchObject({ email: 'mario.rossi@test.local', role: 'STUDENT', kycStatus: 'NONE', plan: null })
    expect(res.body.user).not.toHaveProperty('passwordHash')
    const row = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } })
    expect(row.termsAcceptedAt).toBeInstanceOf(Date)
    expect(row.privacyAcceptedAt).toBeInstanceOf(Date)
    expect(row.marketingOptInAt).toBeInstanceOf(Date)
    expect(row.passwordHash).not.toContain(input.password)
  })

  it('rifiuta i minorenni (17 anni e 364 giorni)', async () => {
    const res = await api().post('/api/v1/auth/register').send(registerInput({ birthDate: yearsAgo(18, 1) }))
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { code: 'UNDERAGE', message: expect.stringContaining('maggiorenne') } })
  })

  it('accetta chi compie 18 anni oggi', async () => {
    const res = await api().post('/api/v1/auth/register').send(registerInput({ birthDate: yearsAgo(18) }))
    expect(res.status).toBe(201)
  })

  it('valida password, consensi ed email', async () => {
    const short = await api().post('/api/v1/auth/register').send(registerInput({ password: '1234567' }))
    expect(short.status).toBe(400)
    expect(short.body.error.code).toBe('VALIDATION_ERROR')
    const noTerms = await api().post('/api/v1/auth/register').send(registerInput({ acceptTerms: false }))
    expect(noTerms.status).toBe(400)
    const badEmail = await api().post('/api/v1/auth/register').send(registerInput({ email: 'non-una-email' }))
    expect(badEmail.status).toBe(400)
    const badDate = await api().post('/api/v1/auth/register').send(registerInput({ birthDate: '2000-02-30' }))
    expect(badDate.status).toBe(400)
  })

  it('email e nickname univoci', async () => {
    const a = registerInput()
    await api().post('/api/v1/auth/register').send(a).expect(201)
    const dupEmail = await api().post('/api/v1/auth/register').send(registerInput({ email: a.email }))
    expect(dupEmail.status).toBe(409)
    expect(dupEmail.body.error.code).toBe('EMAIL_TAKEN')
    const dupNick = await api().post('/api/v1/auth/register').send(registerInput({ nickname: String(a.nickname).toUpperCase() }))
    expect(dupNick.status).toBe(409)
    expect(dupNick.body.error.code).toBe('NICKNAME_TAKEN')
  })
})

describe('login, refresh, logout', () => {
  it('login corretto e sbagliato', async () => {
    const input = registerInput()
    await api().post('/api/v1/auth/register').send(input).expect(201)
    const ok = await api().post('/api/v1/auth/login').send({ email: input.email, password: input.password })
    expect(ok.status).toBe(200)
    expect(ok.body.user.email).toBe(input.email)
    const wrong = await api().post('/api/v1/auth/login').send({ email: input.email, password: 'sbagliata!!' })
    expect(wrong.status).toBe(401)
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS')
    const ghost = await api().post('/api/v1/auth/login').send({ email: 'nessuno@test.local', password: 'qualcosa' })
    expect(ghost.status).toBe(401)
    expect(ghost.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('/auth/me richiede un access token valido', async () => {
    const s = await registerStudent()
    const me = await api().get('/api/v1/auth/me').set(auth(s))
    expect(me.status).toBe(200)
    expect(me.body.id).toBe(s.user.id)
    expect((await api().get('/api/v1/auth/me')).status).toBe(401)
    const bad = await api().get('/api/v1/auth/me').set('Authorization', 'Bearer non.un.jwt')
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe('INVALID_TOKEN')
  })

  it('refresh ruota il token; il riuso del vecchio revoca tutta la famiglia', async () => {
    const s = await registerStudent()
    const r1 = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken })
    expect(r1.status).toBe(200)
    expect(r1.body.refreshToken).not.toBe(s.refreshToken)
    expect(r1.body.user.id).toBe(s.user.id)
    // riuso del token già ruotato → 401 e revoca anche del nuovo
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken })
    expect(reuse.status).toBe(401)
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED')
    const after = await api().post('/api/v1/auth/refresh').send({ refreshToken: r1.body.refreshToken })
    expect(after.status).toBe(401)
    // nel DB c'è solo l'hash
    const rows = await prisma.refreshToken.findMany({ where: { userId: s.user.id } })
    expect(rows.every((r) => r.tokenHash.length === 64 && r.tokenHash !== s.refreshToken)).toBe(true)
  })

  it('logout revoca il refresh token', async () => {
    const s = await registerStudent()
    const out = await api().post('/api/v1/auth/logout').send({ refreshToken: s.refreshToken })
    expect(out.status).toBe(204)
    const r = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken })
    expect(r.status).toBe(401)
  })

  it('refresh scaduto', async () => {
    const s = await registerStudent()
    await prisma.refreshToken.updateMany({ where: { userId: s.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
    const r = await api().post('/api/v1/auth/refresh').send({ refreshToken: s.refreshToken })
    expect(r.status).toBe(401)
    expect(r.body.error.code).toBe('REFRESH_TOKEN_EXPIRED')
  })

  it('cambio password (extra) revoca le sessioni', async () => {
    const input = registerInput()
    const reg = await api().post('/api/v1/auth/register').send(input)
    const h = { Authorization: `Bearer ${reg.body.accessToken}` }
    await api().post('/api/v1/auth/change-password').set(h).send({ currentPassword: 'sbagliata', newPassword: 'nuova-password' }).expect(401)
    await api().post('/api/v1/auth/change-password').set(h).send({ currentPassword: input.password, newPassword: 'nuova-password' }).expect(204)
    await api().post('/api/v1/auth/refresh').send({ refreshToken: reg.body.refreshToken }).expect(401)
    await api().post('/api/v1/auth/login').send({ email: input.email, password: 'nuova-password' }).expect(200)
  })
})

describe('profilo', () => {
  it('PATCH /me aggiorna i campi consentiti e ignora ruolo/piano', async () => {
    const s = await registerStudent()
    const res = await api()
      .patch('/api/v1/me')
      .set(auth(s))
      .send({ bio: 'Grinder serale', gamingTag: 'Lollo#1', shareResultsPublicly: true, roastOptIn: true, role: 'ADMIN', plan: 'elite', kycStatus: 'APPROVED' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ bio: 'Grinder serale', gamingTag: 'Lollo#1', shareResultsPublicly: true, roastOptIn: true, role: 'STUDENT', plan: null, kycStatus: 'NONE' })
  })
})
