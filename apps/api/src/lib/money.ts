// Conversioni Decimal ↔ number in euro con 2 decimali.
type DecimalLike = { toNumber(): number } | number | string | null | undefined

export function num(v: DecimalLike): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return round2(v)
  if (typeof v === 'string') return round2(Number(v))
  return round2(v.toNumber())
}

export function numOrNull(v: DecimalLike): number | null {
  if (v === null || v === undefined) return null
  return num(v)
}

// Arrotondamento simmetrico (metà lontano da zero): -1,005 e 1,005 si comportano allo stesso modo.
export function round2(n: number): number {
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100 || 0
}

export function round1(n: number): number {
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 10)) / 10 || 0
}

export const toCents = (eur: number) => Math.round(eur * 100)
export const fromCents = (cents: number) => round2(cents / 100)
