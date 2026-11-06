// Webhook Stripe con firma reale (chiavi fittizie, nessuna chiamata di rete).
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_key_for_tests'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
})

const { default: Stripe } = await import('stripe')
const { api, prisma, registerStudent, resetDb } = await import('../helpers.js')

const stripe = new Stripe('sk_test_dummy_key_for_tests')
const send = (event: object, secret = 'whsec_test_secret') => {
  const payload = JSON.stringify(event)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return api().post('/api/v1/billing/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', header).send(payload)
}

let userId: string
beforeAll(async () => {
  await resetDb()
  userId = (await registerStudent()).user.id
})

describe('webhook Stripe', () => {
  it('firma non valida → 400', async () => {
    const res = await send({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: {} } }, 'whsec_altro')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_SIGNATURE')
  })

  it('checkout corso pagato → Purchase + Transaction, idempotente', async () => {
    const event = {
      id: 'evt_course_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          object: 'checkout.session',
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 19900,
          customer: 'cus_test_1',
          client_reference_id: userId,
          metadata: { kind: 'course', userId, courseId: 'crs-icm' },
        },
      },
    }
    const r1 = await send(event)
    expect(r1.status).toBe(200)
    const r2 = await send(event)
    expect(r2.body.duplicate).toBe(true)
    const purchases = await prisma.purchase.findMany({ where: { userId } })
    expect(purchases).toHaveLength(1)
    expect(purchases[0]).toMatchObject({ courseId: 'crs-icm', provider: 'STRIPE', stripeSessionId: 'cs_test_1' })
    expect(Number(purchases[0].amountEur)).toBe(199)
    const tx = await prisma.transaction.findMany({ where: { userId } })
    expect(tx.map((t) => [t.category, Number(t.amount), t.source])).toEqual([['COURSE', 199, 'STRIPE']])
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).stripeCustomerId).toBe('cus_test_1')
  })

  it('abbonamento: subscription aggiornata → piano utente; fattura pagata → entrata; cancellazione → piano rimosso', async () => {
    const sub = (status: string) => ({
      id: 'sub_test_1',
      object: 'subscription',
      status,
      customer: 'cus_test_1',
      cancel_at_period_end: false,
      canceled_at: status === 'canceled' ? Math.floor(Date.now() / 1000) : null,
      metadata: { userId, planId: 'pro', interval: 'month' },
      items: { data: [{ price: { id: 'price_x', unit_amount: 8900, recurring: { interval: 'month' } }, quantity: 1, current_period_start: 1793000000, current_period_end: 1795600000 }] },
    })
    await send({ id: 'evt_sub_1', object: 'event', type: 'customer.subscription.updated', data: { object: sub('active') } }).expect(200)
    let user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(user).toMatchObject({ plan: 'pro', planInterval: 'month' })
    const row = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: 'sub_test_1' } })
    expect(Number(row.amountEur)).toBe(89)

    await send({
      id: 'evt_inv_1',
      object: 'event',
      type: 'invoice.paid',
      data: { object: { id: 'in_test_1', object: 'invoice', amount_paid: 8900, number: 'A-0001', parent: { subscription_details: { subscription: 'sub_test_1' } } } },
    }).expect(200)
    const inc = await prisma.transaction.findFirstOrThrow({ where: { externalRef: 'stripe:in_test_1' } })
    expect(inc).toMatchObject({ category: 'MEMBERSHIP', type: 'INCOME', userId })

    await send({ id: 'evt_sub_2', object: 'event', type: 'customer.subscription.deleted', data: { object: sub('canceled') } }).expect(200)
    user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(user.plan).toBeNull()
    expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: 'sub_test_1' } })).status).toBe('CANCELED')
  })
})
