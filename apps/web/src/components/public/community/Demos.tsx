import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Flame, Radio, X } from 'lucide-react'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { Avatar } from '@/components/ui/Avatar'
import { BOUNTIES, DAILY_SPOT_DEMO, DEEP_RUN_DEMO, ROAST_DEMO } from './community-content'
import { usePublicInView } from '@/hooks/usePublicInView'
import { cn } from '@/lib/cn'
import { FounderCard } from '../FounderCard'
import { InlineCards, PlayingCard, parseCard } from '../PlayingCard'
import { fmtInt } from '../graph'

const panel = 'border border-line bg-surface'
const radius: CSSProperties = { borderRadius: 'var(--r-card)' }

// ── Player Card ──────────────────────────────────────────────────────────────
const ATTRS = [
  { key: 'pre', label: 'PRE', name: 'Preflop', w: 0.2 },
  { key: 'post', label: 'POS', name: 'Postflop', w: 0.2 },
  { key: 'icm', label: 'ICM', name: 'ICM', w: 0.15 },
  { key: 'agg', label: 'AGG', name: 'Aggressività', w: 0.1 },
  { key: 'men', label: 'MEN', name: 'Mental', w: 0.15 },
  { key: 'vol', label: 'VOL', name: 'Volume', w: 0.2 },
] as const
type AttrKey = (typeof ATTRS)[number]['key']

export function rarityOf(overall: number) {
  if (overall >= 87) return { id: 'ICON', label: 'Icona', tone: 'var(--c-accent-3)' }
  if (overall >= 75) return { id: 'GOLD', label: 'Oro', tone: 'var(--c-accent)' }
  if (overall >= 65) return { id: 'SILVER', label: 'Argento', tone: 'var(--c-muted)' }
  return { id: 'BRONZE', label: 'Bronzo', tone: 'var(--c-accent-2)' }
}

