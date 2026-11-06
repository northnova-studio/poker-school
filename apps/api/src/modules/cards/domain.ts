// Player Card stile FIFA Ultimate Team — funzioni pure (docs/RANK.md).

export interface CardAttributes {
  pre: number
  post: number
  icm: number
  agg: number
  men: number
  vol: number
}

export type CardRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'ICON'

export const ATTR_MIN = 40
export const ATTR_MAX = 99

export const clampAttr = (n: number) => Math.min(ATTR_MAX, Math.max(ATTR_MIN, Math.round(n)))

/** overall = round(0.20·pre + 0.20·post + 0.15·icm + 0.10·agg + 0.15·men + 0.20·vol) */
export function cardOverall(a: CardAttributes): number {
  return Math.round(0.2 * a.pre + 0.2 * a.post + 0.15 * a.icm + 0.1 * a.agg + 0.15 * a.men + 0.2 * a.vol)
}

/** < 65 BRONZE · 65–74 SILVER · 75–86 GOLD · ≥ 87 ICON. I fondatori sono sempre ICON. */
export function cardRarity(overall: number, isFounder = false): CardRarity {
  if (isFounder || overall >= 87) return 'ICON'
  if (overall >= 75) return 'GOLD'
  if (overall >= 65) return 'SILVER'
  return 'BRONZE'
}

// Volume "pieno" (99) sugli ultimi 90 giorni per formato: tornei MTT, spin, mani cash.
export const VOLUME_TARGET_90D = { MTT: 1500, SPIN: 6000, CASH: 100_000 } as const

/** Attributo Volume (40–99) dal volume degli ultimi 90 giorni, scala logaritmica. */
export function volumeAttribute(format: keyof typeof VOLUME_TARGET_90D, volume90d: number): number {
  const target = VOLUME_TARGET_90D[format]
  const v = Math.max(0, volume90d)
  if (v === 0) return ATTR_MIN
  const ratio = Math.min(1, Math.log10(1 + v) / Math.log10(1 + target))
  return clampAttr(ATTR_MIN + ratio * (ATTR_MAX - ATTR_MIN))
}

export const DEFAULT_ATTRIBUTES: CardAttributes = { pre: 50, post: 50, icm: 50, agg: 50, men: 50, vol: 40 }
