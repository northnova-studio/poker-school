import { Link } from 'react-router-dom'
import { COACHES } from '@/data/coaches'
import { FOUNDER_EXTRA } from '@/data/content'
import { FounderCard } from '../FounderCard'
import { SectionHeading } from '../Section'

export const FOUNDERS = COACHES.filter((c) => FOUNDER_EXTRA[c.id])

export function Founders() {
  return (
    <section aria-labelledby="fondatori-title" className="bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <SectionHeading
          id="fondatori-title"
          title="Tre fondatori. Ancora ai tavoli."
          lede="Non abbiamo appeso le carte al chiodo per insegnare. Giochiamo ogni settimana ai livelli più alti in Italia, e quello che spieghiamo a lezione lo usiamo la sera stessa."
        />
        <ul className="mt-16 grid gap-16 md:mt-24 md:grid-cols-3 md:gap-8">
          {FOUNDERS.map((c, i) => {
            const x = FOUNDER_EXTRA[c.id]
            return (
              <li key={c.id} className={i === 1 ? 'md:translate-y-12' : undefined}>
                <FounderCard coach={c} position={x.position} />
                <div className="mx-auto mt-8 max-w-[19rem]">
                  <p className="font-display text-2xl font-extrabold text-ink">{c.name}</p>
                  <p className="mt-1 text-accent">{x.headline}</p>
                  <p className="mt-3 text-muted">{x.offTable}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="mt-20 md:mt-28">
          <Link to="/team" className="pub-link text-lg font-semibold text-ink hover:text-accent">
            Leggi chi siamo e come lavoriamo
          </Link>
        </div>
      </div>
    </section>
  )
}
