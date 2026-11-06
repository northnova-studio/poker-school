import { z } from 'zod'

export const lessonRangeSchema = z.object({
  from: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  to: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
})

const url = z
  .url()
  .max(500)
  .nullish()
  .transform((v) => v ?? null)

export const groupLessonInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000),
  format: z.enum(['MTT', 'SPIN', 'CASH', 'MENTAL']),
  level: z.enum(['MICRO', 'LOW', 'MID', 'HIGH']),
  coachId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  durationMin: z.number().int().min(15).max(600),
  capacity: z.number().int().min(1).max(1000),
  minPlan: z.enum(['base', 'pro', 'elite']),
  meetingUrl: url,
})

export const groupLessonPatchSchema = groupLessonInputSchema.partial().extend({ recordingUrl: url.optional() })

export const attendanceSchema = z.object({ userIds: z.array(z.string().min(1)).max(500) })
