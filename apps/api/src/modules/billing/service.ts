// Piani, abbonamenti e webhook Stripe.
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { stripe } from '../../lib/stripe.js'
import { badRequest, conflict, notFound, unavailable } from '../../lib/errors.js'
import { fromCents, num, round2 } from '../../lib/money.js'
import { addDays } from '../../lib/dates.js'
import { toUserDto } from '../../lib/dto.js'
import { planFromStripePrice, stripePriceId, type Interval, type PlanKey } from '../../config/plans.js'
import type { SubscriptionStatus, User } from '../../generated/prisma/client.js'

export async function listPlans() {
  const rows = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } })
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    priceMonthly: num(p.priceMonthly),
    priceYearly: num(p.priceYearly),
    tagline: p.tagline,
    features: p.features,
    ...(p.highlighted ? { highlighted: true } : {}),
  }))
}

async function planPrice(plan: PlanKey, interval: Interval) {
  const p = await prisma.plan.findUnique({ where: { id: plan } })
  if (!p) throw notFound('Piano non trovato')
  return num(interval === 'year' ? p.priceYearly : p.priceMonthly)
}

export async function subscribe(user: User, plan: PlanKey, interval: Interval) {
  const s = stripe() // 503 PAYMENTS_NOT_CONFIGURED senza Stripe
  const price = stripePriceId(plan, interval)
  if (!price) throw unavailable(`Prezzo Stripe non configurato per ${plan}/${interval}`, 'PRICE_NOT_CONFIGURED')
  const active = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } } })
  if (active && active.plan === plan && active.interval === interval) throw conflict('Sei già abbonato a questo piano', 'ALREADY_SUBSCRIBED')
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata: { kind: 'subscription', userId: user.id, planId: plan, interval },
    subscription_data: { metadata: { userId: user.id, planId: plan, interval } },
    allow_promotion_codes: true,
    locale: 'it',
    success_url: `${env.FRONTEND_URL}/app/profilo?checkout=success`,
    cancel_url: `${env.FRONTEND_URL}/prezzi?checkout=cancel`,
  })
  return { checkoutUrl: session.url, user: null }
}

/** Extra admin: abbonamento manuale (senza Stripe), entra nel calcolo dell'MRR. */
export async function manualSubscription(userId: string, plan: PlanKey, interval: Interval, amountEur: number | undefined, recordIncome: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('Utente non trovato')
  const amount = round2(amountEur ?? (await planPrice(plan, interval)))
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }, provider: 'MANUAL' },
      data: { status: 'CANCELED', canceledAt: now },
    })
    const sub = await tx.subscription.create({
      data: {
        userId,
        plan,
        interval,
        status: 'ACTIVE',
        provider: 'MANUAL',
        amountEur: amount,
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, interval === 'year' ? 365 : 30),
      },
    })
    if (recordIncome && amount > 0)
      await tx.transaction.create({
        data: {
          date: now,
          type: 'INCOME',
          category: 'MEMBERSHIP',
          amount,
          description: `Abbonamento ${plan} (${interval === 'year' ? 'annuale' : 'mensile'}) — manuale`,
          userId,
          source: 'MANUAL',
          externalRef: `subscription:${sub.id}`,
        },
      })
    return tx.user.update({ where: { id: userId }, data: { plan, planInterval: interval } })
  })
  return toUserDto(updated)
}

// ── Webhook Stripe ─────────────────────────────────────────────────────────

export function constructStripeEvent(raw: Buffer, signature: string | undefined): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw unavailable('Webhook Stripe non configurato', 'PAYMENTS_NOT_CONFIGURED')
  if (!signature) throw badRequest('Firma Stripe mancante', 'INVALID_SIGNATURE')
  try {
    return stripe().webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    throw badRequest('Firma Stripe non valida', 'INVALID_SIGNATURE')
  }
}

const mapStatus = (s: Stripe.Subscription.Status): SubscriptionStatus =>
  s === 'active'
    ? 'ACTIVE'
    : s === 'trialing'
      ? 'TRIALING'
      : s === 'past_due' || s === 'unpaid'
        ? 'PAST_DUE'
        : s === 'canceled' || s === 'incomplete_expired'
          ? 'CANCELED'
          : 'INCOMPLETE'

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : (x?.id ?? null))

/** Periodo corrente: dalle API 2025 è sugli item, prima era sulla subscription. */
function periodOf(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number }) | undefined
  const legacy = sub as unknown as { current_period_start?: number; current_period_end?: number }
  const start = item?.current_period_start ?? legacy.current_period_start
  const end = item?.current_period_end ?? legacy.current_period_end
  return { start: start ? new Date(start * 1000) : null, end: end ? new Date(end * 1000) : null }
}

