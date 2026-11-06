// Registrazione a step: account → profilo poker → verifica identità → riepilogo.
// Gestisce ?plan= (piano scelto in /prezzi) e ?next= (redirect finale).
import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { Format, Level, PlanId } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { FORMAT_LABEL, LEVEL_LABEL } from '@/lib/format'
import { DOC_LABEL, PLAN_LABEL } from '@/lib/app-format'
import { PLANS } from '@/data/plans'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input } from '@/components/app/Controls'
import { Toaster, toast } from '@/components/app/Overlay'
import { KycFields, emptyKyc, kycErrors } from '@/components/app/Kyc'
import type { KycDraft } from '@/components/app/Kyc'

const STEPS = ['Account', 'Profilo poker', 'Verifica identità', 'Riepilogo'] as const

interface Account {
  email: string
  password: string
  nickname: string
  firstName: string
  lastName: string
  birthDate: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  marketingOptIn: boolean
}

function ageOf(b: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b)
  if (!m) return -1
  const now = new Date()
  let a = now.getFullYear() - Number(m[1])
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) a--
  return a
}

function accountErrors(a: Account) {
  const e: Partial<Record<keyof Account, string>> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim())) e.email = 'Inserisci un indirizzo email valido.'
  if (a.password.length < 8) e.password = 'Almeno 8 caratteri.'
  if (a.nickname.trim().length < 3 || a.nickname.trim().length > 20) e.nickname = 'Tra 3 e 20 caratteri.'
  if (!a.firstName.trim()) e.firstName = 'Obbligatorio.'
  if (!a.lastName.trim()) e.lastName = 'Obbligatorio.'
  const age = ageOf(a.birthDate)
  if (age < 0) e.birthDate = 'Inserisci la data di nascita.'
  else if (age < 18) e.birthDate = 'La scuola è riservata ai maggiorenni.'
  if (!a.acceptTerms) e.acceptTerms = 'Necessario per continuare.'
  if (!a.acceptPrivacy) e.acceptPrivacy = 'Necessario per continuare.'
  return e
}

