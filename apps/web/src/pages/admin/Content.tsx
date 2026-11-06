import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Send, Target, Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, HandReview } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { COACHES, coachById } from '@/data/coaches'
import { FORMAT_SHORT, fmtRelative } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Field, Input, Segmented, Select, Tabs, Textarea } from '@/components/app/Controls'
import { toast, toastError } from '@/components/app/Overlay'
import { PokerTable } from '@/components/app/Poker'

export default function Content() {
  const [tab, setTab] = useState<'hr' | 'spot'>('hr')
  return (
    <div className="space-y-5">
      <PageHeader title="Contenuti" description="Coda delle hand review da rispondere e creazione dei Daily Spot. Spot standard, risposte non controverse, spiegazione chiara." />
      <Tabs label="Contenuti" value={tab} onChange={setTab} tabs={[{ value: 'hr', label: 'Hand review' }, { value: 'spot', label: 'Nuovo Daily Spot' }]} />
      <div role="tabpanel">{tab === 'hr' ? <ReviewQueue /> : <SpotForm />}</div>
    </div>
  )
}

function ReviewQueue() {
  const { data, loading, error, reload, setData } = useData(() => api.admin.handReviews.queue(), [])
  const [sel, setSel] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const open = data.filter((h) => h.status !== 'REVIEWED')
  const cur = data.find((h) => h.id === sel) ?? open[0] ?? null

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!cur) return
    setBusy(true)
    try {
      const h = await api.admin.handReviews.reply(cur.id, reply)
      setData(data.map((x) => (x.id === h.id ? h : x)))
      setReply('')
      setSel(null)
      toast.success('Risposta inviata', `${h.nickname} la trova nella sua pagina Hand review.`)
    } catch (err) {
      toastError(err, 'Risposta non inviata')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Panel title="In coda" meta={`${open.length} da rispondere`} flush>
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {data.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { setSel(h.id); setReply('') }} aria-current={cur?.id === h.id ? 'true' : undefined} className={cn('flex min-h-16 w-full flex-col gap-1 px-4 py-3 text-left sm:px-5', cur?.id === h.id ? 'bg-surface-2' : 'hover:bg-surface-2/50', h.status === 'REVIEWED' && 'opacity-60')}>
                <span className="flex items-center gap-2">
                  <Chip>{FORMAT_SHORT[h.format]}</Chip>
                  <span className="text-xs text-muted">
                    {h.nickname} · {fmtRelative(h.createdAt)}
                  </span>
                  {h.status === 'REVIEWED' && <Chip tone="success">risposta</Chip>}
                </span>
                <span className="font-medium text-ink">{h.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {cur ? (
        <ReviewDetail h={cur} reply={reply} setReply={setReply} onSend={send} busy={busy} />
      ) : (
        <EmptyState title="Coda vuota" text="Tutte le mani hanno una risposta." />
      )}
    </div>
  )
}

