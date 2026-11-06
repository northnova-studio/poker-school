import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

export type Suit = 's' | 'h' | 'd' | 'c'
export const SUIT_GLYPH: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
export const SUIT_NAME: Record<Suit, string> = { s: 'picche', h: 'cuori', d: 'quadri', c: 'fiori' }
const RANK_NAME: Record<string, string> = { A: 'Asso', K: 'Re', Q: 'Donna', J: 'Fante', T: 'Dieci' }

/** "A♠" → { rank: 'A', suit: 's' } */
export function parseCard(c: string): { rank: string; suit: Suit } {
  const glyph = c.slice(-1)
  const suit = (Object.entries(SUIT_GLYPH).find(([, g]) => g === glyph)?.[0] ?? 's') as Suit
  return { rank: c.slice(0, -1), suit }
}

export function cardLabel(rank: string, suit: Suit) {
  return `${RANK_NAME[rank] ?? rank} di ${SUIT_NAME[suit]}`
}

/** Carta da gioco disegnata con i token (faccia = --pub-card-face). */
export function PlayingCard({
  rank,
  suit,
  className,
  style,
  caption,
  decorative = false,
}: {
  rank: string
  suit: Suit
  className?: string
  style?: CSSProperties
  caption?: string
  decorative?: boolean
}) {
  const red = suit === 'h' || suit === 'd'
  const color = red ? 'var(--pub-card-red)' : 'var(--pub-card-ink)'
  return (
    <div
      className={cn('pub-card relative flex aspect-[5/7] select-none flex-col overflow-hidden', className)}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : cardLabel(rank, suit)}
      aria-hidden={decorative || undefined}
    >
      <span className="absolute left-[8%] top-[5%] flex flex-col items-center leading-none" style={{ color }}>
        <span className="font-display text-[1.6em] font-black" style={{ fontStretch: '100%' }}>
          {rank}
        </span>
        <span className="text-[1.15em]">{SUIT_GLYPH[suit]}</span>
      </span>
      <span className="absolute bottom-[5%] right-[8%] flex rotate-180 flex-col items-center leading-none" style={{ color }}>
        <span className="font-display text-[1.6em] font-black" style={{ fontStretch: '100%' }}>
          {rank}
        </span>
        <span className="text-[1.15em]">{SUIT_GLYPH[suit]}</span>
      </span>
      <span className="m-auto text-[4.2em] leading-none" style={{ color }}>
        {SUIT_GLYPH[suit]}
      </span>
      {caption && (
        <span
          className="absolute inset-x-0 bottom-[17%] text-center font-mono text-[0.6em] font-semibold tracking-wide"
          style={{ color: 'var(--pub-card-ink)', opacity: 0.7 }}
        >
          {caption}
        </span>
      )}
    </div>
  )
}

/** Mini carte inline per descrivere mani (es. "A♠ 7♦"). */
export function InlineCards({ cards, className }: { cards: string[]; className?: string }) {
  return (
    <span className={cn('inline-flex gap-1', className)}>
      {cards.map((c) => {
        const { rank, suit } = parseCard(c)
        const red = suit === 'h' || suit === 'd'
        return (
          <span
            key={c}
            className="pub-card inline-flex h-[2.4em] w-[1.75em] flex-col items-center justify-center rounded-[0.3em] font-display font-black leading-none"
            style={{ color: red ? 'var(--pub-card-red)' : 'var(--pub-card-ink)', boxShadow: 'none', fontStretch: '100%' }}
            role="img"
            aria-label={cardLabel(rank, suit)}
          >
            <span className="text-[0.95em]">{rank}</span>
            <span className="text-[0.8em]">{SUIT_GLYPH[suit]}</span>
          </span>
        )
      })}
    </span>
  )
}
