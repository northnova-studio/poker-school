import { useMemo, useState } from 'react'
import { Bomb, CalendarCheck, CloudLightning, Flame, Mountain, Sparkles, TimerReset, Waves } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, Period, Session } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { fmtCompactEur, fmtDay, fmtDec, fmtInt, fmtSignedEur } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { ErrorState, PageHeader, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { Segmented } from '@/components/app/Controls'
import { C, ChartCard, CumulativeChart, Legend, SimpleBars } from '@/components/app/charts'
import { TiltGauge } from '@/components/app/Gauge'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 giorni' },
  { value: '30d', label: '30 giorni' },
  { value: '90d', label: '90 giorni' },
  { value: 'ytd', label: 'Anno' },
  { value: 'all', label: 'Tutto' },
]
const PERIOD_DAYS: Record<Period, number | null> = { '7d': 7, '30d': 30, '90d': 90, ytd: null, all: null }

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

/** Istogramma dei risultati per sessione: bin "puliti" tra il 5° e il 95° percentile, code accorpate. */
function histogram(sessions: Session[]) {
  if (sessions.length < 3) return []
  const v = sessions.map((s) => s.profit).sort((a, b) => a - b)
  const q = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))]
  const lo = q(0.05)
  const hi = q(0.95)
  const step = niceStep((hi - lo) / 8 || 10)
  const start = Math.floor(lo / step) * step
  const n = Math.max(1, Math.ceil((hi - start) / step))
  const bins = Array.from({ length: n }, (_, i) => ({ from: start + i * step, value: 0 }))
  for (const p of v) bins[Math.max(0, Math.min(n - 1, Math.floor((p - start) / step)))].value++
  return bins.map((b, i) => ({
    label: i === 0 && v[0] < start ? `≤ ${fmtCompactEur(b.from + step)}` : i === n - 1 && v[v.length - 1] >= b.from + step ? `≥ ${fmtCompactEur(b.from)}` : fmtCompactEur(b.from + step / 2),
    value: b.value,
    sign: b.from + step / 2,
  }))
}

