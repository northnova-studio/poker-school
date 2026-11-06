import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { env } from '../../src/config/env.js'
import { hmacHex } from '../../src/lib/crypto.js'
import { purgeExpiredKycFiles } from '../../src/modules/kyc/service.js'
import { FILES, api, auth, loginAdmin, prisma, registerStudent, resetDb, type Session } from '../helpers.js'

let admin: Session

beforeAll(async () => {
  await resetDb()
  admin = await loginAdmin()
})
afterEach(() => {
  vi.useRealTimers()
})

function upload(s: Session, opts: { front?: Buffer; back?: Buffer | null; selfie?: Buffer; consent?: string; type?: string } = {}) {
  const req = api()
    .post('/api/v1/kyc')
    .set(auth(s))
    .field('documentType', opts.type ?? 'ID_CARD')
    .field('documentNumberLast4', '12ab')
    .field('consent', opts.consent ?? 'true')
    .attach('front', opts.front ?? FILES.jpeg, { filename: 'fronte.jpg', contentType: 'image/jpeg' })
    .attach('selfie', opts.selfie ?? FILES.png, { filename: 'selfie.png', contentType: 'image/png' })
  if (opts.back !== null) req.attach('back', opts.back ?? FILES.pdf, { filename: 'retro.pdf', contentType: 'application/pdf' })
  return req
}

const storagePath = (key: string) => path.resolve(env.STORAGE_LOCAL_DIR, key)

describe('upload KYC', () => {
  it('cifra i file a riposo, minimizza i dati e imposta PENDING', async () => {
    const s = await registerStudent()
    const res = await upload(s)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ userId: s.user.id, documentType: 'ID_CARD', documentNumberLast4: '12AB', status: 'PENDING', provider: 'MANUAL', reviewedAt: null })
    expect(res.body.files.map((f: { kind: string; mime: string }) => [f.kind, f.mime])).toEqual([
      ['FRONT', 'image/jpeg'],
      ['BACK', 'application/pdf'],
      ['SELFIE', 'image/png'],
    ])
    const rows = await prisma.kycFile.findMany({ where: { submissionId: res.body.id } })
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      const raw = await fs.readFile(storagePath(r.storageKey))
      const original = r.kind === 'FRONT' ? FILES.jpeg : r.kind === 'BACK' ? FILES.pdf : FILES.png
      expect(raw.equals(original)).toBe(false) // ciphertext, non il file originale
      expect(raw.includes(original.subarray(0, 4))).toBe(false)
      expect(r.iv).toHaveLength(16) // 12 byte in base64
      expect(r.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
    const me = await api().get('/api/v1/auth/me').set(auth(s))
    expect(me.body.kycStatus).toBe('PENDING')
    const mine = await api().get('/api/v1/kyc/me').set(auth(s))
    expect(mine.body.id).toBe(res.body.id)
    // una sola verifica in attesa
    expect((await upload(s)).status).toBe(409)
  })

  it('rifiuta file che non sono immagini/PDF (magic bytes), selfie in PDF e consenso mancante', async () => {
    const s = await registerStudent()
    const fake = await upload(s, { front: FILES.text })
    expect(fake.status).toBe(400)
    expect(fake.body.error.code).toBe('KYC_INVALID_FILE')
    const pdfSelfie = await upload(s, { selfie: FILES.pdf })
    expect(pdfSelfie.status).toBe(400)
    const noConsent = await upload(s, { consent: 'false' })
    expect(noConsent.status).toBe(400)
    expect(noConsent.body.error.code).toBe('VALIDATION_ERROR')
    const noBack = await upload(s, { back: null })
    expect(noBack.status).toBe(400)
    expect(noBack.body.error.code).toBe('KYC_MISSING_FILE')
    // passaporto: il retro non serve; HEIC accettato
    const passport = await upload(s, { back: null, type: 'PASSPORT', front: FILES.heic })
    expect(passport.status).toBe(201)
  })

  it('limite di 8 MB per file', async () => {
    const s = await registerStudent()
    const big = Buffer.concat([FILES.jpeg, Buffer.alloc(8 * 1024 * 1024)])
    const res = await upload(s, { front: big })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('LIMIT_FILE_SIZE')
  })

  it('richiede autenticazione', async () => {
    const res = await api().post('/api/v1/kyc').field('documentType', 'ID_CARD')
    expect(res.status).toBe(401)
  })
})

