import { useState } from 'react'
import { Crosshair, ExternalLink, Gamepad2, LogIn, LogOut, Trophy, Users } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { GamingEvent } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { fmtTime, fmtWeekday } from '@/lib/app-format'
import { BRAND } from '@/config/brand'
import { COACHES } from '@/data/coaches'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { toast, toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

const KIND = { NIGHT: 'Serata', BOUNTY_1V1: 'Taglia 1v1', TOURNAMENT: 'Torneo' } as const

export default function Lobby() {
  const { user } = useAuth()
  const { celebrate, refreshRank } = useAppShell()
  const ev = useData(() => api.gaming.events(), [])
  const lb = useData(() => api.gaming.leaderboard(), [])
  const [busy, setBusy] = useState<string | null>(null)

  if (ev.loading) return <PageSkeleton />
  if (ev.error || !ev.data) return <ErrorState error={ev.error ?? new Error('Errore')} onRetry={ev.reload} />
  const now = Date.now()
  const upcoming = ev.data.filter((e) => Date.parse(e.startsAt) > now - 2 * 3600_000)
  const bounties = upcoming.filter((e) => e.kind === 'BOUNTY_1V1')
  const nights = upcoming.filter((e) => e.kind !== 'BOUNTY_1V1')
  const past = ev.data.filter((e) => Date.parse(e.startsAt) <= now - 2 * 3600_000).reverse()

  const toggle = async (e: GamingEvent) => {
    setBusy(e.id)
    try {
      const u = e.joinedByMe ? await api.gaming.leave(e.id) : await api.gaming.join(e.id)
      ev.setData(ev.data!.map((x) => (x.id === e.id ? u : x)))
      if (u.joinedByMe) {
        toast.success('Sei in lobby', `${fmtWeekday(e.startsAt)} alle ${fmtTime(e.startsAt)}`)
        void celebrate('Serata in lobby')
      } else {
        toast.info('Hai lasciato l’evento')
        void refreshRank()
      }
    } catch (err) {
      toastError(err, 'Operazione non riuscita')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lobby"
        description="Dopo la sessione si gioca. Warzone, EA FC, Rocket League: serate, tornei interni e taglie sui fondatori."
        actions={
          <a href={BRAND.discordUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-card)] border border-line px-4 text-sm font-semibold text-ink hover:border-accent">
            Apri Discord <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        }
      />

      <section aria-labelledby="bounty" className="grain relative overflow-hidden rounded-[var(--r-card)] border border-accent-2/40 bg-surface p-5 sm:p-7">
        <div className="relative z-[2]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <h2 id="bounty" className="flex items-center gap-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-black leading-none tracking-tight" style={{ fontStretch: '115%' }}>
                <Crosshair className="h-7 w-7 text-accent-2" aria-hidden /> Taglia sui fondatori
              </h2>
              <p className="mt-2 max-w-[60ch] text-sm text-muted">Batti un fondatore in un 1v1 e vinci una lezione 1:1 gratis. Solo gloria e studio: nessun premio in denaro.</p>
            </div>
            <div className="flex -space-x-2">
              {COACHES.slice(0, 3).map((c) => (
                <Avatar key={c.id} seed={c.avatarSeed} label={c.nickname} size={44} className="ring-2 ring-surface" />
              ))}
            </div>
          </div>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {bounties.map((e) => (
              <li key={e.id} className="flex flex-col rounded-[var(--r-card)] border border-line bg-bg/40 p-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Gamepad2 className="h-4 w-4" aria-hidden /> {e.game}
                </div>
                <div className="mt-1 font-display text-lg font-bold leading-tight">{e.title}</div>
                <div className="mt-1 text-sm text-muted">
                  {fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-mono text-ink">{e.participants.length}</span>
                  <span className="text-muted">/{e.maxParticipants} sfidanti</span>
                </div>
                {e.prize && <Chip tone="accent2" className="mt-3 self-start">{e.prize}</Chip>}
                <JoinButton e={e} busy={busy === e.id} onClick={() => toggle(e)} me={user?.id} className="mt-4" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel title="Prossime serate" className="lg:col-span-8">
          <ul className="divide-y divide-line">
            {nights.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-16 shrink-0 text-center">
                  <div className="font-mono text-xl font-semibold leading-none">{new Date(e.startsAt).getDate()}</div>
                  <div className="text-[0.7rem] uppercase text-muted">{new Date(e.startsAt).toLocaleDateString('it-IT', { month: 'short' })}</div>
                  <div className="mt-1 font-mono text-xs text-muted">{fmtTime(e.startsAt)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="accent">{KIND[e.kind]}</Chip>
                    <span className="text-sm text-muted">{e.game}</span>
                  </div>
                  <div className="mt-1 font-semibold text-ink">{e.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{e.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    <span className="flex -space-x-1.5">
                      {e.participants.slice(0, 6).map((p) => (
                        <Avatar key={p.userId} seed={p.nickname.toLowerCase()} label={p.nickname} size={22} className="ring-2 ring-surface" />
                      ))}
                    </span>
                    {e.participants.length}
                    {e.maxParticipants ? `/${e.maxParticipants}` : ''} · host {e.hostNickname}
                  </div>
                </div>
                <JoinButton e={e} busy={busy === e.id} onClick={() => toggle(e)} me={user?.id} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Classifica gaming" meta="punti stagione" className="lg:col-span-4" flush>
          <ol className="divide-y divide-line px-4 pb-2 sm:px-5">
            {(lb.data ?? []).slice(0, 12).map((e) => (
              <li key={e.userId} className={cn('flex items-center gap-3 py-2.5', e.userId === user?.id && 'font-semibold')}>
                <span className="w-5 font-mono text-sm text-muted">{e.position}</span>
                <Avatar seed={e.avatarSeed} label={e.nickname} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {e.nickname}
                  {e.bountiesClaimed > 0 && <Crosshair className="ml-1.5 inline h-3.5 w-3.5 text-accent-2" aria-label={`${e.bountiesClaimed} taglie riscosse`} />}
                </span>
                <span className="font-mono text-xs text-muted">{e.wins}V</span>
                <span className="w-10 text-right font-mono text-sm text-ink">{e.points}</span>
              </li>
            ))}
          </ol>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">10 punti a serata, 30 a vittoria, 50 per una taglia riscossa.</p>
        </Panel>
      </div>

      {past.length > 0 && (
        <Panel title="Risultati recenti">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.slice(0, 6).map((e) => (
              <li key={e.id} className="rounded-[var(--r-card)] border border-line p-3 text-sm">
                <div className="text-xs text-muted">
                  {fmtWeekday(e.startsAt)} · {e.game}
                </div>
                <div className="mt-0.5 font-medium text-ink">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-muted">
                  <Trophy className="h-3.5 w-3.5 text-accent" aria-hidden /> {e.participants.length} in lobby
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

function JoinButton({ e, busy, onClick, me, className }: { e: GamingEvent; busy: boolean; onClick: () => void; me?: string; className?: string }) {
  const full = !!e.maxParticipants && e.participants.length >= e.maxParticipants
  if (e.hostUserId === me) return <Chip className={className}>sei l’host</Chip>
  return (
    <Button
      size="sm"
      variant={e.joinedByMe ? 'secondary' : 'primary'}
      className={cn('min-h-11', className)}
      disabled={busy || (!e.joinedByMe && full)}
      onClick={onClick}
      icon={e.joinedByMe ? <LogOut className="h-4 w-4" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
    >
      {busy ? '…' : e.joinedByMe ? 'Esci' : full ? 'Piena' : 'Partecipa'}
    </Button>
  )
}
