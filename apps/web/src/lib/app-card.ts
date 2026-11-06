// Player Card (stile FIFA Ultimate Team) — formula di overall e rarità da docs/RANK.md.
import type { PlayerCard } from './api/types'

export type CardAttributes = PlayerCard['attributes']

export const ATTR_META: { key: keyof CardAttributes; short: string; label: string; weight: number }[] = [
  { key: 'pre', short: 'PRE', label: 'Preflop', weight: 0.2 },
  { key: 'post', short: 'POS', label: 'Postflop', weight: 0.2 },
  { key: 'icm', short: 'ICM', label: 'ICM', weight: 0.15 },
  { key: 'agg', short: 'AGG', label: 'Aggressività', weight: 0.1 },
  { key: 'men', short: 'MEN', label: 'Mental', weight: 0.15 },
  { key: 'vol', short: 'VOL', label: 'Volume', weight: 0.2 },
]

export const clampAttr = (v: number) => Math.max(40, Math.min(99, Math.round(Number.isFinite(v) ? v : 40)))

export function cardOverall(a: CardAttributes): number {
  return Math.round(0.2 * a.pre + 0.2 * a.post + 0.15 * a.icm + 0.1 * a.agg + 0.15 * a.men + 0.2 * a.vol)
}

export function cardRarity(overall: number): PlayerCard['rarity'] {
  if (overall >= 87) return 'ICON'
  if (overall >= 75) return 'GOLD'
  if (overall >= 65) return 'SILVER'
  return 'BRONZE'
}

export const RARITY_LABEL: Record<PlayerCard['rarity'], string> = {
  BRONZE: 'Bronzo',
  SILVER: 'Argento',
  GOLD: 'Oro',
  ICON: 'Icona',
}

/** Volume 40-99 dal volume degli ultimi 90 giorni (giochi per MTT/Spin, mani per cash). */
export function volumeAttr(format: 'MTT' | 'SPIN' | 'CASH', volume90d: number): number {
  const target = format === 'MTT' ? 900 : format === 'SPIN' ? 4500 : 120000 // volume "da pro" in 90 giorni
  return clampAttr(40 + 59 * Math.sqrt(Math.min(1, volume90d / target)))
}
