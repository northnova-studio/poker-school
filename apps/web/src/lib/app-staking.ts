// Staking / backing — calcoli puri su un ledger. Usati dal mock API e dall'anteprima settlement in admin.
// Convenzione importi (types.ts): positivo = verso la scuola / risultato positivo.
//  TRANSFER_TO_PLAYER  → negativo (capitale che esce dalla scuola)
//  RETURN_FROM_PLAYER  → positivo (capitale/profitti che rientrano)
//  SESSION_RESULT      → risultato delle sessioni giocate con capitale della scuola
//  SETTLEMENT          → quota profitti spettante alla scuola alla chiusura del periodo (≥ 0)
//  ADJUSTMENT          → rettifica del risultato (conta nel netto del periodo)
import type { LedgerEntry, LedgerType } from './api/types'

export interface DealFigures {
  capitalAllocated: number
  capitalReturned: number
  netResult: number // somma di tutti i SESSION_RESULT (+ rettifiche)
  sinceSettlement: number // netto dall'ultimo SETTLEMENT
  makeup: number // max(0, −sinceSettlement)
  schoolProfit: number // somma dei SETTLEMENT
  lastSettlementAt: string | null
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Ordina per data; a parità mantiene l'ordine di inserimento. */
export function sortLedger<T extends Pick<LedgerEntry, 'date'>>(entries: T[]): T[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Date.parse(a.e.date) - Date.parse(b.e.date) || a.i - b.i)
    .map((x) => x.e)
}

export function normalizeAmount(type: LedgerType, amount: number): number {
  if (type === 'TRANSFER_TO_PLAYER') return -Math.abs(amount)
  if (type === 'RETURN_FROM_PLAYER' || type === 'SETTLEMENT') return Math.abs(amount)
  return amount
}

export function dealFigures(entries: Pick<LedgerEntry, 'date' | 'type' | 'amount'>[]): DealFigures {
  const sorted = sortLedger(entries)
  let capitalAllocated = 0
  let capitalReturned = 0
  let netResult = 0
  let since = 0
  let schoolProfit = 0
  let lastSettlementAt: string | null = null
  for (const e of sorted) {
    switch (e.type) {
      case 'TRANSFER_TO_PLAYER':
        capitalAllocated += Math.abs(e.amount)
        break
      case 'RETURN_FROM_PLAYER':
        capitalReturned += Math.abs(e.amount)
        break
      case 'SESSION_RESULT':
      case 'ADJUSTMENT':
        netResult += e.amount
        since += e.amount
        break
      case 'SETTLEMENT':
        schoolProfit += Math.abs(e.amount)
        since = 0
        lastSettlementAt = e.date
        break
    }
  }
  return {
    capitalAllocated: r2(capitalAllocated),
    capitalReturned: r2(capitalReturned),
    netResult: r2(netResult),
    sinceSettlement: r2(since),
    makeup: r2(Math.max(0, -since)),
    schoolProfit: r2(schoolProfit),
    lastSettlementAt,
  }
}

export interface SettlementPreview {
  net: number
  canSettle: boolean
  school: number
  player: number
  makeup: number
}

/** Netto dal settlement > 0 → divisione secondo le percentuali; altrimenti il makeup resta. */
export function settlementPreview(
  entries: Pick<LedgerEntry, 'date' | 'type' | 'amount'>[],
  schoolSharePct: number,
  playerSharePct: number,
): SettlementPreview {
  const f = dealFigures(entries)
  const net = f.sinceSettlement
  if (net <= 0) return { net, canSettle: false, school: 0, player: 0, makeup: f.makeup }
  const tot = schoolSharePct + playerSharePct || 100
  const school = r2((net * schoolSharePct) / tot)
  return { net, canSettle: true, school, player: r2(net - school), makeup: 0 }
}
