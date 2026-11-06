import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { adminOnly, me, staffOnly } from '../../middleware/auth.js'
import { noteSchema, playerFiltersSchema, playerPatchSchema } from './schemas.js'
import * as svc from './service.js'

export const adminRouter = Router()

adminRouter.get('/admin/overview', ...adminOnly, async (_req, res) => {
  res.json(await svc.overview())
})

adminRouter.get('/admin/players', ...adminOnly, async (req, res) => {
  res.json(await svc.listPlayers(parse(playerFiltersSchema, req.query)))
})

adminRouter.get('/admin/players/:userId', ...adminOnly, async (req, res) => {
  res.json(await svc.playerDetail(param(req, 'userId')))
})

adminRouter.patch('/admin/players/:userId', ...adminOnly, async (req, res) => {
  res.json(await svc.updatePlayer(me(req), param(req, 'userId'), parse(playerPatchSchema, req.body)))
})

// Note del coach: anche i coach possono scriverle
adminRouter.post('/admin/players/:userId/notes', ...staffOnly, async (req, res) => {
  const { text } = parse(noteSchema, req.body)
  res.status(201).json(await svc.addNote(me(req), param(req, 'userId'), text))
})
