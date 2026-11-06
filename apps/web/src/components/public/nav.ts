// Navigazione del sito pubblico (modulo piccolo: è nel bundle iniziale).
export type FormatSlug = 'mtt' | 'spin' | 'cash'

export const NAV_COACHING: { slug: FormatSlug; label: string; blurb: string }[] = [
  { slug: 'mtt', label: 'MTT', blurb: 'Tornei: dal field al final table' },
  { slug: 'spin', label: 'Spin & Go', blurb: 'Tre giocatori, stack corti, heads-up' },
  { slug: 'cash', label: 'Cash game', blurb: '6-max, volume e bb/100' },
]

export const NAV_MAIN = [
  { to: '/team', label: 'Team' },
  { to: '/risultati', label: 'Risultati' },
  { to: '/corsi', label: 'Corsi' },
  { to: '/community', label: 'Community' },
  { to: '/prezzi', label: 'Prezzi' },
]
