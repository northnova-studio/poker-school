import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { BRAND } from '@/config/brand'
import { ButtonLink } from '@/components/ui/Button'
import { HERO } from './hero-content'
import { PlayingCard } from '../PlayingCard'
import type { Suit } from '../PlayingCard'
import { ChipStack, InViewGroup } from '../Chips'
import { SplitReveal } from '../SplitReveal'
import { bankrollPoints, toPath } from '../graph'

const HAND: { suit: Suit; caption: string; fan: CSSProperties }[] = [
  { suit: 's', caption: 'MTT', fan: { ['--fan-r' as string]: '-16deg', ['--fan-x' as string]: '-55%', ['--fan-y' as string]: '7%' } },
  { suit: 'h', caption: 'Spin & Go', fan: { ['--fan-r' as string]: '0deg', ['--fan-x' as string]: '0%', ['--fan-y' as string]: '-3%' } },
  { suit: 'd', caption: 'Cash game', fan: { ['--fan-r' as string]: '16deg', ['--fan-x' as string]: '55%', ['--fan-y' as string]: '7%' } },
]

function Hand() {
  return (
    <div className="relative mx-auto h-[13rem] w-[17rem] [perspective:1100px] sm:h-[17rem] sm:w-[24rem] xl:h-[19rem] xl:w-[26rem]">
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out-expo"
        style={{ transform: 'rotateY(calc(var(--tx, 0) * 9deg)) rotateX(calc(var(--ty, 0) * -7deg))', transformStyle: 'preserve-3d' }}
      >
        {HAND.map((c, i) => (
          <div
            key={c.suit}
            className="pub-fan absolute bottom-0 left-1/2 -ml-[3.75rem] w-[7.5rem] origin-[50%_115%] sm:-ml-[5rem] sm:w-[10rem] xl:-ml-[5.5rem] xl:w-[11rem]"
            style={{ ...c.fan, ['--fan-delay' as string]: `${1500 + i * 60}ms`, zIndex: i === 1 ? 3 : 2 }}
          >
            <div className="pub-deal" style={{ ['--deal-delay' as string]: `${250 + i * 140}ms`, ['--from-x' as string]: `${30 + i * 6}vw` }}>
              <div className="pub-flip relative" style={{ ['--flip-delay' as string]: `${950 + i * 110}ms` }}>
                <div className="pub-face">
                  <PlayingCard rank="A" suit={c.suit} caption={c.caption} decorative className="text-[0.78rem] sm:text-[1rem] xl:text-[1.1rem]" />
                </div>
                <div className="pub-backface pub-card-back absolute inset-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <InViewGroup className="pointer-events-none absolute -bottom-3 -right-10 hidden items-end gap-1.5 sm:flex xl:-right-6">
        <ChipStack count={6} tone={0} width={48} delay={2000} />
        <ChipStack count={4} tone={1} width={48} delay={2250} />
        <ChipStack count={2} tone={2} width={48} delay={2450} />
      </InViewGroup>
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const path = useMemo(() => toPath(bankrollPoints(7, 90, 0.75, 1), 1600, 320, 12), [])

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(pointer: coarse)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = e.clientX - r.left
        const y = e.clientY - r.top
        el.style.setProperty('--mx', `${x}px`)
        el.style.setProperty('--my', `${y}px`)
        el.style.setProperty('--tx', ((x / r.width) * 2 - 1).toFixed(3))
        el.style.setProperty('--ty', ((y / r.height) * 2 - 1).toFixed(3))
      })
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <section ref={ref} aria-labelledby="hero-title" className="pub-felt grain relative isolate overflow-hidden">
      <div className="pub-lamp absolute inset-0 -z-0" aria-hidden />
      {/* grafico di bankroll illustrativo che si disegna sullo sfondo */}
      <svg
        viewBox="0 0 1600 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-[10%] h-[30%] w-full opacity-50 sm:top-auto sm:bottom-[22%] sm:h-[30%] sm:opacity-60"
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" x2="1600" y1={40 + i * 80} y2={40 + i * 80} stroke="var(--c-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path
          d={path}
          pathLength={2000}
          className="pub-draw"
          fill="none"
          stroke="var(--c-accent-3)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ ['--draw-delay' as string]: '700ms' }}
        />
      </svg>

      <div className="pub-wrap relative z-[2] flex min-h-[100svh] flex-col pb-10 pt-24 lg:pb-14 lg:pt-28">
        <div className="grid flex-1 content-center gap-y-12 xl:grid-cols-12 xl:items-center xl:gap-x-8">
          <div className="pb-6 sm:pb-8 xl:order-2 xl:col-span-4 xl:pb-0">
            <Hand />
          </div>
          <h1 id="hero-title" className="pub-display pub-hero-title text-[clamp(3.2rem,13.5vw,7.5rem)] text-ink xl:order-1 xl:col-span-8 xl:text-[clamp(4.5rem,8.5vw,8.25rem)]">
            <SplitReveal text="Studiamo come atleti." delay={150} />
            <span className="sr-only"> </span>
            <span
              className="pub-fade-in mt-4 block max-w-[22ch] font-display text-[clamp(1.6rem,3.6vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.025em] text-muted lg:mt-6"
              style={{ ['--d' as string]: '900ms', fontStretch: '100%' }}
            >
              Ci prendiamo in giro come amici.
            </span>
          </h1>
        </div>

        <div
          className="pub-fade-in mt-10 grid gap-8 border-t border-line pt-6 lg:mt-12 lg:grid-cols-12 lg:items-end"
          style={{ ['--d' as string]: '1300ms' }}
        >
          <p className="max-w-xl text-lg leading-relaxed text-ink/85 lg:col-span-6">{HERO.lede}</p>
          <div className="flex flex-col gap-5 lg:col-span-6 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/registrati" size="lg">
                Candidati
              </ButtonLink>
              <ButtonLink to="/team" size="lg" variant="secondary">
                Conosci i fondatori
              </ButtonLink>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" aria-label={`Perché ${BRAND.name}`}>
              {HERO.hud.map((h, i) => (
                <li key={h} className="flex items-center gap-1.5">
                  <span aria-hidden className={i === 1 ? 'text-accent-2' : 'text-accent'}>
                    {['♠', '♥', '♦'][i]}
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
