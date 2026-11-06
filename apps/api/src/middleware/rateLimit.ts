import { rateLimit } from 'express-rate-limit'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'

const passthrough: RequestHandler = (_req, _res, next) => next()

const handler: RequestHandler = (_req, res) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Troppi tentativi: riprova tra qualche minuto' } })
}

// In memoria (un'istanza). Con più repliche usare uno store condiviso (es. Redis).
export const loginLimiter: RequestHandler = env.RATE_LIMIT_ENABLED
  ? rateLimit({ windowMs: 15 * 60_000, limit: env.RATE_LIMIT_LOGIN_MAX, standardHeaders: 'draft-7', legacyHeaders: false, handler })
  : passthrough

export const registerLimiter: RequestHandler = env.RATE_LIMIT_ENABLED
  ? rateLimit({ windowMs: 60 * 60_000, limit: env.RATE_LIMIT_REGISTER_MAX, standardHeaders: 'draft-7', legacyHeaders: false, handler })
  : passthrough

export const refreshLimiter: RequestHandler = env.RATE_LIMIT_ENABLED
  ? rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, handler })
  : passthrough

export const uploadLimiter: RequestHandler = env.RATE_LIMIT_ENABLED
  ? rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, handler })
  : passthrough
