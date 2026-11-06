import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, ChevronRight, Lock, PlayCircle, Users, Video, X } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { GroupLesson, PlanId } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { coachById } from '@/data/coaches'
import { FORMAT_SHORT, PLAN_LABEL, fmtDuration, fmtTime, fmtWeekday } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, ProgressBar } from '@/components/app/Panel'
import { Segmented } from '@/components/app/Controls'
import { Modal, toast, toastError } from '@/components/app/Overlay'
import { Avatar } from '@/components/ui/Avatar'

const RANK: Record<PlanId, number> = { base: 1, pro: 2, elite: 3 }
const DAY = 86_400_000

function weekStart(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay() || 7
  x.setDate(x.getDate() - day + 1)
  return x
}

const FORMAT_TONE: Record<string, string> = { MTT: 'var(--c-accent)', SPIN: 'var(--c-accent-2)', CASH: 'var(--c-accent-3)', MENTAL: 'var(--c-muted)' }

export default function Lessons() {
  const { user } = useAuth()
  const [view, setView] = useState<'week' | 'list'>('week')
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<GroupLesson | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, loading, error, reload, setData } = useData(() => api.lessons.list({ from: new Date(Date.now() - 63 * DAY).toISOString(), to: new Date(Date.now() + 35 * DAY).toISOString() }), [])

  const ws = useMemo(() => new Date(weekStart(new Date()).getTime() + offset * 7 * DAY), [offset])
  const days = Array.from({ length: 7 }, (_, i) => new Date(ws.getTime() + i * DAY))
  const now = Date.now()

  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />

  const canBook = (l: GroupLesson) => user?.role !== 'STUDENT' || (!!user?.plan && RANK[user.plan] >= RANK[l.minPlan])
  const upcoming = data.filter((l) => Date.parse(l.startsAt) > now)
  const mine = upcoming.filter((l) => l.bookedByMe)
  const past = data.filter((l) => Date.parse(l.startsAt) + l.durationMin * 60_000 < now).reverse()

  const act = async (l: GroupLesson) => {
    setBusy(true)
    try {
      const updated = l.bookedByMe ? await api.lessons.cancel(l.id) : await api.lessons.book(l.id)
      setData(data.map((x) => (x.id === l.id ? updated : x)))
      setOpen(updated)
      toast.success(updated.bookedByMe ? 'Posto prenotato' : 'Prenotazione annullata', updated.bookedByMe ? `${fmtWeekday(l.startsAt)} alle ${fmtTime(l.startsAt)}` : undefined)
    } catch (e) {
      toastError(e, 'Operazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lezioni di gruppo"
        description="Live con i fondatori, ogni settimana. Prenota il posto: il link della call compare solo ai prenotati."
        actions={<Segmented label="Vista" value={view} onChange={setView} options={[{ value: 'week', label: 'Settimana' }, { value: 'list', label: 'Lista' }]} />}
      />

      {mine.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--r-card)] border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          <CalendarCheck className="h-5 w-5 text-accent" aria-hidden />
          <span>
            Hai <span className="font-semibold text-ink">{mine.length}</span> lezioni prenotate. La prossima: <span className="font-semibold text-ink">{mine[0].title}</span>, {fmtWeekday(mine[0].startsAt)} alle {fmtTime(mine[0].startsAt)}.
          </span>
        </div>
      )}

      {view === 'week' ? (
        <Panel
          title={`Settimana del ${ws.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}
          actions={
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOffset((o) => o - 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] border border-line hover:border-accent" aria-label="Settimana precedente">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={() => setOffset(0)} className="min-h-11 rounded-[var(--r-card)] px-3 text-sm font-medium text-muted hover:text-ink" disabled={offset === 0}>
                Oggi
              </button>
              <button type="button" onClick={() => setOffset((o) => o + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] border border-line hover:border-accent" aria-label="Settimana successiva">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            {days.map((d) => {
              const list = data.filter((l) => new Date(l.startsAt).toDateString() === d.toDateString())
              const today = d.toDateString() === new Date().toDateString()
              return (
                <div key={d.toISOString()} className={cn('min-h-0 rounded-[var(--r-card)] border p-2 md:min-h-56', today ? 'border-accent/60 bg-accent/5' : 'border-line')}>
                  <div className="mb-2 flex items-baseline gap-2 px-1">
                    <span className={cn('font-mono text-lg font-semibold', today ? 'text-accent' : 'text-ink')}>{d.getDate()}</span>
                    <span className="text-xs capitalize text-muted">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {list.map((l) => {
                      const isPast = Date.parse(l.startsAt) < now
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => setOpen(l)}
                            className={cn('w-full rounded-[calc(var(--r-card)-2px)] border-l-[3px] bg-surface-2 px-2.5 py-2 text-left transition-colors hover:bg-surface-2/60', isPast && 'opacity-60')}
                            style={{ borderLeftColor: FORMAT_TONE[l.format] }}
                          >
                            <div className="flex items-center justify-between gap-1 font-mono text-xs text-muted">
                              {fmtTime(l.startsAt)}
                              {l.bookedByMe && <CalendarCheck className="h-3.5 w-3.5 text-accent" aria-label="prenotata" />}
                              {!canBook(l) && !isPast && <Lock className="h-3.5 w-3.5" aria-label={`serve il piano ${PLAN_LABEL[l.minPlan]}`} />}
                            </div>
                            <div className="mt-0.5 text-[0.82rem] font-semibold leading-snug text-ink">{l.title}</div>
                            <div className="mt-0.5 text-xs text-muted">
                              {FORMAT_SHORT[l.format]} · {coachById(l.coachId)?.nickname}
                            </div>
                          </button>
                        </li>
                      )
                    })}
                    {!list.length && <li className="hidden px-1 text-xs text-muted/70 md:block">—</li>}
                  </ul>
                </div>
              )
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda formati">
            {Object.entries(FORMAT_TONE).map(([f, c]) => (
              <li key={f} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} aria-hidden />
                {FORMAT_SHORT[f as keyof typeof FORMAT_SHORT]}
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="In programma" meta={`${upcoming.length} lezioni`}>
            {upcoming.length ? (
              <ul className="divide-y divide-line">
                {upcoming.map((l) => (
                  <LessonRow key={l.id} l={l} onOpen={() => setOpen(l)} locked={!canBook(l)} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nessuna lezione in programma" />
            )}
          </Panel>
          <Panel title="Registrazioni" meta="lezioni passate">
            <ul className="divide-y divide-line">
              {past.slice(0, 14).map((l) => (
                <LessonRow key={l.id} l={l} onOpen={() => setOpen(l)} locked={!l.recordingUrl} past />
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} description={open ? `${fmtWeekday(open.startsAt)} · ${fmtTime(open.startsAt)} · ${fmtDuration(open.durationMin)}` : undefined}>
        {open && <LessonDetail l={open} canBook={canBook(open)} busy={busy} onAct={() => act(open)} />}
      </Modal>
    </div>
  )
}

function LessonRow({ l, onOpen, locked, past }: { l: GroupLesson; onOpen: () => void; locked: boolean; past?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
        <div className="w-14 shrink-0 text-center">
          <div className="font-mono text-lg font-semibold leading-none">{new Date(l.startsAt).getDate()}</div>
          <div className="text-[0.7rem] uppercase text-muted">{new Date(l.startsAt).toLocaleDateString('it-IT', { month: 'short' })}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{l.title}</div>
          <div className="text-xs text-muted">
            {fmtTime(l.startsAt)} · {FORMAT_SHORT[l.format]} · {coachById(l.coachId)?.nickname} · {l.bookedCount}/{l.capacity}
          </div>
        </div>
        {past ? (
          l.recordingUrl ? <PlayCircle className="h-5 w-5 text-accent" aria-label="registrazione disponibile" /> : <Lock className="h-4 w-4 text-muted" aria-label="registrazione non inclusa nel piano" />
        ) : l.bookedByMe ? (
          <Chip tone="accent">prenotata</Chip>
        ) : locked ? (
          <Chip>{PLAN_LABEL[l.minPlan]}+</Chip>
        ) : null}
      </button>
    </li>
  )
}

function LessonDetail({ l, canBook, busy, onAct }: { l: GroupLesson; canBook: boolean; busy: boolean; onAct: () => void }) {
  const coach = coachById(l.coachId)
  const started = Date.parse(l.startsAt) < Date.now()
  const full = l.bookedCount >= l.capacity
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Chip tone="accent">{FORMAT_SHORT[l.format]}</Chip>
        <Chip>{LEVEL_LABEL[l.level]}</Chip>
        <Chip>dal piano {PLAN_LABEL[l.minPlan]}</Chip>
      </div>
      <p className="text-sm leading-relaxed text-muted">{l.description}</p>
      <div className="flex items-center gap-3">
        <Avatar seed={coach?.avatarSeed ?? l.coachId} label={coach?.nickname} size={40} />
        <div>
          <div className="font-semibold text-ink">{coach?.name}</div>
          <div className="text-xs text-muted">{coach?.role}</div>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Users className="h-4 w-4" aria-hidden /> Posti
          </span>
          <span className="font-mono text-ink">
            {l.bookedCount}/{l.capacity}
          </span>
        </div>
        <ProgressBar value={l.bookedCount} max={l.capacity} label="Posti occupati" tone={full ? 'accent2' : 'accent'} />
      </div>
      {l.bookedByMe && l.meetingUrl && !started && (
        <div className="rounded-[var(--r-card)] border border-line bg-surface-2/60 p-3 text-sm">
          <div className="font-medium text-ink">Link della call</div>
          <a href={l.meetingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-2 break-all font-mono text-xs text-accent underline-offset-4 hover:underline">
            <Video className="h-4 w-4 shrink-0" aria-hidden /> {l.meetingUrl}
          </a>
          {api.mode === 'demo' && <p className="mt-1 text-xs text-muted">Link di esempio in demo.</p>}
        </div>
      )}
      {started ? (
        l.recordingUrl ? (
          <div className="rounded-[var(--r-card)] border border-line bg-surface-2/60 p-3 text-sm">
            <div className="inline-flex items-center gap-2 font-medium text-ink">
              <PlayCircle className="h-4 w-4 text-accent" aria-hidden /> Registrazione disponibile
            </div>
            <p className="mt-1 text-xs text-muted">{api.mode === 'demo' ? 'In demo il video non viene caricato.' : 'Apri la registrazione dal player.'}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Lezione conclusa. {canBook ? 'La registrazione arriverà a breve.' : `Registrazioni incluse dal piano ${PLAN_LABEL[l.minPlan]}.`}</p>
        )
      ) : canBook ? (
        <Button onClick={onAct} disabled={busy || (!l.bookedByMe && full)} variant={l.bookedByMe ? 'secondary' : 'primary'} className="w-full" icon={l.bookedByMe ? <X className="h-4 w-4" aria-hidden /> : <CalendarCheck className="h-4 w-4" aria-hidden />}>
          {busy ? 'Attendi…' : l.bookedByMe ? 'Annulla la prenotazione' : full ? 'Posti esauriti' : 'Prenota il posto'}
        </Button>
      ) : (
        <div className="rounded-[var(--r-card)] border border-line p-3 text-sm">
          <div className="inline-flex items-center gap-2 font-medium text-ink">
            <Lock className="h-4 w-4" aria-hidden /> Serve il piano {PLAN_LABEL[l.minPlan]} o superiore
          </div>
          <Link to="/app/profilo#piano" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
            Cambia piano
          </Link>
        </div>
      )}
    </div>
  )
}
