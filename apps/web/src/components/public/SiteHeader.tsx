import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { NAV_COACHING, NAV_MAIN } from './nav'
import { publicScrollLock } from '@/hooks/usePublicSmoothScroll'

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex min-h-11 items-center px-3 text-[0.95rem] font-medium transition-colors',
    isActive ? 'text-ink after:absolute after:inset-x-3 after:bottom-2 after:h-px after:bg-accent' : 'text-muted hover:text-ink',
  )

function useHeaderScroll() {
  const [state, setState] = useState({ solid: false, hidden: false })
  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const solid = y > 24
        const hidden = y > 320 && y > last + 2
        const shown = y < last - 2
        setState((s) => {
          const next = { solid, hidden: hidden ? true : shown ? false : s.hidden }
          return next.solid === s.solid && next.hidden === s.hidden ? s : next
        })
        last = y
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
    }
  }, [])
  return state
}

function AccountAction({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { user } = useAuth()
  if (user) {
    return (
      <ButtonLink to={user.role === 'ADMIN' ? '/admin' : '/app'} variant="secondary" className={className} onClick={onNavigate}>
        Area riservata
      </ButtonLink>
    )
  }
  return (
    <Link to="/accedi" onClick={onNavigate} className={cn('inline-flex min-h-11 items-center px-3 font-medium text-ink transition-colors hover:text-accent', className)}>
      Accedi
    </Link>
  )
}

function CoachingMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const wrap = useRef<HTMLDivElement>(null)
  const active = pathname.startsWith('/coaching')
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        wrap.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div
      ref={wrap}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="menu-coaching"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex min-h-11 items-center gap-1 px-3 text-[0.95rem] font-medium transition-colors',
          active ? 'text-ink after:absolute after:inset-x-3 after:bottom-2 after:h-px after:bg-accent' : 'text-muted hover:text-ink',
        )}
      >
        Coaching
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} aria-hidden />
      </button>
      <div
        id="menu-coaching"
        data-open={open}
        inert={!open}
        className="pub-pop absolute left-0 top-full w-80 pt-2"
      >
        <ul className="border border-line bg-surface p-2 shadow-[0_24px_60px_-24px_var(--pub-shadow)]" style={{ borderRadius: 'var(--r-card)' }}>
          {NAV_COACHING.map((f) => (
            <li key={f.slug}>
              <NavLink
                to={`/coaching/${f.slug}`}
                className={({ isActive }) => cn('flex min-h-11 flex-col justify-center px-3 py-2.5 transition-colors hover:bg-surface-2', isActive && 'bg-surface-2')}
                style={{ borderRadius: 'calc(var(--r-card) * 0.7)' }}
              >
                <span className="font-display text-lg font-extrabold leading-tight text-ink">{f.label}</span>
                <span className="text-sm text-muted">{f.blurb}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    publicScrollLock(true)
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('a,button')?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>('a,button')
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      publicScrollLock(false)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const links = [
    ...NAV_COACHING.map((f) => ({ to: `/coaching/${f.slug}`, label: f.label, sub: true })),
    ...NAV_MAIN.map((l) => ({ ...l, sub: false })),
  ]

  return (
    <div
      ref={panel}
      id="menu-mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principale"
      data-open={open}
      inert={!open}
      className="pub-menu pub-felt fixed inset-0 z-[70] flex flex-col overflow-y-auto lg:hidden"
      data-lenis-prevent
    >
      <div className="pub-wrap relative z-[2] flex h-[72px] shrink-0 items-center justify-between">
        <Link to="/" onClick={onClose} className="inline-flex min-h-11 items-center">
          <Logo />
        </Link>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-ink" aria-label="Chiudi il menu">
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <nav aria-label="Menu mobile" className="pub-wrap relative z-[2] flex flex-1 flex-col justify-center py-6">
        <p className="mb-2 text-sm text-muted">Coaching</p>
        <ul>
          {links.map((l, i) => (
            <li
              key={l.to}
              className={cn('pub-menu-item', i === NAV_COACHING.length && 'mt-5 border-t border-line pt-4')}
              style={{ ['--i' as string]: i }}
            >
              <NavLink
                to={l.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn('pub-h3 flex min-h-12 items-center py-1 transition-colors', l.sub ? 'text-[2rem]' : 'text-[2.4rem]', isActive ? 'text-accent' : 'text-ink hover:text-accent')
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="pub-menu-item pub-wrap relative z-[2] flex flex-col gap-3 pb-8" style={{ ['--i' as string]: links.length }}>
        <div className="flex items-center gap-3">
          <ButtonLink to="/registrati" size="lg" className="flex-1" onClick={onClose}>
            Candidati
          </ButtonLink>
          <AccountAction onNavigate={onClose} />
        </div>
        <p className="text-sm text-muted">Solo maggiorenni. Formazione, non gioco: nessuna sala da gioco, nessun bonus.</p>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const { solid, hidden } = useHeaderScroll()
  const [menu, setMenu] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setMenu(false)
    menuBtn.current?.focus({ preventScroll: true })
  }, [])
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname])

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-out-expo',
          solid ? 'border-b border-line bg-bg/85 backdrop-blur-md' : 'border-b border-transparent',
          hidden && !menu && '-translate-y-full',
        )}
      >
        <div className="pub-wrap flex h-[72px] items-center gap-4">
          <Link to="/" className="mr-auto inline-flex min-h-11 items-center lg:mr-6">
            <Logo />
          </Link>
          <nav aria-label="Principale" className="hidden flex-1 items-center lg:flex">
            <CoachingMenu />
            {NAV_MAIN.map((l) => (
              <NavLink key={l.to} to={l.to} className={navLink}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <AccountAction />
            <ButtonLink to="/registrati">Candidati</ButtonLink>
          </div>
          <ButtonLink to="/registrati" size="sm" className="min-h-11 lg:hidden">
            Candidati
          </ButtonLink>
          <button
            ref={menuBtn}
            type="button"
            className="-mr-2 grid h-11 w-11 place-items-center text-ink lg:hidden"
            aria-label="Apri il menu"
            aria-expanded={menu}
            aria-controls="menu-mobile"
            onClick={() => setMenu(true)}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>
      <MobileMenu open={menu} onClose={close} />
    </>
  )
}
