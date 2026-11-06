import { Router } from 'express'
import { parse } from '../../lib/validate.js'
import { leaderboard } from '../rank/service.js'
import { publicLeaderboardQuerySchema } from './schemas.js'
import * as svc from './service.js'

export const publicRouter = Router()

publicRouter.get('/public/coaches', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300')
  res.json(await svc.coaches())
})

publicRouter.get('/public/stats', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300')
  res.json(await svc.stats())
})

// Solo membri che hanno dato il consenso (shareResultsPublicly)
publicRouter.get('/public/leaderboard', async (req, res) => {
  const { limit } = parse(publicLeaderboardQuerySchema, req.query)
  res.set('Cache-Control', 'public, max-age=60')
  res.json(await leaderboard({ limit, publicOnly: true }))
})
