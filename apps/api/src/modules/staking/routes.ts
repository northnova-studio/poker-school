import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { audit } from '../../lib/audit.js'
import { adminOnly, me } from '../../middleware/auth.js'
import { dealInputSchema, dealPatchSchema, ledgerInputSchema } from './schemas.js'
import * as svc from './service.js'

export const stakingRouter = Router()

stakingRouter.get('/admin/staking/deals', ...adminOnly, async (_req, res) => {
  res.json(await svc.deals())
})

stakingRouter.post('/admin/staking/deals', ...adminOnly, async (req, res) => {
  const deal = await svc.createDeal(me(req), parse(dealInputSchema, req.body))
  await audit(req, 'staking.create', 'StakingDeal', deal.id)
  res.status(201).json(deal)
})

stakingRouter.patch('/admin/staking/deals/:id', ...adminOnly, async (req, res) => {
  const patch = parse(dealPatchSchema, req.body)
  const deal = await svc.updateDeal(param(req, 'id'), patch)
  await audit(req, 'staking.update', 'StakingDeal', deal.id, patch)
  res.json(deal)
})

stakingRouter.get('/admin/staking/deals/:dealId/ledger', ...adminOnly, async (req, res) => {
  res.json(await svc.ledger(param(req, 'dealId')))
})

stakingRouter.post('/admin/staking/deals/:dealId/ledger', ...adminOnly, async (req, res) => {
  const out = await svc.addEntry(me(req), param(req, 'dealId'), parse(ledgerInputSchema, req.body))
  await audit(req, 'staking.ledger', 'StakingDeal', param(req, 'dealId'), { entryId: out.entry.id, type: out.entry.type })
  res.status(201).json(out)
})

stakingRouter.post('/admin/staking/deals/:dealId/settle', ...adminOnly, async (req, res) => {
  res.json(await svc.settle(me(req), param(req, 'dealId')))
})
