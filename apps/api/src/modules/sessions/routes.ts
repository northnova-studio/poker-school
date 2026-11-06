import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth } from '../../middleware/auth.js'
import { sessionInputSchema } from './schemas.js'
import * as svc from './service.js'

export const sessionsRouter = Router()

sessionsRouter.get('/me/sessions', requireAuth, async (req, res) => {
  res.json(await svc.listSessions(me(req).id))
})

sessionsRouter.post('/me/sessions', requireAuth, async (req, res) => {
  res.status(201).json(await svc.createSession(me(req), parse(sessionInputSchema, req.body)))
})

sessionsRouter.delete('/me/sessions/:id', requireAuth, async (req, res) => {
  await svc.removeSession(me(req), param(req, 'id'))
  res.status(204).end()
})
