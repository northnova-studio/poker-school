// PRNG deterministico (mulberry32) + helper per i dati seed.
export interface Rng {
  (): number
  int(min: number, max: number): number
  range(min: number, max: number): number
  pick<T>(arr: readonly T[]): T
  chance(p: number): boolean
  normal(mean?: number, sd?: number): number
  weighted<T>(items: readonly (readonly [T, number])[]): T
  shuffle<T>(arr: T[]): T[]
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng = next as Rng
  rng.int = (min, max) => Math.floor(next() * (max - min + 1)) + min
  rng.range = (min, max) => next() * (max - min) + min
  rng.pick = (arr) => arr[Math.floor(next() * arr.length)]
  rng.chance = (p) => next() < p
  rng.normal = (mean = 0, sd = 1) => {
    const u = Math.max(next(), 1e-9)
    const v = next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  rng.weighted = (items) => {
    const tot = items.reduce((s, [, w]) => s + w, 0)
    let r = next() * tot
    for (const [v, w] of items) {
      r -= w
      if (r <= 0) return v
    }
    return items[items.length - 1][0]
  }
  rng.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  return rng
}

/** hash stringa → seed */
export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
