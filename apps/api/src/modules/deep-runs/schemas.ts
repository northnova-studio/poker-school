import { z } from 'zod'

export const deepRunListSchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

export const deepRunInputSchema = z
  .object({
    tournamentName: z.string().trim().min(2).max(120),
    buyIn: z.number().min(0).max(1_000_000),
    playersLeft: z.number().int().min(1).max(1_000_000),
    totalPlayers: z.number().int().min(2).max(1_000_000),
    stackBb: z.number().min(0).max(100_000),
  })
  .refine((v) => v.playersLeft <= v.totalPlayers, { message: 'playersLeft non può superare totalPlayers', path: ['playersLeft'] })

export const deepRunPatchSchema = z.object({
  playersLeft: z.number().int().min(1).max(1_000_000).optional(),
  stackBb: z.number().min(0).max(100_000).optional(),
  status: z.enum(['LIVE', 'FINAL_TABLE', 'BUSTED', 'WON']).optional(),
  finishPosition: z.number().int().min(1).max(1_000_000).nullish(),
})

export const commentSchema = z.object({ text: z.string().trim().min(1).max(500) })
