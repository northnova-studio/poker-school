// Applica le migration SQL di prisma/migrations senza lo Schema Engine di Prisma.
// Usato dai test (reset del DB di test) e come ripiego dove il binario di Prisma non è
// scaricabile (rete con egress limitato). Registra le migration in _prisma_migrations
// con lo stesso formato di Prisma (checksum SHA-256 del file), quindi un successivo
// `prisma migrate deploy` le riconosce come già applicate.
//
// Uso: tsx scripts/apply-migrations.ts [--reset]   (DATABASE_URL dall'ambiente / .env)
import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prisma/migrations')

export async function applyMigrations(databaseUrl: string, opts: { reset?: boolean; log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => undefined)
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    if (opts.reset) {
      await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
      log('schema public ricreato')
    }
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`)
    const applied = new Set(
      (await client.query<{ migration_name: string }>('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows.map(
        (r) => r.migration_name,
      ),
    )
    const dirs = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
    let count = 0
    for (const name of dirs) {
      if (applied.has(name)) continue
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8')
      const checksum = crypto.createHash('sha256').update(sql).digest('hex')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1, $2, now(), $3, 1)',
          [crypto.randomUUID(), checksum, name],
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
      count++
      log(`migration applicata: ${name}`)
    }
    return count
  } finally {
    await client.end()
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL non impostata')
    process.exit(1)
  }
  applyMigrations(url, { reset: process.argv.includes('--reset'), log: console.log })
    .then((n) => console.log(`${n} migration applicate`))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
