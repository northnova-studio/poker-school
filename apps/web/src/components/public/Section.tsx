import { useState } from 'react'
import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** Intestazione di sezione: titolo a sinistra, lede a destra (desktop). */
export function SectionHeading({
  id,
  title,
  lede,
  children,
  className,
  as: H = 'h2',
}: {
  id?: string
  title: ReactNode
  lede?: ReactNode
  children?: ReactNode
  className?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-12 lg:items-end', className)}>
      <H id={id} className="pub-h2 text-ink lg:col-span-7">
        {title}
      </H>
      {(lede || children) && (
        <div className="lg:col-span-5 lg:pb-2">
          {lede && <p className="pub-lede">{lede}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

/** FAQ ad accordion accessibile (button + regione), altezza animata via CSS grid. */
export function Faq({ items, idPrefix = 'faq', className }: { items: { q: string; a: string }[]; idPrefix?: string; className?: string }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ul className={cn('border-t border-line', className)}>
      {items.map((it, i) => {
        const isOpen = open === i
        const bid = `${idPrefix}-b-${i}`
        const pid = `${idPrefix}-p-${i}`
        return (
          <li key={it.q} className="border-b border-line">
            <h3 className="m-0" style={{ letterSpacing: 0 }}>
              <button
                id={bid}
                type="button"
                aria-expanded={isOpen}
                aria-controls={pid}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left font-sans text-lg font-semibold text-ink transition-colors hover:text-accent md:text-xl"
              >
                <span>{it.q}</span>
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line transition-[transform,border-color] duration-500 ease-out-expo group-hover:border-accent',
                    isOpen && 'rotate-45 border-accent',
                  )}
                  aria-hidden
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <div id={pid} role="region" aria-labelledby={bid} className="pub-acc" data-open={isOpen}>
              <div>
                <p className="max-w-3xl pb-6 pr-12 leading-relaxed text-muted">
                  {it.a}
                </p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Fascia CTA finale, riusata nelle pagine interne. */
export function CtaBand({
  title = 'Siediti al tavolo.',
  text = 'Candidati in cinque minuti. Ti rispondiamo noi, non un bot: prima la valutazione, poi il piano.',
  to = '/registrati',
  cta = 'Candidati',
  secondary,
}: {
  title?: string
  text?: string
  to?: string
  cta?: string
  secondary?: { to: string; label: string }
}) {
  return (
    <section className="pub-felt grain relative overflow-hidden border-y border-line">
      <div className="pub-wrap relative z-[2] grid gap-8 py-20 md:py-28 lg:grid-cols-12 lg:items-end">
        <h2 className="pub-display text-[clamp(3rem,9vw,7.5rem)] text-ink lg:col-span-8">{title}</h2>
        <div className="lg:col-span-4">
          <p className="pub-lede text-ink/80">{text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to={to} size="lg">
              {cta}
            </ButtonLink>
            {secondary && (
              <ButtonLink to={secondary.to} size="lg" variant="secondary">
                {secondary.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
