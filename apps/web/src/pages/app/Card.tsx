import { useRef, useState } from 'react'
import { Copy, Download, RotateCw } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { ATTR_META, RARITY_LABEL } from '@/lib/app-card'
import { cardToPng, copyText, downloadBlob } from '@/lib/app-card-export'
import { FORMAT_SHORT, fmtDec, fmtInt, fmtSignedEur } from '@/lib/app-format'
import { fmtDate } from '@/lib/format'
import { coachById } from '@/data/coaches'
import { BRAND } from '@/config/brand'
import { Button } from '@/components/ui/Button'
import { useAppShell } from '@/components/app/AppContext'
import { ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { PlayerCardView } from '@/components/app/PlayerCardView'
import { tierName } from '@/components/app/Rank'
import { toast } from '@/components/app/Overlay'
import { cn } from '@/lib/cn'

const RARITIES = [
  { r: 'BRONZE', range: 'sotto 65' },
  { r: 'SILVER', range: '65–74' },
  { r: 'GOLD', range: '75–86' },
  { r: 'ICON', range: '87 e oltre' },
] as const

export default function Card() {
  const { user } = useAuth()
  const { rank } = useAppShell()
  const card = useData(() => api.card.me(), [])
  const stats = useData(() => api.stats.me('90d', 'ALL'), [])
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  if (card.loading) return <PageSkeleton />
  if (card.error || !card.data) return <ErrorState error={card.error ?? new Error('Player Card non disponibile')} onRetry={card.reload} />
  const c = card.data
  const st = stats.data
  const season = rank?.seasonName.split(' — ')[0] ?? ''
  const shareText = `La mia Player Card ${BRAND.name}: ${c.overall} OVR (${RARITY_LABEL[c.rarity]}) · ${FORMAT_SHORT[c.mainFormat]}\n${ATTR_META.map((a) => `${a.short} ${c.attributes[a.key]}`).join(' · ')}${rank ? `\n${tierName(rank.tier, rank.division)} · ${rank.seasonName}` : ''}`

  const download = async () => {
    if (!svg.current) return
    setBusy(true)
    try {
      const blob = await cardToPng(svg.current, { title: `${c.nickname} · ${c.overall} OVR`, footer: `${BRAND.name} · Player Card · ${season}` })
      downloadBlob(blob, `player-card-${c.nickname.toLowerCase()}.png`)
      toast.success('PNG scaricato', 'Pronto da condividere nelle storie.')
    } catch {
      toast.error('Export non riuscito', 'Riprova da un browser aggiornato.')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    if (await copyText(shareText)) toast.success('Testo copiato', 'Incollalo dove vuoi.')
    else toast.error('Copia non riuscita')
  }

  const back = (
    <div className="flex h-full flex-col px-[11%] pb-[16%] pt-[9%] text-[0.8rem]">
      <div className="font-display text-xl font-black uppercase leading-none tracking-tight">{c.nickname}</div>
      <div className="mt-1 text-xs opacity-75">{rank ? `${tierName(rank.tier, rank.division)} · ${season}` : season}</div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
        <BackStat k="Profitto 90g" v={st ? fmtSignedEur(st.profit) : '…'} />
        <BackStat k={st?.roi !== null && st?.roi !== undefined ? 'ROI' : 'bb/100'} v={st ? (st.roi !== null ? `${fmtDec(st.roi)}%` : fmtDec(st.bb100, 1)) : '…'} />
        <BackStat k="Volume" v={st ? fmtInt(st.games) : '…'} />
        <BackStat k="Studio" v={st ? `${fmtDec(st.hoursStudied, 0)} h` : '…'} />
        <BackStat k="Streak" v={st ? `${st.sessionStreakDays} g` : '…'} />
        <BackStat k="Tilt medio" v={st ? fmtDec(st.tiltIndex) : '…'} />
      </dl>
      <div className="mt-4 space-y-1.5">
        {ATTR_META.map((a) => (
          <div key={a.key} className="flex items-center gap-2">
            <span className="w-8 font-mono text-[0.7rem] font-bold">{a.short}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'color-mix(in oklab, currentColor 18%, transparent)' }}>
              <span className="block h-full rounded-full" style={{ width: `${((c.attributes[a.key] - 40) / 59) * 100}%`, background: 'currentColor' }} />
            </span>
            <span className="w-6 text-right font-mono text-[0.7rem] font-bold">{c.attributes[a.key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto text-center text-[0.65rem] opacity-70">{c.updatedByCoachId ? `Aggiornata da ${coachById(c.updatedByCoachId)?.nickname ?? 'coach'} · ${fmtDate(c.updatedAt)}` : `Aggiornata il ${fmtDate(c.updatedAt)}`}</div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Player Card" description="Overall e sei attributi aggiornati dal tuo coach e dai dati del tracker. Muovi il mouse sulla carta, girala, condividila." />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grain relative flex flex-col items-center overflow-hidden rounded-[var(--r-card)] border border-line bg-surface px-4 py-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--c-accent) 14%, transparent), transparent 65%)' }} />
          <button type="button" onClick={() => setFlipped((f) => !f)} className="relative z-[2] rounded-[var(--r-card)]" aria-label={flipped ? 'Mostra il fronte della carta' : 'Mostra il retro con le statistiche'} aria-pressed={flipped}>
            <PlayerCardView card={c} size="lg" flipped={flipped} back={back} caption={`${BRAND.name} · ${season}`} svgRef={svg} />
          </button>
          <div className="relative z-[2] mt-8 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setFlipped((f) => !f)} icon={<RotateCw className="h-4 w-4" aria-hidden />}>
              {flipped ? 'Fronte' : 'Gira la carta'}
            </Button>
            <Button onClick={download} disabled={busy} icon={<Download className="h-4 w-4" aria-hidden />}>
              {busy ? 'Preparo…' : 'Scarica PNG'}
            </Button>
            <Button variant="ghost" onClick={copy} icon={<Copy className="h-4 w-4" aria-hidden />}>
              Copia testo da condividere
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Attributi" meta={`overall ${c.overall}`}>
            <ul className="space-y-3">
              {ATTR_META.map((a) => (
                <li key={a.key} className="grid grid-cols-[3.2rem_1fr_2.5rem] items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-muted">{a.short}</span>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{a.label}</span>
                      <span className="font-mono text-xs text-muted">peso {Math.round(a.weight * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${((c.attributes[a.key] - 40) / 59) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-right font-mono text-lg font-semibold text-ink">{c.attributes[a.key]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 font-mono text-xs leading-relaxed text-muted">overall = 0,20·PRE + 0,20·POS + 0,15·ICM + 0,10·AGG + 0,15·MEN + 0,20·VOL</p>
          </Panel>
          <Panel title="Rarità">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RARITIES.map(({ r, range }) => (
                <li key={r} className={cn('rounded-[var(--r-card)] border px-3 py-2.5', c.rarity === r ? 'border-accent bg-accent/10' : 'border-line')}>
                  <div className="font-semibold text-ink">{RARITY_LABEL[r]}</div>
                  <div className="font-mono text-xs text-muted">{range}</div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Gli attributi li aggiorna {user?.coachId ? coachById(user.coachId)?.nickname ?? 'il tuo coach' : 'il tuo coach'} dopo le review; il Volume segue il tuo volume degli ultimi 90 giorni. I fondatori sono Icona di diritto.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function BackStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-wide opacity-70">{k}</dt>
      <dd className="font-mono text-sm font-bold">{v}</dd>
    </div>
  )
}
