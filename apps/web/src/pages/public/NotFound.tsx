import { BRAND } from '@/config/brand'
import { ButtonLink } from '@/components/ui/Button'
import { PlayingCard } from '@/components/public/PlayingCard'

/** 404 a tema: un 4, una fiche al posto dello zero, un altro 4. */
export default function NotFound() {
  return (
    <>
      <title>{`Pagina non trovata — ${BRAND.name}`}</title>
      <meta name="robots" content="noindex" />
      <section className="pub-felt grain relative overflow-hidden">
        <div className="pub-wrap relative z-[2] grid min-h-[92svh] content-center gap-12 py-32 lg:grid-cols-12 lg:items-center">
          <div className="flex items-center justify-center gap-3 sm:gap-5 lg:order-2 lg:col-span-5" aria-hidden>
            <div className="pub-deal" style={{ ['--deal-delay' as string]: '100ms', ['--from-x' as string]: '-30vw', ['--rest' as string]: '-8deg' }}>
              <PlayingCard rank="4" suit="s" decorative className="w-24 text-[0.85rem] sm:w-32 sm:text-[1.05rem]" />
            </div>
            <div className="pub-deal grid h-24 w-24 place-items-center rounded-full sm:h-32 sm:w-32" style={{ ['--deal-delay' as string]: '260ms', ['--from-x' as string]: '0vw', background: 'var(--c-accent-2)' }}>
              <div className="grid h-[78%] w-[78%] place-items-center rounded-full border-4 border-dashed" style={{ borderColor: 'color-mix(in oklab, var(--c-bg) 45%, transparent)' }}>
                <span className="font-display text-4xl font-black text-on-accent sm:text-5xl">0</span>
              </div>
            </div>
            <div className="pub-deal" style={{ ['--deal-delay' as string]: '420ms', ['--from-x' as string]: '30vw', ['--rest' as string]: '8deg' }}>
              <PlayingCard rank="4" suit="h" decorative className="w-24 text-[0.85rem] sm:w-32 sm:text-[1.05rem]" />
            </div>
          </div>
          <div className="lg:order-1 lg:col-span-7">
            <p className="font-mono text-sm text-muted">Errore 404</p>
            <h1 className="pub-display mt-4 text-[clamp(2.8rem,7.5vw,6.5rem)] text-ink">Hai foldato la pagina sbagliata.</h1>
            <p className="pub-lede mt-6 text-ink/80">
              L’indirizzo non esiste o è stato spostato. Nessun problema: anche i migliori foldano la mano giusta ogni tanto. Riparti da qui.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to="/" size="lg">
                Torna alla home
              </ButtonLink>
              <ButtonLink to="/corsi" size="lg" variant="secondary">
                Guarda i corsi
              </ButtonLink>
              <ButtonLink to="/community" size="lg" variant="ghost">
                Prova il Daily Spot
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
