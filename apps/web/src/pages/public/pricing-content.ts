// Contenuti della pagina Prezzi (confronto piani, lezioni extra, FAQ). Prezzi indicativi: DA VALIDARE.
import type { PlanId } from '@/lib/api/types'

// ── PREZZI ───────────────────────────────────────────────────────────────────
export const PRICING_COMPARE: { label: string; values: Record<PlanId, string | boolean> }[] = [
  { label: 'Libreria video dei fondamentali', values: { base: true, pro: true, elite: true } },
  { label: 'Daily Spot, rank e Player Card', values: { base: true, pro: true, elite: true } },
  { label: 'Community Discord e lobby post-sessione', values: { base: true, pro: true, elite: true } },
  { label: 'Lezioni di gruppo', values: { base: '2 al mese', pro: 'tutte quelle del tuo formato', elite: 'tutte' } },
  { label: 'Hand review con risposta del coach', values: { base: false, pro: '4 al mese', elite: 'illimitate' } },
  { label: 'Corsi inclusi', values: { base: false, pro: 'Fondamenta e Mental', elite: 'tutti' } },
  { label: 'Tracker sessioni e statistiche avanzate', values: { base: false, pro: true, elite: true } },
  { label: 'Sessione 1:1 con un fondatore', values: { base: false, pro: false, elite: '1 al mese' } },
  { label: 'Gruppo ristretto con review settimanali', values: { base: false, pro: false, elite: 'max 12 persone' } },
  { label: 'Valutazione per accordo di staking', values: { base: false, pro: false, elite: true } },
]

export const EXTRA_PRICING: { title: string; price: string; unit: string; text: string }[] = [
  { title: 'Lezione di gruppo singola', price: '25 €', unit: 'a lezione', text: '90 minuti, massimo 20 posti, registrazione inclusa. Per chi non ha un piano o vuole provare un formato diverso.' },
  { title: 'Coaching 1:1', price: 'da 120 €', unit: 'all’ora', text: 'Con un fondatore, sul tuo formato. Pacchetti da 5 ore con prezzo ridotto.' },
  { title: 'Database review', price: 'da 150 €', unit: 'una tantum', text: 'Analisi completa del tuo database con report scritto e una call di 45 minuti per discuterlo.' },
]

export const PRICING_FAQ: { q: string; a: string }[] = [
  { q: 'Posso cambiare piano?', a: 'Sì, in qualsiasi momento dall’area riservata. Il passaggio a un piano superiore è immediato, quello a un piano inferiore parte dal rinnovo successivo.' },
  { q: 'Come funziona l’annuale?', a: 'Paghi dodici mesi al prezzo di dieci. Puoi disdire il rinnovo quando vuoi, il piano resta attivo fino alla scadenza.' },
  { q: 'L’Elite è aperto a tutti?', a: 'No, l’Elite è su selezione: i posti nel gruppo ristretto sono al massimo 12. Ti candidi, facciamo la valutazione e ti diciamo se c’è posto.' },
  { q: 'Cosa vuol dire “valutazione per accordo di staking”?', a: 'Per alcuni giocatori dell’Elite la scuola può valutare un accordo di backing con contratto scritto. Non è un prodotto in vendita e non è garantito.' },
]
