// Copertina/poster generativo per corsi e lezioni (niente foto stock): trama da seed con i token del tema.
import { cn } from '@/lib/cn'

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function CourseCover({ seed, title, label, className, big }: { seed: string; title?: string; label?: string; className?: string; big?: boolean }) {
  const h = hash(seed)
  const kind = h % 3
  const accent = ['var(--c-accent)', 'var(--c-accent-2)', 'var(--c-accent-3)'][(h >> 3) % 3]
  const rot = (h >> 5) % 60
  const lines = Array.from({ length: 9 }, (_, i) => i)
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)} aria-hidden={!title}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <rect width="320" height="180" fill="var(--c-surface-2)" />
        {kind === 0 &&
          lines.map((i) => <circle key={i} cx={250} cy={40} r={20 + i * 22} fill="none" stroke={accent} strokeOpacity={0.5 - i * 0.045} strokeWidth={1.5} />)}
        {kind === 1 &&
          lines.map((i) => (
            <path key={i} d={`M-20 ${150 - i * 6} C 80 ${150 - i * 18 - (h % 20)}, 160 ${100 - i * 9}, 340 ${30 + i * 4}`} fill="none" stroke={accent} strokeOpacity={0.55 - i * 0.05} strokeWidth={1.5} />
          ))}
        {kind === 2 && (
          <g transform={`rotate(${rot - 30} 160 90)`}>
            {lines.map((i) => (
              <rect key={i} x={40 + i * 26} y={30 + ((i * 37 + (h % 30)) % 60)} width={14} height={120} rx={3} fill={accent} fillOpacity={0.12 + (i % 3) * 0.1} />
            ))}
          </g>
        )}
        <circle cx={-10} cy={190} r={90} fill={accent} fillOpacity={0.12} />
      </svg>
      {(title || label) && (
        <div className={cn('absolute inset-0 flex flex-col justify-end p-4', big && 'p-6 sm:p-8')}>
          {label && <span className="mb-1 font-mono text-xs text-muted">{label}</span>}
          {title && <span className={cn('font-display font-extrabold leading-[0.95] tracking-tight text-ink', big ? 'text-[clamp(1.6rem,4vw,2.6rem)]' : 'text-xl')}>{title}</span>}
        </div>
      )}
    </div>
  )
}
