import { z } from 'zod'

export const subscribeSchema = z.object({
  planId: z.enum(['base', 'pro', 'elite']),
  interval: z.enum(['month', 'year']),
})

// Extra admin: abbonamento MANUAL (bonifico, contanti, omaggio) senza Stripe
export const manualSubscriptionSchema = z.object({
  planId: z.enum(['base', 'pro', 'elite']),
  interval: z.enum(['month', 'year']),
  amountEur: z.number().min(0).max(100000).optional(),
  recordIncome: z.boolean().optional().default(true),
})
