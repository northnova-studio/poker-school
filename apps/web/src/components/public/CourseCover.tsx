import { useMemo } from 'react'
import type { CourseFormat } from '@/lib/api/types'
import { cn } from '@/lib/cn'

// Copertine generative da coverSeed: niente immagini esterne, solo token.
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function rng(seed: number) {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const TONES = ['var(--c-accent)', 'var(--c-accent-2)', 'var(--c-accent-3)']

const W = 400
const H = 250

function Field({ r, tone }: { r: () => number; tone: string }) {
  // MTT: piramide di punti che si stringe verso il final table
  const rows = 9
  const dots: { x: number; y: number; k: boolean }[] = []
  for (let i = 0; i < rows; i++) {
    const n = rows * 2 - i * 2
    for (let j = 0; j < n; j++) {
      dots.push({ x: W / 2 + (j - (n - 1) / 2) * 17, y: 210 - i * 20, k: r() > 0.35 + i * 0.04 })
    }
  }
  return (
    <g>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.k ? 4.2 : 2} fill={d.k ? tone : 'var(--c-muted)'} opacity={d.k ? 0.95 : 0.35} />
      ))}
      <ellipse cx={W / 2} cy={34} rx={70} ry={18} fill="none" stroke="var(--c-ink)" strokeOpacity="0.55" strokeWidth="1.5" />
    </g>
  )
}

function Wheel({ r, tone }: { r: () => number; tone: string }) {
  const n = 12
  const rot = r() * 360
  return (
    <g transform={`translate(${W * 0.68} ${H * 0.55}) rotate(${rot})`}>
      {Array.from({ length: n }, (_, i) => {
        const a0 = (i / n) * Math.PI * 2
        const a1 = ((i + 1) / n) * Math.PI * 2
        const R = 150
        const p = `M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`
        return <path key={i} d={p} fill={i % 3 === 0 ? tone : i % 3 === 1 ? 'var(--c-surface)' : 'var(--c-line)'} opacity={i % 3 === 0 ? 0.9 : 0.8} />
      })}
      <circle r="38" fill="var(--c-surface-2)" stroke="var(--c-ink)" strokeOpacity="0.4" />
      <circle r="150" fill="none" stroke="var(--c-ink)" strokeOpacity="0.35" />
    </g>
  )
}

function Graph({ r, tone }: { r: () => number; tone: string }) {
  let y = 200
  const pts: string[] = []
  for (let x = 0; x <= W; x += 10) {
    y += (r() - 0.62) * 18
    y = Math.max(40, Math.min(220, y))
    pts.push(`${x},${y.toFixed(1)}`)
  }
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1="0" x2={W} y1={40 + i * 36} y2={40 + i * 36} stroke="var(--c-line)" strokeWidth="1" />
      ))}
      <polyline points={pts.join(' ')} fill="none" stroke={tone} strokeWidth="3.5" strokeLinejoin="round" />
      <polyline points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={tone} opacity="0.12" />
    </g>
  )
}

function Fan({ r, tone }: { r: () => number; tone: string }) {
  const n = 5
  const base = -24 + r() * 8
  return (
    <g transform={`translate(${W * 0.62} ${H + 40})`}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`rotate(${base + i * 12})`}>
          <rect x={-46} y={-230} width={92} height={130} rx={8} fill={i === n - 1 ? tone : 'var(--c-surface)'} stroke="var(--c-ink)" strokeOpacity="0.35" />
          <text x={-34} y={-200} fill="var(--c-ink)" fillOpacity="0.8" fontFamily="var(--f-display)" fontWeight="900" fontSize="22">
            {['A', 'K', 'Q', 'J', 'T'][i]}
          </text>
        </g>
      ))}
    </g>
  )
}

function Waves({ r, tone }: { r: () => number; tone: string }) {
  // Mental: respiro, cerchi concentrici e onda
  const cx = W * (0.55 + r() * 0.2)
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={cx} cy={H / 2} r={20 + i * 22} fill="none" stroke={i === 2 ? tone : 'var(--c-ink)'} strokeOpacity={i === 2 ? 1 : 0.18} strokeWidth={i === 2 ? 3 : 1.2} />
      ))}
      <path
        d={`M0 ${H * 0.72} ${Array.from({ length: 9 }, (_, i) => `Q${i * 50 + 25} ${H * 0.72 + (i % 2 ? -26 : 26)} ${(i + 1) * 50} ${H * 0.72}`).join(' ')}`}
        fill="none"
        stroke={tone}
        strokeWidth="3"
      />
    </g>
  )
}

function Grid({ r, tone }: { r: () => number; tone: string }) {
  const suits = ['♠', '♥', '♦', '♣']
  return (
    <g>
      {Array.from({ length: 6 * 10 }, (_, i) => {
        const x = (i % 10) * 42 + 18
        const y = Math.floor(i / 10) * 42 + 40
        const hot = r() > 0.78
        return (
          <text key={i} x={x} y={y} fontSize="24" textAnchor="middle" fill={hot ? tone : 'var(--c-ink)'} fillOpacity={hot ? 1 : 0.16}>
            {suits[i % 4]}
          </text>
        )
      })}
    </g>
  )
}

const BY_FORMAT: Record<CourseFormat, (typeof Field)[]> = {
  MTT: [Field, Graph, Fan],
  SPIN: [Wheel, Fan],
  CASH: [Graph, Grid],
  MENTAL: [Waves],
  ALL: [Grid, Graph],
}

export function CourseCover({ seed, format, className, label }: { seed: string; format: CourseFormat; className?: string; label?: string }) {
  const art = useMemo(() => {
    const h = hash(seed)
    const r = rng(h)
    const variants = BY_FORMAT[format]
    const Art = variants[h % variants.length]
    const tone = TONES[(h >> 3) % TONES.length]
    return <Art r={r} tone={tone} />
  }, [seed, format])
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('block h-full w-full bg-surface-2', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {art}
    </svg>
  )
}
