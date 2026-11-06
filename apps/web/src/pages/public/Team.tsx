import { Gamepad2 } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { ButtonLink } from '@/components/ui/Button'
import { FOUNDER_EXTRA, OFF_TABLE, PHILOSOPHY, VALUES } from '@/data/content'
import { FORMAT_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { FounderCard } from '@/components/public/FounderCard'
import { CtaBand, SectionHeading } from '@/components/public/Section'
import { FOUNDERS } from '@/components/public/home/Founders'
import { SplitReveal } from '@/components/public/SplitReveal'

export default function Team() {
  return (
    <>
      <title>{`Team — ${BRAND.name}`}</title>
      <meta name="description" content="I tre fondatori: giocatori italiani in attività ai livelli più alti, head coach di Spin & Go e MTT, e un ex pro player di Call of Duty che porta il metodo esport." />

      <section className="pub-felt grain relative overflow-hidden">
        <div className="pub-wrap relative z-[2] pb-16 pt-32 md:pb-24 md:pt-40">
          <p className="text-lg text-muted">Il team</p>
          <h1 className="pub-display pub-hero-title mt-4 max-w-[16ch] text-[clamp(3rem,8.5vw,8rem)] text-ink">
            <SplitReveal text="Tre giocatori in attività. Un gruppo di amici." step={18} />
          </h1>
          <p className="pub-fade-in pub-lede mt-10 text-ink/80" style={{ ['--d' as string]: '700ms' }}>
            Ci conosciamo da anni ai tavoli e nelle lobby. Abbiamo aperto {BRAND.name} perché il modo in cui studiamo tra di noi, con review, numeri e prese in giro, funziona. E volevamo farlo con altre persone.
          </p>
        </div>
      </section>

      {FOUNDERS.map((c, i) => {
        const x = FOUNDER_EXTRA[c.id]
        const flip = i % 2 === 1
        return (
          <section key={c.id} aria-labelledby={`f-${c.id}`} className={cn('border-t border-line py-24 md:py-32', flip ? 'bg-surface' : 'bg-bg')}>
            <div className="pub-wrap grid gap-14 lg:grid-cols-12 lg:items-center">
              <div className={cn('lg:col-span-5', flip && 'lg:order-2')}>
                <FounderCard coach={c} position={x.position} className="max-w-[21rem]" />
              </div>
              <div className={cn('lg:col-span-7', flip && 'lg:order-1')}>
                <p className="text-accent">{x.headline}</p>
                <h2 id={`f-${c.id}`} className="pub-display mt-3 text-[clamp(3rem,7vw,6rem)] text-ink">
                  {c.name}
                  <span className="ml-3 align-middle font-sans text-xl font-normal tracking-normal text-muted" style={{ fontStretch: '100%' }}>
                    detto {c.nickname}
                  </span>
                </h2>
                <p className="pub-lede mt-6 text-ink/85">{c.bio}</p>
                <dl className="mt-10 grid gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted">Al tavolo</dt>
                    <dd className="mt-2 text-ink">{c.formats.map((f) => FORMAT_LABEL[f]).join(' e ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Nella scuola</dt>
                    <dd className="mt-2">
                      <ul className="space-y-1 text-ink">
                        {x.focus.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
                <p className="mt-10 border-l-2 border-accent-2 pl-5 text-lg italic text-ink/85">{x.offTable}</p>
              </div>
            </div>
          </section>
        )
      })}

      <section aria-labelledby="filosofia-title" className="border-t border-line bg-bg py-24 md:py-36">
        <div className="pub-wrap">
          <SectionHeading id="filosofia-title" title="Come la pensiamo." lede="Tre idee che usiamo per decidere tutto: cosa insegnare, chi accettare, cosa pubblicare." />
          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {PHILOSOPHY.map((p, i) => (
              <article key={p.title} className="border-t-2 border-ink pt-6">
                <span className="font-display text-5xl font-black text-accent" aria-hidden>
                  {['♠', '♥', '♦'][i]}
                </span>
                <h3 className="pub-h3 mt-4 text-3xl text-ink">{p.title}</h3>
                <p className="mt-4 leading-relaxed text-muted">{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="fuori-title" className="pub-night relative overflow-hidden py-24 md:py-36">
        <div className="pub-wrap relative z-[2] grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Gamepad2 className="h-10 w-10" style={{ color: 'var(--pub-night-accent)' }} aria-hidden />
            <h2 id="fuori-title" className="pub-h2 mt-6">
              Fuori dai tavoli.
            </h2>
            <p className="pub-night-muted mt-6 max-w-md text-lg leading-relaxed">
              Dopo la sessione si accende la lobby. Lorenzo arriva da anni di Call of Duty competitivo, Fabri non accetta di perdere a EA FC, Matteo continua a provarci a Warzone. Gli studenti sono invitati, i premi sono lezioni.
            </p>
          </div>
          <ul className="lg:col-span-7">
            {OFF_TABLE.map((o) => (
              <li key={o.title} className="grid gap-2 border-t py-6 sm:grid-cols-[1fr_auto] sm:gap-8" style={{ borderColor: 'color-mix(in oklab, var(--pub-night-ink) 18%, transparent)' }}>
                <div>
                  <h3 className="pub-h3 text-2xl">{o.title}</h3>
                  <p className="pub-night-muted mt-2 max-w-lg">{o.text}</p>
                </div>
                <span className="font-mono text-sm" style={{ color: 'var(--pub-night-accent)' }}>
                  {o.when}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="valori-title" className="bg-bg py-24 md:py-36">
        <div className="pub-wrap">
          <h2 id="valori-title" className="pub-h2 max-w-3xl text-ink">
            Le regole del tavolo.
          </h2>
          <dl className="mt-14 grid gap-x-12 md:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="border-t border-line py-8">
                <dt className="pub-h3 text-2xl text-ink">{v.title}</dt>
                <dd className="mt-3 max-w-lg leading-relaxed text-muted">{v.text}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink to="/risultati" variant="secondary" size="lg" className="mt-10">
            Guarda le prove
          </ButtonLink>
        </div>
      </section>

      <CtaBand title="Vuoi studiare con noi?" />
    </>
  )
}
