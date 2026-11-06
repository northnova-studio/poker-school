// Tilt-o-metro: semicerchio con lancetta (1 = zen, 5 = tilt totale).
import { motion, useReducedMotion } from 'motion/react'

const LABELS = ['Zen', 'Tranquillo', 'Nervoso', 'Teso', 'Tilt totale']

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

export function TiltGauge({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const v = Math.max(1, Math.min(5, value || 1))
  const t = (v - 1) / 4 // 0..1
  const angle = -90 + t * 180 // gradi rispetto alla verticale
  const segs = [
    { from: 0, to: 0.38, color: 'var(--c-success)' },
    { from: 0.4, to: 0.68, color: 'var(--c-warning)' },
    { from: 0.7, to: 1, color: 'var(--c-danger)' },
  ]
  const label = LABELS[Math.min(4, Math.round(v) - 1)]
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[240px]" role="img" aria-label={`Tilt medio ${value.toFixed(1).replace('.', ',')} su 5: ${label}`}>
        {segs.map((s) => (
          <path key={s.from} d={arc(100, 100, 80, Math.PI + s.from * Math.PI, Math.PI + s.to * Math.PI)} fill="none" stroke={s.color} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((k) => {
          const a = Math.PI + k * Math.PI
          return <line key={k} x1={100 + 62 * Math.cos(a)} y1={100 + 62 * Math.sin(a)} x2={100 + 68 * Math.cos(a)} y2={100 + 68 * Math.sin(a)} stroke="var(--c-muted)" strokeWidth={1.5} />
        })}
        <motion.g
          initial={{ rotate: reduce ? angle : -90 }}
          animate={{ rotate: angle }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 11, delay: 0.15 }}
          style={{ originX: '100px', originY: '100px', transformBox: 'view-box' }}
        >
          <path d="M100 100 L96 96 L100 30 L104 96 Z" fill="var(--c-ink)" />
        </motion.g>
        <circle cx={100} cy={100} r={8} fill="var(--c-surface-2)" stroke="var(--c-ink)" strokeWidth={2} />
      </svg>
      <figcaption className="-mt-1 text-center">
        <div className="font-mono text-2xl font-semibold text-ink">{value ? value.toFixed(1).replace('.', ',') : '—'}</div>
        <div className="text-sm text-muted">{value ? label : 'Nessuna sessione'}</div>
      </figcaption>
    </figure>
  )
}