export default function Stats() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [format, setFormat] = useState<Format | 'ALL'>('ALL')
  const { data: st, error, loading, refreshing, reload } = useData(() => api.stats.me(period, format), [period, format])
  const sessions = useData(() => api.sessions.list(), [])

  const inPeriod = useMemo(() => {
    const all = sessions.data ?? []
    const days = PERIOD_DAYS[period]
    const from = days ? Date.now() - days * 86_400_000 : period === 'ytd' ? new Date(new Date().getFullYear(), 0, 1).getTime() : 0
    return all.filter((s) => Date.parse(s.date) >= from && (format === 'ALL' || s.format === format))
  }, [sessions.data, period, format])
  const hist = useMemo(() => histogram(inPeriod), [inPeriod])

  const formats: { value: Format | 'ALL'; label: string }[] = [{ value: 'ALL', label: 'Tutti' }, ...(user?.formats ?? []).map((f) => ({ value: f, label: f === 'SPIN' ? 'Spin' : f === 'CASH' ? 'Cash' : 'MTT' }))]
  const chipEv = useMemo(() => {
    const sp = inPeriod.filter((s) => s.format === 'SPIN' && typeof s.chipEvBb100 === 'number')
    return sp.length ? sp.reduce((a, s) => a + (s.chipEvBb100 ?? 0), 0) / sp.length : null
  }, [inPeriod])

  if (loading && !st) return <PageSkeleton />
  if (error && !st) return <ErrorState error={error} onRetry={reload} />
  if (!st) return null

  const isCash = format === 'CASH'
  const profitPts = st.profitSeries.map((p) => ({ label: fmtDay(p.date), value: p.value }))
  const volPts = st.volumeSeries.map((p) => ({ label: fmtDay(p.date), value: p.value }))
  const unit = isCash ? 'mani' : format === 'SPIN' ? 'spin' : format === 'MTT' ? 'tornei' : 'giochi'

  return (
    <div>
      <PageHeader title="Statistiche" description="I numeri del tracker: risultati, volume e le statistiche che il coach guarda prima della review." />
      <div className="sticky top-16 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIODS} size="sm" />
        <Segmented label="Formato" value={format} onChange={setFormat} options={formats} size="sm" />
        {refreshing && <span className="text-xs text-muted" role="status">Aggiorno…</span>}
      </div>

      <div className={cn('space-y-5 transition-opacity', refreshing && 'opacity-60')}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Profitto netto" value={fmtSignedEur(st.profit)} tone={st.profit > 0 ? 'success' : st.profit < 0 ? 'danger' : 'ink'} sub={`${st.sessionsCount} sessioni`} />
          {isCash || st.roi === null ? (
            <StatTile label="bb/100" value={fmtDec(st.bb100, 2)} tone={(st.bb100 ?? 0) >= 0 ? 'ink' : 'danger'} sub={`${fmtInt(st.hands)} mani`} />
          ) : (
            <StatTile label="ROI" value={`${fmtDec(st.roi)}%`} tone={st.roi >= 0 ? 'ink' : 'danger'} sub={st.abi ? `ABI ${fmtDec(st.abi, 2)} €` : undefined} />
          )}
          {format === 'SPIN' ? (
            <StatTile label="chip EV" value={chipEv === null ? '—' : `${chipEv >= 0 ? '+' : '−'}${fmtDec(Math.abs(chipEv))}`} sub="bb/100 medio" />
          ) : (
            <StatTile label="ITM" value={st.itmPct === null ? '—' : `${fmtDec(st.itmPct)}%`} sub={st.itmPct === null ? 'solo MTT' : 'tornei a premi'} />
          )}
          <StatTile label="Volume" value={fmtInt(isCash ? st.hands : st.games)} sub={`${unit} · ${fmtDec(st.hoursPlayed, 0)} h al tavolo`} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Profitto cumulato"
            meta={profitPts.length > 92 ? 'per settimana' : 'per giorno'}
            summary={`Profitto cumulato nel periodo: ${fmtSignedEur(st.profit)}`}
            table={{ columns: ['Data', 'Cumulato'], rows: profitPts.map((p) => [p.label, fmtSignedEur(p.value)]) }}
          >
            <CumulativeChart data={profitPts} color={st.profit >= 0 ? C.accent : C.accent2} />
          </ChartCard>
          <Panel title="Tilt-o-metro" meta="media delle sessioni">
            <TiltGauge value={st.tiltIndex} />
            <p className="mt-3 text-center text-xs text-muted">Lo segni tu a fine sessione, da 1 (zen) a 5 (tastiera in volo).</p>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Volume" meta={unit} summary={`Volume nel periodo: ${fmtInt(isCash ? st.hands : st.games)} ${unit}`} table={{ columns: ['Data', 'Volume'], rows: volPts.filter((p) => p.value).map((p) => [p.label, fmtInt(p.value)]) }}>
            <SimpleBars data={volPts} name="Volume" color={C.accent3} />
          </ChartCard>
          <ChartCard
            title="Distribuzione dei risultati"
            meta="sessioni per fascia di profitto"
            summary="Numero di sessioni per fascia di risultato"
            table={{ columns: ['Fascia (centro)', 'Sessioni'], rows: hist.map((h) => [h.label, h.value]) }}
          >
            {hist.length ? (
              <>
                <Legend items={[{ name: 'Sessioni in perdita', color: C.danger }, { name: 'Sessioni in attivo', color: C.success }]} />
                <SimpleBars data={hist.map((h) => ({ label: h.label, value: h.value }))} name="Sessioni" colorOf={(i) => (hist[i].sign < 0 ? C.danger : C.success)} />
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted">Servono almeno 3 sessioni nel periodo.</p>
            )}
          </ChartCard>
        </div>

        <section aria-labelledby="fun">
          <h2 id="fun" className="mb-3 font-sans text-[0.95rem] font-semibold">
            Le statistiche che nessun tracker ti dà
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <FunTile icon={<CloudLightning />} label="Bad beat" value={st.badBeats} note="contati da te" />
            <FunTile icon={<Waves />} label="River subiti" value={st.riverSuckouts} note="nel periodo" />
            <FunTile icon={<Bomb />} label="Bolle scoppiate" value={st.bubbles} note="a un posto dai premi" />
            <FunTile icon={<Flame />} label="Streak sessioni" value={st.sessionStreakDays} note="giorni di fila" />
            <FunTile icon={<CalendarCheck />} label="Presenze" value={`${st.attendancePct}%`} note="lezioni di gruppo" />
            <FunTile icon={<Mountain />} label="Deep run" value={st.deepRuns} note="nel periodo" />
          </div>
        </section>

        <Panel title="Fun facts" meta="generati dai tuoi dati">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {st.funFacts.map((f, i) => (
              <li key={i} className="flex gap-3 rounded-[var(--r-card)] bg-surface-2/50 px-4 py-3 leading-snug">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <TimerReset className="h-3.5 w-3.5" aria-hidden /> I dati arrivano dalle sessioni che registri: più sei preciso, più la review è utile.
          </p>
        </Panel>
      </div>
    </div>
  )
}

function FunTile({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="rounded-[var(--r-card)] border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="text-accent-2 [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{note}</div>
    </div>
  )
}
