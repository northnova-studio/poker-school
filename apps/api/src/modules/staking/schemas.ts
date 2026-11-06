import { z } from 'zod'

const pct = z.number().min(0).max(100)
const dateish = z.iso.datetime({ offset: true }).or(z.iso.date())

export const dealInputSchema = z.object({
  userId: z.string().min(1),
  format: z.enum(['MTT', 'SPIN', 'CASH']),
  startDate: dateish,
  schoolSharePct: pct,
  playerSharePct: pct,
  maxAbi: z.number().min(0).max(1_000_000).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  initialCapital: z.number().min(0).max(10_000_000),
})

export const dealPatchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  schoolSharePct: pct.optional(),
  playerSharePct: pct.optional(),
  maxAbi: z.number().min(0).max(1_000_000).nullish(),
  notes: z.string().trim().max(2000).nullish(),
})

export const ledgerInputSchema = z.object({
  date: dateish,
  type: z.enum(['TRANSFER_TO_PLAYER', 'RETURN_FROM_PLAYER', 'SESSION_RESULT', 'SETTLEMENT', 'ADJUSTMENT']),
  amount: z.number().finite().min(-10_000_000).max(10_000_000),
  note: z.string().trim().max(500).nullish(),
})
