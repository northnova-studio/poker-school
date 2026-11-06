// Componenti del gestionale: chip KYC, editor della Player Card con anteprima live,
// tabella del ledger staking, anteprima del settlement.
import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import type { KycStatus, LedgerEntry, PlayerCard } from '@/lib/api/types'
import { ATTR_META, cardOverall, cardRarity, clampAttr, RARITY_LABEL } from '@/lib/app-card'
import { KYC_LABEL, LEDGER_LABEL } from '@/lib/app-format'
import { settlementPreview } from '@/lib/app-staking'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, Money } from '@/components/app/Panel'
import { PlayerCardView } from '@/components/app/PlayerCardView'

const KYC_TONE: Record<KycStatus, 'success' | 'warning' | 'danger' | 'muted'> = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', NONE: 'muted' }
export function KycChip({ s }: { s: KycStatus }) {
  return <Chip tone={KYC_TONE[s]}>{KYC_LABEL[s]}</Chip>
}

export function CardEditor({ card, staff, onSave }: { card: PlayerCard; staff: boolean; onSave: (a: PlayerCard['attributes']) => Promise<void> }) {
  const [a, setA] = useState(card.attributes)
  const [busy, setBusy] = useState(false)
  const preview = useMemo(() => {
    const overall = cardOverall(a)
    return { ...card, attributes: a, overall, rarity: staff ? card.rarity : cardRarity(overall) }
  }, [a, card, staff])
  const dirty = ATTR_META.some((m) => a[m.key] !== card.attributes[m.key])
  return (
    <div className="grid items-start gap-6 md:grid-cols-[auto_1fr]">
      <div className="mx-auto">
        <PlayerCardView card={preview} size="md" />
        <p className="mt-3 text-center text-sm text-muted">
          Overall <span className="font-mono font-semibold text-ink">{preview.overall}</span> · {RARITY_LABEL[preview.rarity]}
        </p>
      </div>
      <div className="space-y-4">
        {ATTR_META.map((m) => (
          <div key={m.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <label htmlFor={`attr-${m.key}`} className="font-medium text-ink">
                {m.label} <span className="font-mono text-xs text-muted">{m.short} · peso {Math.round(m.weight * 100)}%</span>
              </label>
              <input
                type="number"
                min={40}
                max={99}
                value={a[m.key]}
                onChange={(e) => setA({ ...a, [m.key]: clampAttr(Number(e.target.value)) })}
                className="min-h-9 w-16 rounded-[var(--r-card)] border border-line bg-surface-2 px-2 text-right font-mono text-sm"
                aria-label={`${m.label}, valore`}
              />
            </div>
            <input id={`attr-${m.key}`} type="range" min={40} max={99} value={a[m.key]} onChange={(e) => setA({ ...a, [m.key]: Number(e.target.value) })} className="h-11 w-full cursor-pointer accent-[var(--c-accent)]" />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {dirty && (
            <Button variant="ghost" onClick={() => setA(card.attributes)}>
              Annulla modifiche
            </Button>
          )}
          <Button
            disabled={!dirty || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onSave(a)
              } finally {
                setBusy(false)
              }
            }}
            icon={<Save className="h-4 w-4" aria-hidden />}
          >
            {busy ? 'Salvo…' : 'Salva la carta'}
          </Button>
        </div>
        <p className="text-xs text-muted">Ultimo aggiornamento {fmtDate(card.updatedAt)}. Il volume si può allineare a quello degli ultimi 90 giorni.</p>
      </div>
    </div>
  )
}

export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  const rows = entries.slice().reverse()
  return (
    <div className="max-h-[26rem] overflow-auto">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">Movimenti del ledger, dal più recente</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-xs text-muted">
            <th scope="col" className="w-24 py-2 text-left font-medium">Data</th>
            <th scope="col" className="py-2 text-left font-medium">Movimento</th>
            <th scope="col" className="w-32 py-2 text-right font-medium">Importo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-line/60 last:border-0">
              <td className="whitespace-nowrap py-2 pr-3 text-muted">{fmtDate(e.date)}</td>
              <td className="max-w-0 py-2 pr-3">
                <Chip tone={e.type === 'SETTLEMENT' ? 'accent' : e.type === 'TRANSFER_TO_PLAYER' ? 'accent2' : 'muted'}>{LEDGER_LABEL[e.type]}</Chip>
                {e.note && (
                  <div className="mt-0.5 truncate text-xs text-muted" title={e.note}>
                    {e.note}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap py-2 text-right">
                <Money value={e.amount} decimals />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SettlementBox({ entries, school, player, onSettle, busy }: { entries: LedgerEntry[]; school: number; player: number; onSettle: () => void; busy: boolean }) {
  const pv = settlementPreview(entries, school, player)
  return (
    <div className={cn('rounded-[var(--r-card)] border p-4', pv.canSettle ? 'border-accent/50' : 'border-line')}>
      <div className="text-sm font-semibold text-ink">Anteprima settlement</div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Netto dal settlement</dt>
          <dd>
            <Money value={pv.net} decimals />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Scuola {school}%</dt>
          <dd className="font-mono text-ink">{pv.canSettle ? `${pv.school.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €` : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Giocatore {player}%</dt>
          <dd className="font-mono text-ink">{pv.canSettle ? `${pv.player.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €` : '—'}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        {pv.canSettle
          ? 'Il settlement divide il netto secondo le quote, registra la quota della scuola tra le entrate e azzera il conteggio.'
          : pv.makeup > 0
            ? `Il giocatore è in makeup di ${pv.makeup.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €: niente da dividere finché non lo recupera.`
            : 'Niente da dividere dall’ultimo settlement.'}
      </p>
      <Button className="mt-3 w-full" disabled={!pv.canSettle || busy} onClick={onSettle}>
        {busy ? 'Registro…' : 'Esegui settlement'}
      </Button>
    </div>
  )
}
