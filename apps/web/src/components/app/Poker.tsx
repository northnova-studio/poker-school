// Carte da gioco e tavolo stilizzato (Daily Spot, Roast, hand review).
import { cn } from '@/lib/cn'
import { cardLabel, parseCards } from '@/lib/app-format'
import type { PCard } from '@/lib/app-format'

const SUIT_SVG: Record<PCard['suit'], string> = {
  s: 'M12 2C9 6 4 9 4 13a4 4 0 0 0 7 2.6V18l-2 3h6l-2-3v-2.4A4 4 0 0 0 20 13c0-4-5-7-8-11z',
  h: 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z',
  d: 'M12 2l7 10-7 10-7-10z',
  c: 'M12 3a3.6 3.6 0 0 0-3.4 4.8A3.6 3.6 0 1 0 10.8 14L9.5 21h5l-1.3-7a3.6 3.6 0 1 0 2.2-6.2A3.6 3.6 0 0 0 12 3z',
}

const SIZES = {
  sm: { box: 'h-11 w-8 text-[0.8rem]', pip: 'h-3.5 w-3.5' },
  md: { box: 'h-16 w-11 text-base', pip: 'h-5 w-5' },
  lg: { box: 'h-[5.5rem] w-[3.9rem] text-xl', pip: 'h-7 w-7' },
}

export function PlayingCard({ card, size = 'md', className }: { card: PCard | null; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  if (!card)
    return (
      <span
        role="img"
        aria-label="carta coperta"
        className={cn('relative inline-block shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface-2', s.box, className)}
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--c-line) 0 2px, transparent 2px 7px)' }}
      />
    )
  const red = card.suit === 'h' || card.suit === 'd'
  return (
    <span
      role="img"
      aria-label={cardLabel(card)}
      className={cn('relative inline-flex shrink-0 select-none flex-col justify-between rounded-[6px] bg-ink px-1 py-1 font-mono font-bold leading-none', s.box, red ? 'text-accent-2' : 'text-bg', className)}
    >
      <span aria-hidden>{card.rank === 'T' ? '10' : card.rank}</span>
      <svg viewBox="0 0 24 24" className={cn('self-end', s.pip)} aria-hidden>
        <path d={SUIT_SVG[card.suit]} fill="currentColor" />
      </svg>
    </span>
  )
}

export function CardRow({ cards, size = 'md', className, placeholder = 0, label }: { cards: string | null | undefined; size?: keyof typeof SIZES; className?: string; placeholder?: number; label?: string }) {
  const list = parseCards(cards)
  const filled: (PCard | null)[] = list.length ? list : Array.from({ length: placeholder }, () => null)
  return (
    <span className={cn('inline-flex gap-1', className)} role="group" aria-label={label}>
      {filled.map((c, i) => (
        <PlayingCard key={i} card={c} size={size} />
      ))}
    </span>
  )
}

/** Tavolo da poker stilizzato: panno con velo del tema, board al centro, carte dell'hero in basso. */
export function PokerTable({ heroCards, board, stacks, className }: { heroCards: string; board: string | null; stacks: string; className?: string }) {
  const boardCards = parseCards(board)
  return (
    <figure className={cn('relative mx-auto w-full max-w-2xl', className)}>
      <div
        className="relative aspect-[16/10] w-full rounded-[999px] border-[10px] border-surface-2 sm:aspect-[2/1]"
        style={{
          background: 'radial-gradient(ellipse at 50% 42%, color-mix(in oklab, var(--c-accent-3) 30%, var(--c-surface)) 0%, color-mix(in oklab, var(--c-accent-3) 12%, var(--c-bg)) 72%)',
          boxShadow: 'inset 0 0 0 1px var(--c-line), inset 0 10px 40px color-mix(in oklab, var(--c-bg) 55%, transparent)',
        }}
      >
        <div className="absolute inset-[9%] rounded-[999px] border border-ink/10" aria-hidden />
        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          {boardCards.length ? (
            <CardRow cards={board} size="md" label="Board" />
          ) : (
            <span className="rounded-full border border-ink/15 px-3 py-1 font-mono text-xs text-ink/70">preflop</span>
          )}
        </div>
        <div className="absolute bottom-[7%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <CardRow cards={heroCards} size="lg" placeholder={2} label="Le tue carte" />
          <span className="rounded-full bg-bg/70 px-2.5 py-0.5 font-mono text-[0.7rem] text-ink">Hero</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center font-mono text-xs text-muted sm:text-sm">{stacks}</figcaption>
    </figure>
  )
}
