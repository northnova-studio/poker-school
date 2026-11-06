import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Coins, MessageSquarePlus, Save } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Level, PlanId, Role, Session } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { COACHES, coachById } from '@/data/coaches'
import { COURSES } from '@/data/courses'
import { DOC_LABEL, FORMAT_SHORT, fmtCompactEur, PLAN_LABEL, ROLE_LABEL, fmtDec, fmtDuration, fmtInt, fmtRelative, fmtEur } from '@/lib/app-format'
import { LEVEL_LABEL, fmtDate, fmtDateTime } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, EmptyState, ErrorState, Money, PageSkeleton, Panel, StatTile } from '@/components/app/Panel'
import { Field, Select, Tabs, Textarea } from '@/components/app/Controls'
import { DataTable } from '@/components/app/DataTable'
import type { Column } from '@/components/app/DataTable'
import { ChartCard, CumulativeChart, SimpleBars } from '@/components/app/charts'
import { toast, toastError } from '@/components/app/Overlay'
import { RankEmblem, tierName } from '@/components/app/Rank'
import { CardEditor, KycChip, LedgerTable } from '@/components/admin/AdminBits'

type Tab = 'overview' | 'sessions' | 'staking' | 'kyc' | 'courses' | 'notes' | 'card'

export default function PlayerDetail() {
  const { id = '' } = useParams()
  const { data: d, loading, error, reload, setData } = useData(() => api.admin.players.get(id), [id])
  const [tab, setTab] = useState<Tab>('overview')
  const [edit, setEdit] = useState<{ plan: PlanId | ''; coachId: string; role: Role; mainLevel: Level } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const ledgers = useData(async () => (d && tab === 'staking' ? Promise.all(d.stakingDeals.map((x) => api.admin.staking.ledger(x.id))) : []), [d?.user.id, tab])

  if (loading) return <PageSkeleton />
  if (error || !d) return <ErrorState error={error ?? new Error('Giocatore non trovato')} onRetry={reload} />
  const u = d.user
  const st = d.stats
  const form = edit ?? { plan: u.plan ?? '', coachId: u.coachId ?? '', role: u.role, mainLevel: u.mainLevel }
  const dirty = !!edit && (form.plan !== (u.plan ?? '') || form.coachId !== (u.coachId ?? '') || form.role !== u.role || form.mainLevel !== u.mainLevel)

  const saveUser = async () => {
    setBusy(true)
    try {
      const user = await api.admin.players.update(u.id, { plan: form.plan || null, coachId: form.coachId || null, role: form.role, mainLevel: form.mainLevel })
      setData({ ...d, user, row: { ...d.row, plan: user.plan, coachId: user.coachId, role: user.role, mainLevel: user.mainLevel } })
      setEdit(null)
      toast.success('Giocatore aggiornato')
    } catch (e) {
      toastError(e, 'Modifica non salvata')
    } finally {
      setBusy(false)
    }
  }
  const addNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    try {
      const n = await api.admin.players.addNote(u.id, note)
      setData({ ...d, coachNotes: [n, ...d.coachNotes] })
      setNote('')
      toast.success('Nota aggiunta')
    } catch (err) {
      toastError(err, 'Nota non salvata')
    }
  }

  const sessCols: Column<Session>[] = [
    { key: 'date', header: 'Data', mobile: 'primary', sortValue: (s) => s.date, cell: (s) => <span className="whitespace-nowrap">{fmtDateTime(s.date)}</span> },
    { key: 'fmt', header: 'Formato', cell: (s) => FORMAT_SHORT[s.format] },
    { key: 'vol', header: 'Volume', align: 'right', sortValue: (s) => s.games, cell: (s) => <span className="font-mono">{s.format === 'CASH' ? `${fmtInt(s.hands ?? 0)} mani` : s.games}</span> },
    { key: 'abi', header: 'ABI / bb', align: 'right', sortValue: (s) => s.avgBuyIn, cell: (s) => <span className="font-mono">{fmtDec(s.avgBuyIn, s.format === 'CASH' ? 2 : 0)} €</span> },
    { key: 'dur', header: 'Durata', align: 'right', cell: (s) => <span className="font-mono">{fmtDuration(s.durationMin)}</span> },
    { key: 'p', header: 'Risultato', align: 'right', sortValue: (s) => s.profit, cell: (s) => <Money value={s.profit} /> },
    { key: 't', header: 'Tilt', align: 'center', sortValue: (s) => s.tilt, cell: (s) => <span className="font-mono">{s.tilt}</span> },
    { key: 'st', header: 'Staking', align: 'center', cell: (s) => (s.staked ? <Coins className="mx-auto h-4 w-4 text-accent-2" aria-label="in staking" /> : '') },
  ]

  const monthly = (() => {
    const m = new Map<string, number>()
    for (const s of d.sessions) m.set(s.date.slice(0, 7), (m.get(s.date.slice(0, 7)) ?? 0) + s.profit)
    return [...m.entries()]
      .sort()
      .slice(-12)
      .map(([k, v]) => ({ label: new Date(`${k}-01`).toLocaleDateString('it-IT', { month: 'short' }), value: Math.round(v) }))
  })()

  return (
    <div className="space-y-5">
      <Link to="/admin/giocatori" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Giocatori
      </Link>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar seed={u.avatarSeed} label={u.nickname} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none tracking-tight" style={{ fontStretch: '112%' }}>
            {u.nickname}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {u.firstName} {u.lastName} · {u.email} · iscritto {fmtRelative(u.createdAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="accent">{ROLE_LABEL[u.role]}</Chip>
            {u.plan && <Chip>{PLAN_LABEL[u.plan]}</Chip>}
            <KycChip s={u.kycStatus} />
            {u.formats.map((f) => (
              <Chip key={f}>{FORMAT_SHORT[f]}</Chip>
            ))}
            <Chip>{LEVEL_LABEL[u.mainLevel]} stakes</Chip>
            {d.row.staked && <Chip tone="accent2" icon={<Coins />}>staking</Chip>}
          </div>
        </div>
        {u.role === 'STUDENT' && (
          <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface px-4 py-3">
            <RankEmblem tier={d.rank.tier} division={d.rank.division} size={44} />
            <div>
              <div className="font-semibold text-ink">{tierName(d.rank.tier, d.rank.division)}</div>
              <div className="font-mono text-xs text-muted">
                {fmtInt(d.rank.xp)} XP · {d.rank.position}°
              </div>
            </div>
          </div>
        )}
      </div>

      <Panel title="Gestione" meta="piano, coach, ruolo e livello">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <Field label="Piano">
            {(a) => (
              <Select {...a} value={form.plan} onChange={(e) => setEdit({ ...form, plan: e.target.value as PlanId | '' })}>
                <option value="">Nessuno</option>
                {(['base', 'pro', 'elite'] as PlanId[]).map((p) => (
                  <option key={p} value={p}>
                    {PLAN_LABEL[p]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Coach">
            {(a) => (
              <Select {...a} value={form.coachId} onChange={(e) => setEdit({ ...form, coachId: e.target.value })}>
                <option value="">Nessuno</option>
                {COACHES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Ruolo">
            {(a) => (
              <Select {...a} value={form.role} onChange={(e) => setEdit({ ...form, role: e.target.value as Role })}>
                {(['STUDENT', 'COACH', 'ADMIN'] as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Livello">
            {(a) => (
              <Select {...a} value={form.mainLevel} onChange={(e) => setEdit({ ...form, mainLevel: e.target.value as Level })}>
                {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button onClick={saveUser} disabled={!dirty || busy} icon={<Save className="h-4 w-4" aria-hidden />}>
            Salva
          </Button>
        </div>
      </Panel>

      <Tabs
        label="Sezioni del giocatore"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Panoramica' },
          { value: 'sessions', label: 'Sessioni', count: d.sessions.length },
          { value: 'staking', label: 'Staking', count: d.stakingDeals.length },
          { value: 'kyc', label: 'KYC' },
          { value: 'courses', label: 'Corsi', count: d.purchases.length },
          { value: 'notes', label: 'Note coach', count: d.coachNotes.length },
          { value: 'card', label: 'Player Card' },
        ]}
      />

      <div role="tabpanel" aria-label="Contenuto della sezione">
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Profitto 90 giorni" value={<Money value={st.profit} />} sub={`totale ${d.row.profitAll >= 0 ? '+' : ''}${fmtEur(d.row.profitAll)}`} />
              <StatTile label={st.roi !== null ? 'ROI 90 giorni' : 'bb/100 90 giorni'} value={st.roi !== null ? `${fmtDec(st.roi)}%` : fmtDec(st.bb100, 2)} sub={st.abi ? `ABI ${fmtDec(st.abi, 2)} €` : `${fmtInt(st.hands)} mani`} />
              <StatTile label="Volume 90 giorni" value={fmtInt(st.games)} sub={`${st.sessionsCount} sessioni · ${fmtDec(st.hoursPlayed, 0)} h`} />
              <StatTile label="Tilt medio" value={fmtDec(st.tiltIndex)} tone={st.tiltIndex >= 3 ? 'warning' : 'ink'} sub={`${st.badBeats} bad beat · ${fmtDec(st.hoursStudied, 0)} h studio`} />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ChartCard title="Profitto cumulato" meta="90 giorni" summary={`Profitto cumulato 90 giorni: ${st.profit} euro`} table={{ columns: ['Data', 'Cumulato'], rows: st.profitSeries.map((p) => [fmtDate(p.date), Math.round(p.value)]) }}>
                <CumulativeChart data={st.profitSeries.map((p) => ({ label: new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), value: p.value }))} />
              </ChartCard>
              <ChartCard title="Risultato per mese" meta="ultimi 12 mesi" summary="Risultato netto per mese" table={{ columns: ['Mese', 'Risultato'], rows: monthly.map((m) => [m.label, m.value]) }}>
                <SimpleBars data={monthly} polarity name="Risultato" fmt={fmtCompactEur} />
              </ChartCard>
            </div>
          </div>
        )}

        {tab === 'sessions' && (
          <Panel>
            <DataTable rows={d.sessions.slice(0, 200)} columns={sessCols} rowKey={(s) => s.id} caption={`Sessioni di ${u.nickname}`} dense empty={<EmptyState title="Nessuna sessione registrata" />} maxHeight="max-h-[38rem]" />
          </Panel>
        )}

        {tab === 'staking' &&
          (d.stakingDeals.length ? (
            <div className="space-y-5">
              {d.stakingDeals.map((deal, i) => (
                <Panel key={deal.id} title={`Accordo ${FORMAT_SHORT[deal.format]}`} meta={`${deal.status === 'ACTIVE' ? 'attivo' : deal.status === 'PAUSED' ? 'in pausa' : 'chiuso'} dal ${fmtDate(deal.startDate)} · split ${deal.schoolSharePct}/${deal.playerSharePct}`} actions={<Link to={`/admin/staking?deal=${deal.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">Apri nello staking</Link>}>
                  <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Mini k="Capitale" v={fmtEur(deal.capitalAllocated)} />
                    <Mini k="Rientrato" v={fmtEur(deal.capitalReturned)} />
                    <Mini k="Netto" v={<Money value={deal.netResult} />} />
                    <Mini k="Makeup" v={<span className={deal.makeup > 0 ? 'text-danger' : ''}>{fmtEur(deal.makeup)}</span>} />
                    <Mini k="Quota scuola" v={fmtEur(deal.schoolProfit)} />
                  </dl>
                  {ledgers.data?.[i] ? <LedgerTable entries={ledgers.data[i]} /> : <p className="text-sm text-muted">Carico il ledger…</p>}
                </Panel>
              ))}
            </div>
          ) : (
            <EmptyState title="Nessun accordo di staking" action={<Link to="/admin/staking" className="text-sm font-semibold text-accent hover:underline">Crea un accordo</Link>} />
          ))}

        {tab === 'kyc' && (
          <Panel>
            {d.kyc ? (
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <Mini k="Stato" v={<KycChip s={d.kyc.status} />} />
                <Mini k="Documento" v={`${DOC_LABEL[d.kyc.documentType]} ··${d.kyc.documentNumberLast4}`} />
                <Mini k="Inviato" v={fmtDateTime(d.kyc.submittedAt)} />
                <Mini k="Esito" v={d.kyc.reviewedAt ? fmtDateTime(d.kyc.reviewedAt) : 'in attesa'} />
                <Mini k="Revisore" v={d.kyc.reviewerId ? coachById(d.kyc.reviewerId)?.name ?? d.kyc.reviewerId : '—'} />
                <Mini k="File" v={d.kyc.status === 'PENDING' ? `${d.kyc.files.length} in coda` : 'eliminati dopo l’esito'} />
                {d.kyc.rejectionReason && <Mini k="Motivo del rifiuto" v={d.kyc.rejectionReason} />}
              </dl>
            ) : (
              <EmptyState title="Nessuna verifica inviata" />
            )}
            {d.kyc?.status === 'PENDING' && (
              <Link to="/admin/kyc" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
                Vai alla coda KYC
              </Link>
            )}
          </Panel>
        )}

        {tab === 'courses' && (
          <Panel>
            {d.purchases.length ? (
              <ul className="divide-y divide-line">
                {d.purchases.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 font-medium text-ink">{COURSES.find((c) => c.id === p.courseId)?.title ?? p.courseId}</span>
                    <span className="text-sm text-muted">{fmtDate(p.createdAt)}</span>
                    <Chip>{p.provider}</Chip>
                    <span className="w-20 text-right font-mono">{fmtEur(p.amountEur)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nessun corso acquistato" text={u.plan ? `I corsi inclusi nel piano ${PLAN_LABEL[u.plan]} non compaiono come acquisti.` : undefined} />
            )}
          </Panel>
        )}

        {tab === 'notes' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
            <Panel title="Nuova nota">
              <form onSubmit={addNote} className="space-y-3">
                <Field label="Nota per lo staff" hint="Visibile solo ad admin e coach.">
                  {(a) => <Textarea {...a} value={note} onChange={(e) => setNote(e.target.value)} />}
                </Field>
                <Button type="submit" disabled={!note.trim()} icon={<MessageSquarePlus className="h-4 w-4" aria-hidden />}>
                  Aggiungi
                </Button>
              </form>
            </Panel>
            <Panel title="Storico note">
              {d.coachNotes.length ? (
                <ul className="space-y-3">
                  {d.coachNotes.map((n) => (
                    <li key={n.id} className="rounded-[var(--r-card)] bg-surface-2/50 p-3">
                      <div className="text-xs text-muted">
                        {coachById(n.authorId)?.name ?? n.authorId} · {fmtRelative(n.createdAt)}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink">{n.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Nessuna nota" />
              )}
            </Panel>
          </div>
        )}

        {tab === 'card' && (
          <Panel title="Player Card" meta="attributi 40–99, anteprima in tempo reale">
            <CardEditor
              key={d.card.updatedAt}
              card={d.card}
              staff={u.role !== 'STUDENT'}
              onSave={async (attributes) => {
                try {
                  const card = await api.admin.players.updateCard(u.id, attributes)
                  setData({ ...d, card })
                  toast.success('Player Card aggiornata', `Overall ${card.overall}`)
                } catch (e) {
                  toastError(e, 'Carta non salvata')
                }
              }}
            />
          </Panel>
        )}
      </div>
    </div>
  )
}

function Mini({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 truncate font-mono text-ink">{v}</dd>
    </div>
  )
}
