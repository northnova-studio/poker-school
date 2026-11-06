// Player Card stile FIFA Ultimate Team: fronte in SVG (esportabile in PNG), retro in HTML,
// effetto olografico/shine che segue il puntatore, flip 3D. Colori solo dai token del tema.
import { forwardRef, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PlayerCard } from '@/lib/api/types'
import { ATTR_META, RARITY_LABEL } from '@/lib/app-card'
import { FORMAT_SHORT } from '@/lib/app-format'
import { BRAND } from '@/config/brand'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'

export const CARD_PATH = 'M30 10 Q160 -4 290 10 L310 32 V376 Q310 400 288 411 L160 450 L32 411 Q10 400 10 376 V32 Z'
const MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 460' preserveAspectRatio='none'><path d='${CARD_PATH}' fill='black'/></svg>`)}")`

export interface RarityStyle {
  from: string
  to: string
  text: string
  sub: string
  line: string
}

export function rarityStyle(r: PlayerCard['rarity']): RarityStyle {
  switch (r) {
    case 'GOLD':
      return {
        from: 'color-mix(in oklab, var(--c-accent) 82%, var(--c-ink))',
        to: 'color-mix(in oklab, var(--c-accent) 62%, var(--c-bg))',
        text: 'var(--c-on-accent)',
        sub: 'color-mix(in oklab, var(--c-on-accent) 72%, transparent)',
        line: 'color-mix(in oklab, var(--c-on-accent) 30%, transparent)',
      }
    case 'SILVER':
      return {
        from: 'color-mix(in oklab, var(--c-ink) 82%, var(--c-muted))',
        to: 'color-mix(in oklab, var(--c-muted) 70%, var(--c-bg))',
        text: 'var(--c-bg)',
        sub: 'color-mix(in oklab, var(--c-bg) 72%, transparent)',
        line: 'color-mix(in oklab, var(--c-bg) 28%, transparent)',
      }
    case 'BRONZE':
      return {
        from: 'color-mix(in oklab, var(--c-accent-2) 72%, var(--c-accent))',
        to: 'color-mix(in oklab, var(--c-accent-2) 60%, var(--c-bg))',
        text: 'var(--c-bg)',
        sub: 'color-mix(in oklab, var(--c-bg) 72%, transparent)',
        line: 'color-mix(in oklab, var(--c-bg) 28%, transparent)',
      }
    case 'ICON':
      return {
        from: 'color-mix(in oklab, var(--c-bg) 72%, var(--c-accent))',
        to: 'color-mix(in oklab, var(--c-bg) 92%, var(--c-accent-2))',
        text: 'var(--c-accent)',
        sub: 'color-mix(in oklab, var(--c-ink) 75%, transparent)',
        line: 'color-mix(in oklab, var(--c-accent) 40%, transparent)',
      }
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Fronte della carta in SVG puro (riusato per l'export PNG). */
export const PlayerCardFront = forwardRef<SVGSVGElement, { card: PlayerCard; caption?: string; className?: string }>(function PlayerCardFront({ card, caption, className }, ref) {
  const st = rarityStyle(card.rarity)
  const gid = `g-${card.userId}-${card.rarity}`
  const h = hash(card.avatarSeed)
  const hue = h % 360
  const notches = 6 + ((h >> 4) % 3) * 2
  const initials = card.nickname.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
  const nick = card.nickname.toUpperCase()
  const nickSize = Math.min(30, Math.floor(420 / Math.max(6, nick.length)))
  const left = ATTR_META.slice(0, 3)
  const right = ATTR_META.slice(3)
  return (
    <svg ref={ref} viewBox="0 0 320 460" className={className} role="img" aria-label={`Player Card di ${card.nickname}: overall ${card.overall}, rarità ${RARITY_LABEL[card.rarity]}, formato ${card.mainFormat}. ${ATTR_META.map((a) => `${a.label} ${card.attributes[a.key]}`).join(', ')}.`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: st.from }} />
          <stop offset="1" style={{ stopColor: st.to }} />
        </linearGradient>
        <pattern id={`${gid}-p`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" style={{ stroke: st.line }} strokeWidth="1" />
        </pattern>
        <clipPath id={`${gid}-c`}>
          <path d={CARD_PATH} />
        </clipPath>
      </defs>
      <path d={CARD_PATH} fill={`url(#${gid})`} />
      <g clipPath={`url(#${gid}-c)`}>
        <rect x="0" y="0" width="320" height="460" fill={`url(#${gid}-p)`} opacity="0.35" />
        {/* tre barre del brand in filigrana */}
        <g opacity="0.045" style={{ fill: st.text }}>
          <rect x="196" y="250" width="26" height="150" rx="5" />
          <rect x="232" y="250" width="26" height="150" rx="5" />
          <rect x="268" y="250" width="26" height="150" rx="5" />
        </g>
      </g>
      <path d={CARD_PATH} fill="none" style={{ stroke: st.line }} strokeWidth="2" />
      <path d="M38 22 Q160 10 282 22 L298 38 V372 Q298 392 280 400 L160 436 L40 400 Q22 392 22 372 V38 Z" fill="none" style={{ stroke: st.line }} strokeWidth="1" />

      {/* overall e formato */}
      <text x="44" y="98" style={{ fill: st.text, fontFamily: 'var(--f-display)' }} fontSize="62" fontWeight="800" textLength={74} lengthAdjust="spacingAndGlyphs">
        {card.overall}
      </text>
      <text x="47" y="126" style={{ fill: st.text, fontFamily: 'var(--f-sans)' }} fontSize="19" fontWeight="700" letterSpacing="1">
        {FORMAT_SHORT[card.mainFormat].toUpperCase()}
      </text>
      <line x1="47" x2="95" y1="140" y2="140" style={{ stroke: st.line }} strokeWidth="1.5" />
      <text x="47" y="160" style={{ fill: st.sub, fontFamily: 'var(--f-sans)' }} fontSize="12" fontWeight="600" letterSpacing="1.5">
        {RARITY_LABEL[card.rarity].toUpperCase()}
      </text>
      <g transform="translate(47 172)" style={{ fill: st.text }}>
        <rect x="0" y="0" width="5" height="18" rx="1.2" />
        <rect x="8" y="0" width="5" height="18" rx="1.2" />
        <rect x="16" y="0" width="5" height="18" rx="1.2" opacity="0.6" />
      </g>

      {/* avatar generativo (stessa logica di Avatar) */}
      <g transform="translate(200 116)">
        <circle r="70" fill={`oklch(0.42 0.06 ${hue})`} />
        <g transform={`rotate(${(h >> 8) % 360})`}>
          <circle r="54" fill="none" stroke={`oklch(0.78 0.07 ${(hue + 40) % 360})`} strokeWidth="9" strokeDasharray={`${(2 * Math.PI * 54) / (notches * 2)}`} />
        </g>
        <circle r="38" fill={`oklch(0.32 0.05 ${hue})`} />
        <text y="10" textAnchor="middle" fontSize="28" fontWeight="800" fill="white" fillOpacity="0.92" style={{ fontFamily: 'var(--f-mono)' }}>
          {initials}
        </text>
        <circle r="70" fill="none" style={{ stroke: st.line }} strokeWidth="2" />
      </g>

      {/* nickname */}
      <text x="160" y="232" textAnchor="middle" style={{ fill: st.text, fontFamily: 'var(--f-display)' }} fontSize={nickSize} fontWeight="800" letterSpacing="0.5" textLength={nick.length * nickSize * 0.74 > 236 ? 236 : undefined} lengthAdjust="spacingAndGlyphs">
        {nick}
      </text>
      <line x1="52" x2="268" y1="250" y2="250" style={{ stroke: st.line }} strokeWidth="1.5" />

      {/* attributi */}
      {[left, right].map((col, ci) =>
        col.map((a, i) => (
          <g key={a.key} transform={`translate(${ci ? 182 : 62} ${288 + i * 36})`}>
            <text x="0" y="0" style={{ fill: st.text, fontFamily: 'var(--f-mono)' }} fontSize="24" fontWeight="800">
              {card.attributes[a.key]}
            </text>
            <text x="38" y="-1" style={{ fill: st.text, fontFamily: 'var(--f-sans)' }} fontSize="16" fontWeight="600" letterSpacing="1">
              {a.short}
            </text>
          </g>
        )),
      )}
      <line x1="160" x2="160" y1="266" y2="364" style={{ stroke: st.line }} strokeWidth="1.5" />
      <text x="160" y="396" textAnchor="middle" style={{ fill: st.sub, fontFamily: 'var(--f-sans)' }} fontSize="11.5" fontWeight="600" letterSpacing="2">
        {(caption ?? BRAND.name).toUpperCase()}
      </text>
    </svg>
  )
})

const SIZE = { sm: 'w-[150px]', md: 'w-[240px]', lg: 'w-[min(82vw,330px)]' }

/** Carta interattiva: tilt + shine al movimento, flip opzionale con retro. */
export function PlayerCardView({
  card,
  size = 'lg',
  interactive = true,
  flipped = false,
  back,
  caption,
  svgRef,
  className,
}: {
  card: PlayerCard
  size?: keyof typeof SIZE
  interactive?: boolean
  flipped?: boolean
  back?: ReactNode
  caption?: string
  svgRef?: React.Ref<SVGSVGElement>
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const live = interactive && !reduce
  const st = rarityStyle(card.rarity)
  const set = (x: number, y: number, active: boolean) => {
    const el = wrap.current
    if (!el) return
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.style.setProperty('--rx', `${active ? (0.5 - y) * 14 : 0}deg`)
    el.style.setProperty('--ry', `${active ? (x - 0.5) * 16 : 0}deg`)
    el.style.setProperty('--shine', active ? '1' : '0.35')
  }
  const strength = card.rarity === 'ICON' ? 0.55 : card.rarity === 'GOLD' ? 0.42 : 0.28
  return (
    <div className={cn('relative [perspective:1100px]', SIZE[size], className)}>
      <div
        ref={wrap}
        onPointerMove={
          live
            ? (e) => {
                const r = e.currentTarget.getBoundingClientRect()
                set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, true)
              }
            : undefined
        }
        onPointerLeave={live ? () => set(0.5, 0.3, false) : undefined}
        className="relative aspect-[320/460] w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={
          {
            '--mx': '50%',
            '--my': '30%',
            '--rx': '0deg',
            '--ry': '0deg',
            '--shine': '0.35',
            transform: `rotateX(var(--rx)) rotateY(calc(var(--ry) + ${flipped ? 180 : 0}deg))`,
            transition: reduce ? 'none' : 'transform .5s cubic-bezier(.16,1,.3,1)',
          } as CSSProperties
        }
      >
        {/* fronte */}
        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ filter: 'drop-shadow(0 18px 28px color-mix(in oklab, var(--c-bg) 65%, transparent))' }}>
          <PlayerCardFront ref={svgRef} card={card} caption={caption} className="h-full w-full" />
          {/* shine + olografico, ritagliati sulla forma della carta */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              WebkitMaskImage: MASK,
              maskImage: MASK,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              background: `radial-gradient(farthest-corner circle at var(--mx) var(--my), color-mix(in oklab, var(--c-ink) 55%, transparent) 0%, transparent 46%)`,
              mixBlendMode: 'overlay',
              opacity: 'var(--shine)',
              transition: 'opacity .3s',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              WebkitMaskImage: MASK,
              maskImage: MASK,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              backgroundImage:
                'linear-gradient(115deg, transparent 22%, color-mix(in oklab, var(--c-accent-3) 70%, transparent) 38%, color-mix(in oklab, var(--c-accent) 70%, transparent) 48%, color-mix(in oklab, var(--c-accent-2) 65%, transparent) 58%, transparent 74%)',
              backgroundSize: '260% 260%',
              backgroundPosition: 'var(--mx) var(--my)',
              mixBlendMode: 'color-dodge',
              opacity: `calc(var(--shine) * ${strength})`,
              transition: 'opacity .3s',
            }}
          />
        </div>
        {/* retro */}
        {back && (
          <div
            className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{
              WebkitMaskImage: MASK,
              maskImage: MASK,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              background: `linear-gradient(160deg, ${st.from}, ${st.to})`,
              color: st.text,
            }}
          >
            {back}
          </div>
        )}
      </div>
    </div>
  )
}
