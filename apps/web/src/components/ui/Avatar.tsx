import { cn } from '@/lib/cn'
// Avatar generativo da seed: niente foto obbligatorie (privacy), forme da "fiche".
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
export function Avatar({ seed, label, size = 40, className }: { seed: string; label?: string; size?: number; className?: string }) {
  const h = hash(seed)
  const hue = h % 360
  const rot = (h >> 8) % 360
  const notches = 6 + ((h >> 4) % 3) * 2
  const initials = (label ?? seed).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', className)}
      style={{ width: size, height: size, background: `oklch(0.42 0.06 ${hue})` }}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
        <circle cx="20" cy="20" r="15" fill="none" stroke={`oklch(0.78 0.07 ${(hue + 40) % 360})`} strokeWidth="2.5" strokeDasharray={`${(2 * Math.PI * 15) / (notches * 2)}`} />
        <circle cx="20" cy="20" r="10.5" fill={`oklch(0.32 0.05 ${hue})`} />
      </svg>
      <span className="relative font-mono font-bold text-white/90" style={{ fontSize: size * 0.3 }}>
        {initials}
      </span>
    </span>
  )
}
