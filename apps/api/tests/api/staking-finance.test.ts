import { beforeAll, describe, expect, it } from 'vitest'
import { api, auth, loginAdmin, prisma, registerStudent, resetDb, type Session } from '../helpers.js'

let admin: Session
let player: Session

beforeAll(async () => {
  await resetDb()
  admin = await loginAdmin()
  player = await registerStudent({ formats: ['SPIN'] })
})

const base = '/api/v1/admin/staking/deals'

describe('staking: makeup e settlement', () => {
  it('flusso completo con contratto StakingDeal/LedgerEntry', async () => {
    const created = await api()
      .post(base)
      .set(auth(admin))
      .send({ userId: player.user.id, format: 'SPIN', startDate: '2026-11-01', schoolSharePct: 50, playerSharePct: 50, maxAbi: 25, notes: null, initialCapital: 1000 })
    expect(created.status).toBe(201)
    const deal = created.body
    expect(Object.keys(deal).sort()).toEqual(
      ['id', 'userId', 'nickname', 'format', 'status', 'startDate', 'endDate', 'capitalAllocated', 'capitalReturned', 'schoolSharePct', 'playerSharePct', 'makeup', 'netResult', 'schoolProfit', 'maxAbi', 'notes'].sort(),
    )
    expect(deal).toMatchObject({ capitalAllocated: 1000, capitalReturned: 0, makeup: 0, netResult: 0, schoolProfit: 0, maxAbi: 25, status: 'ACTIVE' })

    // sessione persa → makeup
    const loss = await api().post(`${base}/${deal.id}/ledger`).set(auth(admin)).send({ date: '2026-11-02', type: 'SESSION_RESULT', amount: -300, note: 'downswing' })
    expect(loss.status).toBe(201)
    expect(loss.body.deal.makeup).toBe(300)
    expect(loss.body.entry).toMatchObject({ dealId: deal.id, type: 'SESSION_RESULT', amount: -300, createdBy: admin.user.id })

    // con makeup attivo non si divide nulla
    const early = await api().post(`${base}/${deal.id}/settle`).set(auth(admin))
    expect(early.status).toBe(409)
    expect(early.body.error.code).toBe('NOTHING_TO_SETTLE')

    // recupero + profitto: netto +500 dall'inizio
    const win = await api().post(`${base}/${deal.id}/ledger`).set(auth(admin)).send({ date: '2026-11-03', type: 'SESSION_RESULT', amount: 800, note: null })
    expect(win.body.deal).toMatchObject({ makeup: 0, netResult: 500 })

    const settled = await api().post(`${base}/${deal.id}/settle`).set(auth(admin))
    expect(settled.status).toBe(200)
    expect(settled.body.entry).toMatchObject({ type: 'SETTLEMENT', amount: 250 })
    expect(settled.body.deal).toMatchObject({ schoolProfit: 250, makeup: 0, netResult: 500 })
    const tx = await prisma.transaction.findMany({ where: { category: 'STAKING' } })
    expect(tx).toHaveLength(1)
    expect(Number(tx[0].amount)).toBe(250)
    expect(tx[0].type).toBe('INCOME')

    // dopo il settlement si riparte da zero: nuova perdita → nuovo makeup
    const after = await api().post(`${base}/${deal.id}/ledger`).set(auth(admin)).send({ date: '2026-11-04', type: 'SESSION_RESULT', amount: -120, note: null })
    expect(after.body.deal.makeup).toBe(120)
    expect((await api().post(`${base}/${deal.id}/settle`).set(auth(admin))).status).toBe(409)

    // trasferimento con importo positivo → normalizzato come uscita
    const topup = await api().post(`${base}/${deal.id}/ledger`).set(auth(admin)).send({ date: '2026-11-05', type: 'TRANSFER_TO_PLAYER', amount: 500, note: 'ricarica' })
    expect(topup.body.entry.amount).toBe(-500)
    expect(topup.body.deal.capitalAllocated).toBe(1500)

    // SETTLEMENT manuale non ammesso
    expect((await api().post(`${base}/${deal.id}/ledger`).set(auth(admin)).send({ date: '2026-11-05', type: 'SETTLEMENT', amount: 1, note: null })).status).toBe(400)

    const ledger = await api().get(`${base}/${deal.id}/ledger`).set(auth(admin))
    expect(ledger.body.map((e: { type: string }) => e.type)).toContain('SETTLEMENT')
  })

  it('una sessione staked dello studente finisce nel ledger del deal attivo', async () => {
    const s = await registerStudent({ formats: ['MTT'] })
    const d = await api()
      .post(base)
      .set(auth(admin))
      .send({ userId: s.user.id, format: 'MTT', startDate: '2026-11-01', schoolSharePct: 60, playerSharePct: 40, maxAbi: null, notes: null, initialCapital: 2000 })
    const sess = await api()
      .post('/api/v1/me/sessions')
      .set(auth(s))
      .send({ date: new Date().toISOString(), format: 'MTT', durationMin: 300, games: 30, hands: null, avgBuyIn: 20, totalBuyIns: 600, totalCashes: 150, profit: -450, tilt: 3, badBeats: 2, bubbles: 1, deepRun: false, notes: null, staked: true })
    expect(sess.status).toBe(201)
    const deals = await api().get(base).set(auth(admin))
    const mine = deals.body.find((x: { id: string }) => x.id === d.body.id)
    expect(mine).toMatchObject({ netResult: -450, makeup: 450 })
    // cancellando la sessione sparisce anche il risultato
    await api().delete(`/api/v1/me/sessions/${sess.body.id}`).set(auth(s)).expect(204)
    const again = (await api().get(base).set(auth(admin))).body.find((x: { id: string }) => x.id === d.body.id)
    expect(again).toMatchObject({ netResult: 0, makeup: 0 })
  })

  it('valida le quote e chiude il deal', async () => {
    const bad = await api()
      .post(base)
      .set(auth(admin))
      .send({ userId: player.user.id, format: 'SPIN', startDate: '2026-11-01', schoolSharePct: 70, playerSharePct: 20, maxAbi: null, notes: null, initialCapital: 0 })
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('INVALID_SHARES')
    const deals = await api().get(base).set(auth(admin))
    const id = deals.body[0].id
    const closed = await api().patch(`${base}/${id}`).set(auth(admin)).send({ status: 'CLOSED' })
    expect(closed.body.status).toBe('CLOSED')
    expect(closed.body.endDate).not.toBeNull()
  })
})

