import { useState } from 'react'
import { ArrowDown, ArrowUp, Lock, Minus } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useCountdown, useData } from '@/hooks/useData'
import { TIER_RANGES, XP_RULES, XP_TYPE_LABEL, divisionStarts, tierFromXp } from '@/lib/app-rank'
import { fmtInt, fmtRelative } from '@/lib/app-format'
import { DIVISION_LABEL, TIER_LABEL, fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAppShell } from '@/components/app/AppContext'
import { ErrorState, PageHeader, PageSkeleton, Panel, ProgressBar } from '@/components/app/Panel'
import { Segmented } from '@/components/app/Controls'
import { BadgeIcon, RARITY_BADGE, RankEmblem, tierColor, tierName } from '@/components/app/Rank'
import { Avatar } from '@/components/ui/Avatar'

const XP_TABLE: [string, string][] = [
  ['Sessione registrata', `${XP_RULES.sessionBase} + 1 ogni 10 giochi (max +${XP_RULES.sessionBonusMax}) · max ${XP_RULES.sessionsPerDayMax} al giorno`],
  ['Ora di studio', `${XP_RULES.studyPerHour} · max ${XP_RULES.studyHoursPerDayMax} h al giorno`],
  ['Lezione di gruppo', `${XP_RULES.lesson}`],
  ['Mano in hand review', `${XP_RULES.handReview} · max ${XP_RULES.handReviewsPerWeekMax} a settimana`],
  ['Daily Spot', `${XP_RULES.dailyCorrect} se giusto, ${XP_RULES.dailyAttempt} per il tentativo`],
  ['Streak Daily Spot', `${XP_RULES.dailyStreak} ogni ${XP_RULES.dailyStreakEvery} giorni`],
  ['Deep run (final table o vittoria)', `${XP_RULES.deepRun}`],
  ['Voto al Roast', `${XP_RULES.roastVote} · max ${XP_RULES.roastVotesPerWeekMax} a settimana`],
  ['Serata in lobby', `${XP_RULES.gaming}`],
  ['Corso completato', `${XP_RULES.course}`],
  ['Taglia su un fondatore', `${XP_RULES.bounty}`],
]

