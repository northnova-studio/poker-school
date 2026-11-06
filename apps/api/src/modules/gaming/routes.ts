import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth, staffOnly } from '../../middleware/auth.js'
import { gamingEventInputSchema, gamingResultsSchema } from './schemas.js'
import * as svc from './service.js'

export const gamingRouter = Router()

gamingRouter.get('/gaming/events', requireAuth, async (req, res) => {
  res.json(await svc.events(me(req)))
})

gamingRouter.post('/gaming/events/:id/join', requireAuth, async (req, res) => {
  res.json(await svc.join(me(req), param(req, 'id')))
})

gamingRouter.delete('/gaming/events/:id/join', requireAuth, async (req, res) => {
  res.json(await svc.leave(me(req), param(req, 'id')))
})

gamingRouter.get('/gaming/leaderboard', requireAuth, async (_req, res) => {
  res.json(await svc.leaderboard())
})

// Extra (non nel contratto): creazione eventi e registrazione risultati
gamingRouter.post('/admin/gaming/events', ...staffOnly, async (req, res) => {
  res.status(201).json(await svc.createEvent(me(req), parse(gamingEventInputSchema, req.body)))
})

gamingRouter.post('/admin/gaming/events/:id/results', ...staffOnly, async (req, res) => {
  const { results } = parse(gamingResultsSchema, req.body)
  res.json(await svc.recordResults(me(req), param(req, 'id'), results))
})
