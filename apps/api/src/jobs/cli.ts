// Esecuzione manuale/cron dei job: node dist/src/jobs/cli.js kyc-retention|season
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import { purgeExpiredKycFiles } from '../modules/kyc/service.js'
import { ensureCurrentSeason } from '../modules/rank/service.js'

const job = process.argv[2]

async function main() {
  if (job === 'kyc-retention') logger.info(await purgeExpiredKycFiles(), 'retention KYC eseguita')
  else if (job === 'season') logger.info({ season: (await ensureCurrentSeason()).name }, 'stagione corrente verificata')
  else {
    console.error('Uso: jobs/cli <kyc-retention|season>')
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    logger.error({ err }, 'job fallito')
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
