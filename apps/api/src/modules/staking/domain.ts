// Staking / backing — funzioni pure su ledger e settlement.
// Convenzione segno (contratto): amount positivo = verso la scuola / risultato positivo.
import { round2 } from '../../lib/money.js'

export type LedgerType = 'TRANSFER_TO_PLAYER' | 'RETURN_FROM_PLAYER' | 'SESSION_RESULT' | 'SETTLEMENT' | 'ADJUSTMENT'

export interface LedgerLike {
  type: LedgerType
  amount: number
  date: Date
  createdAt?: Date
  settledNet?: number | null
}

/**
 * Normalizza il segno in base al tipo: un trasferimento al giocatore è sempre un'uscita
 * per la scuola (negativo), una restituzione sempre un'entrata (positivo). Risultati e
 * rettifiche mantengono il segno indicato.
 */
export function normalizeAmount(type: LedgerType, amount: number): number {
  if (type === 'TRANSFER_TO_PLAYER') return -Math.abs(amount)
  if (type === 'RETURN_FROM_PLAYER') return Math.abs(amount)
  return round2(amount)
}

// Ordine di registrazione (createdAt, in mancanza la data): un settlement chiude tutto ciò
// che è stato registrato prima, anche se con data contabile antecedente.
const ts = (e: LedgerLike) => (e.createdAt ?? e.date).getTime()
const order = (a: LedgerLike, b: LedgerLike) => ts(a) - ts(b) || a.date.getTime() - b.date.getTime()

const isResult = (e: LedgerLike) => e.type === 'SESSION_RESULT' || e.type === 'ADJUSTMENT'

/** Somma dei risultati (sessioni + rettifiche) dopo l'ultimo SETTLEMENT. */
export function resultsSinceLastSettlement(entries: LedgerLike[]): number {
  const sorted = [...entries].sort(order)
  let lastIdx = -1
  sorted.forEach((e, i) => {
    if (e.type === 'SETTLEMENT') lastIdx = i
  })
  return round2(sorted.slice(lastIdx + 1).filter(isResult).reduce((a, e) => a + e.amount, 0))
}

/** makeup = max(0, −somma risultati dall'ultimo settlement) */
export function computeMakeup(entries: LedgerLike[]): number {
  return round2(Math.max(0, -resultsSinceLastSettlement(entries)))
}

export function summarizeDeal(entries: LedgerLike[]) {
  const sum = (f: (e: LedgerLike) => boolean) => round2(entries.filter(f).reduce((a, e) => a + e.amount, 0))
  return {
    capitalAllocated: round2(Math.abs(sum((e) => e.type === 'TRANSFER_TO_PLAYER'))),
    capitalReturned: sum((e) => e.type === 'RETURN_FROM_PLAYER'),
    netResult: sum((e) => e.type === 'SESSION_RESULT'),
    schoolProfit: sum((e) => e.type === 'SETTLEMENT'),
    makeup: computeMakeup(entries),
  }
}

export interface SettlementPlan {
  net: number
  schoolShare: number
  playerShare: number
}

/**
 * Settlement: divide il netto positivo maturato dall'ultimo settlement secondo le percentuali.
 * Restituisce null se non c'è nulla da dividere (netto ≤ 0, cioè makeup attivo o pari).
 * La quota scuola è arrotondata al centesimo, il giocatore riceve il resto (nessun centesimo perso).
 */
export function planSettlement(entries: LedgerLike[], schoolSharePct: number): SettlementPlan | null {
  const net = resultsSinceLastSettlement(entries)
  if (net <= 0) return null
  const schoolShare = round2((net * schoolSharePct) / 100)
  return { net, schoolShare, playerShare: round2(net - schoolShare) }
}

export function validShares(school: number, player: number): boolean {
  return school >= 0 && player >= 0 && Math.abs(school + player - 100) < 0.001
}
