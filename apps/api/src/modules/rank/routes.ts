import { Router } from 'express'
import { parse } from '../../lib/validate.js'
import { me, requireAuth } from '../../middleware/auth.js'
import { leaderboardQuerySchema } from './schemas.js'
import * as svc from './service.js'

export const rankRouter = Router()

rankRouter.get('/me/rank', requireAuth, async (req, res) => {
  res.json(await svc.rankInfo(me(req).id))
})

// Classifica interna (membri autenticati): solo XP, nessun dato economico
rankRouter.get('/leaderboard', requireAuth, async (req, res) => {
  const { format, limit } = parse(leaderboardQuerySchema, req.query)
  res.json(await svc.leaderboard({ format, limit }))
})

rankRouter.get('/me/xp', requireAuth, async (req, res) => {
  res.json(await svc.listXpEvents(me(req).id))
})
