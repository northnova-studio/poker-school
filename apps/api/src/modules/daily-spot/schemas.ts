import { z } from 'zod'

export const answerSchema = z.object({ optionId: z.string().min(1).max(64) })

export const dailySpotCreateSchema = z
  .object({
    date: z.iso.date(),
    format: z.enum(['MTT', 'SPIN', 'CASH']),
    title: z.string().trim().min(3).max(120),
    situation: z.string().trim().min(3).max(2000),
    heroCards: z.string().trim().min(2).max(20),
    board: z
      .string()
      .trim()
      .max(20)
      .nullish()
      .transform((v) => v || null),
    stacksBb: z.string().trim().max(120),
    options: z
      .array(z.object({ id: z.string().trim().min(1).max(64), label: z.string().trim().min(1).max(200) }))
      .min(2)
      .max(6),
    coachId: z.string().min(1),
    correctOptionId: z.string().min(1),
    explanation: z.string().trim().min(3).max(4000),
  })
  .refine((v) => new Set(v.options.map((o) => o.id)).size === v.options.length, { message: 'id opzioni duplicati', path: ['options'] })
  .refine((v) => v.options.some((o) => o.id === v.correctOptionId), { message: 'correctOptionId non è tra le opzioni', path: ['correctOptionId'] })
