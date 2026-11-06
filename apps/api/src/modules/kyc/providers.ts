// Adapter dei provider di verifica identità.
// - MANUAL (default): i documenti caricati vengono revisionati da un admin nel gestionale.
// - VERIFF / SUMSUB / DIDIT: STUB documentati. Implementano la verifica della firma del
//   webhook e la normalizzazione dell'esito; la creazione della sessione di verifica presso
//   il provider (SDK/redirect) va completata con le credenziali reali (vedi docs/SECURITY.md).
//   Formati di header/payload da riverificare sulla documentazione ufficiale prima del go-live.
import type { IncomingHttpHeaders } from 'node:http'
import { env } from '../../config/env.js'
import { hmacHex, safeEqual } from '../../lib/crypto.js'
import { logger } from '../../lib/logger.js'
import { badRequest, unauthorized, unavailable } from '../../lib/errors.js'

export type ProviderName = 'MANUAL' | 'VERIFF' | 'SUMSUB' | 'DIDIT'

export interface WebhookOutcome {
  eventId: string // per l'idempotenza
  submissionRef: string // providerRef o id della submission (vendor data)
  decision: 'APPROVED' | 'REJECTED' | null // null = evento intermedio, nessun cambio di stato
  reason?: string
}

export interface KycProviderAdapter {
  readonly name: ProviderName
  /** Chiamato dopo il salvataggio della submission; può restituire il riferimento del provider. */
  onSubmitted(sub: { id: string; userId: string }): Promise<{ providerRef?: string }>
  /** Verifica la firma e normalizza il payload del webhook. Lancia 401 se la firma non è valida. */
  parseWebhook(raw: Buffer, headers: IncomingHttpHeaders): WebhookOutcome
}

const header = (h: IncomingHttpHeaders, name: string) => {
  const v = h[name.toLowerCase()]
  return Array.isArray(v) ? v[0] : v
}

function requireSecret(): string {
  if (!env.KYC_WEBHOOK_SECRET) throw unavailable('Webhook KYC non configurato (KYC_WEBHOOK_SECRET)', 'KYC_WEBHOOK_NOT_CONFIGURED')
  return env.KYC_WEBHOOK_SECRET
}

function verifyHmac(raw: Buffer, signature: string | undefined) {
  const expected = hmacHex(requireSecret(), raw)
  if (!signature || !safeEqual(signature.toLowerCase(), expected)) throw unauthorized('Firma webhook non valida', 'INVALID_SIGNATURE')
}

function json(raw: Buffer): Record<string, any> {
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    throw badRequest('Payload webhook non valido', 'INVALID_PAYLOAD')
  }
}

export const manualProvider: KycProviderAdapter = {
  name: 'MANUAL',
  async onSubmitted() {
    return {}
  },
  parseWebhook() {
    throw badRequest('Il provider MANUAL non riceve webhook', 'NO_WEBHOOK')
  },
}

/** Veriff — header X-HMAC-SIGNATURE = HMAC-SHA256(body, shared secret) in hex. */
export const veriffProvider: KycProviderAdapter = {
  name: 'VERIFF',
  async onSubmitted(sub) {
    // TODO(go-live): POST https://stationapi.veriff.com/v1/sessions con vendorData = sub.id,
    // salvare verification.id come providerRef e restituire l'URL di verifica al frontend.
    logger.warn({ submissionId: sub.id }, 'Veriff: creazione sessione non implementata (stub)')
    return {}
  },
  parseWebhook(raw, headers) {
    verifyHmac(raw, header(headers, 'x-hmac-signature'))
    const body = json(raw)
    const v = body.verification ?? {}
    const status = String(v.status ?? '')
    return {
      eventId: `veriff:${v.id}:${status}`,
      submissionRef: String(v.vendorData ?? v.id ?? ''),
      decision: status === 'approved' ? 'APPROVED' : status === 'declined' ? 'REJECTED' : null,
      reason: v.reason ?? undefined,
    }
  },
}

/** Sumsub — header X-Payload-Digest = HMAC-SHA256(body, secret) in hex (alg in X-Payload-Digest-Alg). */
export const sumsubProvider: KycProviderAdapter = {
  name: 'SUMSUB',
  async onSubmitted(sub) {
    // TODO(go-live): creare l'applicant con externalUserId = sub.id e generare l'access token per il WebSDK.
    logger.warn({ submissionId: sub.id }, 'Sumsub: creazione applicant non implementata (stub)')
    return {}
  },
  parseWebhook(raw, headers) {
    const alg = header(headers, 'x-payload-digest-alg') ?? 'HMAC_SHA256_HEX'
    if (alg !== 'HMAC_SHA256_HEX') throw unauthorized('Algoritmo di firma non supportato', 'INVALID_SIGNATURE')
    verifyHmac(raw, header(headers, 'x-payload-digest'))
    const body = json(raw)
    const answer = body.reviewResult?.reviewAnswer
    return {
      eventId: `sumsub:${body.applicantId}:${body.type}:${body.createdAtMs ?? body.createdAt ?? ''}`,
      submissionRef: String(body.externalUserId ?? body.applicantId ?? ''),
      decision: body.type === 'applicantReviewed' ? (answer === 'GREEN' ? 'APPROVED' : answer === 'RED' ? 'REJECTED' : null) : null,
      reason: body.reviewResult?.moderationComment ?? undefined,
    }
  },
}

/** Didit — header X-Signature = HMAC-SHA256(body, webhook secret) in hex. */
export const diditProvider: KycProviderAdapter = {
  name: 'DIDIT',
  async onSubmitted(sub) {
    // TODO(go-live): creare la sessione di verifica con vendor_data = sub.id e restituire il link.
    logger.warn({ submissionId: sub.id }, 'Didit: creazione sessione non implementata (stub)')
    return {}
  },
  parseWebhook(raw, headers) {
    verifyHmac(raw, header(headers, 'x-signature'))
    const body = json(raw)
    const status = String(body.status ?? '')
    return {
      eventId: `didit:${body.session_id}:${status}`,
      submissionRef: String(body.vendor_data ?? body.session_id ?? ''),
      decision: status === 'Approved' ? 'APPROVED' : status === 'Declined' ? 'REJECTED' : null,
      reason: body.decision?.reason ?? undefined,
    }
  },
}

const ADAPTERS: Record<ProviderName, KycProviderAdapter> = {
  MANUAL: manualProvider,
  VERIFF: veriffProvider,
  SUMSUB: sumsubProvider,
  DIDIT: diditProvider,
}

export const activeProvider = () => ADAPTERS[env.KYC_PROVIDER]
export const providerByName = (name: string) => ADAPTERS[name.toUpperCase() as ProviderName] ?? null