export default function Rank() {
  const { user } = useAuth()
  const { rank } = useAppShell()
  const [format, setFormat] = useState<Format | 'ALL'>('ALL')
  const [all, setAll] = useState(false)
  const lb = useData(() => api.rank.leaderboard({ format: format === 'ALL' ? undefined : format, limit: 50 }), [format])
  const events = useData(() => api.rank.xpEvents(), [])
  const cd = useCountdown(rank?.seasonEndsAt)

  if (!rank) return <PageSkeleton />
  const pos = tierFromXp(rank.xp)
  const earned = rank.badges.filter((b) => b.earnedAt)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rank"
        kicker={rank.seasonName}
        description="La ladder si azzera ogni mese con soft reset: riparti dal 30% degli XP con cui hai chiuso la stagione."
        actions={
          cd && (
            <div className="rounded-[var(--r-card)] border border-line bg-surface px-4 py-3">
              <div className="text-xs text-muted">La stagione finisce tra</div>
              <div className="font-mono text-2xl font-semibold tabular text-ink" aria-live="off">
                {cd.d}g {String(cd.h).padStart(2, '0')}h {String(cd.m).padStart(2, '0')}m
              </div>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ladder verticale 7 × 3 */}
        <Panel title="La ladder" meta="7 tier × 3 divisioni" className="lg:col-span-7">
          <ol className="space-y-1.5">
            {[...TIER_RANGES].reverse().map((t) => {
              const here = t.tier === rank.tier
              const starts = divisionStarts(t.min, t.max)
              const reached = rank.xp >= t.min
              return (
                <li key={t.tier} className={cn('grid grid-cols-[44px_1fr] items-center gap-3 rounded-[var(--r-card)] px-2 py-2 sm:grid-cols-[52px_160px_1fr]', here && 'bg-surface-2 ring-1 ring-accent/50')} aria-current={here ? 'step' : undefined}>
                  <RankEmblem tier={t.tier} size={here ? 44 : 38} dim={!reached} />
                  <div className="min-w-0">
                    <div className={cn('font-display font-bold', here ? 'text-lg text-ink' : reached ? 'text-ink' : 'text-muted')}>{TIER_LABEL[t.tier]}</div>
                    <div className="font-mono text-xs text-muted">
                      {fmtInt(t.min)}–{t.tier === 'LEGEND' ? '∞' : fmtInt(t.max - 1)} XP
                    </div>
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-1 sm:col-span-1">
                    {([3, 2, 1] as const).map((d, i) => {
                      const s = starts[i]
                      const e = i < 2 ? starts[i + 1] : t.max
                      const isMe = here && rank.division === d
                      const fill = rank.xp >= e ? 1 : rank.xp < s ? 0 : (rank.xp - s) / (e - s)
                      return (
                        <div key={d} className={cn('relative h-9 overflow-hidden rounded-[4px] border', isMe ? 'border-accent' : 'border-line')} title={`${TIER_LABEL[t.tier]} ${DIVISION_LABEL[d]}: da ${fmtInt(s)} XP`}>
                          <div className="absolute inset-y-0 left-0" style={{ width: `${fill * 100}%`, background: tierColor(t.tier), opacity: isMe ? 0.55 : 0.3 }} />
                          <span className={cn('relative flex h-full items-center justify-center font-mono text-xs font-semibold', isMe ? 'text-ink' : 'text-ink/80')}>{DIVISION_LABEL[d]}</span>
                          {isMe && <span className="sr-only">: sei qui</span>}
                        </div>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ol>
        </Panel>

        <div className="space-y-5 lg:col-span-5">
          <Panel title="Dove sei">
            <div className="flex items-center gap-4">
              <RankEmblem tier={rank.tier} division={rank.division} size={64} />
              <div>
                <div className="font-display text-3xl font-black tracking-tight" style={{ fontStretch: '112%' }}>
                  {tierName(rank.tier, rank.division)}
                </div>
                <div className="text-sm text-muted">
                  <span className="font-mono text-ink">{fmtInt(rank.xp)}</span> XP · {rank.position}° su {lb.data?.length && format === 'ALL' ? lb.data.length : '—'}
                </div>
              </div>
            </div>
            <ProgressBar className="mt-5" value={rank.xpIntoDivision} max={rank.xpForNextDivision} label="Avanzamento nella divisione" height="h-2.5" />
            <p className="mt-2 text-sm text-muted">{pos.next ? `${fmtInt(pos.next.atXp - rank.xp)} XP a ${tierName(pos.next.tier, pos.next.division)}` : 'Sei Legend I: resta lassù.'}</p>
          </Panel>

          <Panel title="XP recenti" flush>
            {events.data ? (
              <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto px-4 sm:px-5">
                {events.data.slice(0, 18).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-14 shrink-0 font-mono text-sm font-semibold text-accent">+{e.xp}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">{e.label}</div>
                      <div className="text-xs text-muted">
                        {XP_TYPE_LABEL[e.type]} · {fmtRelative(e.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 text-sm text-muted">Caricamento…</div>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Badge" meta={`${earned.length} di ${rank.badges.length}`}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {rank.badges.map((b) => {
            const r = RARITY_BADGE[b.rarity]
            return (
              <li key={b.id} className={cn('flex gap-3 rounded-[var(--r-card)] border p-3', b.earnedAt ? 'border-line bg-surface-2/50' : 'border-dashed border-line opacity-60')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: b.earnedAt ? r.color : 'var(--c-line)', color: b.earnedAt ? r.color : 'var(--c-muted)' }}>
                  {b.earnedAt ? <BadgeIcon name={b.icon} className="h-5 w-5" /> : <Lock className="h-4 w-4" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight text-ink">{b.name}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted">{b.description}</div>
                  <div className="mt-1 text-[0.7rem] text-muted">
                    {r.label}
                    {b.earnedAt ? ` · ${fmtDate(b.earnedAt)}` : ' · da sbloccare'}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel
          title="Classifica della stagione"
          meta="delta = posizioni rispetto a 7 giorni fa"
          className="lg:col-span-8"
          actions={<Segmented label="Formato della classifica" size="sm" value={format} onChange={setFormat} options={[{ value: 'ALL', label: 'Tutti' }, { value: 'MTT', label: 'MTT' }, { value: 'SPIN', label: 'Spin' }, { value: 'CASH', label: 'Cash' }]} />}
        >
          {lb.error && <ErrorState error={lb.error} onRetry={lb.reload} />}
          <div className={cn('transition-opacity', lb.refreshing && 'opacity-60')}>
            <table className="w-full text-sm">
              <caption className="sr-only">Classifica XP della stagione</caption>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="w-12 py-2 text-left font-medium">#</th>
                  <th scope="col" className="w-14 py-2 text-left font-medium">Δ</th>
                  <th scope="col" className="py-2 text-left font-medium">Giocatore</th>
                  <th scope="col" className="hidden py-2 text-left font-medium sm:table-cell">Rank</th>
                  <th scope="col" className="py-2 text-right font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {(lb.data ?? []).filter((e, i) => all || i < 15 || e.userId === user?.id).map((e) => {
                  const me = e.userId === user?.id
                  return (
                    <tr key={e.userId} className={cn('border-b border-line/60 last:border-0', me && 'bg-accent/10')}>
                      <td className="py-2.5 font-mono font-semibold text-ink">{e.position}</td>
                      <td className="py-2.5">
                        <span className={cn('inline-flex items-center gap-0.5 font-mono text-xs', e.delta > 0 ? 'text-success' : e.delta < 0 ? 'text-danger' : 'text-muted')}>
                          {e.delta > 0 ? <ArrowUp className="h-3 w-3" aria-hidden /> : e.delta < 0 ? <ArrowDown className="h-3 w-3" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
                          {e.delta ? Math.abs(e.delta) : ''}
                          <span className="sr-only">{e.delta > 0 ? `guadagnate ${e.delta} posizioni` : e.delta < 0 ? `perse ${-e.delta} posizioni` : 'stabile'}</span>
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar seed={e.avatarSeed} label={e.nickname} size={28} />
                          <span className={cn('truncate', me ? 'font-semibold text-ink' : 'text-ink')}>
                            {e.nickname}
                            {me && <span className="ml-1.5 text-xs text-accent">tu</span>}
                          </span>
                        </span>
                      </td>
                      <td className="hidden py-2.5 sm:table-cell">
                        <span className="inline-flex items-center gap-2">
                          <RankEmblem tier={e.tier} size={22} />
                          <span className="text-muted">{tierName(e.tier, e.division)}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-ink">{fmtInt(e.xp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(lb.data?.length ?? 0) > 15 && (
              <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
                {all ? 'Mostra solo la top 15' : `Mostra tutta la classifica (${lb.data!.length})`}
              </button>
            )}
          </div>
        </Panel>
        <Panel title="Come si guadagnano gli XP" className="lg:col-span-4">
          <dl className="divide-y divide-line text-sm">
            {XP_TABLE.map(([k, v]) => (
              <div key={k} className="py-2 first:pt-0">
                <dt className="font-medium text-ink">{k}</dt>
                <dd className="font-mono text-xs text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  )
}
