// Tabella dati accessibile: intestazioni ordinabili (aria-sort), caption, numeri tabulari,
// e su mobile una lista di "schede" (niente scroll orizzontale obbligato).
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => number | string | null
  align?: 'left' | 'right' | 'center'
  className?: string
  /** su mobile: 'primary' = titolo della scheda, 'hide' = nascosta, default = riga etichetta/valore */
  mobile?: 'primary' | 'hide' | 'default'
  /** etichetta testuale per la vista mobile quando header non è testo */
  mobileLabel?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  initialSort,
  empty,
  mobileCard,
  className,
  dense,
  maxHeight,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  caption: string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  empty?: ReactNode
  mobileCard?: (row: T) => ReactNode
  className?: string
  dense?: boolean
  maxHeight?: string
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    return rows.slice().sort((a, b) => {
      const va = sv(a)
      const vb = sv(b)
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'it')
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, sort, columns])

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))

  if (!rows.length && empty) return <>{empty}</>

  const primary = columns.find((c) => c.mobile === 'primary') ?? columns[0]
  const others = columns.filter((c) => c !== primary && c.mobile !== 'hide')

  return (
    <div className={className}>
      {/* desktop / tablet */}
      <div className={cn('relative hidden overflow-auto md:block', maxHeight)}>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.key === c.key
                const aria = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : c.sortValue ? 'none' : undefined
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={aria}
                    className={cn('whitespace-nowrap px-3 py-2 text-xs font-medium text-muted first:pl-0 last:pr-0', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}
                  >
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggle(c.key)} className={cn('inline-flex min-h-9 items-center gap-1 hover:text-ink', active && 'text-ink', c.align === 'right' && 'flex-row-reverse')}>
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={rowKey(r)} className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2/50">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 first:pl-0 last:pr-0', dense ? 'py-2' : 'py-3', c.align === 'right' ? 'whitespace-nowrap text-right tabular' : c.align === 'center' ? 'whitespace-nowrap text-center' : 'text-left', c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* mobile */}
      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {sorted.map((r) => (
          <li key={rowKey(r)} className="rounded-[var(--r-card)] border border-line bg-surface-2/40 p-3">
            {mobileCard ? (
              mobileCard(r)
            ) : (
              <>
                <div className="font-medium text-ink">{primary.cell(r)}</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {others.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-xs text-muted">{c.mobileLabel ?? c.header}</dt>
                      <dd className="truncate">{c.cell(r)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
