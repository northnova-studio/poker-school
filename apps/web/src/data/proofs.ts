// PROVE / RISULTATI — qui vanno i vostri video e screenshot.
// Come aggiungere una prova:
// 1) metti il file in apps/web/public/proofs/ (es. matteo-ft-2026-05.jpg o .mp4)
// 2) aggiungi un oggetto all'array PROOFS con src: 'proofs/<nome-file>'
// 3) per i video YouTube usa kind: 'youtube' e src: '<ID video>'
// ATTENZIONE: oscurate nickname e avatar degli avversari e qualunque logo/nome di poker room
// (Decreto Dignità: niente pubblicità, anche indiretta, delle sale da gioco).
export type ProofKind = 'image' | 'video' | 'youtube'
export interface Proof {
  id: string
  kind: ProofKind
  src: string | null // null = slot vuoto da riempire (mostra un segnaposto disegnato)
  title: string
  who: 'Fabri' | 'Matteo' | 'Lorenzo' | 'Studente'
  format: 'MTT' | 'SPIN' | 'CASH'
  date: string // YYYY-MM
  tag: 'deep run' | 'grafico' | 'sessione' | 'final table' | 'live'
  caption: string
  placeholder: boolean
}

export const PROOFS: Proof[] = [
  { id: 'p1', kind: 'image', src: null, title: 'Final table domenicale', who: 'Matteo', format: 'MTT', date: '2026-10', tag: 'final table', caption: 'Inserisci lo screenshot del final table (lobby oscurata).', placeholder: true },
  { id: 'p2', kind: 'image', src: null, title: 'Grafico 12 mesi spin', who: 'Fabri', format: 'SPIN', date: '2026-09', tag: 'grafico', caption: 'Inserisci il grafico chip EV / risultati degli ultimi 12 mesi.', placeholder: true },
  { id: 'p3', kind: 'youtube', src: null, title: 'Deep run commentato', who: 'Matteo', format: 'MTT', date: '2026-08', tag: 'deep run', caption: 'Inserisci l’ID del video YouTube del breakdown.', placeholder: true },
  { id: 'p4', kind: 'image', src: null, title: 'Trasferta live', who: 'Lorenzo', format: 'MTT', date: '2026-12', tag: 'live', caption: 'Foto o clip della trasferta (vlog).', placeholder: true },
  { id: 'p5', kind: 'video', src: null, title: 'Sessione highstack', who: 'Matteo', format: 'MTT', date: '2026-07', tag: 'sessione', caption: 'Clip della sessione high stakes (con delay e lobby oscurata).', placeholder: true },
  { id: 'p6', kind: 'image', src: null, title: 'Volume del mese', who: 'Fabri', format: 'SPIN', date: '2026-10', tag: 'sessione', caption: 'Screenshot del volume mensile.', placeholder: true },
  { id: 'p7', kind: 'image', src: null, title: 'Risultato studente', who: 'Studente', format: 'SPIN', date: '2026-11', tag: 'grafico', caption: 'Grafico di uno studente (con il suo consenso).', placeholder: true },
  { id: 'p8', kind: 'image', src: null, title: 'Cash: 100k mani', who: 'Studente', format: 'CASH', date: '2026-11', tag: 'grafico', caption: 'Grafico bb/100 di uno studente cash.', placeholder: true },
]
