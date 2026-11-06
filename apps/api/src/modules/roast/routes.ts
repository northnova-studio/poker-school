import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { me, requireAuth, staffOnly } from '../../middleware/auth.js'
import { roastModerationSchema, roastSubmitSchema, voteSchema } from './schemas.js'
import * as svc from './service.js'

export const roastRouter = Router()

roastRouter.get('/roast/current', requireAuth, async (req, res) => {
  res.json(await svc.current(me(req)))
})

roastRouter.post('/roast/:spotId/vote', requireAuth, async (req, res) => {
  const { kind } = parse(voteSchema, req.body)
  res.json(await svc.vote(me(req), param(req, 'spotId'), kind))
})

roastRouter.post('/roast', requireAuth, async (req, res) => {
  res.status(201).json(await svc.submit(me(req), parse(roastSubmitSchema, req.body)))
})

// Extra (non nel contratto): commento dei fondatori e moderazione
roastRouter.patch('/admin/roast/:id', ...staffOnly, async (req, res) => {
  res.json(await svc.moderate(me(req), param(req, 'id'), parse(roastModerationSchema, req.body)))
})
