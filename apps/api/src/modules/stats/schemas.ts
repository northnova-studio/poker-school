import { z } from 'zod'

export const statsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'ytd', 'all']).default('30d'),
  format: z.enum(['MTT', 'SPIN', 'CASH', 'ALL']).default('ALL'),
})
