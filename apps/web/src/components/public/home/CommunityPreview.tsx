import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { COMMUNITY_FEATURES } from '@/data/content'
import { InlineCards } from '../PlayingCard'
import { RankLadder } from '../community/RankLadder'
import { SectionHeading } from '../Section'

const MINI: Record<string, ReactNode> = {
  card: (
    <span className="pub-fut-shape pub-fut-rim grid h-16 w-12 place-items-center" aria-hidden>
      <span className="pub-fut-shape pub-fut-face grid h-[3.85rem] w-[2.85rem] place-items-center font-display text-lg font-black text-ink">87</span>
    </span>
  ),
  daily: <InlineCards cards={['A♠', '7♦']} className="text-xl" />,
  roast: (
    <span className="flex w-24 flex-col gap-1.5" aria-hidden>
      <span className="h-2 rounded-full bg-accent-2" style={{ width: '92%' }} />
      <span className="h-2 rounded-full bg-accent-3" style={{ width: '18%' }} />
    </span>
  ),
  deeprun: (
    <span className="font-mono text-sm text-ink tabular" aria-hidden>
      <span className="text-accent">214</span>
      <span className="text-muted"> / 2.431</span>
    </span>
  ),
}

export function CommunityPreview() {
  const items = COMMUNITY_FEATURES.filter((f) => f.id !== 'lobby')
  return (
    <section aria-labelledby="community-title" className="border-t border-line bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <SectionHeading
          id="community-title"
          title="Una community che ti tiene al tavolo."
          lede="Rank a stagioni, uno spot al giorno, il roast del venerdì. Si studia di più quando qualcuno ti guarda, e ti prende in giro se salti la review."
        />
        <RankLadder className="mt-16" />
        <ul className="mt-20 grid gap-x-10 md:grid-cols-2">
          {items.map((f) => (
            <li key={f.id} className="flex gap-6 border-t border-line py-8">
              <div className="grid h-16 w-24 shrink-0 place-items-center">{MINI[f.id]}</div>
              <div>
                <h3 className="pub-h3 text-2xl text-ink">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <ButtonLink to="/community" variant="secondary" size="lg" className="mt-6">
          Prova il Daily Spot di oggi
        </ButtonLink>
      </div>
    </section>
  )
}
