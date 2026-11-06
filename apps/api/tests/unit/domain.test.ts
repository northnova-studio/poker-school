import { describe, expect, it } from 'vitest'
import { cardOverall, cardRarity, volumeAttribute } from '../../src/modules/cards/domain.js'
import { answerDistribution, computeStreak } from '../../src/modules/daily-spot/domain.js'
import { computeMakeup, normalizeAmount, planSettlement, summarizeDeal, validShares, type LedgerLike } from '../../src/modules/staking/domain.js'
import { computeMrr, financeSummary, monthsBetween } from '../../src/modules/finance/domain.js'
import { computePlayerStats, periodStart, sessionStreak, type SessionLike } from '../../src/modules/stats/domain.js'
import { ageOn, isoWeekId, romeDateKey, romeMonthRange } from '../../src/lib/dates.js'
import { decryptAesGcm, encryptAesGcm } from '../../src/lib/crypto.js'
import { detectMime } from '../../src/modules/kyc/files.js'
import { isAdult } from '../../src/modules/auth/service.js'
import { FILES } from '../helpers.js'

describe('Player Card', () => {
  it('overall = media pesata arrotondata', () => {
    expect(cardOverall({ pre: 80, post: 80, icm: 80, agg: 80, men: 80, vol: 80 })).toBe(80)
    // 0.2*90 + 0.2*70 + 0.15*60 + 0.1*99 + 0.15*50 + 0.2*40 = 66.4
    expect(cardOverall({ pre: 90, post: 70, icm: 60, agg: 99, men: 50, vol: 40 })).toBe(66)
  })
  it('rarità alle soglie', () => {
    expect([64, 65, 74, 75, 86, 87, 99].map((o) => cardRarity(o))).toEqual(['BRONZE', 'SILVER', 'SILVER', 'GOLD', 'GOLD', 'ICON', 'ICON'])
    expect(cardRarity(50, true)).toBe('ICON')
  })
  it('volume dagli ultimi 90 giorni (40–99)', () => {
    expect(volumeAttribute('MTT', 0)).toBe(40)
    expect(volumeAttribute('MTT', 1500)).toBe(99)
    expect(volumeAttribute('MTT', 99999)).toBe(99)
    const mid = volumeAttribute('SPIN', 600)
    expect(mid).toBeGreaterThan(40)
    expect(mid).toBeLessThan(99)
  })
})

describe('Daily Spot', () => {
  const spots = ['2026-11-06', '2026-11-05', '2026-11-04', '2026-11-03', '2026-11-01']
  it('streak consecutivo, oggi non ancora risposto non lo interrompe', () => {
    expect(computeStreak(spots, new Set(['2026-11-05', '2026-11-04']), '2026-11-06')).toBe(2)
    expect(computeStreak(spots, new Set(['2026-11-06', '2026-11-05', '2026-11-04']), '2026-11-06')).toBe(3)
    expect(computeStreak(spots, new Set(['2026-11-06', '2026-11-04']), '2026-11-06')).toBe(1)
    expect(computeStreak(spots, new Set(), '2026-11-06')).toBe(0)
  })
  it('un giorno senza spot pubblicato non interrompe lo streak', () => {
    expect(computeStreak(spots, new Set(spots), '2026-11-06')).toBe(5)
  })
  it('distribuzione percentuale per opzione', () => {
    expect(answerDistribution(['a', 'b', 'c'], [{ optionId: 'a' }, { optionId: 'a' }, { optionId: 'b' }])).toEqual({ a: 66.7, b: 33.3, c: 0 })
    expect(answerDistribution(['a', 'b'], [])).toEqual({ a: 0, b: 0 })
  })
})

