// Ricrea lo schema del DB di test applicando le migration SQL (una volta per run).
import { applyMigrations } from '../scripts/apply-migrations.js'

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL non impostata (vedi .env.test.example)')
  if (!/test/i.test(url)) throw new Error(`Per sicurezza il DB di test deve contenere "test" nel nome: ${url}`)
  await applyMigrations(url, { reset: true })
}
