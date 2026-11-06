import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { authRouter } from './modules/auth/routes.js'
import { kycAdminRouter, kycRouter } from './modules/kyc/routes.js'
import { publicRouter } from './modules/public/routes.js'
import { billingRouter } from './modules/billing/routes.js'
import { coursesRouter } from './modules/courses/routes.js'
import { lessonsRouter } from './modules/lessons/routes.js'
import { sessionsRouter } from './modules/sessions/routes.js'
import { statsRouter } from './modules/stats/routes.js'
import { rankRouter } from './modules/rank/routes.js'
import { cardsRouter } from './modules/cards/routes.js'
import { dailySpotRouter } from './modules/daily-spot/routes.js'
import { roastRouter } from './modules/roast/routes.js'
import { deepRunsRouter } from './modules/deep-runs/routes.js'
import { gamingRouter } from './modules/gaming/routes.js'
import { handReviewsRouter } from './modules/hand-reviews/routes.js'
import { adminRouter } from './modules/admin/routes.js'
import { stakingRouter } from './modules/staking/routes.js'
import { financeRouter } from './modules/finance/routes.js'

export const API_PREFIX = '/api/v1'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY)

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req) => ({ method: req.method, url: String(req.url).replace(/sig=[^&]+/, 'sig=[redacted]') }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  )
  app.use(helmet())

  // CORS con allowlist (CORS_ORIGINS). Le richieste senza Origin (curl, webhook) passano.
  const allowed = new Set(env.corsOrigins)
  app.use(
    cors({
      origin: (origin, cb) => (!origin || allowed.has(origin) ? cb(null, true) : cb(new Error('CORS_NOT_ALLOWED'))),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  )

  // Webhook: corpo RAW per la verifica della firma (prima del parser JSON)
  app.use(`${API_PREFIX}/billing/webhook`, express.raw({ type: '*/*', limit: '1mb' }))
  app.use(`${API_PREFIX}/kyc/webhook`, express.raw({ type: '*/*', limit: '1mb' }))
  app.use(express.json({ limit: '200kb' }))

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'ok', time: new Date().toISOString() })
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' })
    }
  })
  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: 'ok', payments: env.stripeEnabled, video: env.bunnyEnabled, kycProvider: env.KYC_PROVIDER })
  })

  for (const r of [
    authRouter,
    kycRouter,
    kycAdminRouter,
    publicRouter,
    billingRouter,
    coursesRouter,
    lessonsRouter,
    sessionsRouter,
    statsRouter,
    rankRouter,
    cardsRouter,
    dailySpotRouter,
    roastRouter,
    deepRunsRouter,
    gamingRouter,
    handReviewsRouter,
    adminRouter,
    stakingRouter,
    financeRouter,
  ])
    app.use(API_PREFIX, r)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
