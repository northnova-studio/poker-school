import { Router } from 'express'
import { parse } from '../../lib/validate.js'
import { me, requireAuth } from '../../middleware/auth.js'
import { statsQuerySchema } from './schemas.js'
import { playerStats } from './service.js'

export const statsRouter = Router()

statsRouter.get('/me/stats', requireAuth, async (req, res) => {
  const { period, format } = parse(statsQuerySchema, req.query)
  res.json(await playerStats(me(req).id, period, format))
})
