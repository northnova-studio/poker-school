import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth, staffOnly } from '../../middleware/auth.js'
import { handReviewInputSchema, replySchema } from './schemas.js'
import * as svc from './service.js'

export const handReviewsRouter = Router()

handReviewsRouter.get('/me/hand-reviews', requireAuth, async (req, res) => {
  res.json(await svc.mine(me(req).id))
})

handReviewsRouter.post('/me/hand-reviews', requireAuth, async (req, res) => {
  res.status(201).json(await svc.create(me(req), parse(handReviewInputSchema, req.body)))
})

handReviewsRouter.get('/admin/hand-reviews', ...staffOnly, async (_req, res) => {
  res.json(await svc.queue())
})

handReviewsRouter.post('/admin/hand-reviews/:id/reply', ...staffOnly, async (req, res) => {
  const { comment } = parse(replySchema, req.body)
  res.json(await svc.reply(me(req), param(req, 'id'), comment))
})
