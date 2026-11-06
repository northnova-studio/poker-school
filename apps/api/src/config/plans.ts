// Definizione dei piani (listino provvisorio — DA VALIDARE con il business plan).
// I prezzi arrivano da env (PLAN_*), il seed li scrive nella tabella Plan.
import { env } from './env.js'

export type PlanKey = 'base' | 'pro' | 'elite'
export type Interval = 'month' | 'year'

export const PLAN_ORDER: Record<PlanKey, number> = { base: 1, pro: 2, elite: 3 }

export interface PlanDefinition {
  id: PlanKey
  name: string
  priceMonthly: number
  priceYearly: number
  tagline: string
  features: string[]
  highlighted: boolean
  sortOrder: number
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'base',
    name: 'Base',
    priceMonthly: env.PLAN_BASE_MONTHLY,
    priceYearly: env.PLAN_BASE_YEARLY,
    tagline: 'Per iniziare a studiare con metodo.',
    features: [
      'Libreria video dei fondamentali',
      'Daily Spot, rank e Player Card',
      '2 lezioni di gruppo al mese',
      'Community Discord e lobby post-sessione',
    ],
    highlighted: false,
    sortOrder: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: env.PLAN_PRO_MONTHLY,
    priceYearly: env.PLAN_PRO_YEARLY,
    tagline: 'Il ritmo di chi vuole salire di livello.',
    features: [
      'Tutto il Base',
      'Tutte le lezioni di gruppo del tuo formato',
      '4 hand review al mese con risposta del coach',
      'Corsi "Fondamenta" inclusi',
      'Tracker sessioni e statistiche avanzate',
    ],
    highlighted: true,
    sortOrder: 2,
  },
  {
    id: 'elite',
    name: 'Elite',
    priceMonthly: env.PLAN_ELITE_MONTHLY,
    priceYearly: env.PLAN_ELITE_YEARLY,
    tagline: 'Squadra ristretta, posti limitati, su selezione.',
    features: [
      'Tutto il Pro',
      '1 sessione 1:1 al mese con un fondatore',
      'Gruppo ristretto (max 12) con review settimanali',
      'Tutti i corsi inclusi',
      'Valutazione per eventuale accordo di staking',
    ],
    highlighted: false,
    sortOrder: 3,
  },
]

/** Price ID Stripe per piano/intervallo (da env). */
export function stripePriceId(plan: PlanKey, interval: Interval): string | undefined {
  const map: Record<string, string | undefined> = {
    'base:month': env.STRIPE_PRICE_BASE_MONTH,
    'base:year': env.STRIPE_PRICE_BASE_YEAR,
    'pro:month': env.STRIPE_PRICE_PRO_MONTH,
    'pro:year': env.STRIPE_PRICE_PRO_YEAR,
    'elite:month': env.STRIPE_PRICE_ELITE_MONTH,
    'elite:year': env.STRIPE_PRICE_ELITE_YEAR,
  }
  return map[`${plan}:${interval}`]
}

/** Piano/intervallo a partire da un price ID Stripe (webhook). */
export function planFromStripePrice(priceId: string): { plan: PlanKey; interval: Interval } | null {
  for (const plan of ['base', 'pro', 'elite'] as PlanKey[])
    for (const interval of ['month', 'year'] as Interval[]) if (stripePriceId(plan, interval) === priceId) return { plan, interval }
  return null
}

export function planMeets(userPlan: PlanKey | null | undefined, minPlan: PlanKey): boolean {
  if (!userPlan) return false
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[minPlan]
}
