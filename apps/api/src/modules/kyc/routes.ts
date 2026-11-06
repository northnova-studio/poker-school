import { Router, type Request } from 'express'
import multer from 'multer'
import { env } from '../../config/env.js'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth, requireRole } from '../../middleware/auth.js'
import { uploadLimiter } from '../../middleware/rateLimit.js'
import { kycQueueSchema, kycReviewSchema, kycSubmitSchema } from './schemas.js'
import * as svc from './service.js'

// File solo in memoria: vengono cifrati prima di toccare lo storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.KYC_MAX_FILE_MB * 1024 * 1024, files: 3, fields: 10, fieldSize: 1024 },
}).fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
])

const meta = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') })

export function publicBaseUrl(req: Request) {
  return env.PUBLIC_API_URL?.replace(/\/$/, '') ?? `${req.protocol}://${req.get('host')}`
}

export const kycRouter = Router()

kycRouter.post('/kyc', requireAuth, uploadLimiter, upload, async (req, res) => {
  const input = parse(kycSubmitSchema, req.body ?? {})
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>
  const pick = (k: string) => files[k]?.[0]
  const result = await svc.submit(me(req), input, { front: pick('front'), back: pick('back'), selfie: pick('selfie') }, meta(req))
  res.status(201).json(result)
})

kycRouter.get('/kyc/me', requireAuth, async (req, res) => {
  res.json(await svc.mine(me(req).id))
})

// URL firmato (HMAC, 5 minuti) aperto direttamente dal browser dell'admin: niente Bearer.
kycRouter.get('/kyc/files/:fileId', async (req, res) => {
  const q = req.query as Record<string, string | undefined>
  const file = await svc.readSignedFile(param(req, 'fileId'), { exp: q.exp, a: q.a, sig: q.sig }, meta(req))
  res.set({
    'Content-Type': file.mime,
    'Content-Disposition': `inline; filename="kyc-${file.kind.toLowerCase()}"`,
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    // il frontend (altra origine) deve poterlo mostrare in <img>/<iframe>
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    'Referrer-Policy': 'no-referrer',
  })
  res.send(file.body)
})

// Webhook dei provider esterni (raw body montato in app.ts)
kycRouter.post('/kyc/webhook/:provider', async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}))
  res.json(await svc.handleProviderWebhook(param(req, 'provider'), raw, req.headers))
})

// ── Admin (solo ADMIN: dati sensibili). Guardie per singola route: i router
// sono montati sullo stesso prefisso e un .use() globale bloccherebbe gli altri.
export const kycAdminRouter = Router()
const adminOnly = [requireAuth, requireRole('ADMIN')]

kycAdminRouter.get('/admin/kyc', ...adminOnly, async (req, res) => {
  const { status } = parse(kycQueueSchema, req.query)
  res.json(await svc.queue(status))
})

kycAdminRouter.get('/admin/kyc/:submissionId/files/:fileId', ...adminOnly, async (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(await svc.issueFileUrl(me(req), param(req, 'submissionId'), param(req, 'fileId'), publicBaseUrl(req), meta(req)))
})

kycAdminRouter.post('/admin/kyc/:id/review', ...adminOnly, async (req, res) => {
  const { decision, reason } = parse(kycReviewSchema, req.body)
  res.json(await svc.review(me(req), param(req, 'id'), decision, reason, req.ip))
})