describe('revisione admin e URL firmati', () => {
  it('coda, URL firmato a 5 minuti con registro accessi, approvazione', async () => {
    const s = await registerStudent()
    const sub = (await upload(s)).body
    // lo studente non accede alla coda né ai file
    expect((await api().get('/api/v1/admin/kyc').set(auth(s))).status).toBe(403)
    expect((await api().get(`/api/v1/admin/kyc/${sub.id}/files/${sub.files[0].fileId}`).set(auth(s))).status).toBe(403)

    const queue = await api().get('/api/v1/admin/kyc?status=PENDING').set(auth(admin))
    expect(queue.status).toBe(200)
    const item = queue.body.find((x: { id: string }) => x.id === sub.id)
    expect(item.user).toEqual({ id: s.user.id, nickname: s.user.nickname, firstName: 'Mario', lastName: 'Test', email: s.user.email })

    const front = sub.files.find((f: { kind: string }) => f.kind === 'FRONT')
    const urlRes = await api().get(`/api/v1/admin/kyc/${sub.id}/files/${front.fileId}`).set(auth(admin))
    expect(urlRes.status).toBe(200)
    const url = new URL(urlRes.body.url)
    expect(url.origin).toBe('http://api.test')
    const exp = Number(url.searchParams.get('exp'))
    expect(exp - Date.now() / 1000).toBeGreaterThan(290)
    expect(exp - Date.now() / 1000).toBeLessThanOrEqual(300)

    const file = await api().get(url.pathname + url.search)
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toBe('image/jpeg')
    expect(file.headers['cache-control']).toContain('no-store')
    expect(file.headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(Buffer.from(file.body).equals(FILES.jpeg)).toBe(true)

    // firma manomessa
    const tampered = new URL(url)
    tampered.searchParams.set('a', s.user.id)
    expect((await api().get(tampered.pathname + tampered.search)).status).toBe(403)
    // link scaduto (orologio avanti di 6 minuti)
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 6 * 60_000 })
    const expired = await api().get(url.pathname + url.search)
    expect(expired.status).toBe(403)
    expect(expired.body.error.code).toBe('LINK_EXPIRED')
    vi.useRealTimers()

    const logs = await prisma.kycAccessLog.findMany({ where: { submissionId: sub.id }, orderBy: { createdAt: 'asc' } })
    expect(logs.map((l) => l.action)).toEqual(['URL_ISSUED', 'FILE_SERVED'])
    expect(logs.every((l) => l.actorId === admin.user.id)).toBe(true)

    const rev = await api().post(`/api/v1/admin/kyc/${sub.id}/review`).set(auth(admin)).send({ decision: 'APPROVED' })
    expect(rev.status).toBe(200)
    expect(rev.body).toMatchObject({ status: 'APPROVED', reviewerId: admin.user.id, rejectionReason: null })
    expect((await api().get('/api/v1/auth/me').set(auth(s))).body.kycStatus).toBe('APPROVED')
    expect((await api().post(`/api/v1/admin/kyc/${sub.id}/review`).set(auth(admin)).send({ decision: 'REJECTED' })).status).toBe(409)
  })

  it('rifiuto con motivazione e nuova verifica', async () => {
    const s = await registerStudent()
    const sub = (await upload(s)).body
    const rev = await api().post(`/api/v1/admin/kyc/${sub.id}/review`).set(auth(admin)).send({ decision: 'REJECTED', reason: 'Foto sfocata' })
    expect(rev.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'Foto sfocata' })
    expect((await api().get('/api/v1/auth/me').set(auth(s))).body.kycStatus).toBe('REJECTED')
    expect((await upload(s)).status).toBe(201)
  })

  it('retention: dopo N giorni dall’esito restano solo esito e ultime 4 cifre', async () => {
    const s = await registerStudent()
    const sub = (await upload(s)).body
    await api().post(`/api/v1/admin/kyc/${sub.id}/review`).set(auth(admin)).send({ decision: 'APPROVED' }).expect(200)
    const files = await prisma.kycFile.findMany({ where: { submissionId: sub.id } })
    // non ancora scaduta
    expect((await purgeExpiredKycFiles()).submissions).toBe(0)
    await prisma.kycSubmission.update({ where: { id: sub.id }, data: { reviewedAt: new Date(Date.now() - (env.KYC_RETENTION_DAYS + 1) * 86_400_000) } })
    const out = await purgeExpiredKycFiles()
    expect(out.submissions).toBeGreaterThanOrEqual(1)
    for (const f of files) await expect(fs.access(storagePath(f.storageKey))).rejects.toThrow()
    const row = await prisma.kycSubmission.findUniqueOrThrow({ where: { id: sub.id }, include: { files: true } })
    expect(row.files).toHaveLength(0)
    expect(row.filesPurgedAt).toBeInstanceOf(Date)
    expect(row.documentNumberLast4).toBe('12AB')
    expect(row.status).toBe('APPROVED')
    const gone = await api().get(`/api/v1/admin/kyc/${sub.id}/files/${files[0].id}`).set(auth(admin))
    expect(gone.status).toBe(410)
    const logs = await prisma.kycAccessLog.findMany({ where: { submissionId: sub.id, action: 'FILES_PURGED' } })
    expect(logs).toHaveLength(1)
  })
})

describe('webhook provider (stub firmato)', () => {
  it('rifiuta firme non valide e applica un esito firmato', async () => {
    const s = await registerStudent()
    const sub = (await upload(s)).body
    const body = JSON.stringify({ verification: { id: 'veriff-123', status: 'approved', vendorData: sub.id } })
    const bad = await api().post('/api/v1/kyc/webhook/veriff').set('Content-Type', 'application/json').set('X-HMAC-SIGNATURE', 'deadbeef').send(body)
    expect(bad.status).toBe(401)
    const sig = hmacHex(env.KYC_WEBHOOK_SECRET!, body)
    const ok = await api().post('/api/v1/kyc/webhook/veriff').set('Content-Type', 'application/json').set('X-HMAC-SIGNATURE', sig).send(body)
    expect(ok.status).toBe(200)
    const again = await api().post('/api/v1/kyc/webhook/veriff').set('Content-Type', 'application/json').set('X-HMAC-SIGNATURE', sig).send(body)
    expect(again.body.duplicate).toBe(true)
    const row = await prisma.kycSubmission.findUniqueOrThrow({ where: { id: sub.id } })
    expect(row.status).toBe('APPROVED')
    expect(row.reviewerId).toBeNull()
  })
})
