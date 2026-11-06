import { useRef } from 'react'
import { HOW_STEPS } from '@/data/content'
import { usePublicGsap } from '@/hooks/usePublicGsap'
import { SectionHeading } from '../Section'

/** Il percorso come una struttura di torneo: livelli in sequenza. */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  usePublicGsap(ref, ({ gsap, ScrollTrigger }, el) => {
    gsap.fromTo(
      el.querySelector('[data-progress]'),
      { scaleY: 0 },
      { scaleY: 1, ease: 'none', scrollTrigger: { trigger: el.querySelector('ol'), start: 'top 70%', end: 'bottom 60%', scrub: 0.5 } },
    )
    el.querySelectorAll<HTMLElement>('[data-step]').forEach((row) => {
      ScrollTrigger.create({ trigger: row, start: 'top 62%', toggleClass: { targets: row.querySelector('[data-dot]')!, className: 'is-on' } })
    })
  })

  return (
    <section ref={ref} aria-labelledby="come-title" className="border-t border-line bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <SectionHeading
          id="come-title"
          title="Come si entra."
          lede="Cinque livelli, come una struttura di torneo. Nessuno salta i bui: si parte da una candidatura e si arriva al rank."
        />
        <div className="relative mt-16 md:mt-24">
          <div className="absolute bottom-6 left-[0.6875rem] top-6 w-px bg-line md:left-[9.6875rem]" aria-hidden>
            <span data-progress className="block h-full w-full origin-top bg-accent" />
          </div>
          <ol>
            {HOW_STEPS.map((s, i) => (
              <li key={s.title} data-step className="relative grid gap-2 border-b border-line py-8 pl-10 md:grid-cols-[8.5rem_1fr_minmax(0,1.3fr)_9rem] md:items-baseline md:gap-8 md:pl-0">
                <span className="font-mono text-sm text-muted md:text-base">Livello {i + 1}</span>
                <span data-dot className="absolute left-0 top-[2.15rem] h-[1.4rem] w-[1.4rem] rounded-full border-2 border-accent bg-bg transition-colors duration-300 md:left-[9rem] [&.is-on]:bg-accent" aria-hidden />
                <h3 className="pub-h3 text-3xl text-ink md:pl-10 md:text-4xl">{s.title}</h3>
                <p className="max-w-xl leading-relaxed text-muted">{s.text}</p>
                <span className="font-mono text-sm text-ink md:text-right">{s.time}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
