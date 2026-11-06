import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api/client'
import type { RankInfo } from '@/lib/api/types'
import { useAuth } from '@/lib/auth'
import { toast } from './Overlay'

interface AppShell {
  rank: RankInfo | null
  refreshRank(): Promise<RankInfo | null>
  /** Dopo un'azione che dà XP: ricarica il rank e mostra un toast con gli XP guadagnati. */
  celebrate(label?: string): Promise<void>
}

const Ctx = createContext<AppShell | null>(null)

export function AppShellProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [rank, setRank] = useState<RankInfo | null>(null)
  const last = useRef<RankInfo | null>(null)
  const refreshRank = useCallback(async () => {
    try {
      const r = await api.rank.me()
      last.current = r
      setRank(r)
      return r
    } catch {
      return null
    }
  }, [])
  useEffect(() => {
    if (user) void refreshRank()
  }, [user, refreshRank])
  const celebrate = useCallback(
    async (label?: string) => {
      const before = last.current
      const after = await refreshRank()
      if (!before || !after) return
      const gained = after.xp - before.xp
      if (gained > 0) toast.xp(gained, label)
      if (after.tier !== before.tier || after.division !== before.division) toast.success('Promozione!', 'Sei salito di divisione: guarda la ladder nella pagina Rank.')
    },
    [refreshRank],
  )
  const value = useMemo(() => ({ rank, refreshRank, celebrate }), [rank, refreshRank, celebrate])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppShell(): AppShell {
  const v = useContext(Ctx)
  // fuori dall'AppLayout (es. pagine admin) restituisce un fallback inerte
  return v ?? { rank: null, refreshRank: async () => null, celebrate: async () => undefined }
}

// ── Gestionale ───────────────────────────────────────────────────────────────
interface AdminShell {
  kycPending: number
  refreshCounts(): Promise<void>
}
const AdminCtx = createContext<AdminShell>({ kycPending: 0, refreshCounts: async () => undefined })

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [kycPending, setK] = useState(0)
  const refreshCounts = useCallback(async () => {
    try {
      setK((await api.admin.kyc.queue('PENDING')).length)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    void refreshCounts()
  }, [refreshCounts])
  const value = useMemo(() => ({ kycPending, refreshCounts }), [kycPending, refreshCounts])
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>
}
export const useAdminShell = () => useContext(AdminCtx)

/** Ripristino della demo (solo modalità demo): cancella le modifiche locali e ricarica. */
export async function resetDemoData() {
  if (api.mode !== 'demo') return
  const m = await import('@/lib/api/mock')
  m.resetDemo()
  window.location.assign(`${import.meta.env.BASE_URL}accedi`)
}
