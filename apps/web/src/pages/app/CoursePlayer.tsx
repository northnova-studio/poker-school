import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, Lock, Play } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { coachById } from '@/data/coaches'
import { FORMAT_SHORT, fmtDuration, fmtTime } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { ErrorState, PageSkeleton, Panel, ProgressBar } from '@/components/app/Panel'
import { CourseCover } from '@/components/app/CourseCover'
import { toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

export default function CoursePlayer() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, reload, setData } = useData(async () => {
    const course = await api.courses.get(slug)
    const [progress, purchases] = await Promise.all([api.courses.progress(course.id), api.courses.myPurchases()])
    return { course, progress, owned: purchases.some((p) => p.courseId === course.id) || (!!user?.plan && course.includedInPlans.includes(user.plan)) || user?.role !== 'STUDENT' }
  }, [slug])
  const lessons = useMemo(() => data?.course.chapters.flatMap((ch) => ch.lessons) ?? [], [data])
  const currentId = params.get('lezione') ?? data?.progress.lastLessonId ?? lessons[0]?.id
  const idx = Math.max(0, lessons.findIndex((l) => l.id === currentId))
  const lesson = lessons[idx]
  const unlocked = !!lesson && (data?.owned || lesson.preview)
  const video = useData(async () => (lesson && data && unlocked ? api.courses.videoAccess(data.course.id, lesson.id) : null), [lesson?.id, unlocked])
  const [busy, setBusy] = useState(false)

  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Corso non trovato')} onRetry={reload} />
  const { course, progress } = data
  const done = new Set(progress.completedLessonIds)
  const select = (id: string) => setParams({ lezione: id }, { replace: true })

  const complete = async () => {
    if (!lesson) return
    setBusy(true)
    try {
      const p = await api.courses.completeLesson(course.id, lesson.id)
      setData({ ...data, progress: p })
      if (p.percent === 100) void celebrate('Corso completato')
      const next = lessons[idx + 1]
      if (next) select(next.id)
    } catch (e) {
      toastError(e, 'Non riesco a segnare la lezione')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to="/app/corsi" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> I miei corsi
      </Link>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          {/* player: in demo nessun video esterno, poster generativo */}
          <div className="relative aspect-video overflow-hidden rounded-[var(--r-card)] border border-line bg-surface-2">
            <CourseCover seed={`${course.coverSeed}-${lesson?.id}`} className="absolute inset-0" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg/40 p-6 text-center">
              {unlocked ? (
                <>
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-on-accent sm:h-20 sm:w-20">
                    <Play className="ml-1 h-7 w-7 sm:h-9 sm:w-9" aria-hidden />
                  </span>
                  <div>
                    <div className="font-display text-xl font-bold sm:text-2xl">Video della lezione</div>
                    <p className="mt-1 max-w-md text-sm text-muted">
                      {api.mode === 'demo' ? 'In demo non carichiamo video esterni: qui andrà il player del provider (Bunny, Mux o Vimeo) con URL firmato.' : 'Caricamento del video…'}
                    </p>
                    {video.data && <p className="mt-2 font-mono text-xs text-muted">accesso valido fino alle {fmtTime(video.data.expiresAt)}</p>}
                  </div>
                </>
              ) : (
                <>
                  <Lock className="h-10 w-10 text-muted" aria-hidden />
                  <div className="font-display text-xl font-bold">Lezione bloccata</div>
                  <Link to="/app/corsi" className="text-sm font-semibold text-accent hover:underline">
                    Sblocca il corso
                  </Link>
                </>
              )}
            </div>
          </div>
          <Panel>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-muted">
                  {course.title} · lezione {idx + 1} di {lessons.length}
                </div>
                <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{lesson?.title}</h1>
                <div className="mt-2 text-sm text-muted">
                  {fmtDuration(lesson?.durationMin ?? 0)} · {coachById(course.coachId)?.name} · {FORMAT_SHORT[course.format]} {LEVEL_LABEL[course.level]}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson && done.has(lesson.id) ? (
                  <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden /> Completata
                  </span>
                ) : (
                  <Button onClick={complete} disabled={busy || !unlocked} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}>
                    Segna come completata
                  </Button>
                )}
                {lessons[idx + 1] && (
                  <Button variant="secondary" onClick={() => select(lessons[idx + 1].id)} icon={<ChevronRight className="h-4 w-4" aria-hidden />}>
                    Prossima
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-muted">{course.description}</p>
          </Panel>
        </div>

        <Panel title="Programma" meta={`${progress.percent}%`} className="xl:sticky xl:top-24 xl:self-start" flush>
          <div className="px-4 pb-3 sm:px-5">
            <ProgressBar value={progress.percent} label="Avanzamento del corso" tone={progress.percent === 100 ? 'success' : 'accent'} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-line">
            {course.chapters.map((ch, ci) => (
              <div key={ch.title}>
                <div className="sticky top-0 bg-surface px-4 py-2 text-xs font-medium text-muted sm:px-5">
                  Capitolo {ci + 1} · {ch.title}
                </div>
                <ul>
                  {ch.lessons.map((l) => {
                    const on = l.id === lesson?.id
                    const can = data.owned || l.preview
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => select(l.id)}
                          aria-current={on ? 'true' : undefined}
                          className={cn('flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors sm:px-5', on ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/60 hover:text-ink')}
                        >
                          {done.has(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="completata" /> : can ? <Circle className="h-4 w-4 shrink-0" aria-hidden /> : <Lock className="h-4 w-4 shrink-0" aria-label="bloccata" />}
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                          {l.preview && !data.owned && <span className="text-xs text-accent">anteprima</span>}
                          <span className="font-mono text-xs">{l.durationMin}′</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
