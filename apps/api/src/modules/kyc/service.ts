// KYC: upload cifrato, coda admin, URL firmati a scadenza, revisione, retention.
import type { IncomingHttpHeaders } from 'node:http'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { storage } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'
import { toKycDto } from '../../lib/dto.js'
import { badRequest, conflict, forbidden, gone, notFound } from '../../lib/errors.js'
import { addDays } from '../../lib/dates.js'
import { decryptAesGcm, deriveKey, encryptAesGcm, hmacHex, randomToken, safeEqual, sha256Hex } from '../../lib/crypto.js'
import type { KycFileKind, User } from '../../generated/prisma/client.js'
import { detectMime, isImage, type AllowedMime } from './files.js'
import { activeProvider, providerByName } from './providers.js'

export interface UploadedFile {
  buffer: Buffer
  size: number
}

const signingKey = env.KYC_URL_SIGNING_SECRET ? Buffer.from(env.KYC_URL_SIGNING_SECRET) : deriveKey(env.kycKey, 'kyc-url-signing')
const aadFor = (fileId: string) => `kyc-file:${fileId}`

export async function submit(
  user: User,
  input: { documentType: 'ID_CARD' | 'PASSPORT' | 'DRIVING_LICENSE'; documentNumberLast4: string },
  files: { front?: UploadedFile; back?: UploadedFile; selfie?: UploadedFile },
  meta: { ip?: string; userAgent?: string },
) {
  if (user.kycStatus === 'APPROVED') throw conflict('Identità già verificata', 'KYC_ALREADY_APPROVED')
  const pending = await prisma.kycSubmission.findFirst({ where: { userId: user.id, status: 'PENDING' } })
  if (pending) throw conflict('Hai già una verifica in attesa di revisione', 'KYC_ALREADY_PENDING')
  if (!files.front) throw badRequest('Manca il fronte del documento', 'KYC_MISSING_FILE')
  if (!files.selfie) throw badRequest('Manca il selfie', 'KYC_MISSING_FILE')
  if (input.documentType !== 'PASSPORT' && !files.back) throw badRequest('Manca il retro del documento', 'KYC_MISSING_FILE')

  const items: { kind: KycFileKind; file: UploadedFile; mime: AllowedMime }[] = []
  for (const [kind, file] of [
    ['FRONT', files.front],
    ['BACK', files.back],
    ['SELFIE', files.selfie],
  ] as const) {
    if (!file) continue
    const mime = detectMime(file.buffer)
    if (!mime) throw badRequest(`Formato non supportato (${kind}): usa JPEG, PNG, WEBP, HEIC o PDF`, 'KYC_INVALID_FILE')
    if (kind === 'SELFIE' && !isImage(mime)) throw badRequest('Il selfie deve essere una foto', 'KYC_INVALID_FILE')
    items.push({ kind, file, mime })
  }

  const now = new Date()
  const provider = activeProvider()
  const submission = await prisma.kycSubmission.create({
    data: {
      userId: user.id,
      documentType: input.documentType,
      documentNumberLast4: input.documentNumberLast4,
      provider: provider.name,
      consentAt: now,
    },
  })

  const written: string[] = []
  try {
    for (const it of items) {
      const fileId = `kf_${randomToken(18)}` // id non indovinabile, generato prima per legarlo al ciphertext (AAD)
      const key = `kyc/${user.id}/${submission.id}/${fileId}.bin`
      const enc = encryptAesGcm(env.kycKey, it.file.buffer, aadFor(fileId))
      await storage().put(key, enc.ciphertext)
      written.push(key)
      await prisma.kycFile.create({
        data: {
          id: fileId,
          submissionId: submission.id,
          kind: it.kind,
          storageKey: key,
          iv: enc.iv,
          authTag: enc.authTag,
          mime: it.mime,
          sizeBytes: it.file.size,
          sha256: sha256Hex(it.file.buffer),
        },
      })
    }
  } catch (err) {
    // niente documenti orfani: rollback di storage e record
    await Promise.allSettled(written.map((k) => storage().delete(k)))
    await prisma.kycSubmission.delete({ where: { id: submission.id } }).catch(() => undefined)
    throw err
  }

  const ref = await provider.onSubmitted({ id: submission.id, userId: user.id })
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING', kycConsentAt: now } }),
    ...(ref.providerRef ? [prisma.kycSubmission.update({ where: { id: submission.id }, data: { providerRef: ref.providerRef } })] : []),
    prisma.auditLog.create({
      data: { actorId: user.id, action: 'kyc.submit', entity: 'KycSubmission', entityId: submission.id, ip: meta.ip ?? null },
    }),
  ])
  const full = await prisma.kycSubmission.findUniqueOrThrow({ where: { id: submission.id }, include: { files: true } })
  logger.info({ userId: user.id, submissionId: submission.id }, 'KYC inviato')
  return toKycDto(full)
}

