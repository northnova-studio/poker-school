import { createRequire } from 'node:module'
import { pino } from 'pino'
import { env } from '../config/env.js'

// Output leggibile solo in sviluppo e solo se pino-pretty (devDependency) è installato
function prettyAvailable() {
  if (env.isProd || env.isTest) return false
  try {
    createRequire(import.meta.url).resolve('pino-pretty')
    return true
  } catch {
    return false
  }
}

// Redazione di segreti e dati personali dai log (GDPR: minimizzazione anche nei log).
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'tris-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["stripe-signature"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.accessToken',
      '*.birthDate',
      '*.documentNumberLast4',
    ],
    censor: '[redacted]',
  },
  ...(prettyAvailable() ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } } : {}),
})
