import { useRef } from 'react'
import { MANIFESTO } from '@/data/content'
import { usePublicGsap } from '@/hooks/usePublicGsap'

/** Manifesto: le parole si "accendono" con lo scroll (GSAP scrub). */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null)
  usePublicGsap(ref, ({ gsap }, el) => {
    const words = el.querySelectorAll('[data-word]')
    gsap.fromTo(
      words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.05,
        scrollTrigger: { trigger: el.querySelector('[data-text]'), start: 'top 78%', end: 'bottom 45%', scrub: 0.6 },
      },
    )
    gsap.from(el.querySelectorAll('[data-col]'), {
      yPercent: 12,
      opacity: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.12,
      scrollTrigger: { trigger: el.querySelector('[data-cols]'), start: 'top 85%' },
    })
  })

  return (
    <section ref={ref} aria-labelledby="manifesto-title" className="relative bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <h2 id="manifesto-title" className="sr-only">
          Manifesto
        </h2>
        <p data-text className="max-w-[60rem] font-display text-[clamp(1.65rem,3.7vw,3.4rem)] font-bold leading-[1.12] tracking-[-0.025em] text-ink" style={{ fontStretch: '100%' }}>
          {MANIFESTO.text.split(' ').map((w, i) => (
            <span key={i} data-word>
              {w}{' '}
            </span>
          ))}
        </p>

        <div data-cols className="mt-20 grid gap-12 md:mt-28 md:grid-cols-2 md:gap-0">
          {[MANIFESTO.athletes, MANIFESTO.friends].map((col, ci) => (
            <div key={col.title} data-col className={ci === 1 ? 'md:border-l md:border-line md:pl-12' : 'md:pr-12'}>
              <h3 className="pub-h3 flex items-baseline gap-3 text-4xl text-ink md:text-5xl">
                <span aria-hidden className={ci === 0 ? 'text-accent' : 'text-accent-2'}>
                  {ci === 0 ? '♠' : '♥'}
                </span>
                {col.title}
              </h3>
              <ul className="mt-6 border-t border-line">
                {col.items.map((it) => (
                  <li key={it} className="border-b border-line py-4 text-lg text-ink/85">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
