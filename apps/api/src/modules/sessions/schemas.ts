import { z } from 'zod'

const money = z.number().finite().min(-10_000_000).max(10_000_000)

export const sessionInputSchema = z.object({
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
  format: z.enum(['MTT', 'SPIN', 'CASH']),
  durationMin: z.number().int().min(0).max(24 * 60),
  games: z.number().int().min(0).max(100_000),
  hands: z.number().int().min(0).max(10_000_000).nullish(),
  // estensione facoltativa (non nel contratto, stesso nome del mock): tornei chiusi a premio
  itm: z.number().int().min(0).max(100_000).nullish(),
  avgBuyIn: money.min(0),
  totalBuyIns: money.min(0),
  totalCashes: money.min(0),
  profit: money,
  chipEvBb100: z.number().finite().nullish(),
  bbWon: z.number().finite().nullish(),
  tilt: z.number().int().min(1).max(5),
  badBeats: z.number().int().min(0).max(10_000).default(0),
  bubbles: z.number().int().min(0).max(10_000).default(0),
  deepRun: z.boolean().default(false),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  staked: z.boolean().default(false),
})
