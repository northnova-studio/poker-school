import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { usePublicInView } from '@/hooks/usePublicInView'

const CHIP_FILL = ['var(--c-accent)', 'var(--c-accent-2)', 'var(--c-accent-3)', 'var(--c-ink)']

/**
 * Pila di fiches disegnata in SVG. Le fiches "cadono" quando la pila entra
 * nel viewport (classe .pub-in-view sul contenitore).
 */
export function ChipStack({
  count,
  tone = 0,
  width = 64,
  className,
  delay = 0,
  label,
}: {
  count: number
  tone?: number
  width?: number
  className?: string
  delay?: number
  label?: string
}) {
  const chipH = width * 0.16
  const rx = width / 2
  const ry = width * 0.17
  const h = count * chipH + ry * 2 + 2
  const fill = CHIP_FILL[tone % CHIP_FILL.length]
  return (
    <svg
      viewBox={`0 0 ${width} ${h}`}
      width={width}
      height={h}
      className={cn('overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: count }, (_, i) => {
        const y = h - ry - 1 - i * chipH
        return (
          <g key={i} className="pub-chip-drop" style={{ ['--i' as string]: i, ['--d' as string]: `${delay}ms` }}>
            <path
              d={`M0 ${y - chipH} v${chipH} a${rx} ${ry} 0 0 0 ${width} 0 v${-chipH}`}
              fill={fill}
              style={{ filter: 'brightness(0.72)' }}
            />
            {[0.12, 0.38, 0.62, 0.88].map((fx) => {
              const x = fx * width
              const dy = ry * Math.sqrt(Math.max(0, 1 - Math.pow((x - rx) / rx, 2)))
              return (
                <rect
                  key={fx}
                  x={x - width * 0.045}
                  y={y - chipH + dy}
                  width={width * 0.09}
                  height={chipH}
                  fill="var(--c-bg)"
                  fillOpacity="0.4"
                />
              )
            })}
            <ellipse cx={rx} cy={y - chipH} rx={rx} ry={ry} fill={fill} />
            <ellipse
              cx={rx}
              cy={y - chipH}
              rx={rx * 0.78}
              ry={ry * 0.78}
              fill="none"
              stroke="var(--c-bg)"
              strokeOpacity="0.5"
              strokeWidth={width * 0.05}
              strokeDasharray={`${width * 0.1} ${width * 0.1}`}
            />
            <ellipse cx={rx} cy={y - chipH} rx={rx * 0.5} ry={ry * 0.5} fill="none" stroke="var(--c-bg)" strokeOpacity="0.25" />
          </g>
        )
      })}
    </svg>
  )
}

/** Contenitore che aggiunge .pub-in-view quando entra nel viewport. */
export function InViewGroup({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ol' | 'ul' }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = usePublicInView(ref)
  return (
    <Tag ref={ref as never} className={cn(className, inView && 'pub-in-view')}>
      {children}
    </Tag>
  )
}

/** Numero che conta fino al valore quando entra nel viewport. */
export function Counter({ value, className, duration = 1400 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = usePublicInView(ref)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) {
      setN(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 4)
      setN(Math.round(value * e))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])
  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{n.toLocaleString('it-IT')}</span>
      <span className="sr-only">{value.toLocaleString('it-IT')}</span>
    </span>
  )
}
