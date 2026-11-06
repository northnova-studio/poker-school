import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Award, Info, MessageSquareQuote, Plus, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, RoastSpot } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { FORMAT_SHORT, fmtRelative } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/app/Panel'
import { Checkbox, Field, Input, Segmented, Textarea } from '@/components/app/Controls'
import { Modal, toast, toastError } from '@/components/app/Overlay'
import { CardRow } from '@/components/app/Poker'
import { useAppShell } from '@/components/app/AppContext'

export default function Roast() {
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const { data, loading, error, reload, setData } = useData(() => api.roast.current(), [])
  const [open, setOpen] = useState(false)

  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const worst = data.reduce<RoastSpot | null>((a, s) => (!a || s.votesWorst > a.votesWorst ? s : a), null)
  const best = data.reduce<RoastSpot | null>((a, s) => (!a || s.votesBest > a.votesBest ? s : a), null)

  const vote = async (s: RoastSpot, kind: 'WORST' | 'BEST') => {
    try {
      const firstVote = !s.myVote
      const upd = await api.roast.vote(s.id, kind)
      setData(data.map((x) => (x.id === s.id ? upd : x)))
      if (firstVote) void celebrate('Voto al Roast')
    } catch (e) {
      toastError(e, 'Voto non registrato')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roast della settimana"
        kicker={`Settimana ${data[0]?.weekId.split('-W')[1] ?? ''}`}
        description="Lo spot giocato peggio e quello giocato meglio, votati dalla community e commentati dai fondatori."
        actions={
          <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>
            Proponi uno spot
          </Button>
        }
      />

      <aside className="flex gap-3 rounded-[var(--r-card)] border border-line bg-surface px-4 py-3 text-sm" aria-label="Regole del Roast">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-muted">
          <span className="font-semibold text-ink">Si critica la giocata, mai la persona.</span> Le mani sono anonimizzate: niente nickname, avatar o nomi di poker room. Una mano di un membro compare come “sua” solo se ha dato il consenso nel profilo
          {user && !user.roastOptIn && (
            <>
              {' '}
              (<Link to="/app/profilo" className="text-accent underline-offset-2 hover:underline">il tuo è disattivato</Link>)
            </>
          )}
          .
        </p>
      </aside>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {worst && worst.votesWorst > 0 && <Podium kind="WORST" spot={worst} />}
        {best && best.votesBest > 0 && <Podium kind="BEST" spot={best} />}
      </div>

      {data.length ? (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((s) => (
            <li key={s.id}>
              <SpotCard spot={s} onVote={(k) => vote(s, k)} mine={s.submittedByUserId === user?.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nessuno spot questa settimana" text="Proponi il primo: anonimizzato e con spirito sportivo." />
      )}

      <SubmitModal open={open} onClose={() => setOpen(false)} onDone={(s) => setData([s, ...data])} optIn={!!user?.roastOptIn} />
    </div>
  )
}

function Podium({ kind, spot }: { kind: 'WORST' | 'BEST'; spot: RoastSpot }) {
  const worst = kind === 'WORST'
  return (
    <div className={cn('grain relative overflow-hidden rounded-[var(--r-card)] border p-5', worst ? 'border-accent-2/50 bg-surface' : 'border-accent/50 bg-surface')}>
      <div className="relative z-[2]">
        <div className={cn('flex items-center gap-2 text-sm font-semibold', worst ? 'text-accent-2' : 'text-accent')}>
          {worst ? <ThumbsDown className="h-4 w-4" aria-hidden /> : <Award className="h-4 w-4" aria-hidden />}
          {worst ? 'Spot del disonore (per ora)' : 'Giocata della settimana (per ora)'}
        </div>
        <div className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight">{spot.title}</div>
        <div className="mt-1 font-mono text-sm text-muted">{worst ? spot.votesWorst : spot.votesBest} voti</div>
      </div>
    </div>
  )
}

function SpotCard({ spot, onVote, mine }: { spot: RoastSpot; onVote: (k: 'WORST' | 'BEST') => void; mine: boolean }) {
  const reduce = useReducedMotion()
  const total = spot.votesWorst + spot.votesBest || 1
  const btn = (kind: 'WORST' | 'BEST') => {
    const on = spot.myVote === kind
    const n = kind === 'WORST' ? spot.votesWorst : spot.votesBest
    return (
      <motion.button
        type="button"
        onClick={() => onVote(kind)}
        aria-pressed={on}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        className={cn(
          'relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--r-card)] border px-3 text-sm font-semibold transition-colors',
          on ? (kind === 'WORST' ? 'border-accent-2 bg-accent-2 text-on-accent' : 'border-accent bg-accent text-on-accent') : 'border-line text-ink hover:border-muted',
        )}
      >
        {kind === 'WORST' ? <ThumbsDown className="h-4 w-4" aria-hidden /> : <ThumbsUp className="h-4 w-4" aria-hidden />}
        {kind === 'WORST' ? 'Peggio' : 'Meglio'}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={n} className="font-mono" initial={reduce ? false : { y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: 10, opacity: 0 }}>
            {n}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    )
  }
  return (
    <article className="flex h-full flex-col rounded-[var(--r-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="accent">{FORMAT_SHORT[spot.format]}</Chip>
        {spot.playedByMember && <Chip tone="accent2">mano di un membro, con consenso</Chip>}
        {mine && <Chip>proposta da te</Chip>}
        <span className="ml-auto text-xs text-muted">{fmtRelative(spot.createdAt)}</span>
      </div>
      <h2 className="mt-3 font-display text-xl font-bold leading-tight">{spot.title}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="mb-1 text-xs text-muted">Hero</div>
          <CardRow cards={spot.heroCards} size="sm" placeholder={2} label="Carte dell'eroe" />
        </div>
        {spot.board && (
          <div>
            <div className="mb-1 text-xs text-muted">Board</div>
            <CardRow cards={spot.board} size="sm" label="Board" />
          </div>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{spot.description}</p>
      {spot.founderComment ? (
        <blockquote className="mt-4 flex gap-3 border-l-2 border-accent pl-3 text-sm italic leading-relaxed text-muted">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 not-italic text-accent" aria-hidden />
          {spot.founderComment}
        </blockquote>
      ) : (
        <p className="mt-4 text-xs text-muted">In attesa del commento dei fondatori.</p>
      )}
      <div className="mt-auto pt-5">
        <div className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="bg-accent-2" style={{ width: `${(spot.votesWorst / total) * 100}%` }} />
          <div className="ml-auto bg-accent" style={{ width: `${(spot.votesBest / total) * 100}%` }} />
        </div>
        <div className="flex gap-2">
          {btn('WORST')}
          {btn('BEST')}
        </div>
      </div>
    </article>
  )
}

function SubmitModal({ open, onClose, onDone, optIn }: { open: boolean; onClose: () => void; onDone: (s: RoastSpot) => void; optIn: boolean }) {
  const [f, setF] = useState({ title: '', description: '', format: 'MTT' as Format, heroCards: '', board: '', isMyOwnHand: false, confirmAnonymized: false })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const errs = {
    title: f.title.trim().length < 4 ? 'Almeno 4 caratteri.' : undefined,
    description: f.description.trim().length < 20 ? 'Racconta la mano in almeno 20 caratteri.' : undefined,
    confirm: !f.confirmAnonymized ? 'Obbligatorio: senza anonimizzazione non possiamo pubblicarla.' : undefined,
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (errs.title || errs.description || errs.confirm) return
    setBusy(true)
    try {
      const s = await api.roast.submit({ ...f, board: f.board.trim() || null })
      onDone(s)
      toast.success('Spot inviato', 'I fondatori lo commenteranno prima della pubblicazione.')
      setF({ title: '', description: '', format: 'MTT', heroCards: '', board: '', isMyOwnHand: false, confirmAnonymized: false })
      setTried(false)
      onClose()
    } catch (err) {
      toastError(err, 'Invio non riuscito')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Proponi uno spot" description="Una mano tua o vista al tavolo, purché anonimizzata." size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Titolo" error={tried ? errs.title : undefined} required>
            {(a) => <Input {...a} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Es. Il fold di set più lungo della storia" />}
          </Field>
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">Formato</div>
            <Segmented label="Formato" value={f.format} onChange={(v) => setF({ ...f, format: v })} options={[{ value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin' }, { value: 'CASH', label: 'Cash' }]} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carte dell’eroe" hint="Es. AhKd">
            {(a) => <Input {...a} value={f.heroCards} onChange={(e) => setF({ ...f, heroCards: e.target.value })} className="font-mono" maxLength={8} />}
          </Field>
          <Field label="Board" hint="Es. Ks7d2c9h (vuoto se preflop)">
            {(a) => <Input {...a} value={f.board} onChange={(e) => setF({ ...f, board: e.target.value })} className="font-mono" maxLength={14} />}
          </Field>
        </div>
        <Field label="La mano" hint="Stack, posizioni, azioni. Chiama gli avversari “Villain A”, “Villain B”." error={tried ? errs.description : undefined} required>
          {(a) => <Textarea {...a} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}
        </Field>
        <Checkbox
          checked={f.isMyOwnHand}
          onChange={(e) => setF({ ...f, isMyOwnHand: e.target.checked })}
          label="È una mia mano"
          description={optIn ? 'Comparirà come mano di un membro (hai dato il consenso al Roast).' : 'Senza il consenso al Roast nel profilo comparirà comunque come mano anonima.'}
        />
        <div>
          <Checkbox checked={f.confirmAnonymized} onChange={(e) => setF({ ...f, confirmAnonymized: e.target.checked })} label="Ho anonimizzato nickname e avatar e tolto ogni nome di poker room" />
          {tried && errs.confirm && <p className="mt-1.5 pl-8 text-xs font-medium text-danger">{errs.confirm}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={busy} icon={<Send className="h-4 w-4" aria-hidden />}>
            {busy ? 'Invio…' : 'Invia lo spot'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
