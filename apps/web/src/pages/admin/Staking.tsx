import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pause, Play, Plus, Square } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, LedgerType, StakingDeal } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { FORMAT_SHORT, LEDGER_LABEL, fmtCompactEur, fmtEur, fmtSignedEur } from '@/lib/app-format'
import { dealFigures, sortLedger } from '@/lib/app-staking'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, EmptyState, ErrorState, Money, PageHeader, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { Field, Input, Select, Textarea } from '@/components/app/Controls'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { C, ChartCard, CumulativeChart, Lines } from '@/components/app/charts'
import { Modal, toast, toastError } from '@/components/app/Overlay'
import { LedgerTable, SettlementBox } from '@/components/admin/AdminBits'

const STATUS = { ACTIVE: { label: 'Attivo', tone: 'success' }, PAUSED: { label: 'In pausa', tone: 'warning' }, CLOSED: { label: 'Chiuso', tone: 'muted' } } as const

export default function Staking() {
  const [params, setParams] = useSearchParams()
  const deals = useData(() => api.admin.staking.deals(), [])
  const overview = useData(() => api.admin.overview(), [])
  const [creating, setCreating] = useState(false)
  const openId = params.get('deal')
  const open = deals.data?.find((d) => d.id === openId) ?? null

  const totals = useMemo(() => {
    const ds = deals.data ?? []
    return {
      out: ds.filter((d) => d.status !== 'CLOSED').reduce((a, d) => a + d.capitalAllocated - d.capitalReturned, 0),
      net: ds.reduce((a, d) => a + d.netResult, 0),
      school: ds.reduce((a, d) => a + d.schoolProfit, 0),
      makeup: ds.filter((d) => d.status !== 'CLOSED').reduce((a, d) => a + d.makeup, 0),
    }
  }, [deals.data])

  if (deals.loading) return <PageSkeleton />
  if (deals.error || !deals.data) return <ErrorState error={deals.error ?? new Error('Errore')} onRetry={deals.reload} />
  const setOpen = (id: string | null) => setParams(id ? { deal: id } : {}, { replace: true })
  const replace = (d: StakingDeal) => deals.setData(deals.data!.map((x) => (x.id === d.id ? d : x)))

  const cols: Column<StakingDeal>[] = [
    {
      key: 'p',
      header: 'Giocatore',
      mobile: 'primary',
      sortValue: (d) => d.nickname.toLowerCase(),
      cell: (d) => (
        <button type="button" onClick={() => setOpen(d.id)} className="flex min-h-11 items-center gap-3 text-left hover:text-accent">
          <Avatar seed={d.nickname.toLowerCase()} label={d.nickname} size={30} />
          <span>
            <span className="block font-semibold text-ink">{d.nickname}</span>
            <span className="block text-xs text-muted">
              {FORMAT_SHORT[d.format]} · dal {fmtDate(d.startDate)}
            </span>
          </span>
        </button>
      ),
    },
    { key: 's', header: 'Stato', sortValue: (d) => d.status, cell: (d) => <Chip tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Chip> },
    { key: 'split', header: 'Split', align: 'center', cell: (d) => <span className="font-mono">{d.schoolSharePct}/{d.playerSharePct}</span> },
    { key: 'alloc', header: 'Allocato', align: 'right', sortValue: (d) => d.capitalAllocated, cell: (d) => <span className="font-mono">{fmtEur(d.capitalAllocated)}</span> },
    { key: 'ret', header: 'Restituito', align: 'right', sortValue: (d) => d.capitalReturned, cell: (d) => <span className="font-mono text-muted">{fmtEur(d.capitalReturned)}</span> },
    { key: 'net', header: 'Netto', align: 'right', sortValue: (d) => d.netResult, cell: (d) => <Money value={d.netResult} /> },
    { key: 'mk', header: 'Makeup', align: 'right', sortValue: (d) => d.makeup, cell: (d) => <span className={cn('font-mono', d.makeup > 0 ? 'text-danger' : 'text-muted')}>{d.makeup > 0 ? fmtEur(d.makeup) : '—'}</span> },
    { key: 'sc', header: 'Quota scuola', align: 'right', sortValue: (d) => d.schoolProfit, cell: (d) => <span className="font-mono text-ink">{fmtEur(d.schoolProfit)}</span> },
  ]

  const series = (overview.data?.stakingSeries ?? []).map((p) => ({ label: new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), value: p.value }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staking"
        description="Capitale messo dalla scuola sui giocatori, risultati, makeup e divisione dei profitti. Contratti chiari, niente raccolta dal pubblico."
        actions={
          <Button onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>
            Nuovo accordo
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Capitale fuori" value={fmtCompactEur(totals.out)} sub={`${deals.data.filter((d) => d.status === 'ACTIVE').length} accordi attivi`} />
        <StatTile label="Risultato sessioni" value={fmtSignedEur(totals.net)} tone={totals.net >= 0 ? 'success' : 'danger'} sub="somma di tutti gli accordi" />
        <StatTile label="Quota scuola incassata" value={fmtEur(totals.school)} tone="accent" sub="dai settlement" />
        <StatTile label="Makeup aperto" value={fmtEur(totals.makeup)} tone={totals.makeup > 0 ? 'warning' : 'ink'} sub="da recuperare prima del prossimo split" />
      </div>
      <ChartCard title="P&L staking cumulato" meta="tutti gli accordi, per settimana" summary={`P&L staking cumulato, totale ${fmtSignedEur(totals.net)}`} table={{ columns: ['Settimana', 'Cumulato'], rows: series.map((s) => [s.label, fmtSignedEur(s.value)]) }}>
        <CumulativeChart data={series} name="P&L cumulato" />
      </ChartCard>
      <Panel title="Accordi" meta={`${deals.data.length}`}>
        <DataTable rows={deals.data} columns={cols} rowKey={(d) => d.id} caption="Accordi di staking" empty={<EmptyState title="Nessun accordo" />} />
      </Panel>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.nickname} · ${FORMAT_SHORT[open.format]}` : ''} description={open ? `Accordo dal ${fmtDate(open.startDate)} · split scuola/giocatore ${open.schoolSharePct}/${open.playerSharePct}${open.maxAbi ? ` · ABI max ${fmtEur(open.maxAbi)}` : ''}` : undefined} size="xl">
        {open && <DealDetail deal={open} onChange={(d) => { replace(d); void overview.reload() }} />}
      </Modal>
      <CreateDeal open={creating} onClose={() => setCreating(false)} onCreated={(d) => { deals.setData([d, ...deals.data!]); setOpen(d.id) }} />
    </div>
  )
}

function DealDetail({ deal, onChange }: { deal: StakingDeal; onChange: (d: StakingDeal) => void }) {
  const ledger = useData(() => api.admin.staking.ledger(deal.id), [deal.id])
  const [busy, setBusy] = useState(false)
  const [entry, setEntry] = useState({ type: 'SESSION_RESULT' as Exclude<LedgerType, 'SETTLEMENT'>, amount: '', date: new Date().toISOString().slice(0, 10), note: '' })
  const curve = useMemo(() => {
    let cum = 0
    return sortLedger((ledger.data ?? []).filter((e) => e.type === 'SESSION_RESULT' || e.type === 'ADJUSTMENT')).map((e) => {
      cum += e.amount
      return { label: new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), value: Math.round(cum * 100) / 100 }
    })
  }, [ledger.data])
  const capital = useMemo(() => {
    const rows: { label: string; allocato: number; rientrato: number }[] = []
    const acc: { date: string; type: LedgerType; amount: number }[] = []
    for (const e of sortLedger(ledger.data ?? [])) {
      acc.push(e)
      if (e.type === 'TRANSFER_TO_PLAYER' || e.type === 'RETURN_FROM_PLAYER') {
        const f = dealFigures(acc)
        rows.push({ label: new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), allocato: f.capitalAllocated, rientrato: f.capitalReturned })
      }
    }
    if (rows.length) {
      const f = dealFigures(acc)
      rows.push({ label: deal.endDate ? new Date(deal.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'oggi', allocato: f.capitalAllocated, rientrato: f.capitalReturned })
    }
    return rows
  }, [ledger.data, deal.endDate])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  const settle = () =>
    run(async () => {
      try {
        const r = await api.admin.staking.settle(deal.id)
        ledger.setData([...(ledger.data ?? []), r.entry])
        onChange(r.deal)
        toast.success('Settlement registrato', r.entry.note ?? undefined)
      } catch (e) {
        toastError(e, 'Settlement non eseguito')
      }
    })
  const addEntry = (ev: FormEvent) => {
    ev.preventDefault()
    void run(async () => {
      try {
        const r = await api.admin.staking.addEntry(deal.id, { type: entry.type, amount: Number(entry.amount.replace(',', '.')), date: new Date(entry.date + 'T12:00:00').toISOString(), note: entry.note || null })
        ledger.setData([...(ledger.data ?? []), r.entry])
        onChange(r.deal)
        setEntry({ ...entry, amount: '', note: '' })
        toast.success('Voce aggiunta al ledger')
      } catch (e) {
        toastError(e, 'Voce non salvata')
      }
    })
  }
  const setStatus = (status: StakingDeal['status']) =>
    run(async () => {
      try {
        onChange(await api.admin.staking.update(deal.id, { status }))
        toast.success(`Accordo ${STATUS[status].label.toLowerCase()}`)
      } catch (e) {
        toastError(e, 'Stato non aggiornato')
      }
    })

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Fig k="Allocato" v={fmtEur(deal.capitalAllocated)} />
        <Fig k="Restituito" v={fmtEur(deal.capitalReturned)} />
        <Fig k="Netto sessioni" v={<Money value={deal.netResult} />} />
        <Fig k="Makeup" v={<span className={deal.makeup > 0 ? 'text-danger' : ''}>{fmtEur(deal.makeup)}</span>} />
        <Fig k="Quota scuola" v={fmtEur(deal.schoolProfit)} />
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={STATUS[deal.status].tone}>{STATUS[deal.status].label}</Chip>
        {deal.status !== 'ACTIVE' && (
          <Button size="sm" variant="secondary" className="min-h-11" disabled={busy} onClick={() => setStatus('ACTIVE')} icon={<Play className="h-4 w-4" aria-hidden />}>
            Riattiva
          </Button>
        )}
        {deal.status === 'ACTIVE' && (
          <Button size="sm" variant="secondary" className="min-h-11" disabled={busy} onClick={() => setStatus('PAUSED')} icon={<Pause className="h-4 w-4" aria-hidden />}>
            Metti in pausa
          </Button>
        )}
        {deal.status !== 'CLOSED' && (
          <Button size="sm" variant="ghost" className="min-h-11" disabled={busy} onClick={() => window.confirm('Chiudere l’accordo? Potrai riattivarlo in seguito.') && setStatus('CLOSED')} icon={<Square className="h-4 w-4" aria-hidden />}>
            Chiudi
          </Button>
        )}
        <Link to={`/admin/giocatori/${deal.userId}`} className="ml-auto inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
          Scheda giocatore
        </Link>
      </div>
      {deal.notes && <p className="rounded-[var(--r-card)] bg-surface-2/60 px-3 py-2 text-sm text-muted">{deal.notes}</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Andamento del giocatore" meta="risultati cumulati" summary="Risultato cumulato delle sessioni in staking" table={{ columns: ['Data', 'Cumulato'], rows: curve.map((c) => [c.label, fmtSignedEur(c.value)]) }}>
          <CumulativeChart data={curve} height={220} name="Risultato cumulato" />
        </ChartCard>
        <ChartCard title="Capitale" meta="allocato e rientrato" summary="Capitale allocato e rientrato nel tempo" table={{ columns: ['Data', 'Allocato', 'Rientrato'], rows: capital.map((c) => [c.label, fmtEur(c.allocato), fmtEur(c.rientrato)]) }}>
          <Lines data={capital} height={200} step fmt={fmtCompactEur} series={[{ key: 'allocato', name: 'Allocato', color: C.accent }, { key: 'rientrato', name: 'Rientrato', color: C.accent2 }]} />
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Ledger" meta={`${ledger.data?.length ?? 0} movimenti`}>
          {ledger.data ? <LedgerTable entries={ledger.data} /> : <p className="text-sm text-muted">Carico…</p>}
        </Panel>
        <div className="space-y-5">
          {ledger.data && <SettlementBox entries={ledger.data} school={deal.schoolSharePct} player={deal.playerSharePct} onSettle={settle} busy={busy} />}
          <Panel title="Nuova voce">
            <form onSubmit={addEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  {(a) => (
                    <Select {...a} value={entry.type} onChange={(e) => setEntry({ ...entry, type: e.target.value as typeof entry.type })}>
                      {(['SESSION_RESULT', 'TRANSFER_TO_PLAYER', 'RETURN_FROM_PLAYER', 'ADJUSTMENT'] as const).map((t) => (
                        <option key={t} value={t}>
                          {LEDGER_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Data">{(a) => <Input {...a} type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />}</Field>
              </div>
              <Field label="Importo (€)" hint={entry.type === 'SESSION_RESULT' || entry.type === 'ADJUSTMENT' ? 'Negativo se è una perdita.' : 'Sempre positivo: il verso lo dà il tipo.'}>
                {(a) => <Input {...a} inputMode="decimal" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} required />}
              </Field>
              <Field label="Nota">{(a) => <Input {...a} value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} />}</Field>
              <Button type="submit" variant="secondary" className="w-full" disabled={busy || !entry.amount}>
                Aggiungi al ledger
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Fig({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-[var(--r-card)] border border-line px-3 py-2.5">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 font-mono font-semibold text-ink">{v}</dd>
    </div>
  )
}

function CreateDeal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (d: StakingDeal) => void }) {
  const players = useData(() => (open ? api.admin.players.list({ sort: 'nickname' }) : Promise.resolve(null)), [open])
  const [f, setF] = useState({ userId: '', format: 'MTT' as Format, startDate: new Date().toISOString().slice(0, 10), initialCapital: '', school: '50', maxAbi: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const d = await api.admin.staking.create({
        userId: f.userId,
        format: f.format,
        startDate: new Date(f.startDate + 'T12:00:00').toISOString(),
        initialCapital: Number(f.initialCapital.replace(',', '.')),
        schoolSharePct: Number(f.school),
        playerSharePct: 100 - Number(f.school),
        maxAbi: f.maxAbi ? Number(f.maxAbi.replace(',', '.')) : null,
        notes: f.notes || null,
      })
      toast.success('Accordo creato', `${d.nickname} · capitale ${fmtEur(d.capitalAllocated)}`)
      onCreated(d)
      onClose()
    } catch (err) {
      toastError(err, 'Accordo non creato')
    } finally {
      setBusy(false)
    }
  }
  const eligible = (players.data?.items ?? []).filter((p) => p.role === 'STUDENT')
  return (
    <Modal open={open} onClose={onClose} title="Nuovo accordo di staking" description="Il capitale iniziale viene registrato come primo movimento del ledger.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Giocatore" hint="Solo giocatori con identità verificata dovrebbero entrare in staking.">
          {(a) => (
            <Select {...a} required value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}>
              <option value="">Scegli…</option>
              {eligible.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.nickname} — {p.formats.join('/')} · KYC {p.kycStatus === 'APPROVED' ? 'ok' : 'da fare'}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Formato">
            {(a) => (
              <Select {...a} value={f.format} onChange={(e) => setF({ ...f, format: e.target.value as Format })}>
                <option value="MTT">MTT</option>
                <option value="SPIN">Spin</option>
                <option value="CASH">Cash</option>
              </Select>
            )}
          </Field>
          <Field label="Inizio">{(a) => <Input {...a} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />}</Field>
          <Field label="Capitale iniziale (€)">{(a) => <Input {...a} required inputMode="decimal" value={f.initialCapital} onChange={(e) => setF({ ...f, initialCapital: e.target.value })} />}</Field>
          <Field label="Quota scuola">
            {(a) => (
              <Select {...a} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })}>
                <option value="50">50 / 50</option>
                <option value="40">40 / 60 (scuola / giocatore)</option>
                <option value="60">60 / 40 (scuola / giocatore)</option>
              </Select>
            )}
          </Field>
          <Field label={f.format === 'CASH' ? 'Stake max (bb €)' : 'ABI massimo (€)'}>{(a) => <Input {...a} inputMode="decimal" value={f.maxAbi} onChange={(e) => setF({ ...f, maxAbi: e.target.value })} />}</Field>
        </div>
        <Field label="Note">{(a) => <Textarea {...a} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-20" />}</Field>
        <p className="text-xs text-muted">Trattamento fiscale e contratto da verificare con il commercialista prima dell’attivazione.</p>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={busy || !f.userId || !f.initialCapital}>
            {busy ? 'Creo…' : 'Crea accordo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
