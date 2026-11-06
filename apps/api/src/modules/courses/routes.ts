import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { prisma } from '../../lib/prisma.js'
import { adminOnly, me, requireAuth } from '../../middleware/auth.js'
import { publicBaseUrl } from '../kyc/routes.js'
import { courseFiltersSchema, grantPurchaseSchema } from './schemas.js'
import * as svc from './service.js'
import { placeholderHtml } from './video.js'

export const coursesRouter = Router()

coursesRouter.get('/courses', async (req, res) => {
  res.json(await svc.listCourses(parse(courseFiltersSchema, req.query)))
})

coursesRouter.get('/courses/:slug', async (req, res) => {
  res.json(await svc.getCourseBySlug(param(req, 'slug')))
})

coursesRouter.post('/courses/:courseId/checkout', requireAuth, async (req, res) => {
  res.json(await svc.checkout(me(req), param(req, 'courseId')))
})

coursesRouter.get('/me/purchases', requireAuth, async (req, res) => {
  res.json(await svc.myPurchases(me(req).id))
})

coursesRouter.get('/courses/:courseId/progress', requireAuth, async (req, res) => {
  res.json(await svc.progress(me(req), param(req, 'courseId')))
})

coursesRouter.post('/courses/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  res.json(await svc.completeLesson(me(req), param(req, 'courseId'), param(req, 'lessonId')))
})

coursesRouter.get('/courses/:courseId/lessons/:lessonId/video', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(await svc.videoAccess(me(req), param(req, 'courseId'), param(req, 'lessonId'), publicBaseUrl(req)))
})

// Pagina segnaposto quando il video non è configurato (iframe-friendly)
coursesRouter.get('/video/placeholder', async (req, res) => {
  const id = String(req.query.lesson ?? '')
  const lesson = id ? await prisma.courseLesson.findUnique({ where: { id }, select: { title: true } }) : null
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cross-Origin-Resource-Policy': 'cross-origin' })
  res.removeHeader('X-Frame-Options')
  res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *")
  res.send(placeholderHtml(lesson?.title ?? 'Lezione'))
})

// ── Admin ──────────────────────────────────────────────────────────────────
coursesRouter.get('/admin/courses/sales', ...adminOnly, async (_req, res) => {
  res.json(await svc.courseSales())
})

// Extra (non nel contratto): acquisto MANUAL senza Stripe, solo admin
coursesRouter.post('/admin/players/:userId/purchases', ...adminOnly, async (req, res) => {
  const input = parse(grantPurchaseSchema, req.body)
  res.status(201).json(await svc.grantPurchase(param(req, 'userId'), input.courseId, input.amountEur, input.provider))
})