async function syncSubscription(sub: Stripe.Subscription, fallbackUserId?: string) {
  const userId = sub.metadata?.userId ?? fallbackUserId
  if (!userId) {
    logger.warn({ sub: sub.id }, 'subscription Stripe senza userId nei metadata')
    return
  }
  const item = sub.items?.data?.[0]
  const fromPrice = item?.price?.id ? planFromStripePrice(item.price.id) : null
  const plan = (fromPrice?.plan ?? sub.metadata?.planId) as PlanKey | undefined
  const interval = (fromPrice?.interval ?? sub.metadata?.interval ?? item?.price?.recurring?.interval) as Interval | undefined
  if (!plan || !interval) {
    logger.warn({ sub: sub.id }, 'subscription Stripe: piano non riconosciuto')
    return
  }
  const status = mapStatus(sub.status)
  const { start, end } = periodOf(sub)
  const amount = item?.price?.unit_amount != null ? fromCents(item.price.unit_amount * (item.quantity ?? 1)) : await planPrice(plan, interval)
  const customer = idOf(sub.customer)
  const data = {
    userId,
    plan,
    interval,
    status,
    provider: 'STRIPE' as const,
    amountEur: amount,
    stripeCustomerId: customer,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    canceledAt: status === 'CANCELED' ? (sub.canceled_at ? new Date(sub.canceled_at * 1000) : new Date()) : null,
  }
  await prisma.subscription.upsert({ where: { stripeSubscriptionId: sub.id }, create: { ...data, stripeSubscriptionId: sub.id }, update: data })
  const activeNow = status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE'
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(customer ? { stripeCustomerId: customer } : {}),
      ...(activeNow ? { plan, planInterval: interval } : {}),
    },
  })
  if (!activeNow) {
    // nessun altro abbonamento attivo → piano rimosso
    const other = await prisma.subscription.findFirst({ where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } } })
    if (!other) await prisma.user.update({ where: { id: userId }, data: { plan: null, planInterval: null } })
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}
  const userId = meta.userId ?? session.client_reference_id ?? undefined
  if (!userId) return
  const customer = idOf(session.customer)
  if (customer) await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer } }).catch(() => undefined)

  if (session.mode === 'payment' && meta.kind === 'course' && meta.courseId) {
    if (session.payment_status !== 'paid') return
    const amount = fromCents(session.amount_total ?? 0)
    const course = await prisma.course.findUnique({ where: { id: meta.courseId } })
    await prisma.$transaction(async (tx) => {
      const exists = await tx.purchase.findUnique({ where: { userId_courseId: { userId, courseId: meta.courseId! } } })
      if (!exists)
        await tx.purchase.create({
          data: { userId, courseId: meta.courseId!, amountEur: amount, provider: 'STRIPE', stripeSessionId: session.id },
        })
      await tx.transaction.upsert({
        where: { externalRef: `stripe:${session.id}` },
        create: {
          date: new Date(),
          type: 'INCOME',
          category: 'COURSE',
          amount,
          description: `Corso "${course?.title ?? meta.courseId}" (Stripe)`,
          userId,
          source: 'STRIPE',
          externalRef: `stripe:${session.id}`,
        },
        update: {},
      })
    })
  }
  if (session.mode === 'subscription' && session.subscription) {
    const sub = typeof session.subscription === 'string' ? await stripe().subscriptions.retrieve(session.subscription) : session.subscription
    await syncSubscription(sub, userId)
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const inv = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }
  const subId =
    idOf(inv.parent?.subscription_details?.subscription as string | { id: string } | null | undefined) ?? idOf(inv.subscription ?? null)
  if (!subId || !invoice.amount_paid) return
  const local = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subId } })
  const amount = fromCents(invoice.amount_paid)
  await prisma.transaction.upsert({
    where: { externalRef: `stripe:${invoice.id}` },
    create: {
      date: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
      type: 'INCOME',
      category: 'MEMBERSHIP',
      amount,
      description: `Abbonamento ${local?.plan ?? ''} (Stripe ${invoice.number ?? invoice.id})`.trim(),
      userId: local?.userId ?? null,
      source: 'STRIPE',
      externalRef: `stripe:${invoice.id}`,
    },
    update: {},
  })
}

export async function handleStripeEvent(event: Stripe.Event) {
  const seen = await prisma.webhookEvent.findUnique({ where: { id: event.id } })
  if (seen) return { received: true, duplicate: true }
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    case 'invoice.paid':
      await onInvoicePaid(event.data.object as Stripe.Invoice)
      break
    default:
      logger.debug({ type: event.type }, 'evento Stripe ignorato')
  }
  await prisma.webhookEvent.create({ data: { id: event.id, provider: 'stripe', type: event.type } })
  return { received: true }
}