export default function Register() {
  const [params] = useSearchParams()
  const planParam = params.get('plan') as PlanId | null
  const plan = PLANS.find((p) => p.id === planParam) ?? null
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
  const { register, refresh } = useAuth()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [tried, setTried] = useState<boolean[]>([false, false, false, false])
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [acc, setAcc] = useState<Account>({ email: '', password: '', nickname: '', firstName: '', lastName: '', birthDate: '', acceptTerms: false, acceptPrivacy: false, marketingOptIn: false })
  const [formats, setFormats] = useState<Format[]>([])
  const [level, setLevel] = useState<Level>('MICRO')
  const [discord, setDiscord] = useState('')
  const [kyc, setKyc] = useState<KycDraft>(emptyKyc())
  const [kycLater, setKycLater] = useState(false)

  const accErr = accountErrors(acc)
  const profErr = formats.length ? {} : { formats: 'Scegli almeno un formato.' }
  const kErr = kycLater ? {} : kycErrors(kyc)
  const stepValid = [Object.keys(accErr).length === 0, Object.keys(profErr).length === 0, Object.keys(kErr).length === 0, true]

  const go = (to: number) => {
    setDir(to > step ? 1 : -1)
    setStep(to)
    requestAnimationFrame(() => document.getElementById('reg-step-title')?.focus())
  }
  const advance = (e?: FormEvent) => {
    e?.preventDefault()
    setTried((t) => t.map((v, i) => (i === step ? true : v)))
    if (!stepValid[step]) return
    go(step + 1)
  }

  const finish = async () => {
    setServerError(null)
    setBusy(true)
    try {
      const user = await register({
        email: acc.email.trim(),
        password: acc.password,
        nickname: acc.nickname.trim(),
        firstName: acc.firstName.trim(),
        lastName: acc.lastName.trim(),
        birthDate: acc.birthDate,
        formats,
        mainLevel: level,
        discordHandle: discord.trim() || undefined,
        acceptTerms: acc.acceptTerms,
        acceptPrivacy: acc.acceptPrivacy,
        marketingOptIn: acc.marketingOptIn,
      })
      if (!kycLater && kyc.front && kyc.selfie) {
        try {
          await api.kyc.submit({ documentType: kyc.documentType, documentNumberLast4: kyc.last4, front: kyc.front, back: kyc.back ?? undefined, selfie: kyc.selfie, consent: kyc.consent })
        } catch (e) {
          toast.error('Documenti non inviati', `${(e as Error).message} Puoi riprovare da “Verifica identità”.`)
        }
      }
      if (plan) {
        try {
          const r = await api.plans.subscribe(plan.id, 'month')
          if (r.checkoutUrl) {
            window.location.assign(r.checkoutUrl)
            return
          }
        } catch (e) {
          toast.error('Piano non attivato', (e as Error).message)
        }
      }
      await refresh()
      toast.success(`Benvenuto, ${user.nickname}`, 'Il tuo account è pronto.')
      nav(safeNext ?? (kycLater ? '/app/verifica-identita' : '/app'), { replace: true })
    } catch (e) {
      setServerError((e as Error).message)
      const code = (e as { code?: string }).code
      if (code === 'EMAIL_TAKEN' || code === 'NICKNAME_TAKEN' || code === 'UNDERAGE' || code === 'WEAK_PASSWORD') go(0)
    } finally {
      setBusy(false)
    }
  }

  const err = <K extends keyof Account>(k: K) => (tried[0] ? accErr[k] : undefined)
  const maxBirth = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6 lg:pb-16 lg:pt-36">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,5.5vw,3.2rem)] font-extrabold leading-[0.95] tracking-[-0.04em]" style={{ fontStretch: '112%' }}>
            Candidati alla scuola
          </h1>
          <p className="mt-3 text-muted">Solo maggiorenni. Ti servono cinque minuti e un documento d’identità.</p>
        </div>
        {plan && (
          <div className="rounded-[var(--r-card)] border border-accent/50 px-4 py-2 text-sm">
            Piano scelto: <span className="font-semibold text-ink">{plan.name}</span> <span className="font-mono text-muted">{plan.priceMonthly} €/mese</span>
          </div>
        )}
      </div>

      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Avanzamento registrazione">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <div className={cn('h-1 rounded-full transition-colors', i < step ? 'bg-accent' : i === step ? 'bg-ink' : 'bg-line')} />
            <div className={cn('mt-2 hidden text-xs sm:block', i === step ? 'font-semibold text-ink' : 'text-muted')}>
              {i + 1}. {s}
            </div>
          </li>
        ))}
      </ol>

      <div className="relative overflow-hidden rounded-[var(--r-card)] border border-line bg-surface">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 sm:p-8"
          >
            <h2 id="reg-step-title" tabIndex={-1} className="mb-6 font-display text-xl font-bold tracking-tight outline-none sm:text-2xl">
              <span className="mr-2 font-mono text-base text-muted">{step + 1}/4</span>
              {STEPS[step]}
            </h2>

            {step === 0 && (
              <form onSubmit={advance} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" error={err('email')} required className="sm:col-span-2">
                  {(a) => <Input {...a} type="email" autoComplete="email" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} />}
                </Field>
                <Field label="Password" hint="Almeno 8 caratteri." error={err('password')} required>
                  {(a) => (
                    <div className="relative">
                      <Input {...a} type={showPw ? 'text' : 'password'} autoComplete="new-password" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} className="pr-12" />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center text-muted hover:text-ink" aria-label={showPw ? 'Nascondi password' : 'Mostra password'} aria-pressed={showPw}>
                        {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    </div>
                  )}
                </Field>
                <Field label="Nickname" hint="Come ti vedrà la community." error={err('nickname')} required>
                  {(a) => <Input {...a} autoComplete="nickname" value={acc.nickname} onChange={(e) => setAcc({ ...acc, nickname: e.target.value })} />}
                </Field>
                <Field label="Nome" error={err('firstName')} required>
                  {(a) => <Input {...a} autoComplete="given-name" value={acc.firstName} onChange={(e) => setAcc({ ...acc, firstName: e.target.value })} />}
                </Field>
                <Field label="Cognome" error={err('lastName')} required>
                  {(a) => <Input {...a} autoComplete="family-name" value={acc.lastName} onChange={(e) => setAcc({ ...acc, lastName: e.target.value })} />}
                </Field>
                <Field label="Data di nascita" hint="Verifichiamo la maggiore età anche con il documento." error={err('birthDate')} required>
                  {(a) => <Input {...a} type="date" max={maxBirth} autoComplete="bday" value={acc.birthDate} onChange={(e) => setAcc({ ...acc, birthDate: e.target.value })} />}
                </Field>
                <div className="space-y-3 sm:col-span-2">
                  <Checkbox
                    checked={acc.acceptTerms}
                    onChange={(e) => setAcc({ ...acc, acceptTerms: e.target.checked })}
                    label={
                      <>
                        Accetto i{' '}
                        <Link to="/legal/termini" className="text-accent underline underline-offset-2" target="_blank">
                          termini del servizio
                        </Link>{' '}
                        e confermo di avere almeno 18 anni
                      </>
                    }
                  />
                  {err('acceptTerms') && <p className="pl-8 text-xs font-medium text-danger">{err('acceptTerms')}</p>}
                  <Checkbox
                    checked={acc.acceptPrivacy}
                    onChange={(e) => setAcc({ ...acc, acceptPrivacy: e.target.checked })}
                    label={
                      <>
                        Ho letto l’
                        <Link to="/legal/privacy" className="text-accent underline underline-offset-2" target="_blank">
                          informativa privacy
                        </Link>
                      </>
                    }
                  />
                  {err('acceptPrivacy') && <p className="pl-8 text-xs font-medium text-danger">{err('acceptPrivacy')}</p>}
                  <Checkbox checked={acc.marketingOptIn} onChange={(e) => setAcc({ ...acc, marketingOptIn: e.target.checked })} label="Voglio ricevere la newsletter con contenuti di studio (facoltativo)" />
                </div>
                <StepNav onBack={null} submitLabel="Continua" />
              </form>
            )}

            {step === 1 && (
              <form onSubmit={advance} noValidate className="space-y-6">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">Quali formati giochi? *</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['MTT', 'SPIN', 'CASH'] as Format[]).map((f) => {
                      const on = formats.includes(f)
                      return (
                        <label key={f} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--r-card)] border px-4 focus-within:border-accent', on ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink')}>
                          <input type="checkbox" checked={on} onChange={() => setFormats(on ? formats.filter((x) => x !== f) : [...formats, f])} className="h-4 w-4 accent-[var(--c-accent)]" />
                          <span className="font-semibold">{FORMAT_LABEL[f]}</span>
                        </label>
                      )
                    })}
                  </div>
                  {tried[1] && profErr.formats && <p className="mt-1.5 text-xs font-medium text-danger">{profErr.formats}</p>}
                  <p className="mt-2 text-xs text-muted">Il primo che scegli diventa il formato principale della tua Player Card.</p>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">Livello attuale</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                      <label key={l} className={cn('flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--r-card)] border px-3 text-sm font-medium focus-within:border-accent', level === l ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink')}>
                        <input type="radio" name="level" checked={level === l} onChange={() => setLevel(l)} className="sr-only" />
                        {LEVEL_LABEL[l]} stakes
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Username Discord" hint="Facoltativo: ti aggiungiamo ai canali del tuo formato.">
                  {(a) => <Input {...a} value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="es. brigante" className="max-w-sm" />}
                </Field>
                <StepNav onBack={() => go(0)} submitLabel="Continua" />
              </form>
            )}

            {step === 2 && (
              <form onSubmit={advance} noValidate className="space-y-6">
                <p className="text-sm text-muted">Verifichiamo identità e maggiore età prima di attivare staking e lezioni live. Puoi farlo anche più tardi dall’area riservata.</p>
                {!kycLater && <KycFields value={kyc} onChange={setKyc} showErrors={tried[2]} />}
                <Checkbox checked={kycLater} onChange={(e) => setKycLater(e.target.checked)} label="Lo farò più tardi" description="Potrai usare l’area studente, ma staking, lezioni live e classifiche pubbliche restano bloccati fino alla verifica." />
                <StepNav onBack={() => go(1)} submitLabel="Vai al riepilogo" />
              </form>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  <Summary k="Email" v={acc.email} />
                  <Summary k="Nickname" v={acc.nickname} />
                  <Summary k="Nome" v={`${acc.firstName} ${acc.lastName}`} />
                  <Summary k="Data di nascita" v={acc.birthDate ? new Date(acc.birthDate).toLocaleDateString('it-IT') : '—'} />
                  <Summary k="Formati" v={formats.map((f) => FORMAT_LABEL[f]).join(', ')} />
                  <Summary k="Livello" v={`${LEVEL_LABEL[level]} stakes`} />
                  <Summary k="Discord" v={discord || '—'} />
                  <Summary k="Verifica identità" v={kycLater ? 'Più tardi' : `${DOC_LABEL[kyc.documentType]} ··${kyc.last4} + selfie`} />
                  {plan && <Summary k="Piano" v={`${PLAN_LABEL[plan.id]} · ${plan.priceMonthly} €/mese`} />}
                </dl>
                {api.mode === 'demo' && <p className="rounded-[var(--r-card)] border border-line bg-surface-2/50 px-4 py-3 text-sm text-muted">Modalità demo: l’account e i documenti restano solo in questo browser{plan ? ', il piano si attiva senza pagamento' : ''}.</p>}
                {serverError && (
                  <p role="alert" className="rounded-[var(--r-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">
                    {serverError}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <Button variant="ghost" onClick={() => go(2)} icon={<ArrowLeft className="h-4 w-4" aria-hidden />} className="flex-row-reverse">
                    Indietro
                  </Button>
                  <Button onClick={finish} disabled={busy} size="lg" icon={<Check className="h-4 w-4" aria-hidden />}>
                    {busy ? 'Creo l’account…' : 'Crea l’account'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-6 text-sm text-muted">
        Hai già un account?{' '}
        <Link to="/accedi" className="font-semibold text-accent underline-offset-4 hover:underline">
          Accedi
        </Link>
      </p>
      <Toaster />
    </div>
  )
}

function StepNav({ onBack, submitLabel }: { onBack: (() => void) | null; submitLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 sm:col-span-2">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" aria-hidden />} className="flex-row-reverse">
          Indietro
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
        {submitLabel}
      </Button>
    </div>
  )
}

function Summary({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-line pb-2">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink">{v}</dd>
    </div>
  )
}
