import { z } from 'zod'

export const voteSchema = z.object({ kind: z.enum(['WORST', 'BEST']) })

export const roastSubmitSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(4000),
  format: z.enum(['MTT', 'SPIN', 'CASH']),
  heroCards: z.string().trim().min(2).max(20),
  board: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v || null),
  isMyOwnHand: z.boolean(),
  confirmAnonymized: z.boolean(),
})

export const roastModerationSchema = z.object({
  founderComment: z.string().trim().max(1000).nullish(),
  hidden: z.boolean().optional(),
})
