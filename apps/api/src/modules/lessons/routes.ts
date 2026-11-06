import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, optionalAuth, requireAuth, staffOnly } from '../../middleware/auth.js'
import { attendanceSchema, groupLessonInputSchema, groupLessonPatchSchema, lessonRangeSchema } from './schemas.js'
import * as svc from './service.js'

export const lessonsRouter = Router()

// Calendario pubblico; il link della call è visibile solo ai prenotati e allo staff
lessonsRouter.get('/lessons', optionalAuth, async (req, res) => {
  res.json(await svc.listLessons(req.user, parse(lessonRangeSchema, req.query)))
})

lessonsRouter.post('/lessons/:id/book', requireAuth, async (req, res) => {
  res.json(await svc.book(me(req), param(req, 'id')))
})

lessonsRouter.delete('/lessons/:id/book', requireAuth, async (req, res) => {
  res.json(await svc.cancel(me(req), param(req, 'id')))
})

// ── Admin / coach ──────────────────────────────────────────────────────────
lessonsRouter.post('/admin/lessons', ...staffOnly, async (req, res) => {
  res.status(201).json(await svc.createLesson(me(req), parse(groupLessonInputSchema, req.body)))
})

lessonsRouter.patch('/admin/lessons/:id', ...staffOnly, async (req, res) => {
  res.json(await svc.updateLesson(me(req), param(req, 'id'), parse(groupLessonPatchSchema, req.body)))
})

lessonsRouter.delete('/admin/lessons/:id', ...staffOnly, async (req, res) => {
  await svc.removeLesson(param(req, 'id'))
  res.status(204).end()
})

// Extra (non nel contratto): presenze → XP LESSON_ATTENDED
lessonsRouter.post('/admin/lessons/:id/attendance', ...staffOnly, async (req, res) => {
  const { userIds } = parse(attendanceSchema, req.body)
  res.json(await svc.markAttendance(me(req), param(req, 'id'), userIds))
})
