import { useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { Check, Minus } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { PLANS } from '@/data/plans'
import { EXTRA_PRICING, PRICING_COMPARE, PRICING_FAQ } from './pricing-content'
import type { BillingInterval } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { ButtonLink } from '@/components/ui/Button'
import { CtaBand, Faq } from '@/components/public/Section'
import { ChipStack, InViewGroup } from '@/components/public/Chips'
import { fmtEuro, fmtInt } from '@/components/public/graph'

function IntervalToggle({ value, onChange }: { value: BillingInterval; onChange: (v: BillingInterval) => void }) {
  return (
    <div role="radiogroup" aria-label="Fatturazione" className="relative inline-flex border border-line bg-surface p-1" style={{ borderRadius: 'calc(var(--r-card) + 4px)' }}>
      {(['month', 'year'] as const).map((k) => {
        const active = value === k
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(k)}
            className={cn('relative min-h-11 px-5 text-sm font-semibold transition-colors', active ? 'text-on-accent' : 'text-ink hover:text-accent')}
          >
            {active && (
              <motion.span
                layoutId="interval-pill"
                className="absolute inset-0 bg-accent"
                style={{ borderRadius: 'var(--r-card)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span className="relative">{k === 'month' ? 'Mensile' : 'Annuale, 2 mesi gratis'}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function Pricing() {
  const [interval, setBilling] = useState<BillingInterval>('month')

  return (
    <MotionConfig reducedMotion="user">
      <title>{`Prezzi e piani — ${BRAND.name}`}</title>
      <meta name="description" content="Piani Base, Pro ed Elite per studiare poker con metodo: lezioni di gruppo, hand review, corsi inclusi e coaching 1:1." />

      <section className="bg-bg pt-32 md:pt-40">
        <div className="pub-wrap grid gap-8 lg:grid-cols-12 lg:items-end">
          <h1 className="pub-display text-[clamp(3rem,9vw,8.5rem)] text-ink lg:col-span-7">Scegli il buy-in.</h1>
          <div className="lg:col-span-5">
            <p className="pub-lede">Tre piani per tre ritmi di studio. Si cambia o si disdice quando vuoi dall’area riservata.</p>
            <div className="mt-6">
              <IntervalToggle value={interval} onChange={setBilling} />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Piani" className="bg-bg py-16 md:py-20">
        <InViewGroup className="pub-wrap grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((p, i) => {
            const monthly = interval === 'month' ? p.priceMonthly : p.priceYearly / 12
            const saving = p.priceMonthly * 12 - p.priceYearly
            return (
              <article
                key={p.id}
                aria-labelledby={`plan-${p.id}`}
                className={cn('relative flex flex-col border p-7 md:p-8', p.highlighted ? 'pub-felt grain border-accent' : 'border-line bg-surface')}
                style={{ borderRadius: 'var(--r-card)' }}
              >
                <div className="relative z-[2] flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 id={`plan-${p.id}`} className="pub-h3 text-3xl text-ink">
                        {p.name}
                      </h2>
                      <p className="mt-2 text-muted">{p.tagline}</p>
                    </div>
                    <ChipStack count={2 + i * 3} tone={i === 0 ? 3 : i === 1 ? 0 : 1} width={40} delay={i * 150} className="shrink-0" />
                  </div>
                  {p.highlighted && (
                    <p className="absolute -top-[2.6rem] left-0 bg-accent px-2 py-1 text-xs font-semibold text-on-accent md:-top-[2.85rem]" style={{ borderRadius: 'calc(var(--r-card) * .6)' }}>
                      Il più scelto
                    </p>
                  )}
                  <div className="mt-8 flex items-baseline gap-2">
                    <motion.span key={`${p.id}-${interval}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-5xl font-bold text-ink tabular">
                      {fmtInt(monthly)}
                      <span className="ml-1 text-3xl">€</span>
                    </motion.span>
                    <span className="text-muted">al mese</span>
                  </div>
                  <p className="mt-2 min-h-[1.5rem] text-sm text-muted">
                    {interval === 'year' ? `${fmtEuro(p.priceYearly)} all’anno, risparmi ${fmtEuro(saving)}` : `oppure ${fmtEuro(p.priceYearly)} all’anno`}
                  </p>
                  <ul className="mt-8 space-y-3 border-t border-line pt-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-3 text-ink">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <ButtonLink to={`/registrati?plan=${p.id}`} size="lg" variant={p.highlighted ? 'primary' : 'secondary'} className="w-full">
                      {p.id === 'elite' ? 'Candidati all’Elite' : `Scegli ${p.name}`}
                    </ButtonLink>
                  </div>
                </div>
              </article>
            )
          })}
        </InViewGroup>
      </section>

      <section aria-labelledby="confronto-title" className="border-t border-line bg-bg py-20 md:py-28">
        <div className="pub-wrap">
          <h2 id="confronto-title" className="pub-h2 text-ink">
            Confronto completo.
          </h2>
          <div className="pub-scroll-x relative mt-10 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <caption className="sr-only">Cosa include ogni piano</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-4 pr-4 text-sm font-medium text-muted">
                    Incluso
                  </th>
                  {PLANS.map((p) => (
                    <th key={p.id} scope="col" className={cn('w-[18%] px-4 py-4 font-display text-xl font-extrabold', p.highlighted ? 'text-accent' : 'text-ink')}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARE.map((row) => (
                  <tr key={row.label} className="border-b border-line">
                    <th scope="row" className="py-4 pr-4 font-normal text-ink">
                      {row.label}
                    </th>
                    {PLANS.map((p) => {
                      const v = row.values[p.id]
                      return (
                        <td key={p.id} className={cn('px-4 py-4 text-sm', p.highlighted && 'bg-surface')}>
                          {v === true ? (
                            <>
                              <Check className="h-5 w-5 text-accent" aria-hidden />
                              <span className="sr-only">Incluso</span>
                            </>
                          ) : v === false ? (
                            <>
                              <Minus className="h-5 w-5 text-muted/60" aria-hidden />
                              <span className="sr-only">Non incluso</span>
                            </>
                          ) : (
                            <span className="text-ink">{v}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="extra-title" className="border-t border-line bg-surface py-20 md:py-28">
        <div className="pub-wrap">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 id="extra-title" className="pub-h2 text-ink lg:col-span-7">
              Lezioni di gruppo e coaching 1:1.
            </h2>
            <p className="pub-lede lg:col-span-5">Anche senza piano. Prezzi indicativi: quelli definitivi li trovi al momento della prenotazione.</p>
          </div>
          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
            {EXTRA_PRICING.map((x, i) => (
              <li key={x.title} className={cn('border-t border-line pt-6', i > 0 && 'md:border-l md:pl-8', i < 2 && 'md:pr-8')}>
                <h3 className="pub-h3 text-2xl text-ink">{x.title}</h3>
                <p className="mt-4">
                  <span className="font-mono text-3xl font-bold text-ink tabular">{x.price}</span> <span className="text-muted">{x.unit}</span>
                </p>
                <p className="mt-3 leading-relaxed text-muted">{x.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-prezzi-title" className="bg-bg py-20 md:py-28">
        <div className="pub-wrap grid gap-12 lg:grid-cols-12">
          <h2 id="faq-prezzi-title" className="pub-h2 text-ink lg:col-span-4">
            Domande sui piani.
          </h2>
          <Faq items={PRICING_FAQ} idPrefix="faq-prezzi" className="lg:col-span-8" />
        </div>
      </section>

      <CtaBand title="Non sai quale piano?" text="Candidati senza scegliere: dopo la valutazione ti consigliamo noi il piano giusto per il tuo livello e il tuo tempo." />
    </MotionConfig>
  )
}
