import { BRAND } from '@/config/brand'
import { ButtonLink } from '@/components/ui/Button'
import { XP_TABLE } from '@/components/public/community/community-content'
import { RankLadder } from '@/components/public/community/RankLadder'
import { LobbyNight } from '@/components/public/community/LobbyNight'
import { Leaderboard } from '@/components/public/community/Leaderboard'
import { BountyBoard, DailySpotDemo, DeepRunDemo, PlayerCardBuilder, RoastDemo } from '@/components/public/community/Demos'
import { CtaBand, SectionHeading } from '@/components/public/Section'
import { SplitReveal } from '@/components/public/SplitReveal'

export default function Community() {
  return (
    <>
      <title>{`Community, rank e Daily Spot — ${BRAND.name}`}</title>
      <meta name="description" content="Rank a stagioni da Fish a Legend, Player Card, Daily Spot, Roast della settimana, Deep Run Alert e lobby gaming post-sessione." />

      <section className="pub-felt grain relative overflow-hidden">
        <div className="pub-wrap relative z-[2] pb-16 pt-32 md:pb-24 md:pt-40">
          <p className="text-lg text-muted">Community</p>
          <h1 className="pub-display pub-hero-title mt-4 max-w-[15ch] text-[clamp(3rem,8.5vw,8rem)] text-ink">
            <SplitReveal text="Si sale di rank studiando." step={20} />
          </h1>
          <p className="pub-fade-in pub-lede mt-10 text-ink/80" style={{ ['--d' as string]: '700ms' }}>
            Ogni ora di studio, sessione registrata e mano mandata in review vale XP. Le stagioni durano un mese e la classifica è pubblica solo per chi lo sceglie.
          </p>
          <nav aria-label="In questa pagina" className="pub-fade-in mt-10 flex flex-wrap gap-2" style={{ ['--d' as string]: '900ms' }}>
            {[
              ['#rank', 'Rank'],
              ['#card', 'Player Card'],
              ['#daily', 'Daily Spot'],
              ['#roast', 'Roast'],
              ['#deeprun', 'Deep Run Alert'],
              ['#lobby', 'Lobby'],
              ['#classifica', 'Classifica'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center border border-line bg-bg/40 px-4 text-sm font-medium text-ink transition-colors hover:border-accent" style={{ borderRadius: 'var(--r-card)' }}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="rank" aria-labelledby="rank-title" className="scroll-mt-20 bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="rank-title" title="Sette tier, tre divisioni." lede="Da Fish a Legend, ognuno con le divisioni III, II e I. Le stagioni sono mensili: a inizio mese riparti dal 30% dell’XP finale, così nessuno vive di rendita." />
          <RankLadder className="mt-14" initial={0} />
          <div className="mt-16 grid gap-10 lg:grid-cols-12">
            <h3 className="pub-h3 text-3xl text-ink lg:col-span-4">Come si guadagna XP</h3>
            <div className="relative min-w-0 overflow-x-auto lg:col-span-8">
              <table className="w-full text-left">
                <caption className="sr-only">XP per attività</caption>
                <thead>
                  <tr className="border-b border-line text-sm text-muted">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Attività
                    </th>
                    <th scope="col" className="py-3 pr-4 text-right font-medium">
                      XP
                    </th>
                    <th scope="col" className="hidden py-3 font-medium sm:table-cell">
                      Limiti
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {XP_TABLE.map((r) => (
                    <tr key={r.label} className="border-b border-line">
                      <th scope="row" className="py-3 pr-4 font-normal text-ink">
                        {r.label}
                        {r.note && <span className="block text-xs text-muted sm:hidden">{r.note}</span>}
                      </th>
                      <td className="py-3 pr-4 text-right font-mono font-bold text-accent tabular">{r.xp}</td>
                      <td className="hidden py-3 text-sm text-muted sm:table-cell">{r.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="card" aria-labelledby="card-title" className="scroll-mt-20 border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="card-title" title="La tua Player Card." lede="Overall e sei attributi, come nelle carte dei giochi di calcio. La aggiornano i coach con i tuoi dati, e la puoi condividere." />
          <div className="mt-14">
            <PlayerCardBuilder />
          </div>
        </div>
      </section>

      <section id="daily" aria-labelledby="daily-title" className="scroll-mt-20 border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="daily-title" title="Daily Spot." lede="Uno spot al giorno, un minuto per rispondere. Poi vedi cosa ha scelto la community e leggi la spiegazione del coach. Provalo." />
          <div className="mt-14">
            <DailySpotDemo />
          </div>
        </div>
      </section>

      <section id="roast" aria-labelledby="roast-title" className="scroll-mt-20 border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="roast-title" title="Roast della settimana." lede="Si vota lo spot giocato peggio e quello giocato meglio. Mani anonimizzate, si critica la giocata e mai la persona. Il badge “Clown della settimana” lo riceve solo chi ha accettato di partecipare." />
          <div className="mt-14">
            <RoastDemo />
          </div>
        </div>
      </section>

      <section id="deeprun" aria-labelledby="deeprun-title" className="scroll-mt-20 border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="deeprun-title" title="Deep Run Alert." lede="Quando sei deep in un torneo attivi l’alert: la community ti raila, i coach commentano, e lo storico dei deep run resta nel tuo profilo." />
          <div className="mt-14">
            <DeepRunDemo />
          </div>
        </div>
      </section>

      <LobbyNight />

      <section aria-labelledby="taglia-title" className="bg-bg py-24 md:py-32">
        <div className="pub-wrap">
          <SectionHeading id="taglia-title" title="Taglia sui fondatori." lede="Batti uno di noi in un 1v1 e vinci una lezione 1:1. Si vince solo formazione, mai denaro.">
            <ButtonLink to="/registrati" variant="secondary" className="mt-6">
              Entra e sfidaci
            </ButtonLink>
          </SectionHeading>
          <div className="mt-14">
            <BountyBoard />
          </div>
        </div>
      </section>

      <section id="classifica" aria-labelledby="classifica-title" className="scroll-mt-20 border-t border-line bg-bg py-24 md:py-32">
        <div className="pub-wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="classifica-title" className="pub-h2 text-ink">
              Classifica della stagione.
            </h2>
            <p className="mt-6 text-muted">I primi dieci per XP stagionale. Compare solo chi ha scelto di rendere pubblici i propri progressi.</p>
          </div>
          <div className="min-w-0 lg:col-span-8">
            <Leaderboard />
          </div>
        </div>
      </section>

      <CtaBand title="Entra in lobby." text="Candidati: dopo la verifica hai accesso a rank, Daily Spot, Roast e Discord." />
    </>
  )
}
