import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Transaction, TxCategory, TxType } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { EXPENSE_CATS, INCOME_CATS, TX_LABEL, fmtCompactEur, fmtMonth, fmtEur, fmtSignedEur } from '@/lib/app-format'
import { downloadText } from '@/lib/app-card-export'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { Field, Input, Segmented, Select } from '@/components/app/Controls'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { C, ChartCard, PairBars } from '@/components/app/charts'
import { Modal, toast, toastError } from '@/components/app/Overlay'

type Preset = '30d' | '90d' | 'ytd' | '12m' | 'custom'
const day = (d: Date) => d.toISOString().slice(0, 10)

function rangeOf(p: Preset, custom: { from: string; to: string }) {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (p === '30d') start.setDate(start.getDate() - 29)
  if (p === '90d') start.setDate(start.getDate() - 89)
  if (p === 'ytd') start.setMonth(0, 1)
  if (p === '12m') {
    start.setMonth(start.getMonth() - 11, 1)
  }
  if (p === 'custom') return { from: new Date(custom.from + 'T00:00:00').toISOString(), to: new Date(custom.to + 'T23:59:59').toISOString() }
  return { from: start.toISOString(), to: end.toISOString() }
}

export default function Finance() {
  const [preset, setPreset] = useState<Preset>('12m')
  const [custom, setCustom] = useState(() => ({ from: day(new Date(Date.now() - 60 * 86_400_000)), to: day(new Date()) }))
  const range = useMemo(() => rangeOf(preset, custom), [preset, custom])
  const sum = useData(() => api.admin.finance.summary(range), [range.from, range.to])
  const txs = useData(() => api.admin.finance.transactions(range), [range.from, range.to])
  const [type, setType] = useState<'ALL' | TxType>('ALL')
  const [cat, setCat] = useState<TxCategory | ''>('')
  const [adding, setAdding] = useState(false)
  const [del, setDel] = useState<Transaction | null>(null)

  const rows = useMemo(() => (txs.data ?? []).filter((t) => (type === 'ALL' || t.type === type) && (!cat || t.category === cat)), [txs.data, type, cat])

  if (sum.loading && !sum.data) return <PageSkeleton />
  if (sum.error && !sum.data) return <ErrorState error={sum.error} onRetry={sum.reload} />
  const s = sum.data!
  const monthly = s.monthly.map((m) => ({ label: fmtMonth(m.month), a: m.income, b: m.expenses }))
  const incomeCats = s.byCategory.filter((c) => c.type === 'INCOME')
  const expenseCats = s.byCategory.filter((c) => c.type === 'EXPENSE')

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = ['data;tipo;categoria;importo;descrizione', ...rows.map((t) => [t.date.slice(0, 10), t.type === 'INCOME' ? 'entrata' : 'uscita', TX_LABEL[t.category], t.amount.toFixed(2).replace('.', ','), esc(t.description)].join(';'))]
    downloadText(lines.join('\n'), `transazioni-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`)
    toast.success('CSV esportato', `${rows.length} righe`)
  }
  const remove = async () => {
    if (!del) return
    const t = del
    setDel(null)
    try {
      await api.admin.finance.removeTransaction(t.id)
      txs.setData((txs.data ?? []).filter((x) => x.id !== t.id))
      void sum.reload()
      toast.success('Transazione rimossa')
    } catch (e) {
      toastError(e, 'Rimozione non riuscita')
    }
  }

  const cols: Column<Transaction>[] = [
    { key: 'd', header: 'Data', sortValue: (t) => t.date, cell: (t) => <span className="whitespace-nowrap text-muted">{fmtDate(t.date)}</span> },
    { key: 'desc', header: 'Descrizione', mobile: 'primary', cell: (t) => <span className="text-ink">{t.description}</span> },
    { key: 'cat', header: 'Categoria', sortValue: (t) => t.category, cell: (t) => <span className="whitespace-nowrap text-muted">{TX_LABEL[t.category]}</span> },
    {
      key: 'amt',
      header: 'Importo',
      align: 'right',
      sortValue: (t) => (t.type === 'INCOME' ? t.amount : -t.amount),
      cell: (t) => <span className={cn('font-mono', t.type === 'INCOME' ? 'text-success' : 'text-ink')}>{t.type === 'INCOME' ? '+' : '−'}{t.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>,
    },
    {
      key: 'x',
      header: <span className="sr-only">Azioni</span>,
      mobileLabel: 'Azioni',
      align: 'right',
      cell: (t) => (
        <button type="button" onClick={() => setDel(t)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Rimuovi: ${t.description}`}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finanze"
        description="Entrate, uscite e cash flow della scuola. Importi in euro; le imposte sono stime da verificare con il commercialista."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} icon={<Download className="h-4 w-4" aria-hidden />}>
              Esporta CSV
            </Button>
            <Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>
              Nuova transazione
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Segmented label="Intervallo" value={preset} onChange={setPreset} options={[{ value: '30d', label: '30 giorni' }, { value: '90d', label: '90 giorni' }, { value: 'ytd', label: 'Anno' }, { value: '12m', label: '12 mesi' }, { value: 'custom', label: 'Date' }]} size="sm" />
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted">
              Dal
              <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="mt-1 w-auto" />
            </label>
            <label className="text-xs text-muted">
              Al
              <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="mt-1 w-auto" />
            </label>
          </div>
        )}
        <span className="pb-3 text-sm text-muted">
          {fmtDate(range.from)} – {fmtDate(range.to)}
        </span>
      </div>

      <div className={cn('grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4', sum.refreshing && 'opacity-60')}>
        <StatTile label="Entrate" value={fmtEur(s.income)} tone="success" />
        <StatTile label="Uscite" value={fmtEur(s.expenses)} />
        <StatTile label="Netto" value={fmtSignedEur(s.net)} tone={s.net >= 0 ? 'success' : 'danger'} sub={s.income ? `margine ${Math.round((s.net / s.income) * 100)}%` : undefined} />
        <StatTile label="MRR attuale" value={fmtEur(s.mrr)} tone="accent" sub="abbonamenti attivi oggi" />
      </div>

      <ChartCard title="Entrate e uscite per mese" summary={`Entrate ${fmtEur(s.income)}, uscite ${fmtEur(s.expenses)} nel periodo`} table={{ columns: ['Mese', 'Entrate', 'Uscite', 'Netto'], rows: s.monthly.map((m) => [fmtMonth(m.month), fmtEur(m.income), fmtEur(m.expenses), fmtSignedEur(m.net)]) }}>
        <PairBars data={monthly} a={{ name: 'Entrate', color: C.accent }} b={{ name: 'Uscite', color: C.accent2 }} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CatPanel title="Entrate per categoria" cats={incomeCats} total={s.income} color={C.accent} />
        <CatPanel title="Uscite per categoria" cats={expenseCats} total={s.expenses} color={C.accent2} />
      </div>

      <Panel
        title="Transazioni"
        meta={`${rows.length} nel periodo`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Segmented label="Tipo" size="sm" value={type} onChange={setType} options={[{ value: 'ALL', label: 'Tutte' }, { value: 'INCOME', label: 'Entrate' }, { value: 'EXPENSE', label: 'Uscite' }]} />
            <Select aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value as TxCategory | '')} className="w-auto">
              <option value="">Tutte le categorie</option>
              {[...new Set([...INCOME_CATS, ...EXPENSE_CATS])].map((c) => (
                <option key={c} value={c}>
                  {TX_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <DataTable rows={rows} columns={cols} rowKey={(t) => t.id} caption="Transazioni della scuola" dense maxHeight="max-h-[34rem]" empty={<EmptyState title="Nessuna transazione nel periodo" />} />
      </Panel>

      <AddTx open={adding} onClose={() => setAdding(false)} onAdded={(t) => { txs.setData([t, ...(txs.data ?? [])]); void sum.reload() }} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Rimuovere la transazione?" description={del ? `${del.description} · ${fmtEur(del.amount)}` : undefined} size="sm" footer={<><Button variant="ghost" onClick={() => setDel(null)}>Annulla</Button><Button variant="danger" onClick={remove}>Rimuovi</Button></>}>
        <p className="text-sm text-muted">L’operazione aggiorna subito totali e grafici.</p>
      </Modal>
    </div>
  )
}

function CatPanel({ title, cats, total, color }: { title: string; cats: { category: TxCategory; amount: number }[]; total: number; color: string }) {
  const max = Math.max(1, ...cats.map((c) => c.amount))
  return (
    <Panel title={title} meta={fmtEur(total)}>
      {cats.length ? (
        <ul className="space-y-3">
          {cats.map((c) => (
            <li key={c.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-ink">{TX_LABEL[c.category]}</span>
                <span className="font-mono text-ink">
                  {fmtCompactEur(c.amount)} <span className="text-xs text-muted">{total ? Math.round((c.amount / total) * 100) : 0}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(c.amount / max) * 100}%`, background: color }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nessun movimento.</p>
      )}
    </Panel>
  )
}

