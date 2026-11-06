import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Info, OctagonAlert, ScanFace } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useData } from '@/hooks/useData'
import { fmtCompactEur, fmtInt, FORMAT_SHORT, fmtEur, fmtSignedEur } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { ErrorState, Money, PageHeader, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { C, ChartCard, CumulativeChart, Lines, SegmentBar, SimpleBars } from '@/components/app/charts'

const month = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { month: 'short' })

export default function Overview() {
  const { data: o, loading, error, reload } = useData(() => api.admin.overview(), [])
  if (loading) return <PageSkeleton />
  if (error || !o) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const rev = o.revenueSeries.map((p) => ({ label: month(p.date), value: p.value }))
  const stake = o.stakingSeries.map((p) => ({ label: new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), value: p.value }))
  const members = o.membersSeries.map((p) => ({ label: month(p.date), membri: p.value }))
  const lastRev = rev[rev.length - 1]?.value ?? 0
  const prevRev = rev[rev.length - 2]?.value ?? 0

  return (
    <div className="space-y-5">
      <PageHeader title="Panoramica" kicker={new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} description="Membri, ricavi, staking e cose da fare. I numeri si aggiornano a ogni movimento registrato." />

      {o.alerts.length > 0 && (
        <Panel title="Da guardare oggi" meta={`${o.alerts.length} segnalazioni`}>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {o.alerts.map((a, i) => {
              const I = a.level === 'danger' ? OctagonAlert : a.level === 'warning' ? AlertTriangle : Info
              return (
                <li key={i} className={cn('flex gap-3 rounded-[var(--r-card)] border px-3 py-2.5 text-sm', a.level === 'danger' ? 'border-danger/40' : a.level === 'warning' ? 'border-warning/40' : 'border-line')}>
                  <I className={cn('mt-0.5 h-4 w-4 shrink-0', a.level === 'danger' ? 'text-danger' : a.level === 'warning' ? 'text-warning' : 'text-accent-3')} aria-hidden />
                  <span className="text-ink">
                    <span className="sr-only">{a.level === 'danger' ? 'Urgente: ' : a.level === 'warning' ? 'Attenzione: ' : 'Info: '}</span>
                    {a.text}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 rounded-[var(--r-card)] border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Membri attivi</div>
              <div className="mt-2 font-mono text-3xl font-semibold">{o.activeMembers}</div>
            </div>
            <div className="text-right text-sm text-muted">
              <span className="font-mono text-success">+{o.newMembers30d}</span> nuovi in 30 giorni
              <br />
              churn <span className="font-mono text-ink">{String(o.churn30dPct).replace('.', ',')}%</span>
            </div>
          </div>
          <div className="mt-4">
            <SegmentBar
              label="Membri per piano"
              parts={[
                { name: 'Base', value: o.membersByPlan.base, color: C.accent3 },
                { name: 'Pro', value: o.membersByPlan.pro, color: C.accent },
                { name: 'Elite', value: o.membersByPlan.elite, color: C.accent2 },
              ]}
            />
          </div>
        </div>
        <StatTile label="MRR" value={fmtEur(o.mrr)} sub="abbonamenti attivi, annuali ÷ 12" />
        <StatTile label="Ricavi 30 giorni" value={fmtEur(o.revenue30d)} sub={`${o.coursesSold30d} corsi venduti · senza staking`} />
        <StatTile label="Capitale staking fuori" value={fmtCompactEur(o.stakingCapitalOut)} sub="accordi attivi e in pausa" />
        <StatTile label="P&L staking 30 giorni" value={fmtSignedEur(o.stakingNet30d)} tone={o.stakingNet30d >= 0 ? 'success' : 'danger'} sub={<>totale <Money value={o.stakingNetAll} /></>} />
        <Link to="/admin/kyc" className="group col-span-2 flex items-center gap-4 rounded-[var(--r-card)] border border-line bg-surface p-4 hover:border-accent lg:col-span-2">
          <ScanFace className="h-8 w-8 text-accent" aria-hidden />
          <div className="flex-1">
            <div className="text-sm text-muted">Verifiche d’identità in coda</div>
            <div className="font-mono text-3xl font-semibold">{o.kycPending}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Ricavi mensili"
          meta={`questo mese ${fmtEur(lastRev)} · prec. ${fmtEur(prevRev)}`}
          summary={`Ricavi mensili degli ultimi 12 mesi, mese corrente ${fmtEur(lastRev)}`}
          table={{ columns: ['Mese', 'Ricavi'], rows: rev.map((r) => [r.label, fmtEur(r.value)]) }}
        >
          <SimpleBars data={rev} name="Ricavi" fmt={fmtCompactEur} highlightLast />
          <p className="mt-2 text-xs text-muted">Abbonamenti, corsi, lezioni e 1:1. La quota staking è nel grafico accanto. Il mese in corso è parziale.</p>
        </ChartCard>
        <ChartCard
          title="P&L staking cumulato"
          meta="risultati delle sessioni giocate con capitale della scuola"
          summary={`P&L staking cumulato: totale ${fmtSignedEur(o.stakingNetAll)}`}
          table={{ columns: ['Settimana', 'Cumulato'], rows: stake.map((r) => [r.label, fmtSignedEur(r.value)]) }}
        >
          <CumulativeChart data={stake} name="P&L cumulato" color={C.accent} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard className="lg:col-span-4" title="Membri attivi" summary={`Membri attivi a fine mese, oggi ${o.activeMembers}`} table={{ columns: ['Mese', 'Membri'], rows: members.map((m) => [m.label, m.membri]) }}>
          <Lines data={members} series={[{ key: 'membri', name: 'Membri', color: C.accent3 }]} height={220} />
        </ChartCard>
        <PlayersList title="Top 30 giorni" rows={o.topPlayers30d} className="lg:col-span-4" />
        <PlayersList title="Flop 30 giorni" rows={o.worstPlayers30d} className="lg:col-span-4" empty="Nessuno in rosso negli ultimi 30 giorni." />
      </div>
    </div>
  )
}

function PlayersList({ title, rows, className, empty }: { title: string; rows: { userId: string; nickname: string; profit: number; format: 'MTT' | 'SPIN' | 'CASH' }[]; className?: string; empty?: string }) {
  return (
    <Panel title={title} className={className} actions={<Link to="/admin/giocatori" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent hover:underline">Tutti</Link>}>
      {rows.length ? (
        <ol className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.userId}>
              <Link to={`/admin/giocatori/${r.userId}`} className="flex min-h-12 items-center gap-3 py-2 hover:text-accent">
                <span className="w-4 font-mono text-sm text-muted">{i + 1}</span>
                <Avatar seed={r.nickname.toLowerCase()} label={r.nickname} size={28} />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.nickname}</span>
                <span className="text-xs text-muted">{FORMAT_SHORT[r.format]}</span>
                <Money value={r.profit} className="w-24 text-right" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-6 text-center text-sm text-muted">{empty ?? 'Nessun dato.'}</p>
      )}
      <p className="mt-2 text-xs text-muted">{fmtInt(rows.length)} giocatori · profitto netto 30 giorni</p>
    </Panel>
  )
}