describe('finanze', () => {
  it('movimenti, riepilogo e MRR', async () => {
    const add = await api()
      .post('/api/v1/admin/finance/transactions')
      .set(auth(admin))
      .send({ date: '2026-11-02', type: 'EXPENSE', category: 'HOSTING', amount: 25.5, description: 'Server', userId: null })
    expect(add.status).toBe(201)
    expect(add.body).toMatchObject({ type: 'EXPENSE', category: 'HOSTING', amount: 25.5, description: 'Server', userId: null })

    // abbonamento manuale (extra admin) → entra nell'MRR e in cassa
    const sub = await api().post(`/api/v1/admin/players/${player.user.id}/subscription`).set(auth(admin)).send({ planId: 'elite', interval: 'year' })
    expect(sub.status).toBe(201)
    expect(sub.body).toMatchObject({ plan: 'elite', planInterval: 'year' })

    const sum = await api().get('/api/v1/admin/finance/summary?from=2026-01-01&to=2026-12-31').set(auth(admin))
    expect(sum.status).toBe(200)
    expect(sum.body.mrr).toBe(207.5) // 2490 / 12
    expect(sum.body.expenses).toBe(25.5)
    expect(sum.body.monthly).toHaveLength(12)
    expect(sum.body.byCategory).toEqual(expect.arrayContaining([{ category: 'HOSTING', type: 'EXPENSE', amount: 25.5 }]))

    const list = await api().get('/api/v1/admin/finance/transactions?from=2026-11-01&to=2026-11-30').set(auth(admin))
    expect(list.body.some((t: { id: string }) => t.id === add.body.id)).toBe(true)
    await api().delete(`/api/v1/admin/finance/transactions/${add.body.id}`).set(auth(admin)).expect(204)
    const overview = await api().get('/api/v1/admin/overview').set(auth(admin))
    expect(overview.body.mrr).toBe(207.5)
    expect(overview.body.membersByPlan.elite).toBe(1)
  })

  it('importi negativi o categorie inesistenti vengono rifiutati', async () => {
    const res = await api().post('/api/v1/admin/finance/transactions').set(auth(admin)).send({ date: '2026-11-02', type: 'INCOME', category: 'CASINO', amount: -5, description: 'x' })
    expect(res.status).toBe(400)
  })
})