function ReviewDetail({ h, reply, setReply, onSend, busy }: { h: HandReview; reply: string; setReply: (v: string) => void; onSend: (e: FormEvent) => void; busy: boolean }) {
  return (
    <Panel title={h.title} meta={<Link to={`/admin/giocatori/${h.userId}`} className="text-accent hover:underline">{h.nickname}</Link>}>
      {h.description && <p className="text-sm text-ink">{h.description}</p>}
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-[var(--r-card)] bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">{h.handHistory}</pre>
      {h.coachComment ? (
        <div className="mt-4 rounded-[var(--r-card)] border border-success/40 p-3 text-sm">
          <div className="text-xs text-muted">Risposta di {coachById(h.coachId ?? '')?.name ?? 'coach'}</div>
          <p className="mt-1 text-ink">{h.coachComment}</p>
        </div>
      ) : (
        <form onSubmit={onSend} className="mt-4 space-y-3">
          <Field label="Risposta del coach" hint="Spiega la linea, i numeri chiave e cosa rivedere. Minimo 10 caratteri.">
            {(a) => <Textarea {...a} value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-36" />}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || reply.trim().length < 10} icon={<Send className="h-4 w-4" aria-hidden />}>
              {busy ? 'Invio…' : 'Invia la risposta'}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}

function SpotForm() {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const [f, setF] = useState({ date: tomorrow, format: 'MTT' as Format, title: '', situation: '', heroCards: '', board: '', stacksBb: '', coachId: 'c-matteo', explanation: '' })
  const [opts, setOpts] = useState([{ id: 'a', label: 'Fold' }, { id: 'b', label: 'Call' }, { id: 'c', label: 'All-in' }])
  const [correct, setCorrect] = useState('c')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const s = await api.admin.dailySpots.create({ ...f, board: f.board.trim() || null, options: opts.filter((o) => o.label.trim()), correctOptionId: correct, explanation: f.explanation })
      toast.success('Daily Spot programmato', `${new Date(s.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}: ${s.title}`)
      setF({ ...f, title: '', situation: '', heroCards: '', board: '', stacksBb: '', explanation: '' })
    } catch (err) {
      toastError(err, 'Spot non creato')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr]">
      <Panel title="Nuovo Daily Spot" meta="si pubblica alla data scelta">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data">{(a) => <Input {...a} type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}</Field>
            <div>
              <div className="mb-1.5 text-sm font-medium text-ink">Formato</div>
              <Segmented label="Formato" size="sm" value={f.format} onChange={(v) => setF({ ...f, format: v })} options={[{ value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin' }, { value: 'CASH', label: 'Cash' }]} />
            </div>
            <Field label="Coach">
              {(a) => (
                <Select {...a} value={f.coachId} onChange={(e) => setF({ ...f, coachId: e.target.value })}>
                  {COACHES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Titolo">{(a) => <Input {...a} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Es. Bottone a 10 bui" />}</Field>
          <Field label="Situazione">{(a) => <Textarea {...a} required value={f.situation} onChange={(e) => setF({ ...f, situation: e.target.value })} className="min-h-24" />}</Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Carte hero" hint="Es. Ah5c">{(a) => <Input {...a} value={f.heroCards} onChange={(e) => setF({ ...f, heroCards: e.target.value })} className="font-mono" />}</Field>
            <Field label="Board" hint="Vuoto se preflop">{(a) => <Input {...a} value={f.board} onChange={(e) => setF({ ...f, board: e.target.value })} className="font-mono" />}</Field>
            <Field label="Stack" hint="Es. Hero 10bb BTN">{(a) => <Input {...a} value={f.stacksBb} onChange={(e) => setF({ ...f, stacksBb: e.target.value })} />}</Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Opzioni (segna quella corretta)</legend>
            <ul className="space-y-2">
              {opts.map((o, i) => (
                <li key={o.id} className="flex items-center gap-2">
                  <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                    <input type="radio" name="correct" checked={correct === o.id} onChange={() => setCorrect(o.id)} className="h-5 w-5 accent-[var(--c-accent)]" aria-label={`Opzione ${i + 1} corretta`} />
                  </label>
                  <Input value={o.label} onChange={(e) => setOpts(opts.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))} aria-label={`Testo opzione ${i + 1}`} />
                  {opts.length > 2 && (
                    <button type="button" onClick={() => { setOpts(opts.filter((x) => x.id !== o.id)); if (correct === o.id) setCorrect(opts[0].id) }} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-danger" aria-label={`Rimuovi opzione ${i + 1}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {opts.length < 4 && (
              <Button type="button" variant="ghost" size="sm" className="mt-1 min-h-11" onClick={() => setOpts([...opts, { id: String.fromCharCode(97 + opts.length), label: '' }])} icon={<Plus className="h-4 w-4" aria-hidden />}>
                Aggiungi opzione
              </Button>
            )}
          </fieldset>
          <Field label="Spiegazione del coach" hint="Mostrata dopo la risposta. Numeri chiave e ragionamento, niente ambiguità.">
            {(a) => <Textarea {...a} required value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} className="min-h-28" />}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy} icon={<Target className="h-4 w-4" aria-hidden />}>
              {busy ? 'Salvo…' : 'Programma lo spot'}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel title="Anteprima" className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-3 flex items-center gap-2">
          <Chip tone="accent">{FORMAT_SHORT[f.format]}</Chip>
          <span className="font-display text-lg font-bold">{f.title || 'Titolo dello spot'}</span>
        </div>
        <PokerTable heroCards={f.heroCards} board={f.board || null} stacks={f.stacksBb || 'stack'} />
        <p className="mt-4 text-center text-sm text-ink">{f.situation || 'La situazione apparirà qui.'}</p>
        <ul className="mx-auto mt-4 max-w-sm space-y-2">
          {opts.map((o) => (
            <li key={o.id} className={cn('rounded-[var(--r-card)] border px-3 py-2 text-sm font-semibold', o.id === correct ? 'border-success text-ink' : 'border-line text-muted')}>
              {o.label || '—'}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
