// Variabili d'ambiente validate con zod all'avvio. In produzione mancano i default
// "di sviluppo": se una variabile obbligatoria non c'è il processo non parte.
import 'dotenv/config'
import { z } from 'zod'

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .optional()
    .transform((v) => (v === undefined ? def : ['true', '1', 'yes'].includes(v)))

const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  DATABASE_URL: z.string().min(1),

  // URL pubblico di questa API (per URL firmati KYC e fallback video). Es. https://api.tris.poker
  PUBLIC_API_URL: optionalStr,
  // URL del frontend (redirect di Stripe Checkout). Es. https://northnova-studio.github.io/poker-school
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('https://northnova-studio.github.io,http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  RATE_LIMIT_ENABLED: bool(true),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10), // per 15 minuti per IP
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().default(5), // per ora per IP

  LEGAL_TERMS_VERSION: z.string().default('2026-11'),
  LEGAL_PRIVACY_VERSION: z.string().default('2026-11'),

  // KYC
  KYC_ENC_KEY: z.string().min(1), // 32 byte in base64 (openssl rand -base64 32)
  KYC_URL_SIGNING_SECRET: optionalStr, // se assente: derivata via HKDF da KYC_ENC_KEY
  KYC_URL_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  KYC_RETENTION_DAYS: z.coerce.number().int().min(0).default(30),
  KYC_PROVIDER: z.enum(['MANUAL', 'VERIFF', 'SUMSUB', 'DIDIT']).default('MANUAL'),
  KYC_WEBHOOK_SECRET: optionalStr,
  KYC_MAX_FILE_MB: z.coerce.number().positive().max(20).default(8),

  // Storage documenti: local (dev) | s3 (Cloudflare R2 / S3 compatibile)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: optionalStr, // R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: optionalStr,
  S3_ACCESS_KEY_ID: optionalStr,
  S3_SECRET_ACCESS_KEY: optionalStr,
  S3_FORCE_PATH_STYLE: bool(true),

  // Stripe (opzionale): senza STRIPE_SECRET_KEY i pagamenti sono disattivati
  STRIPE_SECRET_KEY: optionalStr,
  STRIPE_WEBHOOK_SECRET: optionalStr,
  STRIPE_PRICE_BASE_MONTH: optionalStr,
  STRIPE_PRICE_BASE_YEAR: optionalStr,
  STRIPE_PRICE_PRO_MONTH: optionalStr,
  STRIPE_PRICE_PRO_YEAR: optionalStr,
  STRIPE_PRICE_ELITE_MONTH: optionalStr,
  STRIPE_PRICE_ELITE_YEAR: optionalStr,

  // Prezzi piani in euro (listino provvisorio, sovrascrivibile)
  PLAN_BASE_MONTHLY: z.coerce.number().positive().default(39),
  PLAN_BASE_YEARLY: z.coerce.number().positive().default(390),
  PLAN_PRO_MONTHLY: z.coerce.number().positive().default(89),
  PLAN_PRO_YEARLY: z.coerce.number().positive().default(890),
  PLAN_ELITE_MONTHLY: z.coerce.number().positive().default(249),
  PLAN_ELITE_YEARLY: z.coerce.number().positive().default(2490),

  // Video: Bunny Stream (opzionale)
  BUNNY_STREAM_LIBRARY_ID: optionalStr,
  BUNNY_STREAM_TOKEN_KEY: optionalStr,
  BUNNY_STREAM_EMBED_HOST: z.string().default('https://iframe.mediadelivery.net'),
  VIDEO_URL_TTL_SECONDS: z.coerce.number().int().positive().default(7200),

  // Job pianificati (retention KYC, rollover stagioni)
  JOBS_ENABLED: bool(true),

  // Seed
  ADMIN_EMAIL: optionalStr,
  ADMIN_PASSWORD: optionalStr,
})

const DEV_DEFAULTS: Record<string, string> = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/poker_school',
  JWT_ACCESS_SECRET: 'dev-only-jwt-secret-change-me-0123456789abcdef',
  // 32 byte di zeri: SOLO sviluppo
  KYC_ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
}

function load() {
  const raw = { ...process.env }
  const isProd = raw.NODE_ENV === 'production'
  if (!isProd) {
    for (const [k, v] of Object.entries(DEV_DEFAULTS)) if (!raw[k]) raw[k] = v
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Configurazione non valida:\n${lines}`)
  }
  const env = parsed.data
  const key = Buffer.from(env.KYC_ENC_KEY, 'base64')
  if (key.length !== 32) throw new Error('KYC_ENC_KEY deve essere di 32 byte codificati in base64 (openssl rand -base64 32)')
  if (isProd) {
    if (env.JWT_ACCESS_SECRET === DEV_DEFAULTS.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET di sviluppo in produzione')
    if (env.KYC_ENC_KEY === DEV_DEFAULTS.KYC_ENC_KEY) throw new Error('KYC_ENC_KEY di sviluppo in produzione')
    if (env.STORAGE_DRIVER === 'local')
      console.warn('[config] STORAGE_DRIVER=local in produzione: i documenti KYC finiscono sul disco del container (usa s3/R2)')
  }
  if (env.STORAGE_DRIVER === 's3' && (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY))
    throw new Error('STORAGE_DRIVER=s3 richiede S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (e S3_ENDPOINT per R2)')
  return {
    ...env,
    isProd,
    isTest: env.NODE_ENV === 'test',
    kycKey: key,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
    stripeEnabled: Boolean(env.STRIPE_SECRET_KEY),
    bunnyEnabled: Boolean(env.BUNNY_STREAM_LIBRARY_ID && env.BUNNY_STREAM_TOKEN_KEY),
  }
}

export const env = load()
export type Env = typeof env
