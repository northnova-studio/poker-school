import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, PlayCircle, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Course, CourseProgress } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { COURSES } from '@/data/courses'
import { coachById } from '@/data/coaches'
import { FORMAT_SHORT, PLAN_LABEL, fmtDuration, fmtEur } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, ProgressBar } from '@/components/app/Panel'
import { CourseCover } from '@/components/app/CourseCover'
import { Modal, toast, toastError } from '@/components/app/Overlay'

export default function MyCourses() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useData(async () => {
    const purchases = await api.courses.myPurchases()
    const owned = COURSES.filter((c) => purchases.some((p) => p.courseId === c.id) || (user?.plan && c.includedInPlans.includes(user.plan)) || user?.role !== 'STUDENT')
    const progress = await Promise.all(owned.map((c) => api.courses.progress(c.id)))
    return { purchases, owned, progress: Object.fromEntries(progress.map((p) => [p.courseId, p])) as Record<string, CourseProgress> }
  }, [user?.plan])
  const [buy, setBuy] = useState<Course | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const others = COURSES.filter((c) => !data.owned.includes(c))
  const inProgress = data.owned.filter((c) => (data.progress[c.id]?.percent ?? 0) > 0 && data.progress[c.id].percent < 100)

  const checkout = async () => {
    if (!buy) return
    setBusy(true)
    try {
      const r = await api.courses.checkout(buy.id)
      if (r.checkoutUrl) {
        window.location.assign(r.checkoutUrl)
        return
      }
      toast.success('Corso sbloccato', api.mode === 'demo' ? 'Acquisto demo: nessun pagamento.' : undefined)
      setBuy(null)
      await reload()
    } catch (e) {
      toastError(e, 'Acquisto non riuscito')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="I miei corsi" description={`Corsi acquistati e quelli inclusi nel piano ${user?.plan ? PLAN_LABEL[user.plan] : ''}. Riprendi da dove avevi lasciato.`} />

      {inProgress[0] && (
        <Link to={`/app/corsi/${inProgress[0].slug}`} className="group grid overflow-hidden rounded-[var(--r-card)] border border-line bg-surface sm:grid-cols-[1.1fr_1fr]">
          <CourseCover seed={inProgress[0].coverSeed} className="aspect-[16/9] sm:aspect-auto sm:min-h-56" />
          <div className="flex flex-col justify-center p-5 sm:p-7">
            <span className="text-sm text-muted">Continua a guardare</span>
            <span className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{inProgress[0].title}</span>
            <ProgressBar className="mt-4" value={data.progress[inProgress[0].id].percent} label={`Avanzamento ${inProgress[0].title}`} />
            <span className="mt-2 text-sm text-muted">{data.progress[inProgress[0].id].percent}% completato</span>
            <span className="mt-4 inline-flex items-center gap-2 font-semibold text-accent">
              <PlayCircle className="h-5 w-5" aria-hidden /> Riprendi la lezione
            </span>
          </div>
        </Link>
      )}

      <section aria-labelledby="owned">
        <h2 id="owned" className="mb-3 font-sans text-[0.95rem] font-semibold">
          La tua libreria <span className="font-mono text-muted">{data.owned.length}</span>
        </h2>
        {data.owned.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.owned.map((c) => {
              const p = data.progress[c.id]
              const purchased = data.purchases.some((x) => x.courseId === c.id)
              return (
                <li key={c.id}>
                  <Link to={`/app/corsi/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[var(--r-card)] border border-line bg-surface transition-colors hover:border-accent/60">
                    <CourseCover seed={c.coverSeed} label={`${FORMAT_SHORT[c.format]} · ${LEVEL_LABEL[c.level]}`} className="aspect-[16/8]" />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="font-display text-lg font-bold leading-tight">{c.title}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted">{c.subtitle}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {fmtDuration(c.durationMin)} · {coachById(c.coachId)?.nickname}
                        <Chip tone={purchased ? 'accent' : 'muted'}>{purchased ? 'acquistato' : 'incluso nel piano'}</Chip>
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="text-muted">{p?.percent === 100 ? 'Completato' : 'Avanzamento'}</span>
                          <span className="font-mono text-ink">{p?.percent ?? 0}%</span>
                        </div>
                        <ProgressBar value={p?.percent ?? 0} label={`Avanzamento ${c.title}`} tone={p?.percent === 100 ? 'success' : 'accent'} />
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title="Nessun corso ancora" text="Scegli un corso qui sotto o passa a un piano che li include." />
        )}
      </section>

      {others.length > 0 && (
        <Panel title="Altri corsi della scuola" meta="sbloccali quando vuoi">
          <ul className="divide-y divide-line">
            {others.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                <CourseCover seed={c.coverSeed} className="h-14 w-24 shrink-0 rounded-[var(--r-card)]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{c.title}</div>
                  <div className="text-sm text-muted">
                    {FORMAT_SHORT[c.format]} · {LEVEL_LABEL[c.level]} · {fmtDuration(c.durationMin)}
                    {c.includedInPlans.length > 0 && ` · incluso in ${c.includedInPlans.map((p) => PLAN_LABEL[p]).join(', ')}`}
                  </div>
                </div>
                <span className="font-mono font-semibold text-ink">{fmtEur(c.priceEur)}</span>
                <Button variant="secondary" size="sm" className="min-h-11" onClick={() => setBuy(c)} icon={<ShoppingBag className="h-4 w-4" aria-hidden />}>
                  Sblocca
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal
        open={!!buy}
        onClose={() => setBuy(null)}
        title={buy ? `Sblocca “${buy.title}”` : ''}
        description={buy ? `${fmtEur(buy.priceEur)} · accesso a vita` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuy(null)}>
              Annulla
            </Button>
            <Button onClick={checkout} disabled={busy} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}>
              {busy ? 'Attendi…' : api.mode === 'demo' ? 'Sblocca (demo)' : 'Vai al pagamento'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{buy?.description}</p>
        {api.mode === 'demo' && <p className="mt-3 text-sm text-ink">In demo l’acquisto è immediato e senza pagamento.</p>}
      </Modal>
    </div>
  )
}
