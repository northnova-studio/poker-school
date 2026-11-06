// ─────────────────────────────────────────────────────────────────────────────
// BRAND CONFIG — unico punto dove cambiare nome, tagline e identità del sito.
// Quando sceglierete il nome definitivo basta modificare `BRAND` qui sotto.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeId = 'tris' | 'ranked' | 'scuderia' | 'lobby' | 'varianza'

export const BRAND = {
  name: 'TRIS',
  legalName: 'TRIS Poker School', // DA SOSTITUIRE con la ragione sociale
  tagline: 'Tre fondatori. Tre formati. Un tavolo solo.',
  claim: 'Studiamo come atleti. Ci prendiamo in giro come amici.',
  email: 'ciao@tris.poker', // DA SOSTITUIRE quando comprate il dominio
  discordUrl: '#', // DA SOSTITUIRE con l'invito Discord
  social: {
    youtube: '#',
    twitch: '#',
    instagram: '#',
    tiktok: '#',
    x: '#',
  },
  defaultTheme: 'tris' as ThemeId,
}

export interface Identity {
  id: ThemeId
  name: string
  concept: string
  tagline: string
  palette: { label: string; hex: string }[]
  fonts: { display: string; text: string }
  tone: string
}

export const IDENTITIES: Identity[] = [
  {
    id: 'tris',
    name: 'TRIS',
    concept: 'Athletic Lab',
    tagline: 'Tre fondatori. Tre formati. Un tavolo solo.',
    palette: [
      { label: 'Panno', hex: '#101814' },
      { label: 'Superficie', hex: '#17221D' },
      { label: 'Osso', hex: '#ECE6D8' },
      { label: 'Ottone', hex: '#C9A45C' },
      { label: 'Argilla', hex: '#B85C45' },
    ],
    fonts: { display: 'Archivo', text: 'Inter Tight' },
    tone: 'Diretto, tecnico, autoironico.',
  },
  {
    id: 'ranked',
    name: 'RANKED',
    concept: 'Esports Ladder',
    tagline: 'Sali di rank. Ogni sessione conta.',
    palette: [
      { label: 'Night', hex: '#13151D' },
      { label: 'Queue', hex: '#1B1E29' },
      { label: 'Ice', hex: '#E6E9F2' },
      { label: 'Viola', hex: '#8C7CF0' },
      { label: 'Lime', hex: '#9ACD6B' },
    ],
    fonts: { display: 'Chakra Petch', text: 'Inter' },
    tone: 'Gaming, season, ladder. GG.',
  },
  {
    id: 'scuderia',
    name: 'Scuderia',
    concept: 'Racing Team',
    tagline: 'La squadra corse del poker italiano.',
    palette: [
      { label: 'Asfalto', hex: '#1A1A1C' },
      { label: 'Box', hex: '#232326' },
      { label: 'Carta', hex: '#EFEBE4' },
      { label: 'Rosso corsa', hex: '#B8433A' },
      { label: 'Segnale', hex: '#D8B45A' },
    ],
    fonts: { display: 'Barlow Condensed', text: 'Barlow' },
    tone: 'Telemetria, box, giro veloce.',
  },
  {
    id: 'lobby',
    name: 'LOBBY',
    concept: 'Late Night Club',
    tagline: 'Si studia, si gioca, poi si entra in lobby.',
    palette: [
      { label: 'Notte', hex: '#1C1520' },
      { label: 'Divano', hex: '#261D2B' },
      { label: 'Crema', hex: '#F1E9E4' },
      { label: 'Neon', hex: '#D9809F' },
      { label: 'Teal', hex: '#62B3A5' },
    ],
    fonts: { display: 'Unbounded', text: 'DM Sans' },
    tone: 'Notturno, community, post-sessione.',
  },
  {
    id: 'varianza',
    name: 'Varianza Club',
    concept: 'Editoriale ironico',
    tagline: 'La varianza la combattiamo insieme.',
    palette: [
      { label: 'Carta', hex: '#F3EEE4' },
      { label: 'Inchiostro', hex: '#1D1D1B' },
      { label: 'Blu fiche', hex: '#2F5D8A' },
      { label: 'Rosso fiche', hex: '#C2483A' },
      { label: 'Senape', hex: '#D9A441' },
    ],
    fonts: { display: 'Instrument Serif', text: 'Instrument Sans' },
    tone: 'Editoriale, ironico, da rivista sportiva.',
  },
]

export const NAME_IDEAS: { name: string; why: string }[] = [
  { name: 'TRIS', why: 'Tre fondatori, tre formati. "Fare tris".' },
  { name: 'RANKED', why: 'Linguaggio gaming, sistema di rank, mentalità competitiva.' },
  { name: 'Scuderia', why: 'Squadra corse e scuderia di giocatori: atleti, eccellenza italiana.' },
  { name: 'LOBBY', why: 'La lobby del client e la lobby dei videogiochi post-sessione.' },
  { name: 'Varianza Club', why: 'Autoironico: la varianza la combattiamo insieme.' },
  { name: 'Overbet Academy', why: 'Tecnico, aggressivo, da reg.' },
  { name: 'Lo Spogliatoio', why: 'Squadra, sfottò, preparazione pre-partita.' },
  { name: 'Deep Run Club', why: "L'obiettivo di ogni MTT player." },
  { name: 'Highstack', why: 'Ambizione high stakes.' },
  { name: 'Clutch', why: 'I momenti decisivi: bolla, ICM, final table.' },
]

const THEME_KEY = 'tris.theme'

export function getStoredTheme(): ThemeId {
  try {
    const t = localStorage.getItem(THEME_KEY) as ThemeId | null
    if (t && IDENTITIES.some((i) => i.id === t)) return t
  } catch {
    /* storage non disponibile */
  }
  return BRAND.defaultTheme
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(THEME_KEY, id)
  } catch {
    /* ignore */
  }
}
