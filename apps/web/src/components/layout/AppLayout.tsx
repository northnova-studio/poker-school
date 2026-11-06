// Layout dell'area studente: sidebar collassabile (desktop), tab bar in basso (mobile),
// topbar con rank, avatar e menu; banner se la verifica d'identità non è completata.
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  FileSearch,
  Flame,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Menu as MenuIcon,
  Mountain,
  NotebookPen,
  ShieldAlert,
  SquareUser,
  Target,
  Trophy,
  UserRound,
  Wrench,
  ExternalLink,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { AppShellProvider, useAppShell } from '@/components/app/AppContext'
import { RankChip } from '@/components/app/Rank'
import { AnimatedOutlet, Drawer, DrawerNav, ShellStyles, Sidebar, SkipLink, UserMenu } from '@/components/app/Shell'
import type { NavGroup } from '@/components/app/Shell'
import { menuItemCls } from '@/components/app/Controls'
import { useCountdown } from '@/hooks/useData'

export const APP_NAV: NavGroup[] = [
  {
    label: 'Allenamento',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/statistiche', label: 'Statistiche', icon: LineChart },
      { to: '/app/sessioni', label: 'Sessioni', icon: NotebookPen },
      { to: '/app/hand-review', label: 'Hand review', icon: FileSearch },
    ],
  },
  {
    label: 'Scuola',
    items: [
      { to: '/app/corsi', label: 'I miei corsi', icon: GraduationCap },
      { to: '/app/lezioni', label: 'Lezioni di gruppo', icon: CalendarDays },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/app/rank', label: 'Rank', icon: Trophy },
      { to: '/app/card', label: 'Player Card', icon: SquareUser },
      { to: '/app/daily-spot', label: 'Daily Spot', icon: Target },
      { to: '/app/roast', label: 'Roast', icon: Flame },
      { to: '/app/deep-run', label: 'Deep Run', icon: Mountain },
      { to: '/app/lobby', label: 'Lobby', icon: Gamepad2 },
    ],
  },
  { label: 'Account', items: [{ to: '/app/profilo', label: 'Profilo', icon: UserRound }] },
]

const TABS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/statistiche', label: 'Statistiche', icon: LineChart },
  { to: '/app/daily-spot', label: 'Daily', icon: Target },
  { to: '/app/rank', label: 'Rank', icon: Trophy },
]

function SeasonClock() {
  const { rank } = useAppShell()
  const cd = useCountdown(rank?.seasonEndsAt)
  if (!rank || !cd) return null
  return (
    <div className="hidden items-center gap-2 text-sm text-muted md:flex">
      <span className="text-ink">{rank.seasonName.split(' — ')[0]}</span>
      <span aria-hidden>·</span>
      <span>
        finisce tra{' '}
        <span className="font-mono text-ink tabular">
          {cd.d}g {String(cd.h).padStart(2, '0')}h
        </span>
      </span>
    </div>
  )
}

function Topbar() {
  const { user } = useAuth()
  const { rank } = useAppShell()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/app" className="inline-flex min-h-11 items-center lg:hidden" aria-label="Dashboard">
          <Logo />
        </Link>
        <SeasonClock />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {rank && (
            <Link to="/app/rank" className="rounded-full" aria-label={`Il tuo rank: vai alla pagina Rank`}>
              <RankChip tier={rank.tier} division={rank.division} className="hidden sm:inline-flex" />
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="hidden min-h-11 items-center gap-1.5 rounded-[var(--r-card)] px-3 text-sm font-medium text-muted hover:text-ink md:inline-flex">
              <Wrench className="h-4 w-4" aria-hidden /> Gestionale
            </Link>
          )}
          <Link to="/" className="hidden min-h-11 items-center gap-1.5 rounded-[var(--r-card)] px-3 text-sm font-medium text-muted hover:text-ink md:inline-flex">
            <ExternalLink className="h-4 w-4" aria-hidden /> Sito
          </Link>
          <UserMenu
            extra={(close) =>
              user?.role === 'ADMIN' ? (
                <Link role="menuitem" to="/admin" onClick={close} className={menuItemCls}>
                  <Wrench className="h-4 w-4 text-muted" aria-hidden /> Gestionale
                </Link>
              ) : null
            }
          />
        </div>
      </div>
    </header>
  )
}

function KycBanner() {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user || user.kycStatus === 'APPROVED' || user.role !== 'STUDENT' || loc.pathname.startsWith('/app/verifica-identita')) return null
  const txt =
    user.kycStatus === 'PENDING'
      ? { t: 'Documenti in verifica', d: 'Ti avvisiamo appena un admin ha controllato. Nel frattempo puoi usare tutta l’area.' }
      : user.kycStatus === 'REJECTED'
        ? { t: 'Verifica non superata', d: 'Leggi il motivo e ricarica i documenti.' }
        : { t: 'Verifica la tua identità', d: 'Serve per lezioni live, staking e classifiche pubbliche. Bastano due minuti.' }
  return (
    <div className={cn('border-b px-4 py-2.5 sm:px-6 lg:px-8', user.kycStatus === 'REJECTED' ? 'border-danger/40 bg-danger/10' : 'border-warning/30 bg-warning/10')} role="status">
      <Link to="/app/verifica-identita" className="group flex min-h-11 items-center gap-3 text-sm">
        <ShieldAlert className={cn('h-5 w-5 shrink-0', user.kycStatus === 'REJECTED' ? 'text-danger' : 'text-warning')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-ink">{txt.t}.</span> <span className="text-muted">{txt.d}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  )
}

function TabBar({ onMore }: { onMore: () => void }) {
  return (
    <nav aria-label="Navigazione rapida" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} end={t.end} className={({ isActive }) => cn('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium', isActive ? 'text-accent' : 'text-muted')}>
              <t.icon className="h-5 w-5" aria-hidden />
              {t.label}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={onMore} className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-muted">
            <MenuIcon className="h-5 w-5" aria-hidden />
            Altro
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default function AppLayout() {
  const [more, setMore] = useState(false)
  return (
    <AppShellProvider>
      <div data-app-shell className="min-h-dvh bg-bg text-ink lg:flex">
        <SkipLink />
        <Sidebar groups={APP_NAV} homeTo="/app" />
        <div className="min-w-0 flex-1">
          <Topbar />
          <KycBanner />
          <main id="contenuto" tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
            <AnimatedOutlet />
          </main>
        </div>
        <TabBar onMore={() => setMore(true)} />
        <Drawer open={more} onClose={() => setMore(false)} title="Sezioni">
          <DrawerNav groups={APP_NAV} />
        </Drawer>
        <ShellStyles />
      </div>
    </AppShellProvider>
  )
}
