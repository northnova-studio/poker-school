import { useMemo, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { usePublicGsap } from '@/hooks/usePublicGsap'
import { fmtInt, seeded } from '../graph'

const COLS = 24
const ROWS = 12
const TOTAL = 2431
const FT = 9

/**
 * MTT: il field si restringe fino al final table. 288 punti = 2.431 iscritti;
 * spariscono a ondate (early, bolla, ITM) e gli ultimi 9 si siedono al tavolo.
 */
export function FieldShrink() {
  const ref = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const phase = useRef<HTMLSpanElement>(null)
  const [run, setRun] = useState(0)

  const { dots, order, seats } = useMemo(() => {
    const r = seeded(31)
    const dots = Array.from({ length: COLS * ROWS }, (_, i) => ({ x: 22 + (i % COLS) * 15.2, y: 30 + Math.floor(i / COLS) * 15.2 }))
    const order = dots.map((_, i) => i).sort(() => r() - 0.5)
    const seats = Array.from({ length: FT }, (_, k) => {
      const a = (k / FT) * Math.PI * 2 - Math.PI / 2
      return { x: 200 + Math.cos(a) * 120, y: 128 + Math.sin(a) * 58 }
    })
    return { dots, order, seats }
  }, [])

  usePublicGsap(
    ref,
    ({ gsap }, el) => {
      const circles = Array.from(el.querySelectorAll<SVGCircleElement>('[data-dot]'))
      const out = order.slice(0, order.length - FT).map((i) => circles[i])
      const finals = order.slice(order.length - FT).map((i) => circles[i])
      const state = { left: TOTAL }
      const phases: [number, string][] = [
        [TOTAL, 'Early stage'],
        [420, 'Bolla'],
        [300, 'In the money'],
        [27, 'Final table in vista'],
        [FT, 'Final table'],
      ]
      gsap.set(circles, { opacity: 0.9, attr: { r: 3.6 } })
      gsap.set(el.querySelector('[data-table]'), { opacity: 0 })
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 75%' } })
      tl.to(out, { opacity: 0.08, attr: { r: 2 }, duration: 0.25, stagger: { each: 3.4 / out.length, from: 'random' }, ease: 'none' }, 0.3)
        .to(state, {
          left: FT,
          duration: 3.6,
          ease: 'power2.in',
          onUpdate: () => {
            const v = Math.round(state.left)
            if (counter.current) counter.current.textContent = fmtInt(v)
            if (phase.current) phase.current.textContent = phases.find(([n]) => v >= n)?.[1] ?? 'Final table'
          },
        }, 0.3)
        .to(el.querySelector('[data-table]'), { opacity: 1, duration: 0.6 }, 3.6)
        .to(finals, {
          attr: { cx: (i: number) => seats[i].x, cy: (i: number) => seats[i].y, r: 8 },
          fill: 'var(--c-accent)',
          opacity: 1,
          duration: 1,
          ease: 'expo.inOut',
          stagger: 0.04,
        }, 3.7)
        .to(out, { opacity: 0, duration: 0.5 }, 3.8)
    },
    [run],
  )

  return (
    <div ref={ref} className="relative">
      <svg viewBox="0 0 400 220" className="h-auto w-full" role="img" aria-label="Animazione: un field di 2.431 iscritti che si riduce fino ai 9 giocatori del final table">
        <ellipse data-table cx="200" cy="128" rx="120" ry="58" fill="var(--c-surface-2)" stroke="var(--c-accent)" strokeWidth="2" opacity="0" />
        {dots.map((d, i) => (
          <circle key={`${run}-${i}`} data-dot cx={d.x} cy={d.y} r="3.6" fill="var(--c-ink)" opacity="0.9" />
        ))}
      </svg>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <p>
          <span className="block text-sm text-muted">Giocatori rimasti</span>
          <span ref={counter} className="font-mono text-4xl font-bold tabular text-ink">
            {fmtInt(TOTAL)}
          </span>
          <span className="ml-2 font-mono text-sm text-muted">/ {fmtInt(TOTAL)}</span>
        </p>
        <div className="flex items-center gap-3">
          <span ref={phase} className="text-sm text-accent" aria-live="polite">
            Early stage
          </span>
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:text-accent"
            aria-label="Rigioca l’animazione del torneo"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
