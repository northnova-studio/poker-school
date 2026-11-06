import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { BRAND, IDENTITIES, NAME_IDEAS, applyTheme, getStoredTheme } from '@/config/brand'
import type { ThemeId } from '@/config/brand'
import { Button } from '@/components/ui/Button'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { COACHES } from '@/data/coaches'
import { COURSES } from '@/data/courses'
import { cn } from '@/lib/cn'
import { PlayingCard } from '@/components/public/PlayingCard'
import { FounderCard } from '@/components/public/FounderCard'
import { CourseCard } from '@/components/public/CourseCard'
import { ChipStack, InViewGroup } from '@/components/public/Chips'

function Swatch({ label, hex }: { label: string; hex: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard non disponibile */
    }
  }
  return (
    <button type="button" onClick={copy} className="group flex min-h-11 items-center gap-3 text-left" aria-label={`Copia ${label} ${hex}`}>
      <span className="h-12 w-12 shrink-0 rounded-full border border-line" style={{ background: hex }} aria-hidden />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted group-hover:text-accent">
          {hex}
          {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          <span aria-live="polite" className="sr-only">
            {copied ? 'Copiato' : ''}
          </span>
        </span>
      </span>
    </button>
  )
}

export default function BrandLab() {
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme())
  const [name, setName] = useState(BRAND.name)
  const identity = IDENTITIES.find((i) => i.id === theme)!
  const pick = (id: ThemeId) => {
    applyTheme(id)
    setTheme(id)
  }

  return (
    <>
      <title>{`Brand Lab (interno) — ${BRAND.name}`}</title>
      <meta name="robots" content="noindex, nofollow" />

      <section className="bg-bg pb-10 pt-32 md:pt-40">
        <div className="pub-wrap grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-lg text-muted">Pagina interna, non indicizzata</p>
            <h1 className="pub-display mt-3 text-[clamp(3rem,8vw,7.5rem)] text-ink">Brand Lab.</h1>
          </div>
          <p className="pub-lede lg:col-span-5">
            Prova dal vivo le cinque identità: colori e font cambiano su tutto il sito. La scelta resta salvata in questo browser (e solo qui) finché non ne scegli un’altra. Il nome cambia solo nell’anteprima: quello vero si imposta in <code className="font-mono text-sm text-ink">src/config/brand.ts</code>.
          </p>
        </div>
      </section>

      <section aria-labelledby="ident-title" className="bg-bg pb-16">
        <div className="pub-wrap">
          <h2 id="ident-title" className="pub-h3 text-2xl text-ink">
            Identità
          </h2>
          <div role="radiogroup" aria-labelledby="ident-title" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {IDENTITIES.map((i) => {
              const active = i.id === theme
              return (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pick(i.id)}
                  className={cn('flex min-h-11 flex-col gap-3 border p-4 text-left transition-colors', active ? 'border-accent bg-surface-2' : 'border-line bg-surface hover:border-accent')}
                  style={{ borderRadius: 'var(--r-card)' }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-extrabold text-ink">{i.name}</span>
                    {active && <Check className="h-4 w-4 text-accent" aria-hidden />}
                  </span>
                  <span className="text-sm text-muted">{i.concept}</span>
                  <span className="flex gap-1" aria-hidden>
                    {i.palette.map((p) => (
                      <span key={p.hex} className="h-4 flex-1 rounded-sm border border-line" style={{ background: p.hex }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <h2 id="nomi-title" className="pub-h3 mt-12 text-2xl text-ink">
            Nome nell’anteprima
          </h2>
          <div role="radiogroup" aria-labelledby="nomi-title" className="mt-5 flex flex-wrap gap-2">
            {NAME_IDEAS.map((n) => (
              <button
                key={n.name}
                type="button"
                role="radio"
                aria-checked={name === n.name}
                onClick={() => setName(n.name)}
                title={n.why}
                className={cn('min-h-11 border px-4 text-sm font-semibold transition-colors', name === n.name ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink hover:border-accent')}
                style={{ borderRadius: 'var(--r-card)' }}
              >
                {n.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{NAME_IDEAS.find((n) => n.name === name)?.why}</p>
        </div>
      </section>

      {/* ANTEPRIMA */}
      <section aria-label="Anteprima" className="bg-bg pb-20">
        <div className="pub-wrap">
          <div className="pub-felt grain relative overflow-hidden border border-line" style={{ borderRadius: 'var(--r-card)' }}>
            <div className="relative z-[2] grid gap-10 p-6 md:p-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2.5 text-ink">
                  <svg viewBox="0 0 36 36" className="h-7 w-7" aria-hidden>
                    <rect x="5" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
                    <rect x="15" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
                    <rect x="25" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent-2)" />
                  </svg>
                  <span className="font-display text-xl font-black uppercase leading-none tracking-[-0.03em]" style={{ fontStretch: '115%' }}>
                    {name}
                  </span>
                </span>
                <p className="pub-display mt-8 text-[clamp(2.5rem,6vw,5.5rem)] text-ink">{identity.tagline}</p>
                <p className="mt-6 max-w-lg text-lg text-ink/80">{BRAND.claim}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg">Candidati</Button>
                  <Button size="lg" variant="secondary">
                    Scopri i formati
                  </Button>
                </div>
              </div>
              <div className="flex items-end justify-center gap-2 lg:col-span-5">
                <PlayingCard rank="A" suit="s" decorative className="w-24 -rotate-12 text-[0.8rem]" />
                <PlayingCard rank="A" suit="h" decorative className="-mb-3 w-24 text-[0.8rem]" />
                <PlayingCard rank="A" suit="d" decorative className="w-24 rotate-12 text-[0.8rem]" />
                <InViewGroup className="ml-2 flex items-end gap-1">
                  <ChipStack count={5} tone={0} width={36} />
                  <ChipStack count={3} tone={1} width={36} delay={200} />
                </InViewGroup>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="border border-line bg-surface p-6" style={{ borderRadius: 'var(--r-card)' }}>
              <h3 className="pub-h3 text-xl text-ink">Palette</h3>
              <p className="mt-1 text-sm text-muted">Clicca per copiare il codice.</p>
              <div className="mt-5 grid gap-3">
                {identity.palette.map((p) => (
                  <Swatch key={p.hex} {...p} />
                ))}
              </div>
            </div>
            <div className="border border-line bg-surface p-6" style={{ borderRadius: 'var(--r-card)' }}>
              <h3 className="pub-h3 text-xl text-ink">Tipografia</h3>
              <p className="mt-4 text-sm text-muted">Titoli, {identity.fonts.display}</p>
              <p className="font-display text-4xl font-black leading-none text-ink">Final table</p>
              <p className="mt-6 text-sm text-muted">Testo, {identity.fonts.text}</p>
              <p className="mt-1 leading-relaxed text-ink">Bolla, pay jump e ranges di call: il corso che trasforma il panico ICM in decisioni da reg.</p>
              <p className="mt-6 text-sm text-muted">Numeri, JetBrains Mono</p>
              <p className="font-mono text-2xl font-bold text-ink tabular">+42 chip EV</p>
              <p className="mt-6 border-t border-line pt-4 text-sm text-muted">Tono: {identity.tone}</p>
            </div>
            <div className="border border-line bg-surface p-6" style={{ borderRadius: 'var(--r-card)' }}>
              <h3 className="pub-h3 text-xl text-ink">Componenti</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm">Primario</Button>
                <Button size="sm" variant="secondary">
                  Secondario
                </Button>
                <Button size="sm" variant="ghost">
                  Ghost
                </Button>
              </div>
              <p className="mt-5 text-sm text-ink">
                Dato di esempio <PlaceholderTag />
              </p>
              <div className="mt-5 flex gap-2 text-sm">
                <span className="bg-accent px-2 py-1 font-semibold text-on-accent" style={{ borderRadius: 'calc(var(--r-card) * .6)' }}>
                  Bestseller
                </span>
                <span className="bg-accent-2 px-2 py-1 font-semibold text-on-accent" style={{ borderRadius: 'calc(var(--r-card) * .6)' }}>
                  Nuovo
                </span>
                <span className="border border-line px-2 py-1 text-muted" style={{ borderRadius: 'calc(var(--r-card) * .6)' }}>
                  Bordo
                </span>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-line">
                <span className="block h-full w-2/3 bg-accent" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="border border-line bg-surface p-6" style={{ borderRadius: 'var(--r-card)' }}>
              <FounderCard coach={COACHES[0]} position="SPIN" className="max-w-[16rem]" />
            </div>
            <div className="border border-line bg-surface p-6" style={{ borderRadius: 'var(--r-card)' }}>
              <CourseCard course={COURSES[0]} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
