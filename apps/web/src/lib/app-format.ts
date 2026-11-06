// Formattazioni ed etichette dell'area riservata (estende src/lib/format.ts).
import type { DocumentType, Format, KycStatus, LedgerType, PlanId, Role, TxCategory } from './api/types'

const compact = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtCompact = (v: number) => compact.format(v)
export const fmtCompactEur = (v: number) => (Math.abs(v) >= 10000 ? `${v < 0 ? '−' : ''}${compact.format(Math.abs(v))} €` : fmtEur(v))
export const fmtSigned = (v: number, digits = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits).replace('.', ',')}`
export const fmtDec = (v: number | null, digits = 1) => (v === null || !Number.isFinite(v) ? '—' : v.toFixed(digits).replace('.', ','))
// Separatore delle migliaia sempre presente (in italiano Intl non raggruppa i numeri a 4 cifre):
// colonne di numeri allineate e leggibili.
const grouped = { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions
const intA = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, ...grouped })
const eurA = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, ...grouped })
const eurA2 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, ...grouped })
export const fmtInt = (v: number) => intA.format(Math.round(v)).replace('-', '−')
export const fmtEur = (v: number, decimals = false) => (decimals ? eurA2 : eurA).format(v).replace('-', '−')
export const fmtSignedEur = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${eurA.format(Math.abs(v))}`

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h} h${m ? ` ${m}′` : ''}` : `${m}′`
}

export function fmtRelative(iso: string, now = Date.now()) {
  const diff = Date.parse(iso) - now
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('it-IT', { numeric: 'auto' })
  if (abs < 60_000) return 'adesso'
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), 'day')
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
export const fmtWeekday = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

export const PLAN_LABEL: Record<PlanId, string> = { base: 'Base', pro: 'Pro', elite: 'Elite' }
export const ROLE_LABEL: Record<Role, string> = { STUDENT: 'Studente', COACH: 'Coach', ADMIN: 'Admin' }
export const KYC_LABEL: Record<KycStatus, string> = { NONE: 'Da fare', PENDING: 'In verifica', APPROVED: 'Verificato', REJECTED: 'Rifiutato' }
export const DOC_LABEL: Record<DocumentType, string> = { ID_CARD: "Carta d'identità", PASSPORT: 'Passaporto', DRIVING_LICENSE: 'Patente' }
export const FORMAT_SHORT: Record<Format | 'MENTAL' | 'ALL', string> = { MTT: 'MTT', SPIN: 'Spin', CASH: 'Cash', MENTAL: 'Mental', ALL: 'Tutti' }

export const TX_LABEL: Record<TxCategory, string> = {
  MEMBERSHIP: 'Abbonamenti',
  COURSE: 'Corsi',
  GROUP_LESSON: 'Lezioni di gruppo',
  COACHING_1V1: 'Coaching 1:1',
  STAKING: 'Quota staking',
  SPONSOR: 'Sponsor',
  TOOLS: 'Software',
  HOSTING: 'Hosting',
  MARKETING: 'Marketing',
  VIDEO_PRODUCTION: 'Produzione video',
  COACH_PAYOUT: 'Compensi coach',
  TRAVEL: 'Trasferte',
  KYC: 'Verifiche KYC',
  FEES: 'Commissioni',
  TAXES: 'Imposte',
  OTHER: 'Altro',
}
export const INCOME_CATS: TxCategory[] = ['MEMBERSHIP', 'COURSE', 'GROUP_LESSON', 'COACHING_1V1', 'STAKING', 'SPONSOR', 'OTHER']
export const EXPENSE_CATS: TxCategory[] = ['TOOLS', 'HOSTING', 'MARKETING', 'VIDEO_PRODUCTION', 'COACH_PAYOUT', 'TRAVEL', 'KYC', 'FEES', 'TAXES', 'OTHER']

export const LEDGER_LABEL: Record<LedgerType, string> = {
  TRANSFER_TO_PLAYER: 'Capitale inviato',
  RETURN_FROM_PLAYER: 'Capitale rientrato',
  SESSION_RESULT: 'Risultato sessioni',
  SETTLEMENT: 'Settlement',
  ADJUSTMENT: 'Rettifica',
}

// ── Carte ────────────────────────────────────────────────────────────────────
export type Suit = 's' | 'h' | 'd' | 'c'
export interface PCard {
  rank: string
  suit: Suit
}
export const SUIT_GLYPH: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
export const SUIT_NAME: Record<Suit, string> = { s: 'picche', h: 'cuori', d: 'quadri', c: 'fiori' }
const RANK_NAME: Record<string, string> = { A: 'asso', K: 're', Q: 'donna', J: 'fante', T: 'dieci' }

/** "AhQd" → [{A,h},{Q,d}]; tollera spazi, "10" e simboli ♠♥♦♣. */
export function parseCards(s: string | null | undefined): PCard[] {
  if (!s) return []
  const norm = s
    .replace(/10/g, 'T')
    .replace(/♠/g, 's')
    .replace(/♥/g, 'h')
    .replace(/♦/g, 'd')
    .replace(/♣/g, 'c')
    .replace(/[\s,]/g, '')
  const out: PCard[] = []
  for (let i = 0; i + 1 < norm.length; i += 2) {
    const rank = norm[i].toUpperCase()
    const suit = norm[i + 1].toLowerCase() as Suit
    if (!'AKQJT98765432'.includes(rank) || !'shdc'.includes(suit)) continue
    out.push({ rank, suit })
  }
  return out
}
export const cardLabel = (c: PCard) => `${RANK_NAME[c.rank] ?? c.rank} di ${SUIT_NAME[c.suit]}`
export const cardsText = (s: string | null | undefined) =>
  parseCards(s)
    .map((c) => `${c.rank === 'T' ? '10' : c.rank}${SUIT_GLYPH[c.suit]}`)
    .join(' ')
