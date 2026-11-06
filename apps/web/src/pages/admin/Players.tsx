import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Search } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, KycStatus, PlanId, PlayerFilters, PlayerRow } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { FORMAT_SHORT, KYC_LABEL, PLAN_LABEL, ROLE_LABEL, fmtDec, fmtInt, fmtRelative } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { coachById } from '@/data/coaches'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, EmptyState, ErrorState, Money, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Input, Select } from '@/components/app/Controls'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { RankEmblem, tierName } from '@/components/app/Rank'
import { KycChip } from '@/components/admin/AdminBits'

export default function Players() {
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [format, setFormat] = useState<Format | ''>('')
  const [plan, setPlan] = useState<PlanId | ''>('')
  const [kyc, setKyc] = useState<KycStatus | ''>('')
  const [staked, setStaked] = useState<'' | 'yes' | 'no'>('')
  const [sort, setSort] = useState<NonNullable<PlayerFilters['sort']>>('profit30d')
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data, loading, error, refreshing, reload } = useData(
    () => api.admin.players.list({ q: dq || undefined, format: format || undefined, plan: plan || undefined, kycStatus: kyc || undefined, staked: staked ? staked === 'yes' : undefined, sort }),
    [dq, format, plan, kyc, staked, sort],
  )

  const cols: Column<PlayerRow>[] = [
    {
      key: 'nick',
      header: 'Giocatore',
      mobile: 'primary',
      sortValue: (r) => r.nickname.toLowerCase(),
      cell: (r) => (
        <Link to={`/admin/giocatori/${r.userId}`} className="flex min-h-11 items-center gap-3 hover:text-accent">
          <Avatar seed={r.avatarSeed} label={r.nickname} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{r.nickname}</span>
            <span className="block truncate text-xs text-muted">{r.fullName}</span>
          </span>
        </Link>
      ),
    },
    { key: 'fmt', header: 'Formati', cell: (r) => <span className="whitespace-nowrap text-muted">{r.formats.map((f) => FORMAT_SHORT[f]).join(' · ')} <span className="text-xs">{LEVEL_LABEL[r.mainLevel]}</span></span> },
    { key: 'plan', header: 'Piano', cell: (r) => (r.role !== 'STUDENT' ? <Chip tone="accent">{ROLE_LABEL[r.role]}</Chip> : r.plan ? <span className="text-ink">{PLAN_LABEL[r.plan]}</span> : <span className="text-muted">—</span>), sortValue: (r) => (r.plan ? { base: 1, pro: 2, elite: 3 }[r.plan] : 0) },
    { key: 'kyc', header: 'KYC', cell: (r) => <KycChip s={r.kycStatus} />, sortValue: (r) => r.kycStatus },
    {
      key: 'tier',
      header: 'Rank',
      cell: (r) =>
        r.role === 'STUDENT' ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted">
            <RankEmblem tier={r.tier} size={20} />
            {tierName(r.tier)}
          </span>
        ) : (
          <span className="text-muted">staff</span>
        ),
    },
    { key: 'coach', header: 'Coach', mobile: 'hide', className: 'hidden 2xl:table-cell', cell: (r) => <span className="text-muted">{r.coachId ? coachById(r.coachId)?.nickname : '—'}</span> },
    { key: 'p30', header: 'Profitto 30g', align: 'right', cell: (r) => <Money value={r.profit30d} />, sortValue: (r) => r.profit30d },
    { key: 'pall', header: 'Totale', align: 'right', className: 'hidden 2xl:table-cell', cell: (r) => <Money value={r.profitAll} />, sortValue: (r) => r.profitAll },
    {
      key: 'roi',
      header: 'ROI / bb100',
      align: 'right',
      sortValue: (r) => r.roi30d ?? r.bb100_30d ?? -999,
      cell: (r) => (
        <span className={cn('font-mono', (r.roi30d ?? r.bb100_30d ?? 0) < 0 ? 'text-danger' : 'text-ink')}>
          {r.roi30d !== null ? `${fmtDec(r.roi30d)}%` : r.bb100_30d !== null ? `${fmtDec(r.bb100_30d, 1)} bb` : '—'}
        </span>
      ),
    },
    { key: 'vol', header: 'Volume 30g', align: 'right', sortValue: (r) => r.volume30d, cell: (r) => <span className="font-mono">{fmtInt(r.volume30d)}</span> },
    { key: 'last', header: 'Ultima sessione', mobile: 'hide', className: 'hidden xl:table-cell', sortValue: (r) => r.lastSessionAt ?? '', cell: (r) => <span className="whitespace-nowrap text-muted">{r.lastSessionAt ? fmtRelative(r.lastSessionAt) : '—'}</span> },
    { key: 'stk', header: <span className="sr-only">Staking</span>, mobileLabel: 'Staking', cell: (r) => (r.staked ? <span title="In staking" className="text-accent-2"><Coins className="h-4 w-4" aria-hidden /><span className="sr-only">in staking</span></span> : null) },
  ]

  if (loading && !data) return <PageSkeleton />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <PageHeader title="Giocatori" description="Tutti gli iscritti con formato, piano, verifica, risultati e staking. Clicca un nickname per il dettaglio." />
      <Panel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Cerca per nickname, nome o email</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nickname, nome, email" className="pl-9" />
          </label>
          <Select aria-label="Formato" value={format} onChange={(e) => setFormat(e.target.value as Format | '')}>
            <option value="">Tutti i formati</option>
            <option value="MTT">MTT</option>
            <option value="SPIN">Spin</option>
            <option value="CASH">Cash</option>
          </Select>
          <Select aria-label="Piano" value={plan} onChange={(e) => setPlan(e.target.value as PlanId | '')}>
            <option value="">Tutti i piani</option>
            <option value="base">Base</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </Select>
          <Select aria-label="Stato KYC" value={kyc} onChange={(e) => setKyc(e.target.value as KycStatus | '')}>
            <option value="">KYC: tutti</option>
            {(Object.keys(KYC_LABEL) as KycStatus[]).map((k) => (
              <option key={k} value={k}>
                KYC: {KYC_LABEL[k]}
              </option>
            ))}
          </Select>
          <Select aria-label="Staking" value={staked} onChange={(e) => setStaked(e.target.value as '' | 'yes' | 'no')}>
            <option value="">Staking: tutti</option>
            <option value="yes">In staking</option>
            <option value="no">Senza staking</option>
          </Select>
          <Select aria-label="Ordina per" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="profit30d">Profitto 30g</option>
            <option value="profitAll">Profitto totale</option>
            <option value="volume30d">Volume 30g</option>
            <option value="joinedAt">Iscrizione recente</option>
            <option value="nickname">Nickname</option>
          </Select>
        </div>
      </Panel>
      <Panel title="Elenco" meta={`${data?.total ?? 0} risultati${refreshing ? ' · aggiorno…' : ''}`}>
        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
          <DataTable rows={data?.items ?? []} columns={cols} rowKey={(r) => r.userId} caption="Elenco giocatori" empty={<EmptyState title="Nessun giocatore con questi filtri" />} />
        </div>
      </Panel>
    </div>
  )
}
