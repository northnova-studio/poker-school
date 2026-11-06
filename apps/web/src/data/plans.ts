import type { Plan } from '@/lib/api/types'
// Listino provvisorio — DA VALIDARE con il business plan.
export const PLANS: Plan[] = [
  {
    id: 'base',
    name: 'Base',
    priceMonthly: 39,
    priceYearly: 390,
    tagline: 'Per iniziare a studiare con metodo.',
    features: [
      'Libreria video dei fondamentali',
      'Daily Spot, rank e Player Card',
      '2 lezioni di gruppo al mese',
      'Community Discord e lobby post-sessione',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 89,
    priceYearly: 890,
    tagline: 'Il ritmo di chi vuole salire di livello.',
    highlighted: true,
    features: [
      'Tutto il Base',
      'Tutte le lezioni di gruppo del tuo formato',
      '4 hand review al mese con risposta del coach',
      'Corsi "Fondamenta" inclusi',
      'Tracker sessioni e statistiche avanzate',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    priceMonthly: 249,
    priceYearly: 2490,
    tagline: 'Squadra ristretta, posti limitati, su selezione.',
    features: [
      'Tutto il Pro',
      '1 sessione 1:1 al mese con un fondatore',
      'Gruppo ristretto (max 12) con review settimanali',
      'Tutti i corsi inclusi',
      'Valutazione per eventuale accordo di staking',
    ],
  },
]
