import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { startJobs } from './jobs/index.js'

const app = createApp()
const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, payments: env.stripeEnabled, video: env.bunnyEnabled, storage: env.STORAGE_DRIVER },
    'API in ascolto',
  )
})
const stopJobs = startJobs()

async function shutdown(signal: string) {
  logger.info({ signal }, 'arresto in corso')
  stopJobs()
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
