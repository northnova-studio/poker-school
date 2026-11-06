import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Crown, Flag, Flame, MessageCircle, Mountain, Send, Skull, Trophy } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { DeepRun as Run } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { fmtInt, fmtRelative, fmtEur } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Field, Input } from '@/components/app/Controls'
import { toast, toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

const isActive = (r: Run) => r.status === 'LIVE' || (r.status === 'FINAL_TABLE' && r.finishPosition === null)
const STATUS: Record<Run['status'], { label: string; tone: 'accent' | 'accent2' | 'success' | 'muted' }> = {
  LIVE: { label: 'Live', tone: 'accent2' },
  FINAL_TABLE: { label: 'Final table', tone: 'accent' },
  BUSTED: { label: 'Eliminato', tone: 'muted' },
  WON: { label: 'Vinto', tone: 'success' },
}

export default function DeepRun() {
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const { data, loading, error, reload, setData } = useData(() => api.deepRuns.list(), [])
  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const mine = data.find((r) => r.userId === user?.id && isActive(r))
  const live = data.filter((r) => isActive(r) && r.userId !== user?.id)
  const done = data.filter((r) => !isActive(r))
  const replace = (r: Run) => setData(data.some((x) => x.id === r.id) ? data.map((x) => (x.id === r.id ? r : x)) : [r, ...data])

  return (
    <div className="space-y-5">
      <PageHeader title="Deep Run" description="Quando vai lontano in un torneo accendi l’alert: la lobby ti raila, i coach commentano. Niente nomi di poker room, solo il torneo." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section aria-labelledby="live-h">
            <h2 id="live-h" className="mb-3 flex items-center gap-2 font-sans text-[0.95rem] font-semibold">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-2 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-2" />
              </span>
              Live adesso
            </h2>
            {live.length ? (
              <ul className="space-y-4">
                {live.map((r) => (
                  <li key={r.id}>
                    <RunCard run={r} onChange={replace} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Mountain />} title="Nessun deep run live" text="Appena qualcuno va lontano lo trovi qui." />
            )}
          </section>
          <Panel title="Storico" meta="deep run conclusi">
            <ul className="divide-y divide-line">
              {done.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar seed={r.avatarSeed} label={r.nickname} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-semibold text-ink">{r.nickname}</span> <span className="text-muted">· {r.tournamentName}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {r.finishPosition ? `${r.finishPosition}° su ${fmtInt(r.totalPlayers)}` : `${fmtInt(r.playersLeft)} rimasti`} · {fmtRelative(r.updatedAt)} · {r.rails} rail
                    </div>
                  </div>
                  <Chip tone={STATUS[r.status].tone} icon={r.status === 'WON' ? <Crown /> : r.status === 'FINAL_TABLE' ? <Trophy /> : <Skull />}>
                    {STATUS[r.status].label}
                  </Chip>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="lg:col-span-4">
          {mine ? <MyRun run={mine} onChange={replace} onXp={() => celebrate('Deep run')} /> : <CreateRun onCreated={(r) => replace(r)} onXp={() => celebrate('Deep run')} />}
        </div>
      </div>
    </div>
  )
}

function RunCard({ run, onChange }: { run: Run; onChange: (r: Run) => void }) {
  const reduce = useReducedMotion()
  const [burst, setBurst] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const out = 1 - run.playersLeft / run.totalPlayers
  const rail = async () => {
    if (run.railedByMe) return
    setBurst((b) => b + 1)
    try {
      onChange(await api.deepRuns.rail(run.id))
    } catch (e) {
      toastError(e, 'Rail non registrato')
    }
  }
  const comment = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      onChange(await api.deepRuns.comment(run.id, text))
      setText('')
    } catch (err) {
      toastError(err, 'Commento non inviato')
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="rounded-[var(--r-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar seed={run.avatarSeed} label={run.nickname} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl font-bold leading-tight">{run.nickname}</div>
          <div className="text-sm text-muted">
            {run.tournamentName} · buy-in {fmtEur(run.buyIn)}
          </div>
        </div>
        <Chip tone={STATUS[run.status].tone}>{STATUS[run.status].label}</Chip>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Metric label="Rimasti" value={fmtInt(run.playersLeft)} />
        <Metric label="Iscritti" value={fmtInt(run.totalPlayers)} />
        <Metric label="Stack" value={`${run.stackBb} bb`} />
      </div>
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Giocatori eliminati" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(out * 100)}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${out * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>meglio del {Math.floor(out * 100)}% del field</span>
          <span>aggiornato {fmtRelative(run.updatedAt)}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <motion.button
            type="button"
            onClick={rail}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            aria-pressed={run.railedByMe}
            className={cn('relative inline-flex min-h-12 items-center gap-2 rounded-[var(--r-card)] px-5 font-display text-lg font-extrabold tracking-tight', run.railedByMe ? 'bg-accent-2 text-on-accent' : 'bg-accent text-on-accent hover:brightness-110')}
          >
            <Flame className="h-5 w-5" aria-hidden />
            {run.railedByMe ? 'Railato' : 'Raila!'}
            <span className="font-mono text-base">{run.rails}</span>
          </motion.button>
          <AnimatePresence>
            {!reduce &&
              burst > 0 &&
              Array.from({ length: 9 }, (_, i) => (
                <motion.span
                  key={`${burst}-${i}`}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 text-xl"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                  animate={{ x: Math.cos((i / 9) * Math.PI * 2) * 70, y: Math.sin((i / 9) * Math.PI * 2) * 50 - 30, opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  {['🔥', '👏', '🚀'][i % 3]}
                </motion.span>
              ))}
          </AnimatePresence>
        </div>
        <span className="text-sm text-muted">{run.railedByMe ? 'Stai railando questo run.' : 'Fagli sentire la lobby.'}</span>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
          <MessageCircle className="h-4 w-4 text-muted" aria-hidden /> Commenti
        </div>
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {run.comments.map((c) => (
            <li key={c.id} className="text-sm">
              <span className={cn('font-semibold', c.userId.startsWith('c-') ? 'text-accent' : 'text-ink')}>{c.nickname}</span>
              {c.userId.startsWith('c-') && <span className="ml-1 text-xs text-muted">coach</span>} <span className="text-ink">{c.text}</span> <span className="text-xs text-muted">· {fmtRelative(c.createdAt)}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={comment} className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor={`c-${run.id}`}>
            Scrivi un commento per {run.nickname}
          </label>
          <Input id={`c-${run.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Scrivi qualcosa di incoraggiante…" />
          <Button type="submit" variant="secondary" disabled={busy || !text.trim()} aria-label="Invia commento" icon={<Send className="h-4 w-4" aria-hidden />} />
        </form>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-card)] bg-surface-2/60 px-2 py-2.5">
      <div className="font-mono text-xl font-semibold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function CreateRun({ onCreated, onXp }: { onCreated: (r: Run) => void; onXp: () => void }) {
  const [f, setF] = useState({ tournamentName: '', buyIn: '', totalPlayers: '', playersLeft: '', stackBb: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.deepRuns.create({ tournamentName: f.tournamentName, buyIn: Number(f.buyIn.replace(',', '.')), totalPlayers: Number(f.totalPlayers), playersLeft: Number(f.playersLeft), stackBb: Number(f.stackBb) })
      onCreated(r)
      toast.success('Alert attivo', 'La lobby ti sta railando.')
      if (r.status === 'FINAL_TABLE') onXp()
    } catch (err) {
      toastError(err, 'Alert non creato')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel title="Accendi l’alert" meta="sei deep in un torneo?" className="lg:sticky lg:top-24">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Torneo" hint="Nome generico, senza poker room. Es. “Main domenicale 109 €”.">
          {(a) => <Input {...a} value={f.tournamentName} onChange={(e) => setF({ ...f, tournamentName: e.target.value })} required />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Buy-in (€)">{(a) => <Input {...a} inputMode="decimal" value={f.buyIn} onChange={(e) => setF({ ...f, buyIn: e.target.value })} required />}</Field>
          <Field label="Stack (bb)">{(a) => <Input {...a} inputMode="numeric" value={f.stackBb} onChange={(e) => setF({ ...f, stackBb: e.target.value })} required />}</Field>
          <Field label="Iscritti">{(a) => <Input {...a} inputMode="numeric" value={f.totalPlayers} onChange={(e) => setF({ ...f, totalPlayers: e.target.value })} required />}</Field>
          <Field label="Rimasti">{(a) => <Input {...a} inputMode="numeric" value={f.playersLeft} onChange={(e) => setF({ ...f, playersLeft: e.target.value })} required />}</Field>
        </div>
        <Button type="submit" className="w-full" disabled={busy} icon={<Flag className="h-4 w-4" aria-hidden />}>
          {busy ? 'Attivo…' : 'Attiva l’alert'}
        </Button>
        <p className="text-xs text-muted">Final table o vittoria valgono 60 XP.</p>
      </form>
    </Panel>
  )
}

function MyRun({ run, onChange, onXp }: { run: Run; onChange: (r: Run) => void; onXp: () => void }) {
  const [left, setLeft] = useState(String(run.playersLeft))
  const [stack, setStack] = useState(String(run.stackBb))
  const [busy, setBusy] = useState(false)
  const patch = async (p: Parameters<typeof api.deepRuns.update>[1], msg: string) => {
    setBusy(true)
    try {
      const r = await api.deepRuns.update(run.id, p)
      onChange(r)
      toast.success(msg)
      if (r.status === 'FINAL_TABLE' || r.status === 'WON') onXp()
    } catch (e) {
      toastError(e, 'Aggiornamento non riuscito')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel title="Il tuo deep run" meta={run.tournamentName} className="lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <Chip tone={STATUS[run.status].tone}>{STATUS[run.status].label}</Chip>
        <span className="font-mono text-sm text-muted">{run.rails} rail</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void patch({ playersLeft: Number(left), stackBb: Number(stack) }, 'Aggiornato')
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rimasti">{(a) => <Input {...a} inputMode="numeric" value={left} onChange={(e) => setLeft(e.target.value)} />}</Field>
          <Field label="Stack (bb)">{(a) => <Input {...a} inputMode="numeric" value={stack} onChange={(e) => setStack(e.target.value)} />}</Field>
        </div>
        <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
          Aggiorna
        </Button>
      </form>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Button size="sm" variant="secondary" className="min-h-11" disabled={busy || run.status === 'FINAL_TABLE'} onClick={() => patch({ status: 'FINAL_TABLE' }, 'Final table!')}>
          Final table
        </Button>
        <Button size="sm" variant="secondary" className="min-h-11" disabled={busy} onClick={() => patch({ status: 'BUSTED', finishPosition: Number(left) }, 'GG, alla prossima')}>
          Eliminato
        </Button>
        <Button size="sm" className="min-h-11" disabled={busy} onClick={() => patch({ status: 'WON' }, 'Campione!')}>
          Vinto
        </Button>
      </div>
    </Panel>
  )
}