export async function mine(userId: string) {
  const s = await prisma.kycSubmission.findFirst({ where: { userId }, orderBy: { submittedAt: 'desc' }, include: { files: true } })
  return s ? toKycDto(s) : null
}

export async function queue(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const rows = await prisma.kycSubmission.findMany({
    where: status ? { status } : {},
    orderBy: { submittedAt: status === 'PENDING' || !status ? 'asc' : 'desc' },
    include: { files: true, user: { select: { id: true, nickname: true, firstName: true, lastName: true, email: true } } },
    take: 500,
  })
  return rows.map((r) => ({ ...toKycDto(r), user: r.user }))
}

// ── URL firmati ────────────────────────────────────────────────────────────

const sign = (fileId: string, exp: number, actorId: string) => hmacHex(signingKey, `${fileId}.${exp}.${actorId}`)

export async function issueFileUrl(
  actor: User,
  submissionId: string,
  fileId: string,
  baseUrl: string,
  meta: { ip?: string; userAgent?: string },
) {
  const file = await prisma.kycFile.findFirst({ where: { id: fileId, submissionId } })
  if (!file) {
    const sub = await prisma.kycSubmission.findUnique({ where: { id: submissionId } })
    if (sub?.filesPurgedAt) throw gone('Documenti cancellati per scadenza della conservazione', 'KYC_FILES_PURGED')
    throw notFound('File non trovato')
  }
  const exp = Math.floor(Date.now() / 1000) + env.KYC_URL_TTL_SECONDS
  await prisma.kycAccessLog.create({
    data: { submissionId, fileId, actorId: actor.id, action: 'URL_ISSUED', ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 255) ?? null },
  })
  const qs = new URLSearchParams({ exp: String(exp), a: actor.id, sig: sign(fileId, exp, actor.id) })
  return { url: `${baseUrl}/api/v1/kyc/files/${encodeURIComponent(fileId)}?${qs}`, expiresAt: new Date(exp * 1000).toISOString() }
}

