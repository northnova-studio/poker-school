// Formattazione italiana condivisa
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('it-IT')
export const fmtEur = (v: number, decimals = false) => (decimals ? eur2 : eur).format(v)
export const fmtSignedEur = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${eur.format(Math.abs(v))}`
export const fmtNum = (v: number) => num.format(v)
export const fmtPct = (v: number | null, digits = 1) => (v === null ? '—' : `${v.toFixed(digits).replace('.', ',')}%`)
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const FORMAT_LABEL = { MTT: 'MTT', SPIN: 'Spin & Go', CASH: 'Cash game', MENTAL: 'Mental game', ALL: 'Tutti i formati' } as const
export const LEVEL_LABEL = { MICRO: 'Micro', LOW: 'Low', MID: 'Mid', HIGH: 'High' } as const
export const TIER_LABEL = {
  FISH: 'Fish',
  CALLING_STATION: 'Calling Station',
  REG: 'Reg',
  GRINDER: 'Grinder',
  SHARK: 'Shark',
  CRUSHER: 'Crusher',
  LEGEND: 'Legend',
} as const
export const TIER_ORDER = ['FISH', 'CALLING_STATION', 'REG', 'GRINDER', 'SHARK', 'CRUSHER', 'LEGEND'] as const
export const DIVISION_LABEL = { 3: 'III', 2: 'II', 1: 'I' } as const
