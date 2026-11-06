import { useRef } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { FORMAT_SUMMARY } from '@/data/content'
import { usePublicGsap } from '@/hooks/usePublicGsap'
import { FormatGlyph } from '../FormatGlyphs'

/**
 * I tre formati: su desktop sezione pinnata con scroll orizzontale (GSAP),
 * su mobile pannelli in colonna. Senza JS/animazioni il nastro è scorrevole.
 */
export function Formats() {
  const ref = useRef<HTMLElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  usePublicGsap(ref, ({ gsap }, el) => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      el.dataset.enhanced = 'true'
      const track = el.querySelector<HTMLElement>('[data-track]')!
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth)
      gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          pin: true,
          scrub: 0.8,
          start: 'top top',
          end: () => `+=${dist()}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
          },
        },
      })
      gsap.from(el.querySelectorAll('[data-glyph]'), {
        rotate: -8,
        scale: 0.9,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 60%' },
      })
      return () => {
        delete el.dataset.enhanced
      }
    })
    return () => mm.revert()
  })

  // wrapper: il pin-spacer di GSAP resta dentro un nodo gestito da React
  return (
    <div>
      <section ref={ref} id="formati" aria-labelledby="formati-title" className="pub-hscroll pub-felt grain relative overflow-hidden border-y border-line">
        <div className="pub-hscroll-viewport relative z-[2] lg:flex lg:h-[100svh] lg:items-center">
          <div data-track className="flex flex-col lg:w-max lg:flex-row lg:items-stretch">
            <div className="pub-wrap flex shrink-0 flex-col justify-center pb-6 pt-20 lg:w-[38vw] lg:max-w-none lg:py-0 lg:pr-16">
              <h2 id="formati-title" className="pub-h2 text-ink">
                Tre formati. Un solo metodo.
              </h2>
              <p className="pub-lede mt-6">
                Ogni formato ha il suo head coach e il suo programma, dal micro all’high stakes. Il metodo è lo stesso: volume pianificato, review, numeri onesti.
              </p>
              <p className="mt-8 hidden text-sm text-muted lg:block">Scorri per sfogliare i formati.</p>
            </div>
            {FORMAT_SUMMARY.map((f) => (
              <article
                key={f.slug}
                aria-labelledby={`fmt-${f.slug}`}
                className="pub-wrap shrink-0 border-t border-line py-14 lg:flex lg:w-[78vw] lg:max-w-none lg:items-center lg:gap-12 lg:border-l lg:border-t-0 lg:px-14 lg:py-0 xl:w-[70vw]"
              >
                <div className="lg:flex-1">
                  <p className="text-sm text-muted">{f.coach}</p>
                  <h3 id={`fmt-${f.slug}`} className="pub-display mt-3 text-[clamp(3.5rem,11vw,9.5rem)] text-ink">
                    {f.name}
                  </h3>
                  <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/85">{f.line}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {f.points.map((p) => (
                      <li key={p} className="border border-line bg-bg/40 px-3 py-2 text-sm text-ink" style={{ borderRadius: 'var(--r-card)' }}>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink to={`/coaching/${f.slug}`} variant="secondary" size="lg" className="mt-8">
                    Programma {f.name}
                  </ButtonLink>
                </div>
                <div data-glyph className="mx-auto mt-12 w-full max-w-[20rem] lg:mt-0 lg:w-[34%] lg:max-w-[26rem]">
                  <FormatGlyph slug={f.slug} className="h-auto w-full" />
                </div>
              </article>
            ))}
            <div className="hidden w-[8vw] shrink-0 lg:block" aria-hidden />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-[3] hidden h-1 bg-line lg:block" aria-hidden>
          <span ref={bar} className="block h-full origin-left scale-x-0 bg-accent" />
        </div>
      </section>
    </div>
  )
}
