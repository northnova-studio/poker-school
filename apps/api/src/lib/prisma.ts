import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { env } from '../config/env.js'

export function createPrisma(url = env.DATABASE_URL) {
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = createPrisma()
export type Db = typeof prisma