/** Serve il file decifrato se la firma è valida e non scaduta (link aperto dal browser dell'admin). */
export async function readSignedFile(fileId: string, q: { exp?: string; a?: string; sig?: string }, meta: { ip?: string; userAgent?: string }) {
  const exp = Number(q.exp)
  if (!q.sig || !q.a || !Number.isFinite(exp)) throw forbidden('Link non valido', 'INVALID_SIGNATURE')
  if (!safeEqual(q.sig, sign(fileId, exp, q.a))) throw forbidden('Link non valido', 'INVALID_SIGNATURE')
  if (exp < Math.floor(Date.now() / 1000)) throw forbidden('Link scaduto', 'LINK_EXPIRED')
  const actor = await prisma.user.findUnique({ where: { id: q.a } })
  if (!actor || actor.role !== 'ADMIN' || actor.disabledAt) throw forbidden('Accesso non consentito', 'FORBIDDEN')
  const file = await prisma.kycFile.findUnique({ where: { id: fileId } })
  if (!file) throw gone('Documento non più disponibile', 'KYC_FILES_PURGED')
  const ciphertext = await storage().get(file.storageKey)
  const plain = decryptAesGcm(env.kycKey, { ciphertext, iv: file.iv, authTag: file.authTag }, aadFor(file.id))
  if (sha256Hex(plain) !== file.sha256) throw new Error('Integrità documento KYC non verificata')
  await prisma.kycAccessLog.create({
    data: {
      submissionId: file.submissionId,
      fileId: file.id,
      actorId: actor.id,
      action: 'FILE_SERVED',
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  })
  return { body: plain, mime: file.mime, kind: file.kind }
}

// ── Revisione ──────────────────────────────────────────────────────────────

export async function review(actor: User | null, id: string, decision: 'APPROVED' | 'REJECTED', reason: string | null | undefined, ip?: string) {
  const sub = await prisma.kycSubmission.findUnique({ where: { id } })
  if (!sub) throw notFound('Verifica non trovata')
  if (sub.status !== 'PENDING') throw conflict('Verifica già revisionata', 'KYC_ALREADY_REVIEWED')
  const now = new Date()
  const [updated] = await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id },
      data: {
        status: decision,
        reviewedAt: now,
        reviewerId: actor?.id ?? null,
        rejectionReason: decision === 'REJECTED' ? reason?.trim() || 'Documento non leggibile o non valido' : null,
      },
      include: { files: true },
    }),
    prisma.user.update({ where: { id: sub.userId }, data: { kycStatus: decision } }),
    prisma.kycAccessLog.create({ data: { submissionId: id, actorId: actor?.id ?? null, action: actor ? 'REVIEWED' : 'PROVIDER_WEBHOOK', ip: ip ?? null } }),
    prisma.auditLog.create({
      data: { actorId: actor?.id ?? null, action: `kyc.${decision.toLowerCase()}`, entity: 'KycSubmission', entityId: id, ip: ip ?? null },
    }),
  ])
  return toKycDto(updated)
}

// ── Webhook provider ───────────────────────────────────────────────────────

export async function handleProviderWebhook(providerName: string, raw: Buffer, headers: IncomingHttpHeaders) {
  const provider = providerByName(providerName)
  if (!provider || provider.name === 'MANUAL') throw notFound('Provider sconosciuto')
  const outcome = provider.parseWebhook(raw, headers)
  const seen = await prisma.webhookEvent.findUnique({ where: { id: outcome.eventId } })
  if (seen) return { ok: true, duplicate: true }
  await prisma.webhookEvent.create({ data: { id: outcome.eventId, provider: provider.name, type: outcome.decision ?? 'event' } })
  if (!outcome.decision) return { ok: true }
  const sub = await prisma.kycSubmission.findFirst({
    where: { OR: [{ providerRef: outcome.submissionRef }, { id: outcome.submissionRef }] },
  })
  if (!sub) {
    logger.warn({ provider: provider.name }, 'webhook KYC: submission non trovata')
    return { ok: true }
  }
  if (sub.status === 'PENDING') await review(null, sub.id, outcome.decision, outcome.reason)
  return { ok: true }
}

// ── Retention ──────────────────────────────────────────────────────────────

/**
 * Cancella i documenti delle verifiche concluse da più di KYC_RETENTION_DAYS giorni.
 * Restano solo esito, date, tipo documento e ultime 4 cifre (+ registro accessi).
 */
export async function purgeExpiredKycFiles(now = new Date(), retentionDays = env.KYC_RETENTION_DAYS) {
  const cutoff = addDays(now, -retentionDays)
  const subs = await prisma.kycSubmission.findMany({
    where: { status: { in: ['APPROVED', 'REJECTED'] }, reviewedAt: { lte: cutoff }, filesPurgedAt: null },
    include: { files: true },
    take: 200,
  })
  let files = 0
  for (const s of subs) {
    for (const f of s.files) {
      await storage().delete(f.storageKey)
      files++
    }
    await prisma.$transaction([
      prisma.kycFile.deleteMany({ where: { submissionId: s.id } }),
      prisma.kycSubmission.update({ where: { id: s.id }, data: { filesPurgedAt: now } }),
      prisma.kycAccessLog.create({ data: { submissionId: s.id, actorId: null, action: 'FILES_PURGED' } }),
    ])
  }
  if (subs.length) logger.info({ submissions: subs.length, files }, 'retention KYC: documenti cancellati')
  return { submissions: subs.length, files }
}
