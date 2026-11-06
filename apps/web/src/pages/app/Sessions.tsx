import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Mountain, Plus, Trash2, Coins } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, Session, SessionInput } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { sessionXp } from '@/lib/app-rank'
import { fmtDec, fmtDuration, fmtInt, fmtSignedEur } from '@/lib/app-format'
import { fmtDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, Money, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Checkbox, Field, Input, Segmented, Textarea } from '@/components/app/Controls'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { Modal, toast, toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

const TILT = ['Zen', 'Calmo', 'Nervoso', 'Teso', 'Tilt']

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

interface Draft {
  format: Format
  date: string
  durationMin: string
  games: string
  hands: string
  avgBuyIn: string
  totalBuyIns: string
  totalCashes: string
  profit: string
  chipEv: string
  tilt: 1 | 2 | 3 | 4 | 5
  badBeats: string
  bubbles: string
  deepRun: boolean
  staked: boolean
  notes: string
}

const empty = (f: Format): Draft => ({ format: f, date: localNow(), durationMin: '', games: '', hands: '', avgBuyIn: '', totalBuyIns: '', totalCashes: '', profit: '', chipEv: '', tilt: 2, badBeats: '0', bubbles: '0', deepRun: false, staked: false, notes: '' })
const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))

export default function Sessions() {
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const { data, error, loading, reload, setData } = useData(() => api.sessions.list(), [])
  const [d, setD] = useState<Draft>(() => empty(user?.formats[0] ?? 'MTT'))
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState(25)
  const [toDelete, setToDelete] = useState<Session | null>(null)
  const [filter, setFilter] = useState<Format | 'ALL'>('ALL')

  const cash = d.format === 'CASH'
  const games = num(d.games)
  const abi = num(d.avgBuyIn)
  const buyIns = d.totalBuyIns.trim() ? num(d.totalBuyIns) : games * abi
  const cashes = num(d.totalCashes)
  const profit = cash ? num(d.profit) : cashes - buyIns
  const errs: Record<string, string> = {}
  if (!(num(d.durationMin) > 0)) errs.durationMin = 'Minuti giocati.'
  if (!(games >= 0)) errs.games = cash ? 'Tavoli × ore (indicativo).' : 'Quanti giochi?'
  if (!(abi > 0)) errs.avgBuyIn = cash ? 'Valore del big blind in €.' : 'Buy-in medio in €.'
  if (cash && !(num(d.hands) > 0)) errs.hands = 'Mani giocate.'
  if (cash && !Number.isFinite(num(d.profit))) errs.profit = 'Risultato netto in €.'
  if (!cash && !(cashes >= 0)) errs.totalCashes = 'Incassi totali (0 se nessun premio).'
  const e = (k: string) => (tried ? errs[k] : undefined)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setTried(true)
    if (Object.keys(errs).length) return
    setBusy(true)
    const input: SessionInput = {
      date: new Date(d.date).toISOString(),
      format: d.format,
      durationMin: Math.round(num(d.durationMin)),
      games: Math.round(games),
      hands: cash ? Math.round(num(d.hands)) : null,
      avgBuyIn: abi,
      totalBuyIns: cash ? 0 : Math.round(buyIns * 100) / 100,
      totalCashes: cash ? Math.max(0, profit) : cashes,
      profit: Math.round(profit * 100) / 100,
      chipEvBb100: d.format === 'SPIN' && d.chipEv.trim() ? num(d.chipEv) : null,
      bbWon: cash ? Math.round(profit / abi) : null,
      tilt: d.tilt,
      badBeats: Math.max(0, Math.round(num(d.badBeats) || 0)),
      bubbles: d.format === 'MTT' ? Math.max(0, Math.round(num(d.bubbles) || 0)) : 0,
      deepRun: d.format === 'MTT' && d.deepRun,
      notes: d.notes.trim() || null,
      staked: d.staked,
    }
    try {
      const s = await api.sessions.create(input)
      setData((prev) => [s, ...(prev ?? [])].sort((a, b) => b.date.localeCompare(a.date)))
      toast.success('Sessione registrata', `${fmtSignedEur(s.profit)} · ${s.format === 'CASH' ? `${fmtInt(s.hands ?? 0)} mani` : `${s.games} giochi`}`)
      setD(empty(d.format))
      setTried(false)
      void celebrate('Sessione registrata')
    } catch (err) {
      toastError(err, 'Sessione non salvata')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    const s = toDelete
    setToDelete(null)
    try {
      await api.sessions.remove(s.id)
      setData((prev) => (prev ?? []).filter((x) => x.id !== s.id))
      toast.success('Sessione eliminata')
      void celebrate()
    } catch (err) {
      toastError(err, 'Eliminazione non riuscita')
    }
  }

  const rows = useMemo(() => (data ?? []).filter((s) => filter === 'ALL' || s.format === filter), [data, filter])
  const totals = useMemo(() => ({ n: rows.length, profit: rows.reduce((a, s) => a + s.profit, 0) }), [rows])

  const cols: Column<Session>[] = [
    { key: 'date', header: 'Data', cell: (s) => <span className="whitespace-nowrap">{fmtDateTime(s.date)}</span>, sortValue: (s) => s.date, mobile: 'primary' },
    { key: 'format', header: 'Formato', cell: (s) => <Chip>{s.format === 'SPIN' ? 'Spin' : s.format === 'CASH' ? 'Cash' : 'MTT'}</Chip>, sortValue: (s) => s.format },
    { key: 'vol', header: 'Volume', align: 'right', cell: (s) => <span className="font-mono">{s.format === 'CASH' ? `${fmtInt(s.hands ?? 0)} mani` : `${s.games} giochi`}</span>, sortValue: (s) => (s.format === 'CASH' ? s.hands ?? 0 : s.games) },
    { key: 'abi', header: 'ABI / stake', align: 'right', className: 'hidden lg:table-cell', cell: (s) => <span className="font-mono">{s.format === 'CASH' ? `${fmtDec(s.avgBuyIn, 2)} € bb` : `${fmtDec(s.avgBuyIn, 0)} €`}</span>, sortValue: (s) => s.avgBuyIn },
    { key: 'dur', header: 'Durata', align: 'right', className: 'hidden 2xl:table-cell', cell: (s) => <span className="font-mono">{fmtDuration(s.durationMin)}</span>, sortValue: (s) => s.durationMin },
    { key: 'profit', header: 'Risultato', align: 'right', cell: (s) => <Money value={s.profit} />, sortValue: (s) => s.profit },
    { key: 'tilt', header: 'Tilt', align: 'center', cell: (s) => <span className={cn('font-mono', s.tilt >= 4 ? 'text-danger' : s.tilt === 3 ? 'text-warning' : 'text-muted')}>{s.tilt}/5</span>, sortValue: (s) => s.tilt },
    {
      key: 'flags',
      header: 'Note',
      mobile: 'hide',
      cell: (s) => (
        <span className="flex items-center gap-2">
          {s.deepRun && (
            <span title="Deep run" className="text-accent">
              <Mountain className="h-4 w-4" aria-hidden />
              <span className="sr-only">deep run</span>
            </span>
          )}
          {s.staked && (
            <span title="Giocata in staking" className="text-accent-2">
              <Coins className="h-4 w-4" aria-hidden />
              <span className="sr-only">staking</span>
            </span>
          )}
          {s.notes && <span className="max-w-[14ch] truncate text-xs text-muted" title={s.notes}>{s.notes}</span>}
        </span>
      ),
    },
    {
      key: 'del',
      header: <span className="sr-only">Azioni</span>,
      mobileLabel: 'Azioni',
      align: 'right',
      cell: (s) => (
        <button type="button" onClick={() => setToDelete(s)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Elimina la sessione del ${fmtDateTime(s.date)}`}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ),
    },
  ]

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div>
      <PageHeader title="Sessioni" description="Registra ogni sessione a fine grind: alimenta statistiche, rank e la review con il coach." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Nuova sessione" meta={`+${sessionXp(Number.isFinite(games) ? games : 0)} XP`} className="xl:sticky xl:top-24 xl:self-start">
          <form onSubmit={submit} noValidate className="space-y-4">
            <Segmented label="Formato" value={d.format} onChange={(f) => setD({ ...empty(f), date: d.date })} options={[{ value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin & Go' }, { value: 'CASH', label: 'Cash' }]} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data e ora" className="col-span-2">
                {(a) => <Input {...a} type="datetime-local" value={d.date} max={localNow()} onChange={(ev) => setD({ ...d, date: ev.target.value })} />}
              </Field>
              <Field label="Durata (min)" error={e('durationMin')}>
                {(a) => <Input {...a} inputMode="numeric" value={d.durationMin} onChange={(ev) => setD({ ...d, durationMin: ev.target.value })} placeholder="240" />}
              </Field>
              <Field label={cash ? 'Tavoli × ore' : d.format === 'SPIN' ? 'Spin giocati' : 'Tornei giocati'} error={e('games')}>
                {(a) => <Input {...a} inputMode="numeric" value={d.games} onChange={(ev) => setD({ ...d, games: ev.target.value })} placeholder={cash ? '8' : '12'} />}
              </Field>
              {cash ? (
                <>
                  <Field label="Mani" error={e('hands')}>
                    {(a) => <Input {...a} inputMode="numeric" value={d.hands} onChange={(ev) => setD({ ...d, hands: ev.target.value })} placeholder="1800" />}
                  </Field>
                  <Field label="Big blind (€)" error={e('avgBuyIn')}>
                    {(a) => <Input {...a} inputMode="decimal" value={d.avgBuyIn} onChange={(ev) => setD({ ...d, avgBuyIn: ev.target.value })} placeholder="0,25" />}
                  </Field>
                  <Field label="Risultato netto (€)" error={e('profit')} className="col-span-2" hint={Number.isFinite(profit) && abi > 0 ? `${fmtDec(profit / abi, 0)} bb · ${num(d.hands) > 0 ? fmtDec(((profit / abi) / num(d.hands)) * 100, 1) : '—'} bb/100` : 'Negativo se hai perso, es. −42,50'}>
                    {(a) => <Input {...a} inputMode="decimal" value={d.profit} onChange={(ev) => setD({ ...d, profit: ev.target.value })} placeholder="-42,50" />}
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Buy-in medio (€)" error={e('avgBuyIn')}>
                    {(a) => <Input {...a} inputMode="decimal" value={d.avgBuyIn} onChange={(ev) => setD({ ...d, avgBuyIn: ev.target.value })} placeholder="22" />}
                  </Field>
                  <Field label="Buy-in totali (€)" hint={Number.isFinite(games * abi) && !d.totalBuyIns ? `Calcolato: ${fmtDec(games * abi, 2)} €` : undefined}>
                    {(a) => <Input {...a} inputMode="decimal" value={d.totalBuyIns} onChange={(ev) => setD({ ...d, totalBuyIns: ev.target.value })} placeholder="auto" />}
                  </Field>
                  <Field label="Incassi (€)" error={e('totalCashes')} className="col-span-2" hint={Number.isFinite(profit) ? `Risultato: ${fmtSignedEur(profit)}` : undefined}>
                    {(a) => <Input {...a} inputMode="decimal" value={d.totalCashes} onChange={(ev) => setD({ ...d, totalCashes: ev.target.value })} placeholder="0" />}
                  </Field>
                  {d.format === 'SPIN' && (
                    <Field label="chip EV (bb/100)" className="col-span-2" hint="Facoltativo, dal tuo tracker.">
                      {(a) => <Input {...a} inputMode="decimal" value={d.chipEv} onChange={(ev) => setD({ ...d, chipEv: ev.target.value })} placeholder="+4,5" />}
                    </Field>
                  )}
                </>
              )}
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Tilt a fine sessione</legend>
              <div className="grid grid-cols-5 gap-1">
                {TILT.map((t, i) => {
                  const v = (i + 1) as Draft['tilt']
                  return (
                    <label key={t} className={cn('flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-[var(--r-card)] border text-xs font-medium focus-within:border-accent', d.tilt === v ? 'border-accent bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink')}>
                      <input type="radio" name="tilt" className="sr-only" checked={d.tilt === v} onChange={() => setD({ ...d, tilt: v })} />
                      <span className="font-mono text-sm">{v}</span>
                      {t}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bad beat">
                {(a) => <Input {...a} inputMode="numeric" value={d.badBeats} onChange={(ev) => setD({ ...d, badBeats: ev.target.value })} />}
              </Field>
              {d.format === 'MTT' && (
                <Field label="Bolle scoppiate">
                  {(a) => <Input {...a} inputMode="numeric" value={d.bubbles} onChange={(ev) => setD({ ...d, bubbles: ev.target.value })} />}
                </Field>
              )}
            </div>
            {d.format === 'MTT' && <Checkbox checked={d.deepRun} onChange={(ev) => setD({ ...d, deepRun: ev.target.checked })} label="Deep run in questa sessione" />}
            <Checkbox checked={d.staked} onChange={(ev) => setD({ ...d, staked: ev.target.checked })} label="Giocata con il capitale della scuola" description="Solo se hai un accordo di staking attivo per questo formato: il risultato va nel ledger." />
            <Field label="Note" hint="Cosa vuoi ricordarti per la review?">
              {(a) => <Textarea {...a} value={d.notes} onChange={(ev) => setD({ ...d, notes: ev.target.value })} className="min-h-20" />}
            </Field>
            <Button type="submit" className="w-full" disabled={busy} icon={<Plus className="h-4 w-4" aria-hidden />}>
              {busy ? 'Salvo…' : 'Registra la sessione'}
            </Button>
          </form>
        </Panel>

        <Panel
          title="Storico"
          meta={
            <>
              <span className="font-mono text-ink">{totals.n}</span> sessioni · <Money value={totals.profit} />
            </>
          }
          actions={<Segmented label="Filtra per formato" size="sm" value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'Tutte' }, { value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin' }, { value: 'CASH', label: 'Cash' }]} />}
        >
          <DataTable
            rows={rows.slice(0, limit)}
            columns={cols}
            rowKey={(s) => s.id}
            caption="Storico delle sessioni registrate"
            mobileCard={(s) => (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-ink">{fmtDateTime(s.date)}</span>
                    <Chip>{s.format === 'SPIN' ? 'Spin' : s.format === 'CASH' ? 'Cash' : 'MTT'}</Chip>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted">
                    {s.format === 'CASH' ? `${fmtInt(s.hands ?? 0)} mani · bb ${fmtDec(s.avgBuyIn, 2)} €` : `${s.games} giochi · ABI ${fmtDec(s.avgBuyIn, 0)} €`} · {fmtDuration(s.durationMin)} · tilt {s.tilt}
                    {s.staked ? ' · staking' : ''}
                    {s.deepRun ? ' · deep run' : ''}
                  </div>
                </div>
                <Money value={s.profit} className="pt-0.5 text-sm" />
                <button type="button" onClick={() => setToDelete(s)} className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-danger" aria-label={`Elimina la sessione del ${fmtDateTime(s.date)}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
            empty={<EmptyState title="Nessuna sessione" text="Registra la prima sessione con il modulo: ci vogliono 30 secondi." />}
          />
          {rows.length > limit && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + 60)}>
                Mostra altre ({rows.length - limit})
              </Button>
            </div>
          )}
        </Panel>
      </div>
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminare la sessione?"
        description={toDelete ? `${fmtDateTime(toDelete.date)} · ${fmtSignedEur(toDelete.profit)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={remove} icon={<Trash2 className="h-4 w-4" aria-hidden />}>
              Elimina
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Spariscono anche gli XP della sessione e, se era in staking, la voce nel ledger.</p>
      </Modal>
    </div>
  )
}
