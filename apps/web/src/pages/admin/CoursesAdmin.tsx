import { api } from '@/lib/api/client'
import type { CourseSalesRow } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { COURSES } from '@/data/courses'
import { coachById } from '@/data/coaches'
import { FORMAT_SHORT, PLAN_LABEL, fmtCompactEur, fmtEur } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { ErrorState, PageHeader, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { ChartCard, SimpleBars } from '@/components/app/charts'
import { CourseCover } from '@/components/app/CourseCover'

export default function CoursesAdmin() {
  const { data, loading, error, reload } = useData(() => api.admin.courses.sales(), [])
  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const revenue = data.reduce((a, r) => a + r.revenue, 0)
  const units = data.reduce((a, r) => a + r.units, 0)
  const last30 = data.reduce((a, r) => a + r.last30dUnits, 0)
  const best = data[0]

  const cols: Column<CourseSalesRow>[] = [
    {
      key: 't',
      header: 'Corso',
      mobile: 'primary',
      sortValue: (r) => r.title,
      cell: (r) => {
        const c = COURSES.find((x) => x.id === r.courseId)
        return (
          <span className="flex items-center gap-3">
            <CourseCover seed={c?.coverSeed ?? r.courseId} className="h-10 w-16 shrink-0 rounded-[var(--r-card)]" />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{r.title}</span>
              <span className="block text-xs text-muted">
                {c ? `${FORMAT_SHORT[c.format]} · ${LEVEL_LABEL[c.level]} · ${coachById(c.coachId)?.nickname}` : ''}
              </span>
            </span>
          </span>
        )
      },
    },
    { key: 'p', header: 'Prezzo', align: 'right', cell: (r) => <span className="font-mono">{fmtEur(COURSES.find((c) => c.id === r.courseId)?.priceEur ?? 0)}</span> },
    { key: 'inc', header: 'Incluso in', cell: (r) => <span className="text-muted">{(COURSES.find((c) => c.id === r.courseId)?.includedInPlans ?? []).map((p) => PLAN_LABEL[p]).join(', ') || '—'}</span> },
    { key: 'u', header: 'Unità', align: 'right', sortValue: (r) => r.units, cell: (r) => <span className="font-mono">{r.units}</span> },
    { key: 'u30', header: 'Ultimi 30g', align: 'right', sortValue: (r) => r.last30dUnits, cell: (r) => <span className="font-mono">{r.last30dUnits}</span> },
    { key: 'r', header: 'Ricavi', align: 'right', sortValue: (r) => r.revenue, cell: (r) => <span className="font-mono font-semibold text-ink">{fmtEur(r.revenue)}</span> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Corsi e vendite" description="Vendite dei video corsi. I corsi inclusi nei piani non contano come vendite: li trovi nell’MRR." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Ricavi corsi" value={fmtEur(revenue)} tone="accent" sub="da sempre" />
        <StatTile label="Unità vendute" value={String(units)} sub={`${last30} negli ultimi 30 giorni`} />
        <StatTile label="Prezzo medio" value={units ? fmtEur(revenue / units) : '—'} />
        <StatTile label="Più venduto" value={best ? best.title : '—'} size="sm" sub={best ? `${best.units} unità · ${fmtEur(best.revenue)}` : undefined} />
      </div>
      <ChartCard title="Ricavi per corso" summary="Ricavi totali per corso" table={{ columns: ['Corso', 'Ricavi', 'Unità'], rows: data.map((r) => [r.title, fmtEur(r.revenue), r.units]) }}>
        <SimpleBars data={data.map((r) => ({ label: r.title.length > 14 ? `${r.title.slice(0, 13)}…` : r.title, value: r.revenue }))} name="Ricavi" fmt={fmtCompactEur} height={260} />
      </ChartCard>
      <Panel title="Dettaglio">
        <DataTable rows={data} columns={cols} rowKey={(r) => r.courseId} caption="Vendite per corso" initialSort={{ key: 'r', dir: 'desc' }} />
      </Panel>
    </div>
  )
}
