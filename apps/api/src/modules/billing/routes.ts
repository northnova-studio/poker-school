import { Router } from 'express'
import { param, parse } from '../../lib/validate.js'
import { adminOnly, me, requireAuth } from '../../middleware/auth.js'
import { manualSubscriptionSchema, subscribeSchema } from './schemas.js'
import * as svc from './service.js'

export const billingRouter = Router()

billingRouter.get('/plans', async (_req, res) => {
  res.json(await svc.listPlans())
})

billingRouter.post('/billing/subscribe', requireAuth, async (req, res) => {
  const { planId, interval } = parse(subscribeSchema, req.body)
  res.json(await svc.subscribe(me(req), planId, interval))
})

// Webhook Stripe: corpo RAW (express.raw montato in app.ts) per verificare la firma
billingRouter.post('/billing/webhook', async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  const event = svc.constructStripeEvent(raw, req.get('stripe-signature'))
  res.json(await svc.handleStripeEvent(event))
})

// Extra (non nel contratto): abbonamento MANUAL senza Stripe, solo admin
billingRouter.post('/admin/players/:userId/subscription', ...adminOnly, async (req, res) => {
  const i = parse(manualSubscriptionSchema, req.body)
  res.status(201).json(await svc.manualSubscription(param(req, 'userId'), i.planId, i.interval, i.amountEur, i.recordIncome))
})
