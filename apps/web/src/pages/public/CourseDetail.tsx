import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronDown, Lock, Play, X } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { courseBySlug, COURSES } from '@/data/courses'
import { coachById } from '@/data/coaches'
import { PLANS } from '@/data/plans'
import type { CourseLesson } from '@/lib/api/types'
import { FORMAT_LABEL, LEVEL_LABEL, fmtEur } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { CourseCover } from '@/components/public/CourseCover'
import { CourseBadge, CourseCard, fmtDuration } from '@/components/public/CourseCard'
import { publicScrollLock } from '@/hooks/usePublicSmoothScroll'
import NotFound from './NotFound'

function PreviewModal({ lesson, seed, format, onClose }: { lesson: CourseLesson | null; seed: string; format: Parameters<typeof CourseCover>[0]['format']; onClose: () => void }) {
  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {lesson && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          className="fixed inset-0 z-[90] grid place-items-center bg-bg/90 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          data-lenis-prevent
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl border border-line bg-surface"
            style={{ borderRadius: 'var(--r-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video overflow-hidden" style={{ borderRadius: 'var(--r-card) var(--r-card) 0 0' }}>
              <CourseCover seed={seed + lesson.id} format={format} />
              <div className="absolute inset-0 grid place-items-center bg-bg/40">
                <div className="text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-on-accent">
                    <Play className="h-7 w-7" aria-hidden />
                  </span>
                  <p className="mt-4 font-semibold text-ink">Il video dell’anteprima sarà disponibile al lancio.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted">Anteprima gratuita</p>
                <h2 id="preview-title" className="font-display text-xl font-extrabold text-ink">
                  {lesson.title}
                </h2>
              </div>
              <button type="button" autoFocus onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-accent" aria-label="Chiudi l’anteprima">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </MotionConfig>
  )
}

export default function CourseDetail() {
  const { slug = '' } = useParams()
  const course = courseBySlug(slug)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [openCh, setOpenCh] = useState<number[]>([0])
  const [preview, setPreview] = useState<CourseLesson | null>(null)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!course) return <NotFound />
  const coach = coachById(course.coachId)
  const lessons = course.chapters.reduce((a, c) => a + c.lessons.length, 0)
  const previews = course.chapters.flatMap((c) => c.lessons).filter((l) => l.preview)
  const plans = PLANS.filter((p) => course.includedInPlans.includes(p.id))
  const related = COURSES.filter((c) => c.id !== course.id && (c.format === course.format || c.coachId === course.coachId)).slice(0, 3)

  const openPreview = (l: CourseLesson | null) => {
    publicScrollLock(!!l)
    setPreview(l)
  }

  const buy = async () => {
    if (!user) {
      navigate(`/registrati?next=${encodeURIComponent(`/corsi/${course.slug}`)}`)
      return
    }
    setBuying(true)
    setError(null)
    try {
      const r = await api.courses.checkout(course.id)
      if (r.checkoutUrl) {
        window.location.href = r.checkoutUrl
        return
      }
      if (r.purchase) navigate(`/app/corsi/${course.slug}`)
      else setError('Il pagamento non è stato avviato. Riprova tra qualche minuto.')
    } catch (e) {
      setError((e as Error).message || 'Il pagamento non è stato avviato. Riprova tra qualche minuto.')
    } finally {
      setBuying(false)
    }
  }

  return (
    <>
      <title>{`${course.title} — Corsi ${BRAND.name}`}</title>
      <meta name="description" content={course.description} />

      <section className="pub-felt grain relative overflow-hidden">
        <div className="pub-wrap relative z-[2] grid gap-12 pb-16 pt-28 lg:grid-cols-12 lg:pb-24 lg:pt-36">
          <div className="lg:col-span-7">
            <nav aria-label="Percorso" className="text-sm text-muted">
              <Link to="/corsi" className="pub-link hover:text-ink">
                Corsi
              </Link>
              <span aria-hidden> / </span>
              <span>{FORMAT_LABEL[course.format]}</span>
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <CourseBadge course={course} />
              <span className="text-sm text-muted">
                {FORMAT_LABEL[course.format]}, livello {LEVEL_LABEL[course.level]}
              </span>
            </div>
            <h1 className="pub-display mt-5 text-[clamp(2.8rem,7vw,6rem)] text-ink">{course.title}</h1>
            <p className="mt-4 font-display text-2xl font-bold leading-snug text-ink/80" style={{ fontStretch: '100%' }}>
              {course.subtitle}
            </p>
            <p className="pub-lede mt-6">{course.description}</p>
            {coach && (
              <div className="mt-8 flex items-center gap-3">
                <Avatar seed={coach.avatarSeed} label={coach.nickname} size={48} />
                <span>
                  <span className="block font-semibold text-ink">{coach.nickname === 'Staff' ? 'Staff tecnico' : coach.name}</span>
                  <span className="block text-sm text-muted">{coach.role}</span>
                </span>
              </div>
            )}
          </div>

          <aside className="lg:col-span-5" aria-label="Acquisto">
            <div className="overflow-hidden border border-line bg-bg/80 backdrop-blur-sm lg:sticky lg:top-28" style={{ borderRadius: 'var(--r-card)' }}>
              <div className="aspect-[16/10]">
                <CourseCover seed={course.coverSeed} format={course.format} />
              </div>
              <div className="p-6">
                <p className="font-mono text-4xl font-bold text-ink tabular">
                  {course.priceEur}
                  <span className="ml-1 text-2xl">€</span>
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-4 text-sm">
                  <div>
                    <dt className="text-muted">Durata</dt>
                    <dd className="mt-1 font-mono text-ink">{fmtDuration(course.durationMin)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Lezioni</dt>
                    <dd className="mt-1 font-mono text-ink">{lessons}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Anteprime</dt>
                    <dd className="mt-1 font-mono text-ink">{previews.length}</dd>
                  </div>
                </dl>
                {plans.length > 0 && (
                  <p className="mt-4 text-sm text-muted">
                    {plans.length === 1 ? 'Incluso nel piano' : 'Incluso nei piani'}{' '}
                    {plans.map((p, i) => (
                      <span key={p.id}>
                        <Link to="/prezzi" className="font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                          {p.name}
                        </Link>
                        {i < plans.length - 1 ? ' e ' : ''}
                      </span>
                    ))}
                    .
                  </p>
                )}
                <Button size="lg" className="mt-6 w-full" onClick={buy} disabled={buying} aria-busy={buying}>
                  {buying ? 'Apertura del pagamento…' : user ? `Acquista a ${fmtEur(course.priceEur)}` : 'Registrati per acquistare'}
                </Button>
                {error && (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                  </p>
                )}
                {previews[0] && (
                  <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={() => openPreview(previews[0])}>
                    Guarda l’anteprima gratuita
                  </Button>
                )}
                <p className="mt-4 text-xs text-muted">Accesso illimitato al corso. Solo formazione: nessun collegamento a sale da gioco.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="curr-title" className="bg-bg py-20 md:py-28">
        <div className="pub-wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="curr-title" className="pub-h2 text-ink">
              Curriculum
            </h2>
            <p className="mt-3 text-muted">
              {course.chapters.length} capitoli, {lessons} lezioni, {fmtDuration(course.durationMin)}.
            </p>
            <ol className="mt-10 border-t border-line">
              {course.chapters.map((ch, ci) => {
                const isOpen = openCh.includes(ci)
                const dur = ch.lessons.reduce((a, l) => a + l.durationMin, 0)
                return (
                  <li key={ch.title} className="border-b border-line">
                    <h3 style={{ letterSpacing: 0 }}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`ch-${ci}`}
                        onClick={() => setOpenCh((s) => (isOpen ? s.filter((x) => x !== ci) : [...s, ci]))}
                        className="flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left"
                      >
                        <span className="flex items-baseline gap-4">
                          <span className="font-mono text-sm text-muted">{String(ci + 1).padStart(2, '0')}</span>
                          <span className="font-display text-xl font-extrabold text-ink md:text-2xl">{ch.title}</span>
                        </span>
                        <span className="flex items-center gap-3 text-sm text-muted">
                          <span className="hidden font-mono sm:inline">{fmtDuration(dur)}</span>
                          <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')} aria-hidden />
                        </span>
                      </button>
                    </h3>
                    <div id={`ch-${ci}`} className="pub-acc" data-open={isOpen}>
                      <div>
                        <ul className="pb-5">
                          {ch.lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between gap-4 py-2 pl-9">
                              {l.preview ? (
                                <button type="button" onClick={() => openPreview(l)} className="flex min-h-11 items-center gap-3 text-left text-ink hover:text-accent">
                                  <Play className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                                  <span>
                                    {l.title}
                                    <span className="ml-2 text-xs font-semibold text-accent">Anteprima</span>
                                  </span>
                                </button>
                              ) : (
                                <span className="flex min-h-11 items-center gap-3 text-muted">
                                  <Lock className="h-4 w-4 shrink-0" aria-hidden />
                                  <span>{l.title}</span>
                                </span>
                              )}
                              <span className="shrink-0 font-mono text-sm text-muted">{l.durationMin} min</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
          <div className="lg:col-span-5">
            <h2 className="pub-h3 text-2xl text-ink">Temi del corso</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((t) => (
                <li key={t} className="border border-line px-3 py-2 text-sm text-ink" style={{ borderRadius: 'var(--r-card)' }}>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="pub-h3 text-2xl text-ink">Preferisci il percorso completo?</h2>
              <p className="mt-3 text-muted">Con un piano hai anche lezioni live, hand review e un coach che ti segue.</p>
              <ButtonLink to="/prezzi" variant="secondary" className="mt-5">
                Confronta i piani
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel-title" className="border-t border-line bg-bg py-20 md:py-28">
          <div className="pub-wrap">
            <h2 id="rel-title" className="pub-h2 text-ink">
              Potrebbero servirti anche
            </h2>
            <div className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
              {related.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      <PreviewModal lesson={preview} seed={course.coverSeed} format={course.format} onClose={() => openPreview(null)} />
    </>
  )
}