export function PlayerCardBuilder() {
  const id = useId()
  const [a, setA] = useState<Record<AttrKey, number>>({ pre: 72, post: 64, icm: 58, agg: 77, men: 61, vol: 70 })
  const overall = Math.round(ATTRS.reduce((s, x) => s + a[x.key] * x.w, 0))
  const r = rarityOf(overall)
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div style={{ ['--c-accent' as string]: r.tone } as CSSProperties}>
        <FounderCard
          coach={{ name: 'Tu', nickname: 'Tu', avatarSeed: 'studente-demo', stats: [] }}
          position="MTT"
          overall={overall}
          rarity={r.label}
          attributes={ATTRS.map((x) => ({ label: x.label, value: a[x.key] }))}
        />
        <p className="mt-6 text-center text-sm text-muted" aria-live="polite">
          Overall <span className="font-mono font-bold text-ink">{overall}</span>, rarità {r.label}
        </p>
      </div>
      <div className={cn(panel, 'p-6')} style={radius}>
        <p className="text-sm text-muted">Muovi gli attributi: overall e rarità si aggiornano con la formula reale della scuola.</p>
        <div className="mt-5 space-y-4">
          {ATTRS.map((x) => (
            <div key={x.key}>
              <label htmlFor={`${id}-${x.key}`} className="flex items-baseline justify-between text-sm">
                <span className="text-ink">
                  {x.name} <span className="text-muted">peso {Math.round(x.w * 100)}%</span>
                </span>
                <span className="font-mono font-bold text-ink tabular">{a[x.key]}</span>
              </label>
              <input
                id={`${id}-${x.key}`}
                type="range"
                min={40}
                max={99}
                value={a[x.key]}
                onChange={(e) => setA((s) => ({ ...s, [x.key]: Number(e.target.value) }))}
                className="mt-1 h-8 w-full cursor-pointer accent-[var(--c-accent)]"
              />
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-line pt-4 text-xs text-muted">Bronzo sotto 65, argento 65–74, oro 75–86, icona da 87. Gli attributi li aggiornano i coach, il volume si calcola dagli ultimi 90 giorni.</p>
      </div>
    </div>
  )
}

// ── Daily Spot ───────────────────────────────────────────────────────────────
export function DailySpotDemo() {
  const s = DAILY_SPOT_DEMO
  const [answer, setAnswer] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const correct = answer === s.correct
  const share = async () => {
    const text = `Daily Spot: ${correct ? 'risposta corretta' : 'sbagliato, ma ho imparato qualcosa'}. ${s.title}.`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard non disponibile */
    }
  }
  return (
    <div className={cn(panel, 'pub-felt grain relative overflow-hidden')} style={radius}>
      <div className="relative z-[2] grid gap-8 p-6 md:grid-cols-[auto_1fr] md:p-10">
        <div className="flex justify-center gap-3 md:block md:space-y-0">
          <div className="flex gap-3">
            {s.heroCards.map((c, i) => {
              const { rank, suit } = parseCard(c)
              return <PlayingCard key={c} rank={rank} suit={suit} className={cn('w-24 text-[0.85rem] md:w-28', i === 0 ? '-rotate-6' : 'rotate-6')} />
            })}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">
            Spot di esempio, {s.format}, spiegazione di {s.coach}
          </p>
          <h3 className="pub-h3 mt-2 text-3xl text-ink">{s.title}</h3>
          <p className="mt-3 max-w-xl leading-relaxed text-ink/85">{s.situation}</p>
          <p className="mt-2 font-mono text-sm text-muted">{s.stacks}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3" role="group" aria-label="Scegli la tua giocata">
            {s.options.map((o) => {
              const picked = answer === o.id
              const isRight = o.id === s.correct
              const pct = s.distribution[o.id]
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!!answer}
                  aria-pressed={picked}
                  onClick={() => setAnswer(o.id)}
                  className={cn(
                    'relative min-h-14 overflow-hidden border px-4 text-left font-semibold transition-colors',
                    !answer && 'border-line bg-bg/60 text-ink hover:border-accent',
                    answer && isRight && 'border-success text-ink',
                    answer && picked && !isRight && 'border-danger text-ink',
                    answer && !picked && !isRight && 'border-line text-muted',
                  )}
                  style={radius}
                >
                  {answer && (
                    <span
                      className={cn('absolute inset-y-0 left-0 transition-[width] duration-1000 ease-out-expo', isRight ? 'bg-success/20' : 'bg-line/60')}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="relative flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {answer && isRight && <Check className="h-4 w-4 text-success" aria-hidden />}
                      {answer && picked && !isRight && <X className="h-4 w-4 text-danger" aria-hidden />}
                      {o.label}
                    </span>
                    {answer && <span className="font-mono text-sm tabular">{pct}%</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <div aria-live="polite">
            {answer && (
              <div className="mt-6 border-t border-line pt-5">
                <p className={cn('font-semibold', correct ? 'text-success' : 'text-danger')}>
                  {correct ? 'Corretto. +15 XP e la streak continua.' : 'Non questa volta. +5 XP per la partecipazione.'}
                </p>
                <p className="mt-2 max-w-2xl leading-relaxed text-ink/85">{s.explanation}</p>
                <p className="mt-3 text-xs text-muted">
                  Percentuali delle risposte della community
                  <PlaceholderTag show={s.placeholder} />
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAnswer(null)} className="min-h-11 border border-line px-4 text-sm font-semibold text-ink hover:border-accent" style={radius}>
                    Rispondi di nuovo
                  </button>
                  <button type="button" onClick={share} className="min-h-11 border border-line px-4 text-sm font-semibold text-ink hover:border-accent" style={radius}>
                    {copied ? 'Copiato' : 'Copia il risultato'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Roast ────────────────────────────────────────────────────────────────────
export function RoastDemo() {
  const [votes, setVotes] = useState<Record<string, 'WORST' | 'BEST' | null>>({})
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {ROAST_DEMO.map((r) => {
        const v = votes[r.id] ?? null
        const worst = r.worst + (v === 'WORST' ? 1 : 0)
        const best = r.best + (v === 'BEST' ? 1 : 0)
        const tot = worst + best
        return (
          <article key={r.id} className={cn(panel, 'flex flex-col p-6')} style={radius}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="pub-h3 text-2xl text-ink">{r.title}</h3>
              <InlineCards cards={r.cards.split(' ')} className="shrink-0 text-lg" />
            </div>
            <p className="mt-3 leading-relaxed text-muted">{r.description}</p>
            <p className="mt-2 font-mono text-xs text-muted">Board: {r.board}</p>
            <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
              <span className="bg-accent-2 transition-[width] duration-700" style={{ width: `${(worst / tot) * 100}%` }} />
              <span className="bg-accent-3 transition-[width] duration-700" style={{ width: `${(best / tot) * 100}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-xs text-muted">
              <span>{worst} voti peggiore</span>
              <span>{best} voti migliore</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(['WORST', 'BEST'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={v === k}
                  onClick={() => setVotes((s) => ({ ...s, [r.id]: s[r.id] === k ? null : k }))}
                  className={cn(
                    'min-h-11 border px-3 text-sm font-semibold transition-colors',
                    v === k ? (k === 'WORST' ? 'border-accent-2 bg-accent-2 text-on-accent' : 'border-accent-3 bg-accent-3 text-on-accent') : 'border-line text-ink hover:border-accent',
                  )}
                  style={radius}
                >
                  {k === 'WORST' ? 'Giocata peggio' : 'Giocata meglio'}
                </button>
              ))}
            </div>
            <p className={cn('mt-5 border-l-2 border-accent pl-4 text-ink/90 transition-opacity duration-500', v ? 'opacity-100' : 'opacity-0')} aria-live="polite">
              {v ? r.comment : ''}
            </p>
          </article>
        )
      })}
    </div>
  )
}

// ── Deep Run Alert ───────────────────────────────────────────────────────────
export function DeepRunDemo() {
  const d = DEEP_RUN_DEMO
  const ref = useRef<HTMLDivElement>(null)
  const inView = usePublicInView(ref, { once: false })
  const [left, setLeft] = useState(d.startLeft)
  const [railed, setRailed] = useState(false)
  useEffect(() => {
    if (!inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setLeft((l) => (l <= 9 ? 9 : Math.max(9, l - Math.ceil(l * 0.12)))), 1400)
    return () => window.clearInterval(t)
  }, [inView])
  const ft = left <= 9
  const pct = 100 - (left / d.totalPlayers) * 100
  return (
    <div ref={ref} className={cn(panel, 'grid overflow-hidden md:grid-cols-[1.1fr_1fr]')} style={radius}>
      <div className="p-6 md:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent-2">
          <Radio className="h-4 w-4 animate-pulse" aria-hidden />
          {ft ? 'Final table' : 'Deep run in corso'}
          <PlaceholderTag show={d.placeholder} />
        </p>
        <h3 className="pub-h3 mt-3 text-3xl text-ink">giuli_ftw è deep</h3>
        <p className="mt-1 text-muted">{d.tournament}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted">Rimasti</dt>
            <dd className="font-mono text-3xl font-bold text-ink tabular" aria-live="off">
              {fmtInt(left)}
              <span className="text-base font-normal text-muted"> / {fmtInt(d.totalPlayers)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Stack</dt>
            <dd className="font-mono text-3xl font-bold text-ink tabular">{d.stackBb} bb</dd>
          </div>
        </dl>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full bg-accent transition-[width] duration-1000 ease-out-expo" style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          aria-pressed={railed}
          onClick={() => setRailed((x) => !x)}
          className={cn('mt-6 inline-flex min-h-12 items-center gap-2 border px-5 font-semibold transition-colors', railed ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink hover:border-accent')}
          style={radius}
        >
          <Flame className="h-4 w-4" aria-hidden />
          {railed ? 'Stai railando' : 'Raila'}
          <span className="font-mono text-sm tabular">{d.railers + (railed ? 1 : 0)}</span>
        </button>
      </div>
      <ul className="border-t border-line bg-bg/50 p-6 md:border-l md:border-t-0 md:p-8" aria-label="Commenti del rail">
        {d.comments.map((c) => (
          <li key={c.who + c.text} className="flex gap-3 py-3">
            <Avatar seed={c.who} label={c.who} size={36} />
            <p className="text-sm">
              <span className="font-semibold text-ink">{c.who}</span>
              <span className="block text-muted">{c.text}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Taglia sui fondatori ─────────────────────────────────────────────────────
export function BountyBoard() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {BOUNTIES.map((b) => (
        <li key={b.founder} className={cn(panel, 'relative overflow-hidden p-6')} style={radius}>
          <p className="text-sm text-muted">Taglia su</p>
          <p className="pub-h3 mt-1 text-3xl text-ink">{b.founder}</p>
          <p className="mt-4 font-display text-xl font-extrabold text-accent">{b.game}</p>
          <p className="mt-2 text-sm text-muted">{b.rule}</p>
          <p className="mt-5 border-t border-line pt-4 text-sm text-ink">
            Premio: una lezione 1:1. Finora {b.record}.
            <PlaceholderTag show={b.placeholder} />
          </p>
        </li>
      ))}
    </ul>
  )
}
