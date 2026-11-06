import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { audit } from '../../lib/audit.js'
import { adminOnly, me } from '../../middleware/auth.js'
import { rangeSchema, transactionInputSchema } from './schemas.js'
import * as svc from './service.js'

export const financeRouter = Router()

financeRouter.get('/admin/finance/summary', ...adminOnly, async (req, res) => {
  res.json(await svc.summary(parse(rangeSchema, req.query)))
})

financeRouter.get('/admin/finance/transactions', ...adminOnly, async (req, res) => {
  res.json(await svc.transactions(parse(rangeSchema, req.query)))
})

financeRouter.post('/admin/finance/transactions', ...adminOnly, async (req, res) => {
  const t = await svc.addTransaction(me(req), parse(transactionInputSchema, req.body))
  await audit(req, 'finance.add', 'Transaction', t.id)
  res.status(201).json(t)
})

financeRouter.delete('/admin/finance/transactions/:id', ...adminOnly, async (req, res) => {
  await svc.removeTransaction(param(req, 'id'))
  await audit(req, 'finance.remove', 'Transaction', param(req, 'id'))
  res.status(204).end()
})
