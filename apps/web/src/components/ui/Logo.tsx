import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'
// Wordmark di lavoro: tre barre (tre fondatori / tre formati) + nome dal brand config.
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <svg viewBox="0 0 36 36" className="h-7 w-7" aria-hidden>
        <rect x="5" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
        <rect x="15" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
        <rect x="25" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent-2)" />
      </svg>
      {!compact && (
        <span className="font-display text-xl font-black uppercase leading-none tracking-[-0.03em]" style={{ fontStretch: '115%' }}>
          {BRAND.name}
        </span>
      )}
      <span className="sr-only">{BRAND.name} — home</span>
    </span>
  )
}
