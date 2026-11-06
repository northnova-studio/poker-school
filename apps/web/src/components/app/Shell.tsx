// Pezzi comuni ai due layout (area studente e gestionale): sidebar, topbar, menu utente, transizioni.
import { Suspense, useEffect, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ExternalLink, LogOut, PanelLeftClose, PanelLeftOpen, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { ROLE_LABEL } from '@/lib/app-format'
import { Menu, menuItemCls } from './Controls'
import { PageSkeleton } from './Panel'
import { resetDemoData } from './AppContext'
import { Toaster } from './Overlay'

export type Icon = ComponentType<SVGProps<SVGSVGElement>>
export interface NavItem {
  to: string
  label: string
  icon: Icon
  end?: boolean
  badge?: number
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

const SIDEBAR_KEY = 'tris.app.sidebar'

export function Sidebar({ groups, footer, title, homeTo }: { groups: NavGroup[]; footer?: ReactNode; title?: string; homeTo: string }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])
  return (
    <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-300 ease-out lg:flex', collapsed ? 'w-[76px]' : 'w-[252px]')} aria-label="Navigazione principale">
      <div className={cn('flex h-16 items-center gap-2 border-b border-line', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link to={homeTo} className="inline-flex min-h-11 items-center rounded-[var(--r-card)]">
          <Logo compact={collapsed} />
        </Link>
        {!collapsed && title && <span className="ml-1 truncate rounded-full border border-line px-2 py-0.5 text-[0.7rem] font-medium text-muted">{title}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.label} className="mb-3.5">
            {!collapsed ? <div className="mb-1.5 px-3 text-xs font-medium text-muted/80">{g.label}</div> : <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    title={collapsed ? it.label : undefined}
                    aria-label={collapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex min-h-11 items-center gap-3 rounded-[var(--r-card)] text-[0.9rem] font-medium transition-colors',
                        collapsed ? 'justify-center px-0' : 'px-3',
                        isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/60 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" aria-hidden />}
                        <it.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-accent')} aria-hidden />
                        {!collapsed && <span className="truncate">{it.label}</span>}
                        {!!it.badge && (
                          <span className={cn('rounded-full bg-accent-2 px-1.5 font-mono text-[0.7rem] font-bold text-on-accent', collapsed ? 'absolute right-2 top-1.5' : 'ml-auto')} aria-label={`${it.badge} in attesa`}>
                            {it.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        {!collapsed && footer}
        {api.mode === 'demo' && (
          <div className={cn('mb-1 flex items-center gap-2 px-3 py-2 text-xs text-muted', collapsed && 'justify-center px-0')} title="Demo: i dati restano nel tuo browser">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden />
            {collapsed ? <span className="sr-only">Modalità demo</span> : <span>Demo · i dati restano nel tuo browser</span>}
          </div>
        )}
        <button type="button" onClick={() => setCollapsed((v) => !v)} className={cn('flex min-h-11 w-full items-center gap-3 rounded-[var(--r-card)] px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'}>
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden /> : <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />}
          {!collapsed && 'Comprimi'}
        </button>
      </div>
    </aside>
  )
}

export function UserMenu({ extra }: { extra?: (close: () => void) => ReactNode }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  if (!user) return null
  return (
    <Menu label="Menu utente" trigger={<Avatar seed={user.avatarSeed} label={user.nickname} size={34} />}>
      {(close) => (
        <>
          <div className="border-b border-line px-4 pb-3 pt-2">
            <div className="truncate font-semibold text-ink">{user.nickname}</div>
            <div className="truncate text-xs text-muted">
              {user.email} · {ROLE_LABEL[user.role]}
            </div>
          </div>
          <div className="py-1">
            <Link role="menuitem" to="/app/profilo" onClick={close} className={menuItemCls}>
              <UserRound className="h-4 w-4 text-muted" aria-hidden /> Profilo
            </Link>
            {user.kycStatus !== 'APPROVED' && (
              <Link role="menuitem" to="/app/verifica-identita" onClick={close} className={menuItemCls}>
                <ShieldCheck className="h-4 w-4 text-muted" aria-hidden /> Verifica identità
              </Link>
            )}
            {extra?.(close)}
            <Link role="menuitem" to="/" onClick={close} className={menuItemCls}>
              <ExternalLink className="h-4 w-4 text-muted" aria-hidden /> Sito pubblico
            </Link>
            {api.mode === 'demo' && (
              <button
                role="menuitem"
                type="button"
                className={menuItemCls}
                onClick={() => {
                  close()
                  if (window.confirm('Ripristinare la demo? Le modifiche fatte in questo browser verranno cancellate.')) void resetDemoData()
                }}
              >
                <RotateCcw className="h-4 w-4 text-muted" aria-hidden /> Ripristina demo
              </button>
            )}
            <button
              role="menuitem"
              type="button"
              className={cn(menuItemCls, 'text-danger')}
              onClick={async () => {
                close()
                await logout()
                nav('/accedi', { replace: true })
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden /> Esci
            </button>
          </div>
        </>
      )}
    </Menu>
  )
}

/** Contenuto della pagina con transizione sobria al cambio di rotta. */
export function AnimatedOutlet() {
  const loc = useLocation()
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={loc.pathname}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export function SkipLink() {
  return (
    <a href="#contenuto" className="sr-only z-[80] rounded-[var(--r-card)] bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
      Vai al contenuto
    </a>
  )
}

/** Drawer laterale per mobile (dialog nativo). */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const loc = useLocation()
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" aria-label="Chiudi menu" className="absolute inset-0 bg-bg/80" onClick={onClose} />
          <motion.div
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[calc(var(--r-card)+10px)] border-t border-line bg-surface px-4 pb-8 pt-3"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-lg font-bold">{title}</span>
              <button type="button" onClick={onClose} aria-label="Chiudi" autoFocus className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DrawerNav({ groups }: { groups: NavGroup[] }) {
  return (
    <nav aria-label="Tutte le sezioni">
      {groups.map((g) => (
        <div key={g.label} className="mb-4">
          <div className="mb-1 text-xs font-medium text-muted">{g.label}</div>
          <ul className="grid grid-cols-2 gap-1.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} end={it.end} className={({ isActive }) => cn('flex min-h-12 items-center gap-2.5 rounded-[var(--r-card)] border px-3 text-sm font-medium', isActive ? 'border-accent text-ink' : 'border-line text-muted')}>
                  <it.icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{it.label}</span>
                  {!!it.badge && <span className="ml-auto rounded-full bg-accent-2 px-1.5 font-mono text-[0.7rem] font-bold text-on-accent">{it.badge}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Stile globale dell'area riservata: sposta il banner demo sopra la tab bar su mobile. */
export function ShellStyles() {
  return (
    <>
      <style>{`@media (max-width: 1023px){[data-app-shell] ~ div.fixed.bottom-3.left-3{bottom:calc(84px + env(safe-area-inset-bottom));}}@media (min-width: 1024px){[data-app-shell] ~ div.fixed.bottom-3.left-3{display:none}}`}</style>
      <Toaster />
    </>
  )
}
