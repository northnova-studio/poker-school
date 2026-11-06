import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth, staffOnly } from '../../middleware/auth.js'
import { answerSchema, dailySpotCreateSchema } from './schemas.js'
import * as svc from './service.js'

export const dailySpotRouter = Router()

dailySpotRouter.get('/daily-spot/today', requireAuth, async (req, res) => {
  res.json(await svc.today(me(req)))
})

dailySpotRouter.post('/daily-spot/:spotId/answer', requireAuth, async (req, res) => {
  const { optionId } = parse(answerSchema, req.body)
  res.json(await svc.answer(me(req), param(req, 'spotId'), optionId))
})

dailySpotRouter.get('/daily-spot/streaks', requireAuth, async (_req, res) => {
  res.json(await svc.streaks())
})

dailySpotRouter.post('/admin/daily-spots', ...staffOnly, async (req, res) => {
  res.status(201).json(await svc.createSpot(parse(dailySpotCreateSchema, req.body)))
})
