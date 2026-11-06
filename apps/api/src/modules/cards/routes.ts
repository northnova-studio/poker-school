import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { audit } from '../../lib/audit.js'
import { me, requireAuth, staffOnly } from '../../middleware/auth.js'
import { cardUpdateSchema } from './schemas.js'
import * as svc from './service.js'

export const cardsRouter = Router()

cardsRouter.get('/me/card', requireAuth, async (req, res) => {
  res.json(await svc.getCard(me(req).id))
})

cardsRouter.get('/cards/:userId', requireAuth, async (req, res) => {
  res.json(await svc.getCard(param(req, 'userId')))
})

// Coach e admin aggiornano gli attributi
cardsRouter.patch('/admin/players/:userId/card', ...staffOnly, async (req, res) => {
  const { attributes, mainFormat } = parse(cardUpdateSchema, req.body)
  const card = await svc.updateCard(me(req), param(req, 'userId'), attributes, mainFormat)
  await audit(req, 'card.update', 'PlayerCard', param(req, 'userId'), { attributes })
  res.json(card)
})
