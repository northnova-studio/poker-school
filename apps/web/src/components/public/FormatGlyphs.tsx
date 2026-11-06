import { useMemo } from 'react'
import type { FormatSlug } from './nav'
import { bankrollPoints, seeded, toPath } from './graph'

// Illustrazioni dei tre formati (SVG, solo token). Decorative: aria-hidden.

export function FieldGlyph({ className }: { className?: string }) {
  const dots = useMemo(() => {
    const r = seeded(11)
    const out: { x: number; y: number; on: boolean }[] = []
    const rows = 11
    for (let i = 0; i < rows; i++) {
      const n = 25 - i * 2
      for (let j = 0; j < n; j++) out.push({ x: 200 + (j - (n - 1) / 2) * 15, y: 340 - i * 26, on: r() > 0.25 + i * 0.065 })
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.on ? 4.4 : 2.2} fill={d.on ? 'var(--c-ink)' : 'var(--c-muted)'} opacity={d.on ? 0.85 : 0.3} />
      ))}
      <ellipse cx="200" cy="44" rx="74" ry="24" fill="none" stroke="var(--c-accent)" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 - Math.PI / 2
        return <circle key={i} cx={200 + Math.cos(a) * 74} cy={44 + Math.sin(a) * 24} r="6" fill="var(--c-accent)" />
      })}
    </svg>
  )
}

export const WHEEL_SEGMENTS = ['x2', 'x3', 'x2', 'x5', 'x2', 'x10', 'x2', 'x3', 'x2', 'x25', 'x2', 'x100']

export function WheelGlyph({ className, rotation = 0, spinning = false }: { className?: string; rotation?: number; spinning?: boolean }) {
  const n = WHEEL_SEGMENTS.length
  const R = 180
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <g transform="translate(200 200)">
        <g style={{ transform: `rotate(${rotation}deg)`, transformBox: 'fill-box', transformOrigin: 'center' }} className={spinning ? 'pub-wheel' : undefined}>
          {WHEEL_SEGMENTS.map((m, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n
            const a1 = a0 + (Math.PI * 2) / n
            const big = m === 'x100' || m === 'x25'
            const fill = big ? 'var(--c-accent)' : m === 'x2' ? 'var(--c-surface-2)' : m === 'x10' ? 'var(--c-accent-2)' : 'var(--c-line)'
            const am = (a0 + a1) / 2
            return (
              <g key={i}>
                <path d={`M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`} fill={fill} stroke="var(--c-bg)" strokeWidth="2" />
                <text
                  x={Math.cos(am) * R * 0.72}
                  y={Math.sin(am) * R * 0.72}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="var(--f-mono)"
                  fontWeight="700"
                  fontSize="17"
                  fill={big ? 'var(--c-on-accent)' : 'var(--c-ink)'}
                  transform={`rotate(${(am * 180) / Math.PI + 90} ${Math.cos(am) * R * 0.72} ${Math.sin(am) * R * 0.72})`}
                >
                  {m}
                </text>
              </g>
            )
          })}
        </g>
        <circle r={R} fill="none" stroke="var(--c-ink)" strokeOpacity="0.4" strokeWidth="2" />
        <circle r="46" fill="var(--c-bg)" stroke="var(--c-accent)" strokeWidth="3" />
        <path d="M-12 -196 L12 -196 L0 -170 Z" fill="var(--c-accent)" />
      </g>
    </svg>
  )
}

export function TablesGlyph({ className }: { className?: string }) {
  const path = useMemo(() => toPath(bankrollPoints(23, 60, 0.6, 0.8), 360, 110, 6), [])
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      {[0, 1, 2, 3].map((i) => {
        const cx = 105 + (i % 2) * 190
        const cy = 80 + Math.floor(i / 2) * 120
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="82" ry="44" fill="var(--c-surface-2)" stroke="var(--c-accent)" strokeOpacity={i === 0 ? 1 : 0.45} strokeWidth="2" />
            <ellipse cx={cx} cy={cy} rx="62" ry="28" fill="none" stroke="var(--c-line)" />
            {Array.from({ length: 6 }, (_, k) => {
              const a = (k / 6) * Math.PI * 2
              return <circle key={k} cx={cx + Math.cos(a) * 92} cy={cy + Math.sin(a) * 52} r="7" fill={k === 3 ? 'var(--c-accent)' : 'var(--c-muted)'} opacity={k === 3 ? 1 : 0.5} />
            })}
          </g>
        )
      })}
      <g transform="translate(20 268)">
        <line x1="0" x2="360" y1="110" y2="110" stroke="var(--c-line)" />
        <path d={path} fill="none" stroke="var(--c-accent-3)" strokeWidth="3" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function FormatGlyph({ slug, className }: { slug: FormatSlug; className?: string }) {
  if (slug === 'mtt') return <FieldGlyph className={className} />
  if (slug === 'spin') return <WheelGlyph className={className} rotation={-8} />
  return <TablesGlyph className={className} />
}
