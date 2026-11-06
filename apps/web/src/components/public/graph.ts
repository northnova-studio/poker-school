// Generatore deterministico di linee "bankroll" illustrative (nessun dato reale).
export function seeded(seed: number) {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Punti di una curva con trend positivo e drawdown realistici. */
export function bankrollPoints(seed: number, n: number, drift = 0.55, vol = 1) {
  const r = seeded(seed)
  const pts: number[] = [0]
  let v = 0
  for (let i = 1; i < n; i++) {
    // passi con code pesanti: ogni tanto un salto (deep run) o un downswing
    const shock = r() > 0.94 ? (r() - 0.3) * 9 : 0
    v += (r() - 0.5 + drift * 0.1) * 2.2 * vol + shock
    pts.push(v)
  }
  return pts
}

/** Converte valori in un path SVG adattato al box. */
export function toPath(values: number[], w: number, h: number, pad = 0) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = pad + (1 - (v - min) / span) * (h - pad * 2)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

/** Intero con separatore delle migliaia sempre presente (2.431, non 2431). */
export const fmtInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Prezzo in euro con separatore delle migliaia (2.490 €). */
export const fmtEuro = (n: number) => `${fmtInt(n)} €`
