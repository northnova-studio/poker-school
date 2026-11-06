import { NUMBERS } from '@/data/content'
import { Counter } from '../Chips'

/** Striscia di numeri onesti (nessun risultato inventato). */
export function Numbers() {
  return (
    <section aria-label="La scuola in numeri" className="border-y border-line bg-surface">
      <dl className="pub-wrap grid grid-cols-2 md:grid-cols-5">
        {NUMBERS.map((n, i) => (
          <div
            key={n.label}
            className={`flex flex-col gap-3 border-line py-10 md:py-14 ${i % 2 === 1 ? 'border-l pl-6' : 'pr-6'} ${i > 1 ? 'border-t md:border-t-0' : ''} md:border-l md:px-6 md:first:border-l-0 md:first:pl-0 ${i === 4 ? 'col-span-2 md:col-span-1' : ''} ${i === 4 ? 'border-l-0 pl-0 md:border-l md:pl-6' : ''}`}
          >
            <dt className="order-2 text-sm leading-snug text-muted">{n.label}</dt>
            <dd className={`order-1 font-mono text-[clamp(3rem,6vw,5rem)] font-bold leading-none tabular ${n.value === 0 ? 'text-accent-2' : 'text-ink'}`}>
              <Counter value={n.value} />
              {n.suffix}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