describe('Staking', () => {
  const d = (n: number) => new Date(Date.UTC(2026, 10, n))
  const e = (type: LedgerLike['type'], amount: number, day: number): LedgerLike => ({ type, amount, date: d(day), createdAt: d(day) })

  it('segno normalizzato per tipo', () => {
    expect(normalizeAmount('TRANSFER_TO_PLAYER', 1000)).toBe(-1000)
    expect(normalizeAmount('TRANSFER_TO_PLAYER', -1000)).toBe(-1000)
    expect(normalizeAmount('RETURN_FROM_PLAYER', -200)).toBe(200)
    expect(normalizeAmount('SESSION_RESULT', -55.556)).toBe(-55.56)
  })

  it('makeup = max(0, −somma risultati dall’ultimo settlement)', () => {
    const entries = [e('TRANSFER_TO_PLAYER', -1000, 1), e('SESSION_RESULT', -300, 2), e('SESSION_RESULT', 100, 3)]
    expect(computeMakeup(entries)).toBe(200)
    expect(planSettlement(entries, 50)).toBeNull()
    entries.push(e('SESSION_RESULT', 700, 4))
    expect(computeMakeup(entries)).toBe(0)
    expect(planSettlement(entries, 50)).toEqual({ net: 500, schoolShare: 250, playerShare: 250 })
  })

  it('dopo il settlement si riparte da zero', () => {
    const entries = [
      e('SESSION_RESULT', 500, 1),
      { ...e('SETTLEMENT', 300, 2), settledNet: 500 },
      e('SESSION_RESULT', -120, 3),
      e('ADJUSTMENT', 20, 4),
    ]
    expect(computeMakeup(entries)).toBe(100)
    const s = summarizeDeal([e('TRANSFER_TO_PLAYER', -2000, 1), e('RETURN_FROM_PLAYER', 500, 1), ...entries])
    expect(s).toEqual({ capitalAllocated: 2000, capitalReturned: 500, netResult: 380, schoolProfit: 300, makeup: 100 })
  })

  it('split con quote non tonde: nessun centesimo perso', () => {
    const p = planSettlement([e('SESSION_RESULT', 100.01, 1)], 60)!
    expect(p.schoolShare + p.playerShare).toBeCloseTo(100.01, 2)
    expect(p.schoolShare).toBe(60.01)
  })

  it('le quote devono sommare 100', () => {
    expect(validShares(50, 50)).toBe(true)
    expect(validShares(60, 30)).toBe(false)
  })
})

