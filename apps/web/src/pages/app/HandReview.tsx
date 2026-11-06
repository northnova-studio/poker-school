import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, MessageSquareText, Send } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, HandReview as HR } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { coachById } from '@/data/coaches'
import { FORMAT_SHORT, fmtRelative } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Field, Input, Segmented, Textarea } from '@/components/app/Controls'
import { toast, toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

const STATUS: Record<HR['status'], { label: string; tone: 'muted' | 'warning' | 'success' }> = {
  OPEN: { label: 'In coda', tone: 'muted' },
  IN_REVIEW: { label: 'Il coach ci sta lavorando', tone: 'warning' },
  REVIEWED: { label: 'Risposta del coach', tone: 'success' },
}

export default function HandReview() {
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const { data, loading, error, reload, setData } = useData(() => api.handReviews.mine(), [])
  const [f, setF] = useState({ format: (user?.formats[0] ?? 'MTT') as Format, title: '', description: '', handHistory: '' })
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const h = await api.handReviews.create(f)
      setData([h, ...(data ?? [])])
      setF({ ...f, title: '', description: '', handHistory: '' })
      toast.success('Mano inviata', 'Risposta del coach di solito entro 48 ore.')
      void celebrate('Mano in review')
    } catch (err) {
      toastError(err, 'Invio non riuscito')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />

  return (
    <div>
      <PageHeader title="Hand review" description="Incolla la hand history, scrivi il dubbio: risponde il coach del tuo formato. Prima di incollare, sostituisci i nickname dei villain." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Invia una mano" className="xl:sticky xl:top-24 xl:self-start">
          <form onSubmit={submit} className="space-y-4">
            <Segmented label="Formato" value={f.format} onChange={(v) => setF({ ...f, format: v })} options={[{ value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin' }, { value: 'CASH', label: 'Cash' }]} />
            <Field label="Titolo">{(a) => <Input {...a} required minLength={4} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Es. AQs in 3-bet pot fuori posizione" />}</Field>
            <Field label="Il tuo dubbio">{(a) => <Textarea {...a} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-20" placeholder="Cosa vuoi sapere dal coach?" />}</Field>
            <Field label="Hand history" hint="Incollala dal client o dal tracker. Usa Villain1, Villain2 al posto dei nickname.">
              {(a) => <Textarea {...a} required value={f.handHistory} onChange={(e) => setF({ ...f, handHistory: e.target.value })} className="min-h-48 font-mono text-xs leading-relaxed" spellCheck={false} />}
            </Field>
            <Button type="submit" className="w-full" disabled={busy} icon={<Send className="h-4 w-4" aria-hidden />}>
              {busy ? 'Invio…' : 'Invia al coach'}
            </Button>
            <p className="text-xs text-muted">25 XP per mano, fino a 5 a settimana.</p>
          </form>
        </Panel>

        <section aria-labelledby="mine-h">
          <h2 id="mine-h" className="mb-3 font-sans text-[0.95rem] font-semibold">
            Le tue mani <span className="font-mono text-muted">{data.length}</span>
          </h2>
          {data.length ? (
            <ul className="space-y-3">
              {data.map((h) => {
                const isOpen = open === h.id
                const coach = h.coachId ? coachById(h.coachId) : null
                return (
                  <li key={h.id} className="rounded-[var(--r-card)] border border-line bg-surface">
                    <button type="button" onClick={() => setOpen(isOpen ? null : h.id)} aria-expanded={isOpen} aria-controls={`hr-${h.id}`} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip>{FORMAT_SHORT[h.format]}</Chip>
                          <Chip tone={STATUS[h.status].tone}>{STATUS[h.status].label}</Chip>
                        </div>
                        <div className="mt-1.5 font-semibold text-ink">{h.title}</div>
                        <div className="text-xs text-muted">inviata {fmtRelative(h.createdAt)}</div>
                      </div>
                      <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} aria-hidden />
                    </button>
                    {isOpen && (
                      <div id={`hr-${h.id}`} className="space-y-4 border-t border-line px-4 py-4">
                        {h.description && <p className="text-sm text-ink">{h.description}</p>}
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--r-card)] bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">{h.handHistory}</pre>
                        {h.coachComment ? (
                          <div className="flex gap-3 rounded-[var(--r-card)] border border-success/40 p-3">
                            <Avatar seed={coach?.avatarSeed ?? 'coach'} label={coach?.nickname} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <MessageSquareText className="h-4 w-4 text-success" aria-hidden />
                                {coach?.name ?? 'Coach'} <span className="font-normal text-muted">· {h.reviewedAt ? fmtRelative(h.reviewedAt) : ''}</span>
                              </div>
                              <p className="mt-1.5 text-sm leading-relaxed text-ink">{h.coachComment}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted">Ancora nessuna risposta: il coach la prende in carico a breve.</p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState title="Nessuna mano inviata" text="La prima review è quella che ti cambia il modo di giocare uno spot." />
          )}
        </section>
      </div>
    </div>
  )
}
