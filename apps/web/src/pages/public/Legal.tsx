import { NavLink, useParams } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'
import { LEGAL } from './legal-content'
import type { LegalSlug } from './legal-content'
import NotFound from './NotFound'

const ORDER: LegalSlug[] = ['privacy', 'termini', 'cookie', 'gioco-responsabile']

export default function Legal() {
  const { page: slug } = useParams()
  const page = slug && slug in LEGAL ? LEGAL[slug as LegalSlug] : null
  if (!page) return <NotFound />

  return (
    <>
      <title>{`${page.title} — ${BRAND.name}`}</title>
      <section className="bg-bg pb-24 pt-32 md:pt-40">
        <div className="pub-wrap grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <nav aria-label="Pagine legali" className="lg:sticky lg:top-28">
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-l lg:border-line">
                {ORDER.map((s) => (
                  <li key={s}>
                    <NavLink
                      to={`/legal/${s}`}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center border px-4 text-sm transition-colors lg:-ml-px lg:border-0 lg:border-l-2',
                          isActive ? 'border-accent font-semibold text-ink' : 'border-line text-muted hover:text-ink lg:border-transparent',
                        )
                      }
                    >
                      {LEGAL[s].title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="max-w-3xl lg:col-span-9">
            <div role="note" className="flex gap-3 border border-warning/60 bg-warning/10 p-4 text-sm text-ink" style={{ borderRadius: 'var(--r-card)' }}>
              <TriangleAlert className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              <p>
                <strong>Bozza da validare con un legale.</strong> Il testo è una base di lavoro e i dati tra parentesi quadre vanno completati prima della pubblicazione.
              </p>
            </div>
            <h1 className="pub-display mt-10 text-[clamp(2.6rem,6vw,5rem)] text-ink">{page.title}</h1>
            <p className="pub-lede mt-6">{page.intro}</p>
            <p className="mt-3 text-sm text-muted">Ultimo aggiornamento: {page.updated}</p>

            {page.sections.map((s) => (
              <section key={s.title} className="mt-12 border-t border-line pt-8">
                <h2 className="pub-h3 text-2xl text-ink md:text-3xl">{s.title}</h2>
                {s.blocks.map((b, i) =>
                  b.type === 'p' ? (
                    <p key={i} className="mt-4 leading-relaxed text-ink/85">
                      {b.text}
                    </p>
                  ) : b.type === 'ul' ? (
                    <ul key={i} className="mt-4 space-y-2">
                      {b.items.map((it) => (
                        <li key={it} className="flex gap-3 leading-relaxed text-ink/85">
                          <span aria-hidden className="text-accent">
                            ♦
                          </span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="mt-4 leading-relaxed text-ink/85">
                      {b.text}{' '}
                      <a href={b.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline decoration-accent underline-offset-4">
                        {b.label}
                        <span className="sr-only"> (si apre in una nuova scheda)</span>
                      </a>
                    </p>
                  ),
                )}
              </section>
            ))}

            {page.slug === 'gioco-responsabile' && (
              <div className="mt-14 grid gap-4 border border-line bg-surface p-6 sm:grid-cols-[auto_1fr] sm:items-center" style={{ borderRadius: 'var(--r-card)' }}>
                <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-accent-2 font-display text-xl font-black text-ink" role="img" aria-label="Vietato ai minori di 18 anni">
                  18+
                </span>
                <p className="text-ink">
                  Telefono Verde Nazionale gioco d’azzardo (ISS):{' '}
                  <a href="tel:800558822" className="font-mono text-xl font-bold text-ink underline decoration-accent underline-offset-4">
                    800 55 88 22
                  </a>
                </p>
              </div>
            )}
          </article>
        </div>
      </section>
    </>
  )
}
