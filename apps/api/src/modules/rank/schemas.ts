import { z } from 'zod'

export const leaderboardQuerySchema = z.object({
  format: z.enum(['MTT', 'SPIN', 'CASH']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})
