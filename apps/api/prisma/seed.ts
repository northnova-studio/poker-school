// Seed: `npm run prisma:seed` (sviluppo) o `node dist/prisma/seed.js` (container).
// - base (sempre): piani, badge, admin (ADMIN_EMAIL/ADMIN_PASSWORD), fondatori, coach staff, 8 corsi, stagione corrente
// - demo (SEED_DEMO=true, default solo fuori produzione): studenti, sessioni, community, staking, finanze
import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'
import { ensureCurrentSeason } from '../src/modules/rank/service.js'
import { DEV_PASSWORDS, seedBase } from './seed/base.js'
import { seedDemo } from './seed/demo.js'

async function main() {
  const { adminEmail } = await seedBase(prisma)
  const season = await ensureCurrentSeason()
  console.log(`[seed] base ok: piani, badge, corsi, fondatori; admin ${adminEmail}; ${season.name}`)
  const demo = process.env.SEED_DEMO ? process.env.SEED_DEMO === 'true' : !env.isProd
  if (demo) await seedDemo(prisma)
  if (!env.isProd)
    console.log(
      `[seed] credenziali di sviluppo → admin: ${adminEmail} / ${env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : DEV_PASSWORDS.admin}; ` +
        `fondatori: fabri|matteo|lorenzo@${process.env.SEED_EMAIL_DOMAIN || 'tris.local'} / ${process.env.SEED_FOUNDER_PASSWORD ? '(SEED_FOUNDER_PASSWORD)' : DEV_PASSWORDS.founder}`,
    )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
