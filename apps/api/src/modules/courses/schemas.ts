import { z } from 'zod'

export const courseFiltersSchema = z.object({
  format: z.enum(['MTT', 'SPIN', 'CASH', 'MENTAL', 'ALL']).optional(),
  level: z.enum(['MICRO', 'LOW', 'MID', 'HIGH']).optional(),
  q: z.string().trim().max(100).optional(),
})

export const grantPurchaseSchema = z.object({
  courseId: z.string().min(1),
  amountEur: z.number().min(0).max(100000).optional(),
  provider: z.enum(['MANUAL', 'DEMO']).optional(),
})
