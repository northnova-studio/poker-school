import { z } from 'zod'

// Campi testuali del multipart (i valori arrivano come stringhe)
export const kycSubmitSchema = z.object({
  documentType: z.enum(['ID_CARD', 'PASSPORT', 'DRIVING_LICENSE']),
  documentNumberLast4: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4}$/, 'servono esattamente le ultime 4 cifre/caratteri del documento')
    .transform((v) => v.toUpperCase()),
  consent: z.enum(['true', 'false']).refine((v) => v === 'true', { message: 'serve il consenso al trattamento dei dati' }),
})

export const kycQueueSchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() })

export const kycReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(500).nullish(),
})
