// Dati dimostrativi (studenti, sessioni, community, staking, finanze) per provare tutto.
// Mai in produzione salvo SEED_DEMO=true. Tutti i numeri sono inventati (demo).
import bcrypt from 'bcryptjs'
import { env } from '../../src/config/env.js'
import { addDays, dateKeyToDbDate, isoWeekId, romeDateKey, romeLocalToUtc, romeParts } from '../../src/lib/dates.js'
import { round2 } from '../../src/lib/money.js'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { ensureCurrentSeason } from '../../src/modules/rank/service.js'
import * as kyc from '../../src/modules/kyc/service.js'
import { sessionXp } from '../../src/modules/rank/domain.js'
import { DEV_PASSWORDS } from './base.js'

type Db = PrismaClient
type Fmt = 'MTT' | 'SPIN' | 'CASH'

// PRNG deterministico: il seed produce sempre gli stessi dati
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261106)
const between = (a: number, b: number) => a + rnd() * (b - a)
const int = (a: number, b: number) => Math.floor(between(a, b + 1))
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]
const gauss = () => {
  const u = 1 - rnd()
  const v = rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

const STUDENTS = [
  { id: 'u-marco', nickname: 'marco_mtt', firstName: 'Marco', lastName: 'Rossi', formats: ['MTT'], level: 'LOW', plan: 'pro', interval: 'month', kyc: 'APPROVED', coachId: 'c-matteo', share: true, roast: true, joined: 110, xp: 1450, drift: 0.12 },
  { id: 'u-giulia', nickname: 'giulia.spin', firstName: 'Giulia', lastName: 'Bianchi', formats: ['SPIN'], level: 'MID', plan: 'elite', interval: 'year', kyc: 'APPROVED', coachId: 'c-fabri', share: true, roast: false, joined: 95, xp: 2600, drift: 0.08 },
  { id: 'u-luca', nickname: 'luca_cash', firstName: 'Luca', lastName: 'Verdi', formats: ['CASH'], level: 'MICRO', plan: 'base', interval: 'month', kyc: 'PENDING', coachId: null, share: false, roast: true, joined: 12, xp: 320, drift: 0.02 },
  { id: 'u-sara', nickname: 'sara_grind', firstName: 'Sara', lastName: 'Neri', formats: ['MTT', 'SPIN'], level: 'LOW', plan: 'pro', interval: 'year', kyc: 'APPROVED', coachId: 'c-matteo', share: true, roast: true, joined: 70, xp: 980, drift: 0.05 },
  { id: 'u-ale', nickname: 'ale_fish', firstName: 'Alessandro', lastName: 'Gallo', formats: ['MTT'], level: 'MICRO', plan: null, interval: null, kyc: 'NONE', coachId: null, share: false, roast: false, joined: 6, xp: 90, drift: -0.2 },
  { id: 'u-nico', nickname: 'nico_reg', firstName: 'Nicola', lastName: 'Costa', formats: ['MTT'], level: 'MID', plan: 'elite', interval: 'month', kyc: 'APPROVED', coachId: 'c-matteo', share: true, roast: true, joined: 120, xp: 4100, drift: -0.15 },
  { id: 'u-fede', nickname: 'fede_hu', firstName: 'Federica', lastName: 'Ricci', formats: ['SPIN'], level: 'LOW', plan: 'base', interval: 'month', kyc: 'REJECTED', coachId: 'c-fabri', share: true, roast: false, joined: 40, xp: 650, drift: 0.03 },
] as const

const ABI: Record<Fmt, Record<string, number>> = {
  MTT: { MICRO: 5, LOW: 15, MID: 45, HIGH: 110 },
  SPIN: { MICRO: 2, LOW: 10, MID: 25, HIGH: 50 },
  CASH: { MICRO: 0.1, LOW: 0.25, MID: 0.5, HIGH: 2 },
}

function genSession(fmt: Fmt, level: string, drift: number, date: Date) {
  const abi = ABI[fmt][level]
  const tilt = Math.min(5, Math.max(1, Math.round(2 + gauss() * 1.1)))
  const badBeats = int(0, 5)
  if (fmt === 'CASH') {
    const hands = int(500, 3000)
    const bbWon = round2(((drift * 40 + gauss() * 35) * hands) / 100)
    const profit = round2(bbWon * abi)
    return { date, format: fmt, durationMin: int(90, 300), games: int(4, 12), hands, avgBuyIn: abi, totalBuyIns: 0, totalCashes: Math.max(0, profit), profit, chipEvBb100: null, bbWon, tilt, badBeats, bubbles: 0, deepRun: false }
  }
  const games = fmt === 'MTT' ? int(8, 45) : int(40, 180)
  const totalBuyIns = round2(games * abi * between(0.85, 1.15))
  const roiMult = fmt === 'MTT' ? Math.max(0, 1 + drift + gauss() * 1.1 + (rnd() < 0.06 ? between(3, 9) : 0)) : Math.max(0, 1 + drift / 2 + gauss() * 0.35)
  const totalCashes = round2(totalBuyIns * roiMult)
  return {
    date,
    format: fmt,
    durationMin: int(120, 480),
    games,
    itmCount: totalCashes > 0 ? Math.max(1, Math.round(games * (fmt === 'MTT' ? between(0.1, 0.22) : between(0.3, 0.5)))) : 0,
    hands: null,
    avgBuyIn: abi,
    totalBuyIns,
    totalCashes,
    profit: round2(totalCashes - totalBuyIns),
    chipEvBb100: fmt === 'SPIN' ? round2(gauss() * 15 + drift * 60) : null,
    bbWon: null,
    tilt,
    badBeats,
    bubbles: fmt === 'MTT' ? int(0, 2) : 0,
    deepRun: fmt === 'MTT' && rnd() < 0.08,
  }
}

const XP_PALETTE: { type: 'STUDY_HOURS' | 'LESSON_ATTENDED' | 'DAILY_SPOT_CORRECT' | 'HAND_REVIEW_SUBMITTED' | 'ROAST_VOTE'; xp: number; label: string }[] = [
  { type: 'STUDY_HOURS', xp: 30, label: 'Studio: 2 ore di video' },
  { type: 'STUDY_HOURS', xp: 60, label: 'Studio: 4 ore di video' },
  { type: 'LESSON_ATTENDED', xp: 40, label: 'Lezione di gruppo' },
  { type: 'DAILY_SPOT_CORRECT', xp: 15, label: 'Daily Spot — risposta corretta' },
  { type: 'DAILY_SPOT_CORRECT', xp: 5, label: 'Daily Spot — tentativo' },
  { type: 'HAND_REVIEW_SUBMITTED', xp: 25, label: 'Mano inviata in review' },
  { type: 'ROAST_VOTE', xp: 3, label: 'Voto al Roast della settimana' },
]

export async function seedDemo(db: Db) {
  if (await db.user.findUnique({ where: { id: 'u-marco' } })) {
    console.log('[seed] dati demo già presenti: salto')
    return
  }
  const now = new Date()
  const season = await ensureCurrentSeason(now)
  const hash = await bcrypt.hash(DEV_PASSWORDS.student, env.isTest ? 4 : 10)
  const plans = await db.plan.findMany()
  const price = (p: string, i: string) => {
    const row = plans.find((x) => x.id === p)!
    return Number(i === 'year' ? row.priceYearly : row.priceMonthly)
  }

  // ── Studenti ────────────────────────────────────────────────────────────
  for (const s of STUDENTS) {
    const createdAt = addDays(now, -s.joined)
    await db.user.create({
      data: {
        id: s.id,
        email: `${s.nickname.replace(/[^a-z0-9]/gi, '')}@demo.tris.local`,
        passwordHash: hash,
        nickname: s.nickname,
        firstName: s.firstName,
        lastName: s.lastName,
        birthDate: new Date(`${1988 + int(0, 12)}-0${int(1, 9)}-1${int(0, 9)}T00:00:00Z`),
        avatarSeed: s.nickname,
        formats: [...s.formats],
        mainLevel: s.level,
        plan: s.plan,
        planInterval: s.interval,
        coachId: s.coachId,
        discordHandle: `${s.nickname}#${int(1000, 9999)}`,
        gamingTag: rnd() < 0.6 ? `${s.firstName}${int(10, 99)}` : null,
        shareResultsPublicly: s.share,
        roastOptIn: s.roast,
        marketingOptIn: rnd() < 0.5,
        termsAcceptedAt: createdAt,
        termsVersion: env.LEGAL_TERMS_VERSION,
        privacyAcceptedAt: createdAt,
        privacyVersion: env.LEGAL_PRIVACY_VERSION,
        createdAt,
      },
    })
    if (s.plan && s.interval)
      await db.subscription.create({
        data: {
          userId: s.id,
          plan: s.plan,
          interval: s.interval,
          status: 'ACTIVE',
          provider: 'MANUAL',
          amountEur: price(s.plan, s.interval),
          currentPeriodStart: createdAt,
          currentPeriodEnd: addDays(createdAt, s.interval === 'year' ? 365 : 30),
          createdAt,
        },
      })
  }
  // un ex iscritto (churn negli ultimi 30 giorni)
  const exCreated = addDays(now, -80)
  await db.user.create({
    data: {
      id: 'u-ex',
      email: 'ex.iscritto@demo.tris.local',
      passwordHash: hash,
      nickname: 'ex_iscritto',
      firstName: 'Paolo',
      lastName: 'Fontana',
      birthDate: new Date('1992-03-14T00:00:00Z'),
      avatarSeed: 'ex_iscritto',
      formats: ['CASH'],
      mainLevel: 'MICRO',
      termsAcceptedAt: exCreated,
      termsVersion: env.LEGAL_TERMS_VERSION,
      privacyAcceptedAt: exCreated,
      privacyVersion: env.LEGAL_PRIVACY_VERSION,
      createdAt: exCreated,
      subscriptions: {
        create: { plan: 'base', interval: 'month', status: 'CANCELED', provider: 'MANUAL', amountEur: price('base', 'month'), createdAt: exCreated, canceledAt: addDays(now, -9) },
      },
    },
  })

  // ── KYC ─────────────────────────────────────────────────────────────────
  const admin = await db.user.findUniqueOrThrow({ where: { id: 'c-lorenzo' } })
  for (const s of STUDENTS.filter((x) => x.kyc === 'APPROVED')) {
    const reviewedAt = addDays(now, -Math.max(1, s.joined - 2))
    await db.kycSubmission.create({
      data: {
        userId: s.id,
        documentType: pick(['ID_CARD', 'PASSPORT', 'DRIVING_LICENSE'] as const),
        documentNumberLast4: String(int(1000, 9999)),
        status: 'APPROVED',
        consentAt: addDays(reviewedAt, -1),
        submittedAt: addDays(reviewedAt, -1),
        reviewedAt,
        reviewerId: admin.id,
        // documenti già cancellati dalla retention se l'esito è più vecchio di KYC_RETENTION_DAYS
        filesPurgedAt: s.joined - 2 > env.KYC_RETENTION_DAYS ? addDays(reviewedAt, env.KYC_RETENTION_DAYS) : null,
      },
    })
    await db.user.update({ where: { id: s.id }, data: { kycStatus: 'APPROVED', kycConsentAt: addDays(reviewedAt, -1) } })
  }
  const files = { front: { buffer: TINY_PNG, size: TINY_PNG.length }, back: { buffer: TINY_PNG, size: TINY_PNG.length }, selfie: { buffer: TINY_PNG, size: TINY_PNG.length } }
  const luca = await db.user.findUniqueOrThrow({ where: { id: 'u-luca' } })
  await kyc.submit(luca, { documentType: 'ID_CARD', documentNumberLast4: '4821' }, files, {})
  const fede = await db.user.findUniqueOrThrow({ where: { id: 'u-fede' } })
  const fedeSub = await kyc.submit(fede, { documentType: 'DRIVING_LICENSE', documentNumberLast4: '7730' }, files, {})
  await kyc.review(admin, fedeSub.id, 'REJECTED', 'Foto del documento sfocata: ricarica un fronte leggibile')

  // ── Staking (prima delle sessioni, per collegare i risultati) ──────────
  const giuliaDeal = await db.stakingDeal.create({
    data: { userId: 'u-giulia', format: 'SPIN', startDate: addDays(now, -60), schoolSharePct: 50, playerSharePct: 50, maxAbi: 25, notes: 'Accordo demo: spin €10-25', createdById: admin.id },
  })
  const nicoDeal = await db.stakingDeal.create({
    data: { userId: 'u-nico', format: 'MTT', startDate: addDays(now, -45), schoolSharePct: 60, playerSharePct: 40, maxAbi: 50, notes: 'Accordo demo: MTT ABI max €50', createdById: admin.id },
  })
  await db.ledgerEntry.createMany({
    data: [
      { dealId: giuliaDeal.id, date: addDays(now, -60), type: 'TRANSFER_TO_PLAYER', amount: -3000, note: 'Capitale iniziale', createdById: admin.id, createdAt: addDays(now, -60) },
      { dealId: nicoDeal.id, date: addDays(now, -45), type: 'TRANSFER_TO_PLAYER', amount: -5000, note: 'Capitale iniziale', createdById: admin.id, createdAt: addDays(now, -45) },
      { dealId: nicoDeal.id, date: addDays(now, -20), type: 'TRANSFER_TO_PLAYER', amount: -1500, note: 'Ricarica', createdById: admin.id, createdAt: addDays(now, -20) },
    ],
  })

  // ── Sessioni ────────────────────────────────────────────────────────────
  for (const s of STUDENTS) {
    const days = Math.min(90, s.joined)
    const count = Math.max(2, Math.round(days * between(0.25, 0.45)))
    const dayOffsets = [...new Set(Array.from({ length: count }, () => int(0, days - 1)))].sort((a, b) => b - a)
    for (const d of dayOffsets) {
      const date = new Date(addDays(now, -d).getTime() - int(1, 8) * 3600_000)
      const fmt = pick(s.formats) as Fmt
      const g = genSession(fmt, s.level, s.drift, date)
      const deal = s.id === 'u-giulia' && fmt === 'SPIN' && d < 60 ? giuliaDeal : s.id === 'u-nico' && d < 45 ? nicoDeal : null
      const row = await db.session.create({ data: { userId: s.id, ...g, staked: Boolean(deal), notes: g.deepRun ? 'Deep run! Rail pazzesco' : null, createdAt: date } })
      if (deal)
        await db.ledgerEntry.create({
          data: { dealId: deal.id, date, type: 'SESSION_RESULT', amount: g.profit, note: `Sessione ${fmt} (${g.games} giochi)`, createdById: s.id, sessionId: row.id, createdAt: date },
        })
      if (date >= season.startsAt)
        await db.xpEvent.create({
          data: { userId: s.id, seasonId: season.id, type: 'SESSION_LOGGED', xp: sessionXp(g.games, 0), label: `Sessione registrata (${fmt}, ${g.games} giochi)`, refId: row.id, createdAt: date },
        })
    }
  }
  // Giulia in profitto netto (settlement possibile), Nico in makeup: rettifiche demo
  const sumDeal = async (dealId: string) =>
    (await db.ledgerEntry.findMany({ where: { dealId, type: 'SESSION_RESULT' } })).reduce((a, e) => a + Number(e.amount), 0)
  const gNet = await sumDeal(giuliaDeal.id)
  if (gNet <= 200)
    await db.ledgerEntry.create({ data: { dealId: giuliaDeal.id, date: addDays(now, -2), type: 'ADJUSTMENT', amount: round2(650 - gNet), note: 'Rettifica demo (rakeback)', createdById: admin.id, createdAt: addDays(now, -2) } })
  const nNet = await sumDeal(nicoDeal.id)
  if (nNet >= -300)
    await db.ledgerEntry.create({ data: { dealId: nicoDeal.id, date: addDays(now, -3), type: 'ADJUSTMENT', amount: round2(-900 - nNet), note: 'Rettifica demo (sessioni live non tracciate)', createdById: admin.id, createdAt: addDays(now, -3) } })

  // ── XP della stagione fino al target di ciascuno ───────────────────────
  const spanMs = Math.max(3600_000, now.getTime() - season.startsAt.getTime() - 2 * 3600_000)
  for (const s of STUDENTS) {
    const agg = await db.xpEvent.aggregate({ where: { userId: s.id, seasonId: season.id }, _sum: { xp: true } })
    let remaining = s.xp - (agg._sum.xp ?? 0)
    while (remaining > 0) {
      const p = pick(XP_PALETTE)
      const xp = Math.min(p.xp, remaining)
      await db.xpEvent.create({
        data: { userId: s.id, seasonId: season.id, type: p.type, xp, label: p.label, createdAt: new Date(season.startsAt.getTime() + 3600_000 + rnd() * spanMs) },
      })
      remaining -= xp
    }
  }
  const badges = await db.badge.findMany()
  const badgeId = (k: string) => badges.find((b) => b.key === k)!.id
  for (const s of STUDENTS) await db.userBadge.create({ data: { userId: s.id, badgeId: badgeId('first-session'), earnedAt: addDays(now, -Math.min(s.joined, 30)) } })
  await db.userBadge.create({ data: { userId: 'u-nico', badgeId: badgeId('deep-run') } })
  await db.userBadge.create({ data: { userId: 'u-giulia', badgeId: badgeId('bounty-hunter'), earnedAt: addDays(now, -20) } })
  await db.userBadge.create({ data: { userId: 'u-marco', badgeId: badgeId('streak-7'), earnedAt: addDays(now, -3) } })

  // ── Player Card ─────────────────────────────────────────────────────────
  const cards: Record<string, [number, number, number, number, number]> = {
    'u-marco': [68, 64, 61, 70, 72],
    'u-giulia': [79, 74, 83, 80, 76],
    'u-sara': [66, 63, 60, 62, 70],
    'u-nico': [82, 80, 84, 77, 71],
    'u-fede': [62, 58, 64, 66, 60],
  }
  for (const [userId, [pre, post, icm, agg, men]] of Object.entries(cards)) {
    const st = STUDENTS.find((x) => x.id === userId)!
    await db.playerCard.create({ data: { userId, mainFormat: st.formats[0], pre, post, icm, agg, men, vol: 40, volAuto: true, updatedByCoachId: st.coachId } })
  }

  // ── Daily Spot ──────────────────────────────────────────────────────────
  const todayKey = romeDateKey(now)
  const spotDefs = [
    { format: 'MTT', title: 'Bolla, big stack in CO', situation: 'Bolla di un MTT da 1.200 iscritti, 9 left to ITM. Folda fino a te in CO.', heroCards: 'KhJh', board: null, stacksBb: 'Hero 48bb CO vs BTN 12bb, SB 25bb, BB 30bb', opts: ['Fold', 'Open 2bb', 'Shove'], correct: 'b', expl: 'Con 48bb in bolla e short stack dietro, KJs è un open standard: metti pressione sugli stack medi che non possono reagire.' },
    { format: 'SPIN', title: '3-handed dal bottone', situation: 'Spin & Go, 3-handed, livello 3. Sei al bottone.', heroCards: 'Ts8s', board: null, stacksBb: 'Hero 18bb BTN vs SB 25bb, BB 7bb', opts: ['Fold', 'Min-raise', 'Shove'], correct: 'b', expl: 'Con il BB corto il min-raise sfrutta la fold equity contro lo SB e mantiene giocabile la mano contro un BB che shova ampio.' },
    { format: 'CASH', title: 'Turn barrel in SRP', situation: 'NL25 6-max, apri dal CO e il BB chiama. Flop Ks7d2c: c-bet 33%, call.', heroCards: 'AdQd', board: 'Ks7d2c5d', stacksBb: '100bb effettivi', opts: ['Check', 'Bet 50%', 'Bet 120%'], correct: 'b', expl: 'Il 5d ti dà il flush draw nut: continuare con bet medio protegge equity e polarizza bene il range.' },
    { format: 'MTT', title: 'Final table, short stack', situation: 'Final table, 7 left, pay jump importante. Folda fino a te in SB.', heroCards: 'A5o', board: null, stacksBb: 'Hero 9bb SB vs BB 40bb', opts: ['Fold', 'Limp', 'Shove'], correct: 'c', expl: 'A 9bb contro un BB coperto ma non enorme, A5o è uno shove profittevole anche considerando ICM.' },
    { format: 'SPIN', title: 'Heads-up a 12bb', situation: 'Spin & Go, heads-up. Sei in SB/BTN.', heroCards: 'Q4s', board: null, stacksBb: 'Hero 12bb vs 38bb', opts: ['Fold', 'Min-raise', 'Shove'], correct: 'c', expl: 'Sotto i 15bb in heads-up Q4s è uno shove di equilibrio: il min-raise ti espone a reshove senza abbastanza equity.' },
    { format: 'MTT', title: 'River: thin value?', situation: 'MTT mid stage, 3-bet pot vs reg aggressivo. Board secco, villain checka il river.', heroCards: 'AsJc', board: 'Jd8s3h2c4d', stacksBb: 'Effettivi 22bb dietro, pot 14bb', opts: ['Check', 'Bet 30%', 'Shove'], correct: 'b', expl: 'Top pair top kicker su board secco: un bet piccolo viene pagato da coppie peggiori e non ti fa folding out.' },
    { format: 'CASH', title: '3-bet o call dal BB?', situation: 'NL10 6-max, BTN apre 2.5bb, SB folda.', heroCards: 'KcTs', board: null, stacksBb: '100bb', opts: ['Fold', 'Call', '3-bet 11bb'], correct: 'b', expl: 'KTo contro un open dal BTN si difende principalmente in call: il 3-bet resta per una parte polarizzata del range.' },
  ] as const
  const spots: { id: string; key: string }[] = []
  for (let i = 0; i < spotDefs.length; i++) {
    const offset = i - 5 // 5 giorni fa → domani
    const key = romeDateKey(addDays(now, offset))
    const d = spotDefs[i]
    const coachId = d.format === 'SPIN' ? 'c-fabri' : d.format === 'CASH' ? 'c-matteo' : 'c-matteo'
    const spot = await db.dailySpot.create({
      data: {
        date: dateKeyToDbDate(key),
        format: d.format,
        title: d.title,
        situation: d.situation,
        heroCards: d.heroCards,
        board: d.board,
        stacksBb: d.stacksBb,
        options: d.opts.map((label, j) => ({ id: 'abc'[j], label })),
        correctOptionId: d.correct,
        explanation: d.expl,
        coachId,
      },
    })
    spots.push({ id: spot.id, key })
  }
  const answering: Record<string, number> = { 'u-marco': 5, 'u-giulia': 3, 'u-sara': 4, 'u-nico': 2, 'u-fede': 1 }
  for (const [userId, n] of Object.entries(answering)) {
    const past = spots.filter((s) => s.key < todayKey).slice(-n)
    for (const s of past) {
      const optionId = rnd() < 0.65 ? spotDefs[spots.indexOf(s)].correct : pick(['a', 'b', 'c'])
      await db.dailySpotAnswer.create({ data: { spotId: s.id, userId, optionId, correct: optionId === spotDefs[spots.indexOf(s)].correct } })
    }
  }
  const todaySpot = spots.find((s) => s.key === todayKey)!
  for (const userId of ['u-giulia', 'u-nico']) {
    const optionId = pick(['a', 'b', 'b', 'c'])
    await db.dailySpotAnswer.create({ data: { spotId: todaySpot.id, userId, optionId, correct: optionId === spotDefs[spots.indexOf(todaySpot)].correct } })
  }

  // ── Roast della settimana ──────────────────────────────────────────────
  const week = isoWeekId(now)
  const roastDefs = [
    { title: 'Hero call con terza coppia', description: 'River overbet di un reg (nickname rimosso), hero chiama con 88 su board A-K-Q-J-4. "Mi sembrava un bluff."', format: 'CASH', heroCards: '8h8d', board: 'AsKdQcJh4s', by: 'u-marco', own: true, comment: 'Marco, quel board aveva più scale di un condominio. Fabri' },
    { title: 'Slowplay di AA a 3-way', description: 'Hero limpa AA da UTG in bolla, flop monotone, perde contro colore runner-runner. Mano anonimizzata.', format: 'MTT', heroCards: 'AcAd', board: '9h6h2h', by: 'u-nico', own: true, comment: null },
    { title: 'Fold perfetto di KK preflop', description: 'Final table, ICM pesante: hero folda KK contro 4-bet shove + call. Lettura del pay jump da manuale.', format: 'MTT', heroCards: 'KsKh', board: null, by: 'u-sara', own: false, comment: 'Questo è giocare a poker. Matte' },
  ] as const
  const roastIds: string[] = []
  for (const r of roastDefs) {
    const author = STUDENTS.find((s) => s.id === r.by)!
    const spot = await db.roastSpot.create({
      data: {
        weekId: week,
        title: r.title,
        description: r.description,
        format: r.format,
        heroCards: r.heroCards,
        board: r.board,
        submittedByUserId: r.by,
        playedByMember: r.own && author.roast,
        founderComment: r.comment,
        createdAt: addDays(now, -int(0, 2)),
      },
    })
    roastIds.push(spot.id)
  }
  const voters = ['u-giulia', 'u-sara', 'u-fede', 'u-luca', 'u-nico', 'u-marco']
  for (const v of voters)
    for (const [i, id] of roastIds.entries()) if (rnd() < 0.7) await db.roastVote.create({ data: { spotId: id, userId: v, kind: i === 2 ? 'BEST' : rnd() < 0.8 ? 'WORST' : 'BEST' } })

  // ── Deep run ────────────────────────────────────────────────────────────
  const dr1 = await db.deepRun.create({ data: { userId: 'u-marco', tournamentName: 'Sunday Major €50', buyIn: 50, playersLeft: 87, totalPlayers: 2140, stackBb: 42, status: 'LIVE', startedAt: addDays(now, -0.2) } })
  const dr2 = await db.deepRun.create({ data: { userId: 'u-nico', tournamentName: 'High Roller serale €109', buyIn: 109, playersLeft: 9, totalPlayers: 412, stackBb: 28, status: 'FINAL_TABLE', startedAt: addDays(now, -0.3) } })
  await db.deepRun.create({ data: { userId: 'u-sara', tournamentName: 'Bounty Builder €22', buyIn: 22, playersLeft: 31, totalPlayers: 980, stackBb: 0, status: 'BUSTED', finishPosition: 31, startedAt: addDays(now, -1.2) } })
  for (const u of ['u-giulia', 'u-sara', 'c-fabri']) await db.deepRunRail.create({ data: { deepRunId: dr1.id, userId: u } })
  for (const u of ['u-marco', 'u-giulia', 'c-matteo', 'c-lorenzo']) await db.deepRunRail.create({ data: { deepRunId: dr2.id, userId: u } })
  await db.deepRunComment.create({ data: { deepRunId: dr1.id, userId: 'c-fabri', text: 'Stack sano, niente hero call stasera 😄' } })
  await db.deepRunComment.create({ data: { deepRunId: dr2.id, userId: 'c-matteo', text: 'Occhio al pay jump: il CO short shova largo.' } })
  await db.deepRunComment.create({ data: { deepRunId: dr2.id, userId: 'u-marco', text: 'Forza Nico!!' } })

  // ── Lobby gaming ────────────────────────────────────────────────────────
  const rome = (daysFromNow: number, h: number) => {
    const p = romeParts(addDays(now, daysFromNow))
    return romeLocalToUtc(p.year, p.month, p.day, h)
  }
  const night = await db.gamingEvent.create({
    data: { kind: 'NIGHT', game: 'Warzone', title: 'Warzone — lobby del giovedì', description: 'Quad dopo la sessione: si gioca, si scherza, si perde contro Lollo.', startsAt: rome(2, 22), hostUserId: 'c-lorenzo', maxParticipants: 16 },
  })
  for (const u of ['u-marco', 'u-nico', 'u-sara']) await db.gamingParticipant.create({ data: { eventId: night.id, userId: u } })
  await db.gamingEvent.create({
    data: { kind: 'BOUNTY_1V1', game: 'Warzone', title: 'Taglia su Lollo: 1v1', description: 'Batti Lorenzo in un 1v1 e vinci una lezione 1:1.', startsAt: rome(4, 21), hostUserId: 'c-lorenzo', maxParticipants: 1, prize: 'Lezione 1:1 gratis' },
  })
  const fc = await db.gamingEvent.create({
    data: { kind: 'TOURNAMENT', game: 'EA FC', title: 'Torneo EA FC della scuola', description: 'Eliminazione diretta, finale in diretta su Discord.', startsAt: rome(-10, 21), hostUserId: 'c-matteo', maxParticipants: 8, prize: 'Hand review prioritaria' },
  })
  for (const [u, points, won] of [['u-nico', 30, true], ['u-marco', 20, false], ['u-sara', 10, false], ['c-matteo', 5, false]] as const)
    await db.gamingParticipant.create({ data: { eventId: fc.id, userId: u, points, won } })
  const bounty = await db.gamingEvent.create({
    data: { kind: 'BOUNTY_1V1', game: 'Rocket League', title: 'Taglia su Fabri: 1v1', description: '1v1 al meglio delle tre.', startsAt: rome(-20, 22), hostUserId: 'c-fabri', maxParticipants: 1, prize: 'Lezione 1:1 gratis' },
  })
  await db.gamingParticipant.create({ data: { eventId: bounty.id, userId: 'u-giulia', points: 15, won: true, bountyClaimed: true } })

  // ── Lezioni di gruppo ───────────────────────────────────────────────────
  const lessons = [
    { title: 'ICM al tavolo finale', description: 'Review live di spot di final table inviati dagli studenti.', format: 'MTT', level: 'MID', coachId: 'c-matteo', startsAt: rome(2, 21), durationMin: 90, capacity: 30, minPlan: 'pro' },
    { title: 'Spin: HU a 15bb in diretta', description: 'Fabri gioca e commenta heads-up a stack corti.', format: 'SPIN', level: 'LOW', coachId: 'c-fabri', startsAt: rome(3, 21), durationMin: 75, capacity: 25, minPlan: 'base' },
    { title: 'Mental: routine pre-sessione', description: 'Warm-up, obiettivi di sessione e piano anti-tilt.', format: 'MENTAL', level: 'LOW', coachId: 'c-lorenzo', startsAt: rome(5, 19), durationMin: 60, capacity: 40, minPlan: 'base' },
    { title: 'Cash 6-max: review del database', description: 'Leak finder sui database degli studenti NL10-NL50.', format: 'CASH', level: 'LOW', coachId: 'c-matteo', startsAt: rome(7, 21), durationMin: 90, capacity: 20, minPlan: 'pro' },
    { title: 'MTT micro: open ranges', description: 'Le basi del preflop per chi inizia con i tornei.', format: 'MTT', level: 'MICRO', coachId: 'c-matteo', startsAt: rome(9, 20), durationMin: 60, capacity: 50, minPlan: 'base' },
    { title: 'Elite: review settimanale', description: 'Gruppo ristretto, review delle mani della settimana.', format: 'MTT', level: 'HIGH', coachId: 'c-matteo', startsAt: rome(6, 21), durationMin: 120, capacity: 12, minPlan: 'elite' },
    { title: 'Bolla: chi ha paura di chi', description: 'Dinamiche di bolla con esempi reali.', format: 'MTT', level: 'LOW', coachId: 'c-matteo', startsAt: rome(-6, 21), durationMin: 90, capacity: 30, minPlan: 'base' },
    { title: 'Spin: gestione della varianza', description: 'Bankroll e jackpot: numeri alla mano.', format: 'SPIN', level: 'LOW', coachId: 'c-fabri', startsAt: rome(-13, 21), durationMin: 60, capacity: 30, minPlan: 'base' },
  ] as const
  for (const l of lessons) {
    const row = await db.groupLesson.create({ data: { ...l, meetingUrl: 'https://meet.example.com/tris-lezione' } })
    const past = row.startsAt < now
    for (const s of STUDENTS.filter((x) => x.plan)) {
      if (rnd() < 0.55 || (past && rnd() < 0.3)) {
        const attended = past && rnd() < 0.75
        await db.booking.create({ data: { lessonId: row.id, userId: s.id, attendedAt: attended ? row.startsAt : null } })
      }
    }
    if (past) await db.groupLesson.update({ where: { id: row.id }, data: { recordingUrl: 'https://video.example.com/registrazione-demo' } })
  }

  // ── Hand review ─────────────────────────────────────────────────────────
  const hh = (t: string) => `PokerStars-like Hand #000 (anonimizzata)\nHero: ${t}\nVillain1, Villain2: nickname rimossi\n*** FLOP *** ...\n*** TURN *** ...\n*** RIVER *** ...`
  await db.handReview.create({ data: { userId: 'u-marco', format: 'MTT', title: 'Squeeze in bolla con AJo', description: 'Troppo loose?', handHistory: hh('AsJd'), coachId: 'c-matteo', createdAt: addDays(now, -1) } })
  await db.handReview.create({ data: { userId: 'u-luca', format: 'CASH', title: 'Check-raise del turn', description: 'Volevo capire il sizing', handHistory: hh('9c8c'), createdAt: addDays(now, -4) } })
  await db.handReview.create({
    data: { userId: 'u-sara', format: 'SPIN', title: 'HU a 10bb: shove o fold?', description: '', handHistory: hh('K7o'), status: 'REVIEWED', coachId: 'c-fabri', coachComment: 'Shove standard: K7o a 10bb è nettamente sopra il range di equilibrio. Brava a chiedere.', createdAt: addDays(now, -6), reviewedAt: addDays(now, -5) },
  })

  // ── Acquisti, progressi, note ───────────────────────────────────────────
  const buys = [
    ['u-marco', 'crs-icm', 199, 12],
    ['u-sara', 'crs-spin-method', 149, 25],
    ['u-luca', 'crs-cash6', 119, 5],
    ['u-fede', 'crs-spin-hu', 129, 33],
  ] as const
  for (const [userId, courseId, amount, ago] of buys) {
    const p = await db.purchase.create({ data: { userId, courseId, amountEur: amount, provider: 'DEMO', createdAt: addDays(now, -ago) } })
    await db.transaction.create({ data: { date: p.createdAt, type: 'INCOME', category: 'COURSE', amount, description: `Corso ${courseId} (demo)`, userId, source: 'SYSTEM', externalRef: `purchase:${p.id}` } })
  }
  for (const lessonId of ['icm-fon-1', 'icm-fon-2', 'icm-fon-3'])
    await db.lessonProgress.create({ data: { userId: 'u-marco', courseId: 'crs-icm', lessonId, completedAt: addDays(now, -int(1, 10)) } })
  await db.coachNote.create({ data: { userId: 'u-marco', authorId: 'c-matteo', text: 'Leak principale: troppi call in BB vs open del CO. Lavorare sulle difese.' } })
  await db.coachNote.create({ data: { userId: 'u-nico', authorId: 'c-lorenzo', text: 'Makeup in crescita: valutare pausa di 1 settimana e review volume.' } })

  // ── Movimenti di cassa (ultimi 6 mesi) ──────────────────────────────────
  const tx: { date: Date; type: 'INCOME' | 'EXPENSE'; category: string; amount: number; description: string }[] = []
  for (let m = 5; m >= 0; m--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 3))
    if (d > now) continue
    const members = 4 + (5 - m) * 3
    tx.push({ date: d, type: 'INCOME', category: 'MEMBERSHIP', amount: round2(members * 89 * between(0.8, 1.1)), description: 'Abbonamenti del mese (demo)' })
    tx.push({ date: addDays(d, 10), type: 'INCOME', category: 'GROUP_LESSON', amount: round2(between(150, 400)), description: 'Lezioni di gruppo extra (demo)' })
    if (m % 2 === 0) tx.push({ date: addDays(d, 12), type: 'INCOME', category: 'COACHING_1V1', amount: round2(between(300, 700)), description: 'Coaching 1:1 (demo)' })
    tx.push({ date: addDays(d, 1), type: 'EXPENSE', category: 'HOSTING', amount: 25, description: 'Hosting API + database (demo)' })
    tx.push({ date: addDays(d, 2), type: 'EXPENSE', category: 'TOOLS', amount: 120, description: 'Solver e software di studio (demo)' })
    tx.push({ date: addDays(d, 5), type: 'EXPENSE', category: 'MARKETING', amount: round2(between(150, 400)), description: 'Contenuti social (demo)' })
    tx.push({ date: addDays(d, 20), type: 'EXPENSE', category: 'COACH_PAYOUT', amount: round2(between(400, 800)), description: 'Compensi coach (demo)' })
  }
  tx.push({ date: addDays(now, -50), type: 'EXPENSE', category: 'VIDEO_PRODUCTION', amount: 800, description: 'Registrazione corso Deep Run Lab (demo)' })
  tx.push({ date: addDays(now, -15), type: 'EXPENSE', category: 'FEES', amount: 18.4, description: 'Commissioni pagamenti (demo)' })
  await db.transaction.createMany({ data: tx.filter((t) => t.date <= now).map((t) => ({ ...t, category: t.category as never, source: 'MANUAL' as const })) })

  console.log(`[seed] demo: ${STUDENTS.length} studenti (password ${DEV_PASSWORDS.student}), stagione "${season.name}"`)
}
