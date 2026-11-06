// Layout del gestionale: sidebar distinta "Gestionale" con badge delle verifiche in coda.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, CalendarDays, Coins, GraduationCap, LayoutGrid, Menu as MenuIcon, ScanFace, Users, Wallet, ArrowLeftRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { AdminShellProvider, useAdminShell } from '@/components/app/AppContext'
import { AnimatedOutlet, Drawer, DrawerNav, ShellStyles, Sidebar, SkipLink, UserMenu } from '@/components/app/Shell'
import type { NavGroup } from '@/components/app/Shell'

function useNav(): NavGroup[] {
  const { kycPending } = useAdminShell()
  return [
    {
      label: 'Gestionale',
      items: [
        { to: '/admin', label: 'Panoramica', icon: LayoutGrid, end: true },
        { to: '/admin/giocatori', label: 'Giocatori', icon: Users },
        { to: '/admin/kyc', label: 'Verifiche KYC', icon: ScanFace, badge: kycPending },
      ],
    },
    {
      label: 'Soldi',
      items: [
        { to: '/admin/staking', label: 'Staking', icon: Coins },
        { to: '/admin/finanze', label: 'Finanze', icon: Wallet },
      ],
    },
    {
      label: 'Scuola',
      items: [
        { to: '/admin/corsi', label: 'Corsi e vendite', icon: GraduationCap },
        { to: '/admin/lezioni', label: 'Lezioni', icon: CalendarDays },
        { to: '/admin/contenuti', label: 'Contenuti', icon: BookOpenCheck },
      ],
    },
  ]
}

function Inner() {
  const nav = useNav()
  const [open, setOpen] = useState(false)
  return (
    <div data-app-shell className="min-h-dvh bg-bg text-ink lg:flex">
      <SkipLink />
      <Sidebar
        groups={nav}
        homeTo="/admin"
        title="Gestionale"
        footer={
          <Link to="/app" className="mb-1 flex min-h-11 items-center gap-3 rounded-[var(--r-card)] px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeftRight className="h-[18px] w-[18px]" aria-hidden /> Area studente
          </Link>
        }
      />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 lg:hidden" aria-label="Panoramica gestionale">
              <Logo compact />
              <span className="font-display text-lg font-bold">Gestionale</span>
            </Link>
            <span className="hidden text-sm text-muted lg:block">Dati riservati agli amministratori · accessi registrati</span>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/app" className="hidden min-h-11 items-center gap-1.5 rounded-[var(--r-card)] px-3 text-sm font-medium text-muted hover:text-ink md:inline-flex">
                <ArrowLeftRight className="h-4 w-4" aria-hidden /> Area studente
              </Link>
              <UserMenu />
              <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] hover:bg-surface-2 lg:hidden" aria-label="Apri il menu del gestionale">
                <MenuIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </header>
        <main id="contenuto" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
          <AnimatedOutlet />
        </main>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Gestionale">
        <DrawerNav groups={[...nav, { label: 'Altro', items: [{ to: '/app', label: 'Area studente', icon: ArrowLeftRight }] }]} />
      </Drawer>
      <ShellStyles />
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AdminShellProvider>
      <Inner />
    </AdminShellProvider>
  )
}
