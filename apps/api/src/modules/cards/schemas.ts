import { z } from 'zod'

const attr = z.number().int().min(40).max(99)

export const cardUpdateSchema = z.object({
  attributes: z.object({ pre: attr, post: attr, icm: attr, agg: attr, men: attr, vol: attr }),
  mainFormat: z.enum(['MTT', 'SPIN', 'CASH']).optional(),
})
