import { z } from 'zod'

const dateish = z.iso.datetime({ offset: true }).or(z.iso.date())

export const rangeSchema = z.object({ from: dateish.optional(), to: dateish.optional() })

export const TX_CATEGORIES = [
  'MEMBERSHIP',
  'COURSE',
  'GROUP_LESSON',
  'COACHING_1V1',
  'STAKING',
  'SPONSOR',
  'TOOLS',
  'HOSTING',
  'MARKETING',
  'VIDEO_PRODUCTION',
  'COACH_PAYOUT',
  'TRAVEL',
  'KYC',
  'FEES',
  'TAXES',
  'OTHER',
] as const

export const transactionInputSchema = z.object({
  date: dateish,
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(TX_CATEGORIES),
  amount: z.number().positive().max(10_000_000),
  description: z.string().trim().min(1).max(500),
  userId: z.string().min(1).nullish(),
})
