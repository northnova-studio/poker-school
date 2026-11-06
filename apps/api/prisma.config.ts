// Configurazione Prisma CLI (Prisma 7): l'URL del DB non sta più nello schema.
// Prisma 7 non carica .env da solo → dotenv/config.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` non richiede un DB: placeholder se DATABASE_URL non è impostata
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
})
