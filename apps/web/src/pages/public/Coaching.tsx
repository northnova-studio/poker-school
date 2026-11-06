import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { ButtonLink } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { coachById } from '@/data/coaches'
import { COURSES } from '@/data/courses'
import { FOUNDER_EXTRA } from '@/data/content'
import { NAV_COACHING } from '@/components/public/nav'
import type { FormatSlug } from '@/components/public/nav'
import { FORMAT_PAGES } from './coaching-content'
import { LEVEL_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { FounderCard } from '@/components/public/FounderCard'
import { CourseCard } from '@/components/public/CourseCard'
import { CtaBand, Faq, SectionHeading } from '@/components/public/Section'
import { FieldShrink } from '@/components/public/coaching/FieldShrink'
import { SpinWheel } from '@/components/public/coaching/SpinWheel'
import { CashTables } from '@/components/public/coaching/CashTables'
import NotFound from './NotFound'

const VISUAL: Record<FormatSlug, () => ReactNode> = {
  mtt: () => <FieldShrink />,
  spin: () => <SpinWheel />,
  cash: () => <CashTables />,
}

export default function Coaching() {
  const { format } = useParams()
  const page = format && format in FORMAT_PAGES ? FORMAT_PAGES[format as FormatSlug] : null
  if (!page) return <NotFound />

  const head = coachById(page.headCoachId)
  const support = page.supportCoachIds.map(coachById).filter(Boolean)
  const courses = COURSES.filter((c) => c.format === page.format || (c.format === 'ALL' && page.format !== 'SPIN') || c.format === 'MENTAL')
  const headIsFounder = head && FOUNDER_EXTRA[head.id]

  return (
    <>
      <title>{`Coaching ${page.name} — ${BRAND.name}`}</title>
      <meta name="description" content={page.lede} />

      {/* HERO */}
      <section className="pub-felt grain relative overflow-hidden">
        <div className="pub-wrap relative z-[2] grid gap-12 pb-20 pt-28 lg:grid-cols-12 lg:items-center lg:pb-28 lg:pt-36">
          <div className="lg:col-span-7">
            <nav aria-label="Formati" className="flex flex-wrap gap-2">
              {NAV_COACHING.map((n) => (
                <ButtonLink
                  key={n.slug}
                  to={`/coaching/${n.slug}`}
                  size="sm"
                  variant={n.slug === page.slug ? 'primary' : 'secondary'}
                  aria-current={n.slug === page.slug ? 'page' : undefined}
                  className="min-h-11"
                >
                  {n.label}
                </ButtonLink>
              ))}
            </nav>
            <p className="mt-10 text-lg text-muted">Coaching {page.name}</p>
            <h1 className="pub-display mt-3 text-[clamp(2.6rem,6vw,5.5rem)] text-ink">{page.title}</h1>
            <p className="pub-lede mt-8 text-ink/80">{page.lede}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to="/registrati" size="lg">
                Candidati
              </ButtonLink>
              <ButtonLink to="/prezzi" size="lg" variant="secondary">
                Vedi i piani
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="border border-line bg-bg/50 p-5 backdrop-blur-sm sm:p-7" style={{ borderRadius: 'var(--r-card)' }}>
              {VISUAL[page.slug]()}
            </div>
            <p className="mt-3 text-sm text-muted">{page.visualCaption}</p>
          </div>
        </div>
      </section>

      {/* HEAD COACH */}
      <section aria-labelledby="coach-title" className="bg-bg py-24 md:py-32">
        <div className="pub-wrap grid gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            {head && headIsFounder ? (
              <FounderCard coach={head} position={FOUNDER_EXTRA[head.id].position} />
            ) : (
              <div className="pub-slot relative mx-auto grid aspect-[5/6.6] max-w-[19rem] place-items-center p-8 text-center" style={{ borderRadius: 'var(--r-card)' }}>
                <span className="pub-crop tl" aria-hidden />
                <span className="pub-crop tr" aria-hidden />
                <span className="pub-crop bl" aria-hidden />
                <span className="pub-crop br" aria-hidden />
                <div>
                  <p className="font-display text-6xl font-black text-accent">?</p>
                  <p className="mt-4 font-semibold text-ink">Coach cash in arrivo</p>
                  <p className="mt-2 text-sm text-muted">Verrà annunciato al lancio.</p>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-7">
            <h2 id="coach-title" className="pub-h2 text-ink">
              {headIsFounder ? `Head coach: ${head!.name}` : 'Chi ti allena'}
            </h2>
            <p className="pub-lede mt-6">{headIsFounder ? head!.bio : page.coachNote}</p>
            {headIsFounder && (
              <ul className="mt-8 border-t border-line">
                {FOUNDER_EXTRA[head!.id].focus.map((f) => (
                  <li key={f} className="border-b border-line py-3 text-ink">
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {support.length > 0 && (
              <div className="mt-8">
                <p className="text-sm text-muted">{headIsFounder ? 'Con il supporto di' : 'Supervisione e supporto'}</p>
                <ul className="mt-3 flex flex-wrap gap-4">
                  {support.map((c) => (
                    <li key={c!.id} className="flex items-center gap-3">
                      <Avatar seed={c!.avatarSeed} label={c!.nickname} size={44} />
                      <span>
                        <span className="block font-semibold text-ink">{c!.name}</span>
                        <span className="block text-sm text-muted">{c!.role}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PER CHI È */}
      <section aria-labelledby="perchi-title" className="border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="perchi-title" title="Per chi è." lede="Ti candidi, valutiamo insieme se è il programma giusto. Se non lo è, te lo diciamo." />
          <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            {page.forWho.map((w, i) => (
              <li key={w.title} className={cn('border-t border-line pt-6', i > 0 && 'md:border-l md:pl-8', i < 2 && 'md:pr-8')}>
                <h3 className="pub-h3 text-2xl text-ink">{w.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{w.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CURRICULUM A GRADINI */}
      <section aria-labelledby="curr-title" className="pub-felt grain relative border-y border-line py-24 md:py-32">
        <div className="pub-wrap relative z-[2]">
          <SectionHeading id="curr-title" title="Il curriculum, livello per livello." lede="Dal micro all’high stakes: ogni gradino ha i suoi obiettivi. Si sale quando i numeri e il coach dicono che sei pronto, non prima." />
          <ol className="mt-16 grid gap-4 md:grid-cols-4 md:items-end">
            {page.levels.map((l, i) => (
              <li
                key={l.level}
                className="flex flex-col border border-line bg-bg/70 p-6"
                style={{ borderRadius: 'var(--r-card)', minHeight: `calc(15rem + ${i * 3}rem)` }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-black text-ink">{LEVEL_LABEL[l.level]}</span>
                  <span className="font-mono text-xs text-muted">{l.stakes}</span>
                </div>
                <h3 className="mt-6 font-semibold text-accent">{l.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink/85">
                  {l.focus.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className="text-muted">
                        ♠
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-1 pt-6" aria-hidden>
                  {Array.from({ length: 4 }, (_, k) => (
                    <span key={k} className={cn('h-1.5 flex-1 rounded-full', k <= i ? 'bg-accent' : 'bg-line')} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FORMATO LEZIONI + COSA OTTIENI */}
      <section aria-labelledby="lezioni-title" className="bg-bg py-24 md:py-32">
        <div className="pub-wrap grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="lezioni-title" className="pub-h2 text-ink">
              Come lavoriamo.
            </h2>
            <ul className="mt-10 border-t border-line">
              {page.lessons.map((l) => (
                <li key={l.title} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
                  <div>
                    <h3 className="pub-h3 text-2xl text-ink">{l.title}</h3>
                    <p className="mt-2 max-w-lg leading-relaxed text-muted">{l.text}</p>
                  </div>
                  <span className="font-mono text-sm text-ink sm:text-right">{l.cadence}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <div className="border border-line bg-surface p-8 lg:sticky lg:top-28" style={{ borderRadius: 'var(--r-card)' }}>
              <h2 className="pub-h3 text-3xl text-ink">Cosa ottieni</h2>
              <ul className="mt-6 space-y-4">
                {page.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-ink">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                    {o}
                  </li>
                ))}
              </ul>
              <ButtonLink to="/registrati" size="lg" className="mt-8 w-full">
                Candidati al coaching {page.name}
              </ButtonLink>
              <p className="mt-4 text-sm text-muted">Nessuna promessa di risultati: lavoriamo sulle decisioni, la varianza resta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORSI COLLEGATI */}
      {courses.length > 0 && (
        <section aria-labelledby="corsi-coll-title" className="border-t border-line bg-bg py-24 md:py-32">
          <div className="pub-wrap">
            <SectionHeading id="corsi-coll-title" title="Corsi collegati." lede="Si comprano singolarmente oppure sono inclusi in alcuni piani." />
            <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {courses.slice(0, 3).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-fmt-title" className="border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap grid gap-12 lg:grid-cols-12">
          <h2 id="faq-fmt-title" className="pub-h2 text-ink lg:col-span-4">
            Domande sul {page.name}.
          </h2>
          <Faq items={page.faqs} idPrefix={`faq-${page.slug}`} className="lg:col-span-8" />
        </div>
      </section>

      <CtaBand
        title={`Il tuo ${page.name} parte da qui.`}
        text="Candidati, facciamo la valutazione e costruiamo il piano. Se il formato giusto per te è un altro, te lo diciamo."
        secondary={{ to: '/corsi', label: 'Guarda i corsi' }}
      />
    </>
  )
}
