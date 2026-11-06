import { ButtonLink } from '@/components/ui/Button'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { COURSES } from '@/data/courses'
import { HOME_FAQ, TESTIMONIALS } from '@/data/content'
import { CourseCard } from '../CourseCard'
import { Faq, SectionHeading } from '../Section'

const FEATURED = ['icm-masterclass', 'spin-metodo-hyper', 'deep-run-lab'].map((s) => COURSES.find((c) => c.slug === s)!).filter(Boolean)

export function FeaturedCourses() {
  return (
    <section aria-labelledby="corsi-title" className="border-t border-line bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <SectionHeading
          id="corsi-title"
          title="Corsi registrati da chi gioca."
          lede="Video corsi che si comprano una volta e restano tuoi. Spot reali, deep run commentati, il metodo di ogni head coach."
        />
        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {FEATURED.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
        <ButtonLink to="/corsi" variant="secondary" size="lg" className="mt-14">
          Tutti i corsi
        </ButtonLink>
      </div>
    </section>
  )
}

export function Testimonials() {
  return (
    <section aria-labelledby="voci-title" className="border-t border-line bg-surface py-24 md:py-32">
      <div className="pub-wrap">
        <h2 id="voci-title" className="pub-h2 max-w-3xl text-ink">
          Cosa dice chi è già dentro.
        </h2>
        <p className="mt-4 text-sm text-muted">
          Testimonianze di esempio, verranno sostituite con quelle reali degli studenti.
        </p>
        <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-0">
          {TESTIMONIALS.map((t, i) => (
            <li key={i} className={i > 0 ? 'md:border-l md:border-line md:pl-10' : 'md:pr-10'}>
              <figure>
                <span aria-hidden className="block font-display text-7xl font-black leading-[0.6] text-accent">
                  “
                </span>
                <blockquote className="mt-4 text-xl leading-snug text-ink">{t.quote}</blockquote>
                <figcaption className="mt-6 text-sm text-muted">
                  <span className="font-semibold text-ink">{t.who}</span>, {t.detail}
                  <PlaceholderTag show={t.placeholder} />
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-title" className="bg-bg py-24 md:py-36">
      <div className="pub-wrap grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="faq-title" className="pub-h2 text-ink lg:sticky lg:top-28">
            Domande che ci fanno sempre.
          </h2>
        </div>
        <Faq items={HOME_FAQ} idPrefix="home-faq" className="lg:col-span-8" />
      </div>
    </section>
  )
}
