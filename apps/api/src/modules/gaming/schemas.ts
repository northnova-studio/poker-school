import { z } from 'zod'

export const gamingEventInputSchema = z.object({
  kind: z.enum(['NIGHT', 'BOUNTY_1V1', 'TOURNAMENT']),
  game: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(''),
  startsAt: z.iso.datetime({ offset: true }),
  hostUserId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(1000).nullish(),
  // mai premi in denaro (vincoli Decreto Dignità): solo premi formativi/simbolici
  prize: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .refine((v) => !v || !/[€$£]|\beur(o|i)?\b|denaro|contanti|cash prize/i.test(v), { message: 'niente premi in denaro' }),
})

export const gamingResultsSchema = z.object({
  results: z
    .array(
      z.object({
        userId: z.string().min(1),
        points: z.number().int().min(0).max(10_000).default(0),
        won: z.boolean().default(false),
        bountyClaimed: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(200),
})
