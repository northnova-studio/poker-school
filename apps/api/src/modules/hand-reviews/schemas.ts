import { z } from 'zod'

export const handReviewInputSchema = z.object({
  format: z.enum(['MTT', 'SPIN', 'CASH']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  handHistory: z.string().trim().min(10).max(20_000),
})

export const replySchema = z.object({ comment: z.string().trim().min(1).max(8000) })
