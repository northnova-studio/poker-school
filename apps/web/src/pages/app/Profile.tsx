import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Check, Clock3, Save, ShieldAlert, ShieldX } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { BillingInterval, Format, Level, PlanId } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { PLANS } from '@/data/plans'
import { coachById } from '@/data/coaches'
import { KYC_LABEL, PLAN_LABEL } from '@/lib/app-format'
import { FORMAT_LABEL, LEVEL_LABEL, fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PageHeader, Panel } from '@/components/app/Panel'
import { Field, Input, Segmented, Select, Textarea, Toggle } from '@/components/app/Controls'
import { toast, toastError } from '@/components/app/Overlay'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [f, setF] = useState(() => ({ nickname: user?.nickname ?? '', formats: user?.formats ?? [], mainLevel: user?.mainLevel ?? 'MICRO', discordHandle: user?.discordHandle ?? '', gamingTag: user?.gamingTag ?? '', bio: user?.bio ?? '' }))
  const [busy, setBusy] = useState(false)
  const [interval, setBilling] = useState<BillingInterval>(user?.planInterval ?? 'month')
  const [planBusy, setPlanBusy] = useState<PlanId | null>(null)
  useEffect(() => {
    if (location.hash === '#piano') document.getElementById('piano')?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  if (!user) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      setUser(await api.auth.updateProfile({ ...f, formats: f.formats as Format[], mainLevel: f.mainLevel as Level, discordHandle: f.discordHandle || null, gamingTag: f.gamingTag || null, bio: f.bio || null }))
      toast.success('Profilo salvato')
    } catch (err) {
      toastError(err, 'Salvataggio non riuscito')
    } finally {
      setBusy(false)
    }
  }
  const consent = async (k: 'shareResultsPublicly' | 'roastOptIn', v: boolean) => {
    try {
      setUser(await api.auth.updateProfile({ [k]: v }))
      toast.success(v ? 'Consenso attivato' : 'Consenso revocato')
    } catch (err) {
      toastError(err, 'Modifica non salvata')
    }
  }
  const subscribe = async (p: PlanId) => {
    setPlanBusy(p)
    try {
      const r = await api.plans.subscribe(p, interval)
      if (r.checkoutUrl) {
        window.location.assign(r.checkoutUrl)
        return
      }
      if (r.user) setUser(r.user)
      toast.success(`Piano ${PLAN_LABEL[p]} attivo`, api.mode === 'demo' ? 'In demo nessun pagamento.' : undefined)
    } catch (err) {
      toastError(err, 'Cambio piano non riuscito')
    } finally {
      setPlanBusy(null)
    }
  }
  const toggleFormat = (fm: Format) => setF({ ...f, formats: f.formats.includes(fm) ? f.formats.filter((x) => x !== fm) : [...f.formats, fm] })
  const kycIcon = { APPROVED: BadgeCheck, PENDING: Clock3, REJECTED: ShieldX, NONE: ShieldAlert }[user.kycStatus]
  const KycIcon = kycIcon

  return (
    <div className="space-y-5">
      <PageHeader title="Profilo" description="I tuoi dati, i consensi e il piano. La mail e il nome restano privati: in community si vede solo il nickname." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel title="Dati del giocatore" className="lg:col-span-7">
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar seed={user.avatarSeed} label={user.nickname} size={56} />
              <div className="text-sm">
                <div className="font-semibold text-ink">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-muted">
                  {user.email} · iscritto dal {fmtDate(user.createdAt)}
                </div>
                {user.coachId && <div className="text-muted">Coach di riferimento: {coachById(user.coachId)?.name}</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nickname">{(a) => <Input {...a} value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} />}</Field>
              <Field label="Livello">
                {(a) => (
                  <Select {...a} value={f.mainLevel} onChange={(e) => setF({ ...f, mainLevel: e.target.value as Level })}>
                    {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABEL[l]} stakes
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Discord">{(a) => <Input {...a} value={f.discordHandle} onChange={(e) => setF({ ...f, discordHandle: e.target.value })} />}</Field>
              <Field label="Gaming tag" hint="Activision ID, PSN, EA ID…">{(a) => <Input {...a} value={f.gamingTag} onChange={(e) => setF({ ...f, gamingTag: e.target.value })} />}</Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Formati</legend>
              <div className="flex flex-wrap gap-2">
                {(['MTT', 'SPIN', 'CASH'] as Format[]).map((fm) => (
                  <label key={fm} className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-card)] border px-3 text-sm font-medium focus-within:border-accent', f.formats.includes(fm) ? 'border-accent text-ink' : 'border-line text-muted')}>
                    <input type="checkbox" checked={f.formats.includes(fm)} onChange={() => toggleFormat(fm)} className="h-4 w-4 accent-[var(--c-accent)]" />
                    {FORMAT_LABEL[fm]}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Bio" hint="Massimo 280 caratteri.">{(a) => <Textarea {...a} maxLength={280} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className="min-h-20" />}</Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy} icon={<Save className="h-4 w-4" aria-hidden />}>
                {busy ? 'Salvo…' : 'Salva il profilo'}
              </Button>
            </div>
          </form>
        </Panel>

        <div className="space-y-5 lg:col-span-5">
          <Panel title="Consensi" meta="modificabili quando vuoi">
            <div className="space-y-4">
              <Toggle checked={user.shareResultsPublicly} onChange={(v) => consent('shareResultsPublicly', v)} label="Comparire nelle classifiche pubbliche" description="Nickname, rank e XP nella classifica del sito. Mai importi o risultati in euro." />
              <div className="h-px bg-line" />
              <Toggle checked={user.roastOptIn} onChange={(v) => consent('roastOptIn', v)} label="Partecipare al Roast della settimana" description="Le tue mani possono comparire come “mano di un membro” e puoi ricevere il badge Clown della settimana." />
            </div>
          </Panel>
          <Panel title="Verifica identità">
            <div className="flex items-center gap-3">
              <KycIcon className={cn('h-8 w-8', user.kycStatus === 'APPROVED' ? 'text-success' : user.kycStatus === 'REJECTED' ? 'text-danger' : 'text-warning')} aria-hidden />
              <div className="flex-1">
                <div className="font-semibold text-ink">{KYC_LABEL[user.kycStatus]}</div>
                <div className="text-sm text-muted">{user.kycStatus === 'APPROVED' ? 'Documenti già cancellati dopo l’esito.' : 'Serve per staking e lezioni live.'}</div>
              </div>
              {user.kycStatus !== 'APPROVED' && (
                <Link to="/app/verifica-identita" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent hover:underline">
                  {user.kycStatus === 'PENDING' ? 'Dettagli' : 'Verifica'}
                </Link>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <section id="piano" aria-labelledby="plan-h" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="plan-h" className="font-sans text-[0.95rem] font-semibold">
            Il tuo piano: <span className="text-accent">{user.plan ? `${PLAN_LABEL[user.plan]} · ${user.planInterval === 'year' ? 'annuale' : 'mensile'}` : 'nessuno'}</span>
          </h2>
          <Segmented label="Fatturazione" size="sm" value={interval} onChange={setBilling} options={[{ value: 'month', label: 'Mensile' }, { value: 'year', label: 'Annuale' }]} />
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = user.plan === p.id && (user.planInterval ?? 'month') === interval
            return (
              <li key={p.id} className={cn('flex flex-col rounded-[var(--r-card)] border bg-surface p-5', current ? 'border-accent' : 'border-line')}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl font-extrabold">{p.name}</span>
                  {p.highlighted && <span className="text-xs font-medium text-accent">il più scelto</span>}
                </div>
                <div className="mt-2 font-mono text-3xl font-semibold text-ink">
                  {interval === 'year' ? p.priceYearly : p.priceMonthly} €<span className="text-sm text-muted">/{interval === 'year' ? 'anno' : 'mese'}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{p.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.features.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  {current ? (
                    <span className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">Piano attuale</span>
                  ) : (
                    <Button variant={p.highlighted ? 'primary' : 'secondary'} className="w-full" disabled={!!planBusy} onClick={() => subscribe(p.id)}>
                      {planBusy === p.id ? 'Attendi…' : user.plan ? `Passa a ${p.name}` : `Attiva ${p.name}`}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {api.mode === 'demo' && <p className="mt-3 text-xs text-muted">Demo: il cambio piano è immediato, senza pagamento. Con il backend reale si passa da Stripe Checkout.</p>}
      </section>
    </div>
  )
}
