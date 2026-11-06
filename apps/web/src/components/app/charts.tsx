// Grafici Recharts con i token del tema (stroke/fill "var(--c-*)"): leggibili in tutti e 5 i temi,
// incluso quello chiaro. Linee 2px, barre sottili con estremità arrotondate, griglia a filo,
// tooltip su hover e vista tabella (ChartCard) come alternativa accessibile.
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { BarChart3, Table2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtCompactEur } from '@/lib/app-format'
import { Panel } from './Panel'

export const C = {
  accent: 'var(--c-accent)',
  accent2: 'var(--c-accent-2)',
  accent3: 'var(--c-accent-3)',
  success: 'var(--c-success)',
  danger: 'var(--c-danger)',
  muted: 'var(--c-muted)',
  line: 'var(--c-line)',
  ink: 'var(--c-ink)',
  surface: 'var(--c-surface)',
}

const tick = { fill: 'var(--c-muted)', fontSize: 11.5, fontFamily: 'var(--f-mono)' }
const axisX = { tick, axisLine: false, tickLine: false, tickMargin: 8, minTickGap: 18 } as const
const axisY = { tick, axisLine: false, tickLine: false, width: 66 } as const

interface TipProps {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: unknown; name?: unknown; value?: unknown; color?: string }>
  label?: unknown
  fmtValue?: (v: number, name: string) => string
  fmtLabel?: (l: string) => string
}
const tip = (p: TooltipContentProps<number, string>, fmtValue: (v: number) => string) => (
  <ChartTip active={p.active} payload={p.payload as TipProps['payload']} label={p.label} fmtValue={fmtValue} />
)

export function ChartTip({ active, payload, label, fmtValue, fmtLabel }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[var(--r-card)] border border-line bg-surface px-3 py-2 text-sm">
      <div className="mb-1 text-xs text-muted">{fmtLabel ? fmtLabel(String(label)) : String(label)}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: (p.color as string) ?? C.accent }} aria-hidden />
          <span className="text-muted">{String(p.name)}</span>
          <span className="ml-auto pl-3 font-mono font-semibold text-ink tabular">{fmtValue ? fmtValue(Number(p.value), String(p.name)) : String(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/** Pannello con grafico + interruttore "Tabella" (alternativa accessibile ai dati). */
export function ChartCard({
  title,
  meta,
  actions,
  children,
  table,
  className,
  summary,
}: {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  table?: { columns: string[]; rows: (string | number)[][] }
  className?: string
  summary: string
}) {
  const [asTable, setAsTable] = useState(false)
  const id = useId()
  return (
    <Panel
      title={title}
      meta={meta}
      className={className}
      actions={
        <>
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              aria-controls={id}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--r-card)] px-2 text-xs font-medium text-muted hover:text-ink"
            >
              {asTable ? <BarChart3 className="h-4 w-4" aria-hidden /> : <Table2 className="h-4 w-4" aria-hidden />}
              {asTable ? 'Grafico' : 'Tabella'}
            </button>
          )}
        </>
      }
    >
      <div id={id}>
        {asTable && table ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{summary}</caption>
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={cn('py-2 text-xs font-medium text-muted', i ? 'text-right' : 'text-left')}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    {r.map((v, j) => (
                      <td key={j} className={cn('py-1.5', j ? 'text-right font-mono tabular' : 'text-left')}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div role="img" aria-label={summary}>
            {children}
          </div>
        )}
      </div>
    </Panel>
  )
}

export interface Pt {
  label: string
  value: number
}

/** Profitto cumulato: area con velo al 10%, linea 2px, linea dello zero. */
export function CumulativeChart({ data, height = 260, color = C.accent, name = 'Profitto', fmt = fmtCompactEur }: { data: Pt[]; height?: number; color?: string; name?: string; fmt?: (v: number) => string }) {
  return (
    <AreaChart responsive data={data} style={{ width: '100%', height }} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={C.line} vertical={false} />
      <XAxis dataKey="label" {...axisX} />
      <YAxis {...axisY} tickFormatter={(v: number) => fmt(v)} />
      <ReferenceLine y={0} stroke={C.muted} strokeOpacity={0.5} />
      <Tooltip cursor={{ stroke: C.muted, strokeWidth: 1 }} content={(p) => tip(p as unknown as TooltipContentProps<number, string>, fmt)} />
      <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} dot={false} activeDot={{ r: 4.5, stroke: C.surface, strokeWidth: 2, fill: color }} isAnimationActive={false} />
    </AreaChart>
  )
}

