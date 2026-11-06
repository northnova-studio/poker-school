import { Link } from 'react-router-dom'
import { BRAND } from '@/config/brand'
import { Logo } from '@/components/ui/Logo'
import { NAV_COACHING } from './nav'
import { SocialLinks } from './SocialIcons'

const cols: { title: string; links: { to: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Coaching',
    links: NAV_COACHING.map((f) => ({ to: `/coaching/${f.slug}`, label: f.label })),
  },
  {
    title: 'Scuola',
    links: [
      { to: '/team', label: 'Team' },
      { to: '/risultati', label: 'Risultati' },
      { to: '/corsi', label: 'Corsi' },
      { to: '/prezzi', label: 'Prezzi' },
    ],
  },
  {
    title: 'Community',
    links: [
      { to: '/community', label: 'Rank e Daily Spot' },
      { to: '/community#lobby', label: 'Lobby post-sessione' },
      { to: BRAND.discordUrl, label: 'Discord', external: true },
      { to: `mailto:${BRAND.email}`, label: BRAND.email, external: true },
    ],
  },
  {
    title: 'Legale',
    links: [
      { to: '/legal/privacy', label: 'Privacy' },
      { to: '/legal/termini', label: 'Termini e condizioni' },
      { to: '/legal/cookie', label: 'Cookie' },
      { to: '/legal/gioco-responsabile', label: 'Gioco responsabile' },
    ],
  },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative mt-auto border-t border-line bg-bg">
      <div className="pub-wrap grid gap-12 py-16 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-5 max-w-sm text-lg leading-snug text-ink">{BRAND.claim}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{BRAND.tagline}</p>
          <SocialLinks className="-ml-3 mt-6" />
        </div>
        <nav aria-label="Mappa del sito" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
          {cols.map((c) => (
            <div key={c.title}>
              <h2 className="font-sans text-sm font-semibold text-ink" style={{ letterSpacing: 0 }}>
                {c.title}
              </h2>
              <ul className="mt-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.to} className="inline-flex min-h-11 items-center break-all text-sm text-muted transition-colors hover:text-ink">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="pub-wrap grid gap-6 py-8 md:grid-cols-[auto_1fr] md:items-start">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-accent-2 font-display text-lg font-black text-ink"
            aria-label="Vietato ai minori di 18 anni"
            role="img"
          >
            18+
          </span>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-muted">
            <p>
              <strong className="font-semibold text-ink">{BRAND.name} offre solo formazione.</strong> Non organizziamo gioco, non abbiamo
              accordi con sale da gioco e non pubblichiamo bonus, codici o link. Il gioco con vincite in denaro è vietato ai minori e può
              causare dipendenza patologica.
            </p>
            <p>
              Se il gioco smette di essere un divertimento, chiedi aiuto: Telefono Verde Nazionale per le problematiche legate al gioco
              d’azzardo dell’Istituto Superiore di Sanità,{' '}
              <a href="tel:800558822" className="font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                800 55 88 22
              </a>
              . Leggi la pagina{' '}
              <Link to="/legal/gioco-responsabile" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                gioco responsabile
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="pub-wrap flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {BRAND.legalName}. I risultati mostrati sono prove di competenza dei coach, non promesse di guadagno.
          </p>
          <Link to="/brand-lab" className="inline-flex min-h-11 items-center hover:text-ink">
            Brand Lab (interno)
          </Link>
        </div>
      </div>
    </footer>
  )
}
