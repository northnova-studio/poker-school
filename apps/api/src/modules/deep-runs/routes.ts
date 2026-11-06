import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth } from '../../middleware/auth.js'
import { commentSchema, deepRunInputSchema, deepRunListSchema, deepRunPatchSchema } from './schemas.js'
import * as svc from './service.js'

export const deepRunsRouter = Router()

deepRunsRouter.get('/deep-runs', requireAuth, async (req, res) => {
  const { activeOnly } = parse(deepRunListSchema, req.query)
  res.json(await svc.list(me(req), activeOnly))
})

deepRunsRouter.post('/deep-runs', requireAuth, async (req, res) => {
  res.status(201).json(await svc.create(me(req), parse(deepRunInputSchema, req.body)))
})

deepRunsRouter.patch('/deep-runs/:id', requireAuth, async (req, res) => {
  res.json(await svc.update(me(req), param(req, 'id'), parse(deepRunPatchSchema, req.body)))
})

deepRunsRouter.post('/deep-runs/:id/rail', requireAuth, async (req, res) => {
  res.json(await svc.rail(me(req), param(req, 'id')))
})

deepRunsRouter.post('/deep-runs/:id/comments', requireAuth, async (req, res) => {
  const { text } = parse(commentSchema, req.body)
  res.status(201).json(await svc.comment(me(req), param(req, 'id'), text))
})
