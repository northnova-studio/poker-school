// Emblemi di rank (7 tier × 3 divisioni), chip per la topbar, ladder visiva e icone dei badge.
import type { ComponentType, SVGProps } from 'react'
import {
  BookOpen,
  CalendarCheck,
  Cog,
  Crosshair,
  Crown,
  Dumbbell,
  FileSearch,
  Fish,
  Flame,
  Gamepad2,
  GraduationCap,
  Hammer,
  Laugh,
  Leaf,
  Medal,
  Mountain,
  PhoneCall,
  Play,
  Sparkles,
  Trophy,
  Waves,
  Briefcase,
} from 'lucide-react'
import type { RankTier } from '@/lib/api/types'
import { DIVISION_LABEL, TIER_LABEL, TIER_ORDER } from '@/lib/format'
import { cn } from '@/lib/cn'

const TIER_ICON: Record<RankTier, ComponentType<SVGProps<SVGSVGElement>>> = {
  FISH: Fish,
  CALLING_STATION: PhoneCall,
  REG: Briefcase,
  GRINDER: Cog,
  SHARK: Waves,
  CRUSHER: Hammer,
  LEGEND: Crown,
}

/** Colore del tier dai token: dal neutro all'ottone fino all'argilla per le leggende. */
export function tierColor(tier: RankTier): string {
  const i = TIER_ORDER.indexOf(tier)
  if (i <= 1) return 'var(--c-muted)'
  if (i === 2) return 'var(--c-accent-3)'
  if (i <= 4) return 'var(--c-accent)'
  return 'var(--c-accent-2)'
}

export const tierName = (tier: RankTier, division?: 1 | 2 | 3) => `${TIER_LABEL[tier]}${division ? ` ${DIVISION_LABEL[division]}` : ''}`

export function RankEmblem({ tier, division, size = 48, className, dim }: { tier: RankTier; division?: 1 | 2 | 3; size?: number; className?: string; dim?: boolean }) {
  const Icon = TIER_ICON[tier]
  const color = tierColor(tier)
  const level = TIER_ORDER.indexOf(tier)
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', dim && 'opacity-35', className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
        <path d="M24 2 43 9v15c0 11-8 18.5-19 22C13 42.5 5 35 5 24V9z" fill={`color-mix(in oklab, ${color} 18%, var(--c-surface))`} stroke={color} strokeWidth={level >= 5 ? 2.4 : 1.6} />
        {level >= 4 && <path d="M24 7 38.5 12.4V24c0 8.4-6 14.3-14.5 17.1C15.5 38.3 9.5 32.4 9.5 24V12.4z" fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1} />}
      </svg>
      <Icon className="relative" style={{ color, width: size * 0.42, height: size * 0.42 }} strokeWidth={2} />
      {division && (
        <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-[2px]">
          {[3, 2, 1].map((d) => (
            <span key={d} className="h-[3px] rounded-full" style={{ width: Math.max(4, size / 9), background: d >= division ? color : 'var(--c-line)' }} />
          ))}
        </span>
      )}
    </span>
  )
}

export function RankChip({ tier, division, className }: { tier: RankTier; division: 1 | 2 | 3; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3', className)}>
      <RankEmblem tier={tier} division={division} size={26} />
      <span className="text-sm font-semibold text-ink">{tierName(tier, division)}</span>
    </span>
  )
}

/** Ladder 7×3: una barra per divisione, la posizione attuale evidenziata. */
export function LadderStrip({ tier, division, progress, className }: { tier: RankTier; division: 1 | 2 | 3; progress: number; className?: string }) {
  const cur = TIER_ORDER.indexOf(tier) * 3 + (3 - division)
  return (
    <div className={className}>
      <div className="flex items-end gap-[3px]" role="img" aria-label={`Posizione nella ladder: ${tierName(tier, division)}, ${Math.round(progress * 100)}% della divisione`}>
        {TIER_ORDER.map((t, ti) => (
          <div key={t} className="flex flex-1 gap-[2px]">
            {[3, 2, 1].map((d, di) => {
              const idx = ti * 3 + di
              const done = idx < cur
              const here = idx === cur
              return (
                <div key={d} className="relative h-3 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
                  {(done || here) && <div className="absolute inset-y-0 left-0" style={{ width: done ? '100%' : `${Math.max(6, progress * 100)}%`, background: tierColor(t), opacity: done ? 0.55 : 1 }} />}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 hidden grid-cols-7 gap-[3px] text-[0.68rem] text-muted sm:grid">
        {TIER_ORDER.map((t) => (
          <span key={t} className={cn('truncate', t === tier && 'font-semibold text-ink')}>
            {TIER_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  )
}

const BADGE_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Play,
  Dumbbell,
  BookOpen,
  Flame,
  Sparkles,
  CalendarCheck,
  FileSearch,
  GraduationCap,
  Mountain,
  Trophy,
  Crown,
  Leaf,
  Gamepad2,
  Crosshair,
  Laugh,
}

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const I = BADGE_ICONS[name] ?? Medal
  return <I className={className} aria-hidden />
}

export const RARITY_BADGE: Record<string, { label: string; color: string }> = {
  COMMON: { label: 'Comune', color: 'var(--c-muted)' },
  RARE: { label: 'Raro', color: 'var(--c-accent-3)' },
  EPIC: { label: 'Epico', color: 'var(--c-accent)' },
  LEGENDARY: { label: 'Leggendario', color: 'var(--c-accent-2)' },
}
