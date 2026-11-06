import { useId, useMemo, useRef, useState } from 'react'
import { usePublicInView } from '@/hooks/usePublicInView'
import { cn } from '@/lib/cn'
import { bankrollPoints, fmtInt, toPath } from '../graph'

const HANDS_PER_TABLE_HOUR = 70 // stima indicativa per un tavolo 6-max

/** Cash: quanti tavoli giochi, quante mani all'ora, e una winrate che si legge solo sul lungo periodo. */
export function CashTables() {
  const [tables, setTables] = useState(4)
  const id = useId()
  const graphRef = useRef<HTMLDivElement>(null)
  const inView = usePublicInView(graphRef)
  const path = useMemo(() => toPath(bankrollPoints(41, 120, 0.35, 1.3), 400, 140, 8), [])
  const hands = tables * HANDS_PER_TABLE_HOUR

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'relative aspect-[16/10] border transition-all duration-500 ease-out-expo',
              i < tables ? 'border-accent bg-surface-2 opacity-100' : 'border-line bg-transparent opacity-40',
            )}
            style={{ borderRadius: '999px' }}
          >
            {i < tables && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />}
          </div>
        ))}
      </div>
      <div className="mt-6">
        <label htmlFor={`${id}-t`} className="flex items-baseline justify-between text-sm text-muted">
          <span>Tavoli aperti</span>
          <span className="font-mono text-2xl font-bold text-ink tabular">{tables}</span>
        </label>
        <input
          id={`${id}-t`}
          type="range"
          min={1}
          max={12}
          value={tables}
          onChange={(e) => setTables(Number(e.target.value))}
          className="mt-3 h-11 w-full cursor-pointer accent-[var(--c-accent)]"
        />
        <p className="mt-1 text-sm text-muted">
          Circa <span className="font-mono font-bold text-ink tabular">{fmtInt(hands)}</span> mani all’ora. Con più tavoli il volume sale, la qualità delle decisioni no: per questo il numero giusto lo decidi con il coach.
        </p>
      </div>
      <div ref={graphRef} className="mt-8 border-t border-line pt-6">
        <p className="text-sm text-muted">Una winrate positiva su 100.000 mani: anche così, con mesi in perdita.</p>
        <svg viewBox="0 0 400 150" className="mt-3 h-auto w-full" role="img" aria-label="Grafico illustrativo di una winrate positiva con oscillazioni ampie">
          <line x1="0" x2="400" y1="146" y2="146" stroke="var(--c-line)" />
          {inView && <path d={path} pathLength={2000} className="pub-draw" fill="none" stroke="var(--c-accent-3)" strokeWidth="2.5" strokeLinejoin="round" style={{ ['--draw-delay' as string]: '100ms' }} />}
        </svg>
        <p className="mt-2 text-xs text-muted">Grafico illustrativo, non è un risultato reale.</p>
      </div>
    </div>
  )
}
