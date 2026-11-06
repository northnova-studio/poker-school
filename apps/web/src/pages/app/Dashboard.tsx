import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CalendarDays, Clock, Flame, Gamepad2, Mountain, Sparkles, Target, Users } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { tierFromXp } from '@/lib/app-rank'
import { fmtDay, fmtDec, fmtInt, fmtRelative, fmtTime, fmtWeekday, FORMAT_SHORT, fmtSignedEur } from '@/lib/app-format'
import { coachById } from '@/data/coaches'
import { cn } from '@/lib/cn'
import { useAppShell } from '@/components/app/AppContext'
import { Chip, EmptyState, PageSkeleton, Panel, Skeleton, StatTile } from '@/components/app/Panel'
import { LadderStrip, RankEmblem, tierName } from '@/components/app/Rank'
import { PlayerCardView } from '@/components/app/PlayerCardView'
import { CardRow } from '@/components/app/Poker'
import { Sparkline } from '@/components/app/charts'
import { Avatar } from '@/components/ui/Avatar'

function greeting() {
  const h = new Date().getHours()
  return h < 6 ? 'Notte fonda' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { rank } = useAppShell()
  const reduce = useReducedMotion()
  const card = useData(() => api.card.me(), [])
  const stats = useData(() => api.stats.me('30d', 'ALL'), [])
  const spot = useData(() => api.dailySpot.today(), [])
  const lessons = useData(() => api.lessons.list({ from: new Date().toISOString() }), [])
  const runs = useData(() => api.deepRuns.list({ activeOnly: true }), [])
  const events = useData(() => api.gaming.events(), [])

  if (!rank || !user) return <PageSkeleton />
  const pos = tierFromXp(rank.xp)
  const pct = rank.xpForNextDivision ? rank.xpIntoDivision / rank.xpForNextDivision : 1
  const toNext = pos.next ? pos.next.atXp - rank.xp : 0
  const st = stats.data
  const myLessons = (lessons.data ?? []).filter((l) => l.bookedByMe).slice(0, 3)
  const tonight = (events.data ?? []).find((e) => new Date(e.startsAt).toDateString() === new Date().toDateString() && Date.parse(e.startsAt) > Date.now() - 3 * 3600_000)
  const nextEvent = tonight ?? (events.data ?? []).find((e) => Date.parse(e.startsAt) > Date.now())
  const roiLabel = st?.roi !== null && st?.roi !== undefined ? `ROI ${fmtDec(st.roi)}%` : st?.bb100 !== null && st?.bb100 !== undefined ? `${fmtDec(st.bb100)} bb/100` : '—'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* rank: il momento principale della pagina */}
        <section className="grain relative overflow-hidden rounded-[var(--r-card)] border border-line bg-surface p-5 sm:p-7 lg:col-span-8" aria-labelledby="hello">
          <div className="relative z-[2]">
            <p className="text-sm text-muted">
              {greeting()}, <span className="text-ink">{user.nickname}</span> · {rank.seasonName}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              <RankEmblem tier={rank.tier} division={rank.division} size={84} />
              <div className="min-w-0">
                <h1 id="hello" className="font-display text-[clamp(2.2rem,6vw,4.2rem)] font-black leading-[0.9] tracking-[-0.045em]" style={{ fontStretch: '118%' }}>
                  {tierName(rank.tier, rank.division)}
                </h1>
                <p className="mt-2 text-sm text-muted">
                  <span className="font-mono text-ink tabular">{fmtInt(rank.xp)}</span> XP stagionali · <span className="text-ink">{rank.position}°</span> nella classifica della scuola
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">
                  {pos.next ? (
                    <>
                      Mancano <span className="font-mono font-semibold text-ink">{fmtInt(toNext)} XP</span> a {tierName(pos.next.tier, pos.next.division)}
                    </>
                  ) : (
                    'Sei in cima alla ladder'
                  )}
                </span>
                <span className="font-mono text-xs text-muted tabular">
                  {fmtInt(rank.xpIntoDivision)}/{fmtInt(rank.xpForNextDivision)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Avanzamento nella divisione" aria-valuemin={0} aria-valuemax={rank.xpForNextDivision} aria-valuenow={rank.xpIntoDivision}>
                <motion.div className="h-full rounded-full bg-accent" initial={{ width: reduce ? `${pct * 100}%` : '0%' }} animate={{ width: `${Math.max(2, pct * 100)}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} />
              </div>
              <LadderStrip tier={rank.tier} division={rank.division} progress={pct} className="mt-6" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/sessioni" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-card)] bg-accent px-4 text-sm font-semibold text-on-accent hover:brightness-110">
                Registra una sessione
              </Link>
              <Link to="/app/rank" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-card)] border border-line px-4 text-sm font-semibold text-ink hover:border-accent">
                Ladder e classifica <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <Panel title="La tua Player Card" className="lg:col-span-4" actions={<Link to="/app/card" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent hover:underline">Apri</Link>}>
          <div className="flex items-center justify-center py-1">
            {card.data ? (
              <Link to="/app/card" aria-label="Apri la tua Player Card" className="rounded-[var(--r-card)]">
                <PlayerCardView card={card.data} size="md" caption={rank.seasonName.split(' — ')[0]} />
              </Link>
            ) : (
              <Skeleton className="aspect-[320/460] w-[240px]" />
            )}
          </div>
        </Panel>
      </div>

      {/* statistiche 30 giorni */}
      <section aria-labelledby="snap">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="snap" className="font-sans text-[0.95rem] font-semibold">
            Ultimi 30 giorni
          </h2>
          <Link to="/app/statistiche" className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
            Tutte le statistiche
          </Link>
        </div>
        {st ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Profitto" value={fmtSignedEur(st.profit)} tone={st.profit > 0 ? 'success' : st.profit < 0 ? 'danger' : 'ink'} sub={<Sparkline values={st.profitSeries.map((p) => p.value)} color={st.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)'} />} />
            <StatTile label="Rendimento" value={roiLabel} sub={st.abi ? `ABI ${fmtDec(st.abi, 0)} €` : `${fmtInt(st.hands)} mani`} />
            <StatTile label="Volume" value={fmtInt(st.games)} sub={`${st.sessionsCount} sessioni · ${fmtDec(st.hoursPlayed, 0)} h al tavolo`} />
            <StatTile label="Studio" value={`${fmtDec(st.hoursStudied, 0)} h`} sub={`Presenze lezioni ${st.attendancePct}%`} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel title="Daily Spot di oggi" className="lg:col-span-5" actions={<Chip tone="accent" icon={<Target />}>{spot.data ? FORMAT_SHORT[spot.data.format] : '…'}</Chip>}>
          {spot.data ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded-[var(--r-card)] bg-surface-2 p-3">
                <CardRow cards={spot.data.heroCards} size="md" placeholder={2} label="Carte dell'hero" />
                {spot.data.board && <CardRow cards={spot.data.board} size="sm" className="mt-2" label="Board" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold leading-tight">{spot.data.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{spot.data.situation}</p>
                <div className="mt-3">
                  {spot.data.answeredOptionId ? (
                    <span className={cn('inline-flex items-center gap-2 text-sm font-semibold', spot.data.answeredOptionId === spot.data.correctOptionId ? 'text-success' : 'text-danger')}>
                      {spot.data.answeredOptionId === spot.data.correctOptionId ? 'Risposta giusta' : 'Risposta sbagliata'} ·{' '}
                      <Link to="/app/daily-spot" className="text-accent underline-offset-4 hover:underline">
                        rivedi la spiegazione
                      </Link>
                    </span>
                  ) : (
                    <Link to="/app/daily-spot" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-card)] bg-accent px-4 text-sm font-semibold text-on-accent hover:brightness-110">
                      Gioca lo spot <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className="h-32" />
          )}
        </Panel>

        <Panel title="Le tue prossime lezioni" className="lg:col-span-4" actions={<Link to="/app/lezioni" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent hover:underline">Calendario</Link>}>
          {lessons.loading ? (
            <Skeleton className="h-32" />
          ) : myLessons.length ? (
            <ul className="divide-y divide-line">
              {myLessons.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="w-12 shrink-0 text-center">
                    <div className="font-mono text-lg font-semibold leading-none">{new Date(l.startsAt).getDate()}</div>
                    <div className="text-[0.7rem] uppercase text-muted">{new Date(l.startsAt).toLocaleDateString('it-IT', { month: 'short' })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{l.title}</div>
                    <div className="text-xs text-muted">
                      {fmtTime(l.startsAt)} · {coachById(l.coachId)?.nickname ?? 'Coach'} · {FORMAT_SHORT[l.format]}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarDays />} title="Nessuna lezione prenotata" action={<Link to="/app/lezioni" className="text-sm font-semibold text-accent hover:underline">Prenota la prossima</Link>} />
          )}
        </Panel>

        <Panel title={tonight ? 'Stasera in lobby' : 'Prossima serata in lobby'} className="lg:col-span-3">
          {nextEvent ? (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Gamepad2 className="h-4 w-4 text-accent" aria-hidden /> {nextEvent.game}
              </div>
              <div className="mt-2 font-display text-lg font-bold leading-tight">{nextEvent.title}</div>
              <div className="mt-1 text-sm text-muted">
                <Clock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                {tonight ? `alle ${fmtTime(nextEvent.startsAt)}` : fmtWeekday(nextEvent.startsAt)} · con {nextEvent.hostNickname}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                <Users className="h-4 w-4" aria-hidden />
                <span className="font-mono text-ink">{nextEvent.participants.length}</span>
                {nextEvent.maxParticipants ? `/${nextEvent.maxParticipants}` : ''} iscritti
              </div>
              {nextEvent.prize && <Chip tone="accent2" className="mt-3">{nextEvent.prize}</Chip>}
              <Link to="/app/lobby" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                {nextEvent.joinedByMe ? 'Sei dentro · dettagli' : 'Partecipa'} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <Skeleton className="h-32" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel title="Deep run in corso" meta="la community sta railando" className="lg:col-span-7" actions={<Link to="/app/deep-run" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent hover:underline">Rail</Link>}>
          {runs.loading ? (
            <Skeleton className="h-28" />
          ) : runs.data?.length ? (
            <ul className="space-y-4">
              {runs.data.slice(0, 3).map((r) => {
                const out = 1 - r.playersLeft / r.totalPlayers
                return (
                  <li key={r.id} className="flex items-center gap-3">
                    <Avatar seed={r.avatarSeed} label={r.nickname} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold text-ink">{r.nickname}</span>
                        <span className="truncate text-sm text-muted">{r.tournamentName}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${out * 100}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        <span className="font-mono text-ink">{fmtInt(r.playersLeft)}</span> rimasti su {fmtInt(r.totalPlayers)} · {r.stackBb} bb · aggiornato {fmtRelative(r.updatedAt)}
                      </div>
                    </div>
                    <span className="hidden items-center gap-1 font-mono text-sm text-accent-2 sm:inline-flex">
                      <Flame className="h-4 w-4" aria-hidden />
                      {r.rails}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={<Mountain />} title="Nessun deep run live" text="Quando qualcuno va lontano in un torneo lo vedrai qui." />
          )}
        </Panel>

        <Panel title="Fun facts del mese" className="lg:col-span-5">
          {st ? (
            <ul className="space-y-3">
              {st.funFacts.map((f, i) => (
                <li key={i} className="flex gap-3 text-[0.95rem] leading-snug">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-28" />
          )}
          {myLessons.length > 0 && <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Prossima lezione: {fmtDay(myLessons[0].startsAt)} alle {fmtTime(myLessons[0].startsAt)}</p>}
        </Panel>
      </div>
    </div>
  )
}
