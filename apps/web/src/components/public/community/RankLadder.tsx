import { useId, useState } from 'react'
import { TIER_INFO } from '@/data/content'
import { TIER_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ChipStack, InViewGroup } from '../Chips'
import { fmtInt } from '../graph'

export function divisions(min: number, max: number) {
  const w = (max - min) / 3
  const b1 = Math.round(min + w)
  const b2 = Math.round(min + 2 * w)
  return [
    { div: 'III', from: min, to: b1 - 1 },
    { div: 'II', from: b1, to: b2 - 1 },
    { div: 'I', from: b2, to: max - 1 },
  ]
}

/**
 * Ladder dei 7 tier come pile di fiches crescenti. Cliccando un tier si
 * vedono soglie XP e divisioni III/II/I (regole in docs/RANK.md).
 */
export function RankLadder({ className, initial = 2 }: { className?: string; initial?: number }) {
  const [sel, setSel] = useState(initial)
  const id = useId()
  const t = TIER_INFO[sel]
  return (
    <div className={className}>
      <InViewGroup className="relative">
        <div role="tablist" aria-label="Tier del rank" className="pub-scroll-x relative -mx-5 flex items-end gap-1 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:gap-2 sm:overflow-visible sm:px-0">
          {TIER_INFO.map((x, i) => {
            const active = i === sel
            return (
              <button
                key={x.tier}
                type="button"
                role="tab"
                id={`${id}-t-${i}`}
                aria-selected={active}
                aria-controls={`${id}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setSel(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + TIER_INFO.length) % TIER_INFO.length
                    setSel(n)
                    document.getElementById(`${id}-t-${n}`)?.focus()
                  }
                }}
                className={cn(
                  'group flex min-w-[5.5rem] shrink-0 flex-col items-center gap-3 rounded-[var(--r-card)] px-1 pb-3 pt-4 transition-colors sm:min-w-0',
                  active ? 'bg-surface-2' : 'hover:bg-surface',
                )}
              >
                <ChipStack count={2 + i * 2} tone={i < 2 ? 3 : i < 4 ? 2 : i < 6 ? 0 : 1} width={54} delay={i * 90} className={cn('transition-transform duration-500 ease-out-expo', active && '-translate-y-1')} />
                <span className={cn('text-center text-sm font-semibold leading-tight', active ? 'text-accent' : 'text-ink')}>{TIER_LABEL[x.tier]}</span>
                <span className="font-mono text-[0.7rem] text-muted tabular">{fmtInt(x.min)} XP</span>
              </button>
            )
          })}
        </div>
      </InViewGroup>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-t-${sel}`} className="mt-6 grid gap-6 border-t border-line pt-6 md:grid-cols-[1fr_1.2fr] md:items-start">
        <div>
          <p className="pub-h3 text-3xl text-ink">{TIER_LABEL[t.tier]}</p>
          <p className="mt-2 max-w-md text-muted">{t.text}</p>
        </div>
        <ol className="grid grid-cols-3 gap-2" aria-label={`Divisioni di ${TIER_LABEL[t.tier]}`}>
          {divisions(t.min, t.max).map((d) => (
            <li key={d.div} className="border border-line bg-surface px-3 py-3" style={{ borderRadius: 'var(--r-card)' }}>
              <p className="font-display text-xl font-black text-ink">{d.div}</p>
              <p className="mt-1 font-mono text-xs text-muted tabular">
                {fmtInt(d.from)}–{fmtInt(d.to)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