function AddTx({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (t: Transaction) => void }) {
  const [f, setF] = useState({ type: 'EXPENSE' as TxType, category: 'TOOLS' as TxCategory, amount: '', date: day(new Date()), description: '' })
  const [busy, setBusy] = useState(false)
  const cats = f.type === 'INCOME' ? INCOME_CATS : EXPENSE_CATS
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const t = await api.admin.finance.addTransaction({ type: f.type, category: f.category, amount: Number(f.amount.replace(',', '.')), date: new Date(f.date + 'T12:00:00').toISOString(), description: f.description, userId: null })
      onAdded(t)
      toast.success('Transazione aggiunta')
      setF({ ...f, amount: '', description: '' })
      onClose()
    } catch (err) {
      toastError(err, 'Transazione non salvata')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Nuova transazione">
      <form onSubmit={submit} className="space-y-4">
        <Segmented label="Tipo" value={f.type} onChange={(t) => setF({ ...f, type: t, category: t === 'INCOME' ? 'MEMBERSHIP' : 'TOOLS' })} options={[{ value: 'INCOME', label: 'Entrata' }, { value: 'EXPENSE', label: 'Uscita' }]} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Categoria">
            {(a) => (
              <Select {...a} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as TxCategory })}>
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {TX_LABEL[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Importo (€)">{(a) => <Input {...a} required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />}</Field>
          <Field label="Data">{(a) => <Input {...a} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}</Field>
        </div>
        <Field label="Descrizione">{(a) => <Input {...a} required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Salvo…' : 'Aggiungi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
