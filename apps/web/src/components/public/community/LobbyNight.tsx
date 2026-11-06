import { useMemo, useRef } from 'react'
import { BRAND } from '@/config/brand'
import { GAMING_NIGHTS } from './community-content'
import { usePublicGsap } from '@/hooks/usePublicGsap'
import { seeded } from '../graph'

/**
 * Lobby post-sessione: transizione giorno → notte guidata dallo scroll.
 * Senza animazioni (o prima che GSAP sia caricato) i due momenti sono
 * semplicemente uno sotto l'altro.
 */
export function LobbyNight({ id = 'lobby' }: { id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const stars = useMemo(() => {
    const r = seeded(5)
    return Array.from({ length: 46 }, () => ({ x: r() * 100, y: r() * 60, s: r() * 2 + 1, o: r() * 0.6 + 0.2 }))
  }, [])

  usePublicGsap(ref, ({ gsap }, el) => {
    el.dataset.enhanced = 'true'
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top top', end: '+=140%', pin: true, scrub: 0.7, invalidateOnRefresh: true },
    })
    tl.to(el.querySelector('[data-sun]'), { yPercent: 160, scale: 0.7, ease: 'none', duration: 1 }, 0)
      .to(el.querySelector('[data-day-copy]'), { yPercent: -30, opacity: 0, ease: 'none', duration: 0.6 }, 0.15)
      .fromTo(el.querySelector('[data-night]'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 0.75 }, 0.2)
      .from(el.querySelectorAll('[data-night-item]'), { y: 40, opacity: 0, stagger: 0.06, duration: 0.3, ease: 'power2.out' }, 0.7)
    return () => {
      delete el.dataset.enhanced
    }
  })

  // wrapper: il pin-spacer di GSAP resta dentro un nodo gestito da React
  return (
    <div>
      <section ref={ref} id={id} aria-labelledby={`${id}-title`} className="pub-lobby relative overflow-hidden">
        {/* GIORNO: la sessione */}
        <div data-day className="pub-felt grain pub-lobby-layer flex items-center">
          <div
            data-sun
            className="pointer-events-none absolute left-1/2 top-[14%] h-[52vmin] w-[52vmin] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--c-accent) 55%, transparent), color-mix(in oklab, var(--c-accent) 12%, transparent) 55%, transparent 70%)' }}
            aria-hidden
          />
          <div data-day-copy className="pub-wrap relative z-[2] py-24">
            <p className="font-mono text-sm text-muted">22:47</p>
            <h2 id={`${id}-title`} className="pub-display mt-3 text-[clamp(3rem,10vw,8.5rem)] text-ink">
              Fine sessione.<span className="sr-only"> Si entra in lobby.</span>
            </h2>
            <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4" style={{ borderRadius: 'var(--r-card)' }}>
              {[
                ['Durata', '5 h 40 min'],
                ['Tavoli', '12'],
                ['Review', 'fatta'],
                ['Tilt', '1 su 5'],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-1 font-mono text-lg font-bold text-ink tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted">Una sessione tipo di un martedì. Poi si chiude il client.</p>
          </div>
        </div>

        {/* NOTTE: la lobby */}
        <div data-night className="pub-night pub-lobby-layer flex items-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {stars.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full"
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: 'var(--pub-night-ink)', opacity: s.o }}
              />
            ))}
          </div>
          <div className="pub-wrap relative z-[2] grid gap-10 py-24 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <p data-night-item className="pub-night-muted font-mono text-sm">23:05</p>
              <p data-night-item className="pub-display mt-3 text-[clamp(3rem,9vw,7.5rem)]" aria-hidden>
                Si entra in lobby.
              </p>
              <p data-night-item className="pub-night-muted mt-6 max-w-md text-lg">
                Warzone, EA FC, tornei interni. E la Taglia sui fondatori: batti uno di noi in 1v1 e vinci una lezione 1:1. Premi solo in lezioni, mai in denaro.
              </p>
              <a
                data-night-item
                href={BRAND.discordUrl}
                className="mt-8 inline-flex min-h-12 items-center border px-6 font-semibold transition-colors hover:bg-[var(--pub-night-ink)] hover:text-[var(--pub-night)]"
                style={{ borderColor: 'var(--pub-night-ink)', borderRadius: 'var(--r-card)' }}
              >
                Entra nel Discord
              </a>
            </div>
            <ul className="lg:col-span-6" aria-label="Serate della settimana">
              {GAMING_NIGHTS.map((g) => (
                <li
                  key={g.day}
                  data-night-item
                  className="grid grid-cols-[3.5rem_1fr] items-baseline gap-4 border-t py-5"
                  style={{ borderColor: 'color-mix(in oklab, var(--pub-night-ink) 18%, transparent)' }}
                >
                  <span className="font-mono text-sm" style={{ color: 'var(--pub-night-accent)' }}>
                    {g.day}
                  </span>
                  <span>
                    <span className="block font-display text-2xl font-extrabold">{g.game}</span>
                    <span className="pub-night-muted block text-sm">
                      {g.title}. Organizza {g.host}.
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