/** Barre singola serie (volume, ricavi…). Colore fisso per serie, opzionale polarità. */
export function SimpleBars({
  data,
  height = 220,
  color = C.accent,
  name = 'Valore',
  fmt = (v: number) => v.toLocaleString('it-IT'),
  polarity,
  highlightLast,
  colorOf,
}: {
  data: Pt[]
  height?: number
  color?: string
  name?: string
  fmt?: (v: number) => string
  polarity?: boolean
  highlightLast?: boolean
  colorOf?: (i: number) => string
}) {
  return (
    <BarChart responsive data={data} style={{ width: '100%', height }} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
      <CartesianGrid stroke={C.line} vertical={false} />
      <XAxis dataKey="label" {...axisX} />
      <YAxis {...axisY} tickFormatter={(v: number) => fmt(v)} />
      {polarity && <ReferenceLine y={0} stroke={C.muted} strokeOpacity={0.5} />}
      <Tooltip cursor={{ fill: 'var(--c-surface-2)', opacity: 0.6 }} content={(p) => tip(p as unknown as TooltipContentProps<number, string>, fmt)} />
      <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
        {data.map((d, i) => (
          <Cell
            key={i}
            fill={colorOf ? colorOf(i) : polarity ? (d.value < 0 ? C.danger : C.success) : color}
            fillOpacity={highlightLast && i < data.length - 1 ? 0.55 : 1}
          />
        ))}
      </Bar>
    </BarChart>
  )
}

/** Entrate vs uscite (due serie, legenda sempre presente). */
export function PairBars({
  data,
  height = 260,
  a,
  b,
  fmt = fmtCompactEur,
}: {
  data: { label: string; a: number; b: number }[]
  height?: number
  a: { name: string; color: string }
  b: { name: string; color: string }
  fmt?: (v: number) => string
}) {
  return (
    <div>
      <Legend items={[a, b]} />
      <BarChart responsive data={data} style={{ width: '100%', height }} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="label" {...axisX} />
        <YAxis {...axisY} tickFormatter={(v: number) => fmt(v)} />
        <Tooltip cursor={{ fill: 'var(--c-surface-2)', opacity: 0.6 }} content={(p) => tip(p as unknown as TooltipContentProps<number, string>, fmt)} />
        <Bar dataKey="a" name={a.name} fill={a.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        <Bar dataKey="b" name={b.name} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </div>
  )
}

/** Linee (1–3 serie) su un solo asse. */
export function Lines({
  data,
  series,
  height = 240,
  fmt = (v: number) => v.toLocaleString('it-IT'),
  zero,
  step,
}: {
  data: Record<string, number | string>[]
  series: { key: string; name: string; color: string }[]
  height?: number
  fmt?: (v: number) => string
  zero?: boolean
  step?: boolean
}) {
  return (
    <div>
      {series.length > 1 && <Legend items={series} />}
      <LineChart responsive data={data} style={{ width: '100%', height }} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="label" {...axisX} />
        <YAxis {...axisY} tickFormatter={(v: number) => fmt(v)} />
        {zero && <ReferenceLine y={0} stroke={C.muted} strokeOpacity={0.5} />}
        <Tooltip cursor={{ stroke: C.muted, strokeWidth: 1 }} content={(p) => tip(p as unknown as TooltipContentProps<number, string>, fmt)} />
        {series.map((s) => (
          <Line key={s.key} type={step ? 'stepAfter' : 'monotone'} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4.5, stroke: C.surface, strokeWidth: 2, fill: s.color }} isAnimationActive={false} />
        ))}
      </LineChart>
    </div>
  )
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
      {items.map((i) => (
        <li key={i.name} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: i.color }} aria-hidden />
          {i.name}
        </li>
      ))}
    </ul>
  )
}

/** Sparkline leggera in SVG puro (niente Recharts) per tile e righe. */
export function Sparkline({ values, className, color = C.accent, height = 32 }: { values: number[]; className?: string; color?: string; height?: number }) {
  if (values.length < 2) return null
  const w = 120
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 2 - ((v - min) / span) * (height - 4)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const zeroY = height - 2 - ((0 - min) / span) * (height - 4)
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} aria-hidden>
      <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke={C.line} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  )
}

/** Barra segmentata (parte di un tutto): es. membri per piano. */
export function SegmentBar({ parts, label }: { parts: { name: string; value: number; color: string }[]; label: string }) {
  const tot = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div>
      <div role="img" aria-label={`${label}: ${parts.map((p) => `${p.name} ${p.value}`).join(', ')}`} className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.name} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / tot) * 100}%`, background: p.color }} title={`${p.name}: ${p.value}`} />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.name} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.name} <span className="font-mono text-ink tabular">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
