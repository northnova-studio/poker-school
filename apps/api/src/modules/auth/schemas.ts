import { z } from 'zod'

export const formatEnum = z.enum(['MTT', 'SPIN', 'CASH'])
export const levelEnum = z.enum(['MICRO', 'LOW', 'MID', 'HIGH'])

const nickname = z
  .string()
  .trim()
  .min(3, 'almeno 3 caratteri')
  .max(24, 'massimo 24 caratteri')
  .regex(/^[A-Za-z0-9_.-]+$/, 'solo lettere, numeri, _ . -')

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('email non valida')).pipe(z.string().max(254)),
  password: z.string().min(8, 'la password deve avere almeno 8 caratteri').max(128),
  nickname,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato YYYY-MM-DD'),
  formats: z.array(formatEnum).min(1, 'scegli almeno un formato').max(3),
  mainLevel: levelEnum,
  discordHandle: optText(64).optional(),
  acceptTerms: z.literal(true, { error: 'devi accettare i termini' }),
  acceptPrivacy: z.literal(true, { error: "devi accettare l'informativa privacy" }),
  marketingOptIn: z.boolean().optional().default(false),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(128),
})

export const refreshSchema = z.object({ refreshToken: z.string().min(10).max(200) })
export const logoutSchema = z.object({ refreshToken: z.string().max(200).nullish() })

// Campi non previsti (es. role, plan, kycStatus) vengono scartati: non modificabili dall'utente.
export const profilePatchSchema = z.object({
  nickname: nickname.optional(),
  formats: z.array(formatEnum).min(1).max(3).optional(),
  mainLevel: levelEnum.optional(),
  discordHandle: optText(64).optional(),
  gamingTag: optText(64).optional(),
  bio: optText(500).optional(),
  shareResultsPublicly: z.boolean().optional(),
  roastOptIn: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'la password deve avere almeno 8 caratteri').max(128),
})
