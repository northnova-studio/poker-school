// Contenuti delle demo della pagina Community (Daily Spot, Roast, Deep Run, Taglia, XP).
// Valori con placeholder: true sono ESEMPI: DA SOSTITUIRE.
import type { Format } from '@/lib/api/types'

// ── COMMUNITY: demo interattive ──────────────────────────────────────────────
export const DAILY_SPOT_DEMO = {
  format: 'MTT' as Format,
  title: 'Bottone, 8 bui, foldano tutti',
  situation: 'Torneo, fase centrale con ante. Foldano tutti fino a te al bottone. Hai 8 bui effettivi, i bui hanno stack più profondi.',
  heroCards: ['A♠', '7♦'],
  stacks: 'Hero 8bb BTN, SB 31bb, BB 24bb',
  options: [
    { id: 'fold', label: 'Fold' },
    { id: 'minraise', label: 'Min-raise' },
    { id: 'shove', label: 'All-in' },
  ],
  correct: 'shove',
  explanation:
    'A7 offsuit è dentro qualunque range di push standard dal bottone con 8 bui. Hai fold equity contro due giocatori, un blocker sull’asso e una mano che giocata postflop con uno stack così corto perde valore. Il min-raise ha senso con poche mani e stack più profondi; il fold qui regala equity.',
  distribution: { fold: 9, minraise: 23, shove: 68 } as Record<string, number>,
  coach: 'Matteo',
  placeholder: true, // distribuzione delle risposte di esempio
}

export const ROAST_DEMO: { id: string; title: string; description: string; cards: string; board: string; comment: string; worst: number; best: number }[] = [
  {
    id: 'r1',
    title: 'Il call più coraggioso della settimana',
    description: 'Cash 6-max, 100bb. Villain apre dal cutoff, hero chiama dal big blind con 9-4 offsuit, chiama un overbet sul turn e uno shove sul river senza aver chiuso nessun progetto.',
    cards: '9♣ 4♦',
    board: 'K♠ Q♠ 7♥ 2♦ J♣',
    comment: '“Avevo un read.” Il read: nessuno. — Fabri',
    worst: 41,
    best: 3,
  },
  {
    id: 'r2',
    title: 'Fold di una vita',
    description: 'MTT, final table, 9 rimasti con un pay jump enorme. Hero folda K-Q suited contro uno shove dello short stack perché la vera minaccia è il big stack alle sue spalle. ICM da manuale.',
    cards: 'K♥ Q♥',
    board: 'preflop',
    comment: 'Questo lo mettiamo nel corso. Senza dirgli che ci abbiamo pensato dieci minuti. — Matteo',
    worst: 2,
    best: 37,
  },
]

export const DEEP_RUN_DEMO = {
  tournament: 'Torneo domenicale 109 €',
  totalPlayers: 2431,
  startLeft: 214,
  stackBb: 38,
  railers: 17,
  comments: [
    { who: 'Matte', text: 'Occhio al big stack a sinistra, non dargli spot facili.' },
    { who: 'Fabri', text: 'Se vince offre lui la cena. Se perde pure.' },
    { who: 'giuli_ftw', text: 'RAIL RAIL RAIL' },
  ],
  placeholder: true,
}

export const BOUNTIES: { founder: string; game: string; rule: string; record: string; placeholder: boolean }[] = [
  { founder: 'Fabri', game: 'EA FC', rule: '1v1, una partita secca, nessuna rivincita il giorno stesso', record: 'battuto 2 volte su 41', placeholder: true },
  { founder: 'Matteo', game: 'Warzone', rule: '1v1 nella mappa scelta da chi sfida', record: 'battuto 19 volte su 33', placeholder: true },
  { founder: 'Lorenzo', game: 'Call of Duty', rule: '1v1 al meglio delle tre, regole competitive', record: 'battuto 0 volte su 58', placeholder: true },
]

export const GAMING_NIGHTS: { day: string; game: string; title: string; host: string }[] = [
  { day: 'Mar', game: 'Warzone', title: 'Squad miste fondatori e studenti', host: 'Lorenzo' },
  { day: 'Gio', game: 'EA FC', title: 'Torneo a eliminazione diretta', host: 'Fabri' },
  { day: 'Dom', game: 'Rail night', title: 'Si guardano insieme i deep run della domenica', host: 'Matteo' },
]

export const XP_TABLE: { label: string; xp: string; note?: string }[] = [
  { label: 'Sessione registrata', xp: '20 + 1 ogni 10 giochi', note: 'max +30, fino a 3 sessioni al giorno' },
  { label: 'Ora di studio', xp: '15', note: 'max 4 ore al giorno' },
  { label: 'Lezione di gruppo', xp: '40' },
  { label: 'Mano inviata in review', xp: '25', note: 'max 5 a settimana' },
  { label: 'Daily Spot corretto', xp: '15', note: '5 se sbagli: conta anche partecipare' },
  { label: 'Streak di 7 giorni al Daily Spot', xp: '50' },
  { label: 'Deep run fino al final table', xp: '60' },
  { label: 'Voto al Roast', xp: '3', note: 'max 10 a settimana' },
  { label: 'Serata gaming', xp: '20' },
  { label: 'Corso completato', xp: '150' },
  { label: 'Taglia su un fondatore', xp: '200' },
]
