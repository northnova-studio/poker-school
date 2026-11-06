// Client Stripe pigro: esiste solo se STRIPE_SECRET_KEY è impostata.
// Nessun dato di carta passa da questo server (Stripe Checkout ospitato).
import Stripe from 'stripe'
import { env } from '../config/env.js'
import { unavailable } from './errors.js'

let client: Stripe | null = null

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw unavailable('Pagamenti non configurati', 'PAYMENTS_NOT_CONFIGURED')
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: 'tris-api' } })
  return client
}

export const paymentsEnabled = () => env.stripeEnabled
