// Job pianificati in-process (un'istanza). Con più repliche: eseguirli da un cron esterno
// (es. Railway Cron / Render Cron Job) con `npm run job:kyc-retention` / `npm run job:season`.
import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { purgeExpiredKycFiles } from '../modules/kyc/service.js'
import { ensureCurrentSeason } from '../modules/rank/service.js'

const HOUR = 3600_000

async function run(name: string, fn: () => Promise<unknown>) {
  try {
    const out = await fn()
    logger.debug({ job: name, out }, 'job completato')
  } catch (err) {
    logger.error({ err, job: name }, 'job fallito')
  }
}

export function startJobs() {
  if (!env.JOBS_ENABLED) return () => undefined
  const timers = [
    setInterval(() => void run('kyc-retention', () => purgeExpiredKycFiles()), 6 * HOUR),
    setInterval(() => void run('season-rollover', () => ensureCurrentSeason()), HOUR),
  ]
  // primo giro poco dopo l'avvio
  const boot = setTimeout(() => {
    void run('kyc-retention', () => purgeExpiredKycFiles())
    void run('season-rollover', () => ensureCurrentSeason())
  }, 10_000)
  for (const t of [...timers, boot]) t.unref()
  logger.info('job pianificati avviati (retention KYC, rollover stagioni)')
  return () => {
    timers.forEach(clearInterval)
    clearTimeout(boot)
  }
}
