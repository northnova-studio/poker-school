import { z } from 'zod'

export const playerFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  format: z.enum(['MTT', 'SPIN', 'CASH']).optional(),
  plan: z.enum(['base', 'pro', 'elite']).optional(),
  kycStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  staked: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z.enum(['profit30d', 'profitAll', 'volume30d', 'joinedAt', 'nickname']).optional(),
  // extra: paginazione facoltativa
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const playerPatchSchema = z.object({
  role: z.enum(['STUDENT', 'COACH', 'ADMIN']).optional(),
  plan: z.enum(['base', 'pro', 'elite']).nullable().optional(),
  coachId: z.string().min(1).nullable().optional(),
  mainLevel: z.enum(['MICRO', 'LOW', 'MID', 'HIGH']).optional(),
})

export const noteSchema = z.object({ text: z.string().trim().min(1).max(4000) })
