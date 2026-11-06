import { useMemo, useState } from 'react'
import { EyeOff } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { PROOFS } from '@/data/proofs'
import type { Proof } from '@/data/proofs'
import { FORMAT_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ProofLightbox, ProofTile } from '@/components/public/Proofs'
import { CtaBand } from '@/components/public/Section'

type Filter = { who: Proof['who'] | 'ALL'; format: Proof['format'] | 'ALL'; tag: Proof['tag'] | 'ALL' }

const uniq = <T,>(a: T[]) => Array.from(new Set(a))

function FilterGroup<T extends string>({ label, value, options, onChange, format }: { label: string; value: T | 'ALL'; options: T[]; onChange: (v: T | 'ALL') => void; format?: (v: T) => string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm text-muted">{label}</legend>
      <div className="pub-scroll-x relative -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(['ALL', ...options] as (T | 'ALL')[]).map((o) => {
          const active = o === value
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o)}
              className={cn(
                'min-h-11 shrink-0 border px-4 text-sm font-medium transition-colors',
                active ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink hover:border-accent',
              )}
              style={{ borderRadius: 'var(--r-card)' }}
            >
              {o === 'ALL' ? 'Tutti' : format ? format(o as T) : o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function Results() {
  const [f, setF] = useState<Filter>({ who: 'ALL', format: 'ALL', tag: 'ALL' })
  const [open, setOpen] = useState<number | null>(null)
  const items = useMemo(
    () => PROOFS.filter((p) => (f.who === 'ALL' || p.who === f.who) && (f.format === 'ALL' || p.format === f.format) && (f.tag === 'ALL' || p.tag === f.tag)),
    [f],
  )

  return (
    <>
      <title>{`Risultati e prove — ${BRAND.name}`}</title>
      <meta name="description" content="Screenshot, grafici e video dei fondatori e degli studenti: prove di competenza, non promesse di guadagno." />

      <section className="bg-bg pt-32 md:pt-40">
        <div className="pub-wrap grid gap-8 lg:grid-cols-12 lg:items-end">
          <h1 className="pub-display text-[clamp(3rem,9vw,8.5rem)] text-ink lg:col-span-8">Prove, non promesse.</h1>
          <p className="pub-lede lg:col-span-4">
            Deep run, grafici, sessioni e trasferte. Li pubblichiamo per mostrare a che livello giochiamo e insegniamo, non per dirti quanto guadagnerai: nel poker nessuno può promettertelo.
          </p>
        </div>
      </section>

      <section aria-label="Galleria delle prove" className="bg-bg py-16 md:py-20">
        <div className="pub-wrap">
          <div className="grid gap-6 border-y border-line py-6 md:grid-cols-3">
            <FilterGroup label="Chi" value={f.who} options={uniq(PROOFS.map((p) => p.who))} onChange={(who) => setF((s) => ({ ...s, who }))} />
            <FilterGroup label="Formato" value={f.format} options={uniq(PROOFS.map((p) => p.format))} format={(v) => FORMAT_LABEL[v]} onChange={(format) => setF((s) => ({ ...s, format }))} />
            <FilterGroup label="Tipo" value={f.tag} options={uniq(PROOFS.map((p) => p.tag))} onChange={(tag) => setF((s) => ({ ...s, tag }))} />
          </div>
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {items.length === 1 ? '1 prova' : `${items.length} prove`}
          </p>
          {items.length ? (
            <div className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p, i) => (
                <ProofTile key={p.id} proof={p} onOpen={() => setOpen(i)} />
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-line p-10 text-center" style={{ borderRadius: 'var(--r-card)' }}>
              <p className="font-semibold text-ink">Nessuna prova con questi filtri.</p>
              <button type="button" onClick={() => setF({ who: 'ALL', format: 'ALL', tag: 'ALL' })} className="mt-4 min-h-11 font-semibold text-accent underline underline-offset-4">
                Mostra tutte le prove
              </button>
            </div>
          )}

          <aside className="mt-20 grid gap-6 border border-line bg-surface p-6 md:grid-cols-[auto_1fr] md:p-8" style={{ borderRadius: 'var(--r-card)' }}>
            <EyeOff className="h-8 w-8 text-accent" aria-hidden />
            <div>
              <h2 className="pub-h3 text-2xl text-ink">Cosa oscuriamo, sempre</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Nickname e avatar degli avversari, loghi e nomi delle sale da gioco, qualsiasi riferimento a bonus o promozioni. Le clip delle sessioni sono pubblicate in differita. Le prove degli studenti compaiono solo con il loro consenso scritto.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <ProofLightbox items={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
      <CtaBand title="Vuoi lavorare a questo livello?" text="Candidati: valutiamo da dove parti e costruiamo un piano. I risultati dipendono da te e dalla varianza, il metodo lo mettiamo noi." />
    </>
  )
}
