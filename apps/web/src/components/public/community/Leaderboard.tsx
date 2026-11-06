import { ArrowDown, ArrowUp, RotateCw } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAsync } from '@/hooks/useAsync'
import { Avatar } from '@/components/ui/Avatar'
import { DIVISION_LABEL, FORMAT_LABEL, TIER_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { fmtInt } from '../graph'

/** Classifica pubblica (solo membri che hanno dato il consenso). */
export function Leaderboard() {
  const { data, loading, error, reload } = useAsync(() => api.public.leaderboard(10), [])

  if (loading) {
    return (
      <div role="status" aria-label="Caricamento della classifica" className="border-t border-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line py-4">
            <span className="h-4 w-6 animate-pulse rounded bg-surface-2" />
            <span className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
            <span className="h-4 flex-1 animate-pulse rounded bg-surface-2" style={{ maxWidth: `${60 - i * 6}%` }} />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="pub-slot relative grid min-h-[18rem] place-items-center p-8 text-center" style={{ borderRadius: 'var(--r-card)' }}>
        <span className="pub-crop tl" aria-hidden />
        <span className="pub-crop tr" aria-hidden />
        <span className="pub-crop bl" aria-hidden />
        <span className="pub-crop br" aria-hidden />
        <div className="max-w-md">
          <p className="pub-h3 text-2xl text-ink">La classifica si riempie con la prima stagione.</p>
          <p className="mt-3 text-muted">
            {error ? 'Al momento non riusciamo a caricarla.' : 'Ancora nessun membro in classifica.'} Compaiono solo i membri che hanno scelto di rendere pubblici i propri progressi.
          </p>
          {error && (
            <button type="button" onClick={() => void reload()} className="mt-5 inline-flex min-h-11 items-center gap-2 border border-line px-4 font-semibold text-ink hover:border-accent" style={{ borderRadius: 'var(--r-card)' }}>
              <RotateCw className="h-4 w-4" aria-hidden />
              Riprova
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left">
        <caption className="sr-only">Classifica della stagione, primi {data.length}</caption>
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-3 pr-4 font-medium">
              #
            </th>
            <th scope="col" className="py-3 pr-4 font-medium">
              Giocatore
            </th>
            <th scope="col" className="py-3 pr-4 font-medium">
              Rank
            </th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">
              XP
            </th>
            <th scope="col" className="py-3 text-right font-medium">
              7 giorni
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((e) => (
            <tr key={e.userId} className={cn('border-b border-line', e.position <= 3 && 'bg-surface')}>
              <td className="py-3 pr-4 font-mono font-bold tabular text-ink">{e.position}</td>
              <td className="py-3 pr-4">
                <span className="flex items-center gap-3">
                  <Avatar seed={e.avatarSeed} label={e.nickname} size={36} />
                  <span>
                    <span className="block font-semibold text-ink">{e.nickname}</span>
                    <span className="block text-xs text-muted">{e.formats.map((f) => FORMAT_LABEL[f]).join(', ')}</span>
                  </span>
                </span>
              </td>
              <td className="py-3 pr-4 text-ink">
                {TIER_LABEL[e.tier]} {DIVISION_LABEL[e.division]}
              </td>
              <td className="py-3 pr-4 text-right font-mono tabular text-ink">{fmtInt(e.xp)}</td>
              <td className="py-3 text-right font-mono text-sm tabular">
                {e.delta > 0 ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">su di</span>
                    {e.delta}
                  </span>
                ) : e.delta < 0 ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">giù di</span>
                    {Math.abs(e.delta)}
                  </span>
                ) : (
                  <span className="text-muted">stabile</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