describe('Finanze', () => {
  it('MRR: mensili + annuali/12, solo attivi', () => {
    expect(
      computeMrr([
        { status: 'ACTIVE', interval: 'month', amountEur: 89 },
        { status: 'ACTIVE', interval: 'year', amountEur: 2490 },
        { status: 'CANCELED', interval: 'month', amountEur: 39 },
        { status: 'PAST_DUE', interval: 'month', amountEur: 39 },
      ]),
    ).toBe(335.5)
  })
  it('riepilogo per categoria e per mese', () => {
    const from = new Date('2026-09-01T00:00:00Z')
    const to = new Date('2026-11-30T23:59:59Z')
    const s = financeSummary(
      [
        { date: new Date('2026-09-10'), type: 'INCOME', category: 'MEMBERSHIP', amount: 100 },
        { date: new Date('2026-11-02'), type: 'INCOME', category: 'COURSE', amount: 199 },
        { date: new Date('2026-11-03'), type: 'EXPENSE', category: 'HOSTING', amount: 25.5 },
        { date: new Date('2025-01-01'), type: 'INCOME', category: 'COURSE', amount: 999 },
      ],
      from,
      to,
      120,
    )
    expect(s.income).toBe(299)
    expect(s.expenses).toBe(25.5)
    expect(s.net).toBe(273.5)
    expect(s.mrr).toBe(120)
    expect(s.monthly.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(s.monthly[2]).toEqual({ month: '2026-11', income: 199, expenses: 25.5, net: 173.5 })
    expect(s.byCategory[0]).toEqual({ category: 'COURSE', type: 'INCOME', amount: 199 })
  })
  it('mesi tra due date', () => {
    expect(monthsBetween(new Date('2025-11-15T00:00:00Z'), new Date('2026-02-01T00:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
})

describe('Statistiche giocatore', () => {
  const s = (o: Partial<SessionLike>): SessionLike => ({
    date: new Date('2026-11-05T20:00:00Z'),
    format: 'MTT',
    durationMin: 240,
    games: 20,
    hands: null,
    avgBuyIn: 10,
    totalBuyIns: 200,
    totalCashes: 300,
    profit: 100,
    tilt: 2,
    badBeats: 1,
    bubbles: 1,
    deepRun: false,
    ...o,
  })
  const now = new Date('2026-11-06T12:00:00Z')

  it('profit, ROI, ABI, ITM, bb/100, serie cumulate', () => {
    const sessions = [
      s({ date: new Date('2026-11-04T20:00:00Z'), itmCount: 3 }),
      s({ profit: -150, totalCashes: 50, itmCount: 1, tilt: 4, bubbles: 2, deepRun: true }),
      s({ format: 'CASH', games: 6, hands: 2000, avgBuyIn: 0.25, totalBuyIns: 0, totalCashes: 50, profit: 50, bbWon: null, tilt: 1 }),
    ]
    const st = computePlayerStats('u1', '30d', 'ALL', sessions, { hoursStudied: 3.25, lessonsBooked: 4, lessonsAttended: 3, now })
    expect(st.profit).toBe(0)
    expect(st.roi).toBe(-12.5) // (100 − 150) / 400
    expect(st.abi).toBe(10)
    expect(st.itmPct).toBe(10) // 4 piazzamenti su 40 tornei
    expect(st.bb100).toBe(10) // 50€ / 0,25€ = 200bb su 2000 mani
    expect(st.games).toBe(46)
    expect(st.hands).toBe(2000)
    expect(st.tiltIndex).toBe(2.33)
    expect(st.bubbles).toBe(4)
    expect(st.deepRuns).toBe(1)
    expect(st.riverSuckouts).toBe(st.badBeats)
    expect(st.attendancePct).toBe(75)
    expect(st.hoursStudied).toBe(3.3)
    expect(st.hoursPlayed).toBe(12)
    expect(st.profitSeries).toEqual([
      { date: '2026-11-04T00:00:00.000Z', value: 100 },
      { date: '2026-11-05T00:00:00.000Z', value: 0 },
    ])
    expect(st.sessionStreakDays).toBe(2)
    expect(st.funFacts.length).toBeGreaterThanOrEqual(2)
    expect(st.funFacts.length).toBeLessThanOrEqual(4)
  })

  it('senza dati ITM o mani restituisce null (nessuna stima fuorviante)', () => {
    const st = computePlayerStats('u1', '7d', 'MTT', [s({})], { hoursStudied: 0, lessonsBooked: 0, lessonsAttended: 0, now })
    expect(st.itmPct).toBeNull()
    expect(st.bb100).toBeNull()
    expect(st.attendancePct).toBe(0)
  })

  it('periodo vuoto', () => {
    const st = computePlayerStats('u1', 'all', 'ALL', [], { hoursStudied: 0, lessonsBooked: 0, lessonsAttended: 0, now })
    expect(st).toMatchObject({ profit: 0, roi: null, abi: null, bb100: null, games: 0, sessionsCount: 0, tiltIndex: 0, profitSeries: [] })
    expect(st.funFacts.length).toBeGreaterThanOrEqual(2)
  })

  it('inizio periodo e streak sessioni', () => {
    expect(periodStart('all', now)).toBeNull()
    expect(periodStart('7d', now)!.toISOString()).toBe('2026-10-30T12:00:00.000Z')
    expect(periodStart('ytd', now)!.toISOString()).toBe('2025-12-31T23:00:00.000Z') // 1 gennaio a Roma
    expect(sessionStreak(['2026-11-05', '2026-11-04', '2026-11-02'], now)).toBe(2)
  })
})

describe('Date (Europe/Rome)', () => {
  it('chiave giorno e settimana ISO', () => {
    expect(romeDateKey(new Date('2026-11-05T23:30:00Z'))).toBe('2026-11-06')
    expect(isoWeekId(new Date('2026-11-06T10:00:00Z'))).toBe('2026-W45')
    expect(isoWeekId(new Date('2027-01-01T10:00:00Z'))).toBe('2026-W53')
  })
  it('mese: fine alle 23:59 dell’ultimo giorno (ora di Roma)', () => {
    const r = romeMonthRange(new Date('2026-11-06T10:00:00Z'))
    expect(r.start.toISOString()).toBe('2026-10-31T23:00:00.000Z')
    expect(r.end.toISOString()).toBe('2026-11-30T22:59:59.999Z')
    const summer = romeMonthRange(new Date('2026-07-15T10:00:00Z'))
    expect(summer.start.toISOString()).toBe('2026-06-30T22:00:00.000Z')
  })
  it('età e maggiore età', () => {
    expect(ageOn('2008-11-06', '2026-11-06')).toBe(18)
    expect(ageOn('2008-11-07', '2026-11-06')).toBe(17)
    expect(isAdult('2008-11-06', '2026-11-06')).toBe(true)
    expect(isAdult('2008-11-07', '2026-11-06')).toBe(false)
    expect(isAdult('2007-02-30', '2026-11-06')).toBe(false) // data inesistente
  })
})

describe('Crittografia e file KYC', () => {
  it('AES-256-GCM: round-trip e AAD vincolante', () => {
    const key = Buffer.alloc(32, 1)
    const blob = encryptAesGcm(key, FILES.png, 'kyc-file:a')
    expect(blob.ciphertext.equals(FILES.png)).toBe(false)
    expect(decryptAesGcm(key, blob, 'kyc-file:a').equals(FILES.png)).toBe(true)
    expect(() => decryptAesGcm(key, blob, 'kyc-file:b')).toThrow()
    expect(() => decryptAesGcm(Buffer.alloc(32, 2), blob, 'kyc-file:a')).toThrow()
  })
  it('magic bytes', () => {
    expect(detectMime(FILES.jpeg)).toBe('image/jpeg')
    expect(detectMime(FILES.png)).toBe('image/png')
    expect(detectMime(FILES.pdf)).toBe('application/pdf')
    expect(detectMime(FILES.heic)).toBe('image/heic')
    expect(detectMime(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('image/webp')
    expect(detectMime(FILES.text)).toBeNull()
  })
})
