import { z } from 'zod'

export const publicLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
})
