import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Coach } from '@/lib/api/types'
import { Avatar } from '@/components/ui/Avatar'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { cn } from '@/lib/cn'

/**
 * Player card stile FUT (rarità Icona) che si inclina in 3D seguendo il
 * puntatore, con riflesso. Statistiche da COACHES: se placeholder → "esempio".
 */
export function FounderCard({
  coach,
  position,
  rarity = 'Icona',
  className,
  overall,
  attributes,
}: {
  coach: Pick<Coach, 'name' | 'nickname' | 'avatarSeed' | 'stats'>
  position: string
  rarity?: string
  className?: string
  overall?: number | string
  attributes?: { label: string; value: number }[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--ry', `${(px - 0.5) * 18}deg`)
    el.style.setProperty('--rx', `${(0.5 - py) * 16}deg`)
    el.style.setProperty('--gx', `${px * 100}%`)
    el.style.setProperty('--gy', `${py * 100}%`)
    el.dataset.active = 'true'
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--gx', '50%')
    el.style.setProperty('--gy', '30%')
    el.dataset.active = 'false'
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('pub-fut relative mx-auto aspect-[5/6.6] w-full max-w-[19rem] drop-shadow-[0_30px_40px_var(--pub-shadow-soft)]', className)}
    >
      <div className="pub-fut-shape pub-fut-rim absolute inset-0" aria-hidden />
      <div className="pub-fut-shape pub-fut-face absolute inset-[3px] flex flex-col px-[9%] pb-[15%] pt-[9%]">
        <div className="flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
          <div className="leading-none">
            <p className="font-display text-[2.6rem] font-black leading-[0.85] text-ink" style={{ fontStretch: '100%' }}>
              {overall ?? position}
            </p>
            <p className="mt-1 font-mono text-xs font-bold text-ink">{overall ? position : rarity}</p>
          </div>
          <Avatar seed={coach.avatarSeed} label={coach.nickname} size={86} className="ring-2 ring-accent/60" />
        </div>
        <p
          className="mt-4 border-b border-ink/25 pb-2 text-center font-display text-[1.7rem] font-black uppercase leading-none tracking-tight text-ink"
          style={{ fontStretch: '112%' }}
        >
          {coach.nickname}
        </p>
        {attributes ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
            {attributes.map((a) => (
              <div key={a.label} className="flex items-baseline gap-2">
                <dt className="sr-only">{a.label}</dt>
                <dd className="font-display text-xl font-extrabold tabular text-ink" style={{ fontStretch: '100%' }}>
                  {a.value}
                </dd>
                <span className="font-mono text-[0.7rem] font-semibold text-ink/80" aria-hidden>
                  {a.label}
                </span>
              </div>
            ))}
          </dl>
        ) : (
          <dl className="mt-3 space-y-1.5">
            {coach.stats.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-3 text-[0.8rem]">
                <dt className="text-ink/80">{s.label}</dt>
                <dd className="flex shrink-0 items-baseline font-mono font-bold tabular text-ink">
                  {s.value}
                  <PlaceholderTag show={!!s.placeholder} className="border-ink/40 text-ink/70" />
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-auto flex justify-center gap-2 text-sm text-ink/60" aria-hidden>
          <span>♠</span>
          <span>♥</span>
          <span>♦</span>
        </p>
      </div>
    </div>
  )
}
