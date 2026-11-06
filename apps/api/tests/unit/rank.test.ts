import { describe, expect, it } from 'vitest'
import {
  buildLeaderboard,
  cappedXp,
  dailySpotXp,
  divisionStarts,
  isStreakMilestone,
  seasonName,
  sessionXp,
  softResetXp,
  studyXp,
  tierForXp,
} from '../../src/modules/rank/domain.js'

describe('tier e divisioni (docs/RANK.md)', () => {
  it.each([
    [0, 'FISH', 3, 0, 100],
    [99, 'FISH', 3, 99, 100],
    [100, 'FISH', 2, 0, 100],
    [200, 'FISH', 1, 0, 100],
    [299, 'FISH', 1, 99, 100],
    [300, 'CALLING_STATION', 3, 0, 200],
    [899, 'CALLING_STATION', 1, 199, 200],
    [900, 'REG', 3, 0, 367],
    [1266, 'REG', 3, 366, 367],
    [1267, 'REG', 2, 0, 366],
    [1632, 'REG', 2, 365, 366],
    [1633, 'REG', 1, 0, 367],
    [1999, 'REG', 1, 366, 367],
    [2000, 'GRINDER', 3, 0, 600],
    [3800, 'SHARK', 3, 0, 900],
    [6500, 'CRUSHER', 3, 0, 1167],
    [7666, 'CRUSHER', 3, 1166, 1167],
    [7667, 'CRUSHER', 2, 0, 1166],
    [8833, 'CRUSHER', 1, 0, 1167],
    [10000, 'LEGEND', 3, 0, 1500],
    [13000, 'LEGEND', 1, 0, 1500],
    [14499, 'LEGEND', 1, 1499, 1500],
    [20000, 'LEGEND', 1, 7000, 1500],
  ])('%i XP → %s div %i', (xp, tier, division, into, width) => {
    const r = tierForXp(xp)
    expect(r.tier).toBe(tier)
    expect(r.division).toBe(division)
    expect(r.xpIntoDivision).toBe(into)
    expect(r.xpForNextDivision).toBe(width)
  })

  it('esempio REG del documento: III 900–1266, II 1267–1632, I 1633–1999', () => {
    expect(divisionStarts(900, 2000)).toEqual([900, 1267, 1633])
  })

  it('XP negativo o decimale viene normalizzato', () => {
    expect(tierForXp(-50).tier).toBe('FISH')
    expect(tierForXp(299.9).division).toBe(1)
  })
})

describe('XP per evento', () => {
  it('sessione: 20 + 1 ogni 10 giochi (max +30), solo 3 sessioni al giorno', () => {
    expect(sessionXp(0, 0)).toBe(20)
    expect(sessionXp(9, 0)).toBe(20)
    expect(sessionXp(95, 0)).toBe(29)
    expect(sessionXp(5000, 0)).toBe(50)
    expect(sessionXp(100, 2)).toBe(30)
    expect(sessionXp(100, 3)).toBe(0)
  })

  it('studio: 15 XP/ora con tetto di 4 ore (60 XP) al giorno', () => {
    expect(studyXp(60, 0)).toBe(15)
    expect(studyXp(90, 0)).toBe(23)
    expect(studyXp(300, 0)).toBe(60)
    expect(studyXp(60, 50)).toBe(10)
    expect(studyXp(60, 60)).toBe(0)
  })

  it('tetti settimanali (hand review 5, voti roast 10)', () => {
    expect(cappedXp(25, 4, 5)).toBe(25)
    expect(cappedXp(25, 5, 5)).toBe(0)
    expect(cappedXp(3, 10, 10)).toBe(0)
  })

  it('daily spot: 15 se corretta, 5 per il tentativo', () => {
    expect(dailySpotXp(true)).toEqual({ xp: 15, label: 'Daily Spot — risposta corretta' })
    expect(dailySpotXp(false)).toEqual({ xp: 5, label: 'Daily Spot — tentativo' })
  })

  it('bonus streak ogni 7 giorni', () => {
    expect([1, 6, 7, 8, 14, 21].map(isStreakMilestone)).toEqual([false, false, true, false, true, true])
  })
})

describe('stagioni e classifica', () => {
  it('soft reset al 30% arrotondato per difetto', () => {
    expect(softResetXp(1234)).toBe(370)
    expect(softResetXp(9)).toBe(2)
    expect(softResetXp(0)).toBe(0)
  })

  it('nome stagione', () => {
    expect(seasonName(1, 2026, 10)).toBe('Stagione 1 — Novembre 2026')
  })

  it('classifica con delta rispetto a 7 giorni prima', () => {
    const now = [
      { userId: 'a', xp: 500 },
      { userId: 'b', xp: 900 },
      { userId: 'c', xp: 100 },
    ]
    const before = [
      { userId: 'a', xp: 400 },
      { userId: 'b', xp: 100 },
      { userId: 'c', xp: 50 },
    ]
    const lb = buildLeaderboard(now, before)
    expect(lb.map((r) => [r.userId, r.position, r.delta])).toEqual([
      ['b', 1, 1],
      ['a', 2, -1],
      ['c', 3, 0],
    ])
    expect(lb[0].tier).toBe('REG')
  })
})
