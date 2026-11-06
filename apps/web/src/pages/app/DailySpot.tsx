import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Copy, Flame, X } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { DailySpotResult } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { coachById } from '@/data/coaches'
import { copyText } from '@/lib/app-card-export'
import { FORMAT_SHORT } from '@/lib/app-format'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { PokerTable } from '@/components/app/Poker'
import { toast, toastError } from '@/components/app/Overlay'
import { useAppShell } from '@/components/app/AppContext'

export default function DailySpot() {
  const { user } = useAuth()
  const { celebrate } = useAppShell()
  const reduce = useReducedMotion()
  const spot = useData(() => api.dailySpot.today(), [])
  const streaks = useData(() => api.dailySpot.streaks(), [])
  const xp = useData(() => api.rank.xpEvents(), [])
  const [result, setResult] = useState<DailySpotResult | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ultimi 7 giorni dai propri eventi XP del Daily Spot (verde giusto, rosso sbagliato, grigio saltato)
  const week = useMemo(() => {
    const ev = (xp.data ?? []).filter((e) => e.type === 'DAILY_SPOT_CORRECT')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toDateString()
      const e = ev.find((x) => new Date(x.createdAt).toDateString() === key)
      return { d, state: e ? (e.label.includes('tentativo') ? 'miss' : 'hit') : 'none' } as const
    })
  }, [xp.data])

  if (spot.loading) return <PageSkeleton />
  if (spot.error || !spot.data) return <ErrorState error={spot.error ?? new Error('Spot non disponibile')} onRetry={spot.reload} />
  const s = spot.data
  const answered = result ? picked : s.answeredOptionId ?? null
  const correctId = result?.correctOptionId ?? s.correctOptionId ?? null
  const dist = result?.answerDistribution ?? s.answerDistribution ?? null
  const explanation = result?.explanation ?? s.explanation ?? null
  const isCorrect = answered && correctId ? answered === correctId : null
  const coach = coachById(s.coachId)
  const myStreak = result?.streak ?? streaks.data?.find((x) => x.userId === user?.id)?.streak ?? 0

  const answer = async (id: string) => {
    if (answered || busy) return
    setPicked(id)
    setBusy(true)
    try {
      const r = await api.dailySpot.answer(s.id, id)
      setResult(r)
      void xp.reload()
      void streaks.reload()
      void celebrate(r.correct ? 'Daily Spot centrato' : 'Daily Spot: XP di partecipazione')
    } catch (e) {
      setPicked(null)
      toastError(e, 'Risposta non inviata')
    } finally {
      setBusy(false)
    }
  }

  const grid = week.map((w, i) => (i === 6 && isCorrect !== null ? (isCorrect ? '🟩' : '🟥') : w.state === 'hit' ? '🟩' : w.state === 'miss' ? '🟥' : '⬜')).join('')
  const share = `${BRAND.name} Daily Spot ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })} · ${FORMAT_SHORT[s.format]}\n${grid}\n${isCorrect ? '✅ preso' : '❌ sbagliato'} · streak ${myStreak} 🔥`

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Spot"
        kicker={new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        description="Uno spot al giorno, una sola risposta. Poi vedi cosa ha scelto la community e la spiegazione del coach."
        actions={
          <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface px-4 py-2.5">
            <Flame className="h-6 w-6 text-accent-2" aria-hidden />
            <div>
              <div className="font-mono text-2xl font-semibold leading-none">{myStreak}</div>
              <div className="text-xs text-muted">giorni di fila</div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Chip tone="accent">{FORMAT_SHORT[s.format]}</Chip>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">{s.title}</h2>
            </div>
            <PokerTable heroCards={s.heroCards} board={s.board} stacks={s.stacksBb} />
            <p className="mx-auto mt-5 max-w-[62ch] text-center leading-relaxed text-ink">{s.situation}</p>

            <fieldset className="mx-auto mt-6 max-w-xl" disabled={!!answered || busy}>
              <legend className="sr-only">Scegli la tua risposta</legend>
              <ul className="space-y-2">
                {s.options.map((o) => {
                  const pct = dist?.[o.id] ?? 0
                  const mine = answered === o.id
                  const right = correctId === o.id
                  const reveal = !!answered && !!dist
                  return (
                    <li key={o.id}>
                      <motion.button
                        type="button"
                        onClick={() => answer(o.id)}
                        whileTap={reduce || answered ? undefined : { scale: 0.98 }}
                        animate={reveal && mine && !right && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
                        transition={{ duration: 0.4 }}
                        aria-pressed={mine}
                        className={cn(
                          'relative flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-[var(--r-card)] border px-4 text-left font-semibold transition-colors',
                          !answered && 'border-line bg-surface-2/60 text-ink hover:border-accent',
                          reveal && right && 'border-success text-ink',
                          reveal && mine && !right && 'border-danger text-ink',
                          reveal && !mine && !right && 'border-line text-muted',
                          busy && mine && 'border-accent',
                        )}
                      >
                        {reveal && (
                          <motion.span
                            aria-hidden
                            className={cn('absolute inset-y-0 left-0', right ? 'bg-success/20' : mine ? 'bg-danger/15' : 'bg-surface-2')}
                            initial={{ width: reduce ? `${pct}%` : 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        )}
                        <span className="relative flex-1">{o.label}</span>
                        {reveal && (
                          <span className="relative flex items-center gap-2">
                            {right && <Check className="h-5 w-5 text-success" aria-label="risposta corretta" />}
                            {mine && !right && <X className="h-5 w-5 text-danger" aria-label="la tua risposta" />}
                            <span className="font-mono text-sm">{pct}%</span>
                          </span>
                        )}
                      </motion.button>
                    </li>
                  )
                })}
              </ul>
              {dist && <p className="mt-2 text-center text-xs text-muted">Percentuali delle risposte della community</p>}
            </fieldset>

            <AnimatePresence>
              {isCorrect !== null && (
                <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-6 max-w-xl" role="status">
                  <div className={cn('rounded-[var(--r-card)] border px-4 py-3 text-center font-display text-xl font-bold', isCorrect ? 'border-success/50 text-success' : 'border-danger/50 text-danger')}>
                    {isCorrect ? 'Preso. Spot da reg.' : 'Sbagliato, ma si impara da qui.'}
                    {result && <span className="ml-2 font-mono text-base text-accent">+{result.xpGained} XP</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {explanation && (
            <Panel title="La spiegazione del coach">
              <div className="flex gap-4">
                <Avatar seed={coach?.avatarSeed ?? s.coachId} label={coach?.nickname} size={44} />
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{coach?.name ?? 'Coach'}</div>
                  <p className="mt-2 max-w-[68ch] leading-relaxed text-ink">{explanation}</p>
                </div>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-5 lg:col-span-4">
          <Panel title="La tua settimana">
            <ol className="grid grid-cols-7 gap-1.5" aria-label="Risultati degli ultimi 7 giorni">
              {week.map((w, i) => {
                const st = i === 6 && isCorrect !== null ? (isCorrect ? 'hit' : 'miss') : w.state
                return (
                  <li key={i} className="text-center">
                    <div className={cn('aspect-square rounded-[4px] border', st === 'hit' ? 'border-success bg-success/80' : st === 'miss' ? 'border-danger bg-danger/70' : 'border-line bg-surface-2')} aria-label={`${w.d.toLocaleDateString('it-IT', { weekday: 'long' })}: ${st === 'hit' ? 'giusto' : st === 'miss' ? 'sbagliato' : 'non giocato'}`} />
                    <div className="mt-1 text-[0.65rem] capitalize text-muted">{w.d.toLocaleDateString('it-IT', { weekday: 'narrow' })}</div>
                  </li>
                )
              })}
            </ol>
            {answered && (
              <div className="mt-4">
                <pre className="whitespace-pre-wrap rounded-[var(--r-card)] bg-surface-2 p-3 font-mono text-sm text-ink">{share}</pre>
                <Button variant="secondary" className="mt-3 w-full" onClick={async () => ((await copyText(share)) ? toast.success('Copiato', 'Incollalo nel gruppo Discord.') : toast.error('Copia non riuscita'))} icon={<Copy className="h-4 w-4" aria-hidden />}>
                  Copia il risultato
                </Button>
              </div>
            )}
            {!answered && <p className="mt-4 text-sm text-muted">Rispondi allo spot di oggi per allungare la streak: ogni 7 giorni di fila valgono 50 XP bonus.</p>}
          </Panel>

          <Panel title="Classifica streak" flush>
            <ol className="divide-y divide-line px-4 pb-2 sm:px-5">
              {(streaks.data ?? []).slice(0, 10).map((e, i) => (
                <li key={e.userId} className={cn('flex items-center gap-3 py-2.5', e.userId === user?.id && 'font-semibold')}>
                  <span className="w-5 font-mono text-sm text-muted">{i + 1}</span>
                  <Avatar seed={e.avatarSeed} label={e.nickname} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.nickname}</span>
                  <span className="font-mono text-xs text-muted">{e.correctPct}%</span>
                  <span className="inline-flex w-12 items-center justify-end gap-1 font-mono text-sm text-ink">
                    <Flame className="h-3.5 w-3.5 text-accent-2" aria-hidden />
                    {e.streak}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  )
}
