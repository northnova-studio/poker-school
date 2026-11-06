import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, GraduationCap, LogIn, Wrench } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { User } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/app/Controls'
import { Toaster, toast } from '@/components/app/Overlay'
import { BRAND } from '@/config/brand'

function safeNext(v: string | null | undefined): string | null {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : null
}

export default function Login() {
  const { login, demoLogin, user, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<null | 'form' | 'STUDENT' | 'ADMIN'>(null)
  const [error, setError] = useState<string | null>(null)
  const demoParam = params.get('demo')
  const demoDone = useRef(false)
  const from = safeNext((loc.state as { from?: string } | null)?.from) ?? safeNext(params.get('next'))

  const go = (u: User) => nav(from ?? (u.role === 'ADMIN' ? '/admin' : '/app'), { replace: true })

  const enterDemo = async (as: 'STUDENT' | 'ADMIN') => {
    setBusy(as)
    setError(null)
    try {
      go(await demoLogin(as))
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  // ?demo=student|admin → accesso automatico (solo in modalità demo), poi redirect a ?next=
  useEffect(() => {
    if (loading || demoDone.current) return
    if (demoParam && api.mode === 'demo' && (demoParam === 'student' || demoParam === 'admin')) {
      demoDone.current = true
      void enterDemo(demoParam === 'admin' ? 'ADMIN' : 'STUDENT')
      return
    }
    if (user && !demoParam) go(user)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, demoParam])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Inserisci email e password.')
      return
    }
    setBusy('form')
    try {
      const u = await login(email, password)
      toast.success(`Ciao ${u.nickname}`)
      go(u)
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-28 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:pb-20 lg:pt-36">
      <div className="max-w-md">
        <h1 className="font-display text-[clamp(2.2rem,6vw,3.6rem)] font-extrabold leading-[0.92] tracking-[-0.04em]" style={{ fontStretch: '115%' }}>
          Bentornato al tavolo.
        </h1>
        <p className="mt-4 text-muted">Accedi per registrare le sessioni, vedere il tuo rank e prenotare le lezioni.</p>
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <Field label="Email">
            {(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" />}
          </Field>
          <Field label="Password">
            {(a) => (
              <div className="relative">
                <Input {...a} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center text-muted hover:text-ink" aria-label={show ? 'Nascondi password' : 'Mostra password'} aria-pressed={show}>
                  {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            )}
          </Field>
          {error && (
            <p role="alert" className="rounded-[var(--r-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={!!busy} icon={<LogIn className="h-4 w-4" aria-hidden />}>
            {busy === 'form' ? 'Accesso in corso…' : 'Accedi'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Non hai un account?{' '}
          <Link to={`/registrati${params.toString() ? `?${params.toString()}` : ''}`} className="font-semibold text-accent underline-offset-4 hover:underline">
            Candidati alla scuola
          </Link>
        </p>
      </div>

      {api.mode === 'demo' && (
        <aside className="grain relative self-start overflow-hidden rounded-[var(--r-card)] border border-line bg-surface p-6 sm:p-8" aria-labelledby="demo-title">
          <h2 id="demo-title" className="relative z-[2] font-display text-2xl font-bold tracking-tight">
            Prova la demo di {BRAND.name}
          </h2>
          <p className="relative z-[2] mt-2 text-sm text-muted">Dati di esempio, tutto resta nel tuo browser. Puoi ripristinare la demo dal menu utente.</p>
          <div className="relative z-[2] mt-6 space-y-3">
            <DemoButton
              icon={<GraduationCap className="h-5 w-5" aria-hidden />}
              title="Entra come studente demo"
              text="Brigante · Grinder, in staking"
              busy={busy === 'STUDENT'}
              disabled={!!busy}
              onClick={() => enterDemo('STUDENT')}
            />
            <DemoButton
              icon={<Wrench className="h-5 w-5" aria-hidden />}
              title="Entra come admin demo"
              text="Lorenzo · gestionale: KYC, staking, finanze"
              busy={busy === 'ADMIN'}
              disabled={!!busy}
              onClick={() => enterDemo('ADMIN')}
            />
          </div>
          <dl className="relative z-[2] mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-4 font-mono text-xs text-muted">
            <dt>studente</dt>
            <dd className="text-ink">studente@demo.it · demo1234</dd>
            <dt>admin</dt>
            <dd className="text-ink">admin@demo.it · demo1234</dd>
          </dl>
        </aside>
      )}
      <Toaster />
    </div>
  )
}

function DemoButton({ icon, title, text, onClick, busy, disabled }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; busy: boolean; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="group flex min-h-16 w-full items-center gap-4 rounded-[var(--r-card)] border border-line bg-bg/40 px-4 py-3 text-left transition-colors hover:border-accent disabled:opacity-60">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{busy ? 'Entro…' : title}</span>
        <span className="block truncate text-sm text-muted">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
    </button>
  )
}
