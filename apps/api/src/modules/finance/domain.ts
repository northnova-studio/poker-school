// Finanze scuola — funzioni pure (MRR, riepiloghi per categoria e per mese).
import { round2 } from '../../lib/money.js'

export interface SubLike {
  status: string
  interval: 'month' | 'year'
  amountEur: number
}

const ACTIVE = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE'])

/** MRR = somma degli abbonamenti attivi normalizzati al mese (annuale / 12). */
export function computeMrr(subs: SubLike[]): number {
  return round2(subs.filter((s) => ACTIVE.has(s.status)).reduce((a, s) => a + (s.interval === 'year' ? s.amountEur / 12 : s.amountEur), 0))
}

export interface TxLike {
  date: Date
  type: 'INCOME' | 'EXPENSE'
  category: string
  amount: number
}

/** Mesi "YYYY-MM" (UTC) da `from` a `to` inclusi. */
export function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = []
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth()
  const endY = to.getUTCFullYear()
  const endM = to.getUTCMonth()
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`)
    m++
    if (m === 12) {
      m = 0
      y++
    }
    if (out.length > 240) break
  }
  return out
}

export function financeSummary(txs: TxLike[], from: Date, to: Date, mrr: number) {
  const inRange = txs.filter((t) => t.date >= from && t.date <= to)
  const income = round2(inRange.filter((t) => t.type === 'INCOME').reduce((a, t) => a + t.amount, 0))
  const expenses = round2(inRange.filter((t) => t.type === 'EXPENSE').reduce((a, t) => a + t.amount, 0))

  const cat = new Map<string, { category: string; type: 'INCOME' | 'EXPENSE'; amount: number }>()
  for (const t of inRange) {
    const k = `${t.type}:${t.category}`
    const cur = cat.get(k) ?? { category: t.category, type: t.type, amount: 0 }
    cur.amount += t.amount
    cat.set(k, cur)
  }
  const byCategory = [...cat.values()].map((c) => ({ ...c, amount: round2(c.amount) })).sort((a, b) => b.amount - a.amount)

  const months = new Map(monthsBetween(from, to).map((m) => [m, { month: m, income: 0, expenses: 0, net: 0 }]))
  for (const t of inRange) {
    const k = t.date.toISOString().slice(0, 7)
    const row = months.get(k)
    if (!row) continue
    if (t.type === 'INCOME') row.income += t.amount
    else row.expenses += t.amount
  }
  const monthly = [...months.values()].map((r) => ({
    month: r.month,
    income: round2(r.income),
    expenses: round2(r.expenses),
    net: round2(r.income - r.expenses),
  }))

  return { from: from.toISOString(), to: to.toISOString(), income, expenses, net: round2(income - expenses), mrr: round2(mrr), byCategory, monthly }
}
