import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api/client'
import type { RegisterInput, User } from '@/lib/api/types'

interface AuthState {
  user: User | null
  loading: boolean
  login(email: string, password: string): Promise<User>
  register(input: RegisterInput): Promise<User>
  demoLogin(as: 'STUDENT' | 'ADMIN'): Promise<User>
  logout(): Promise<void>
  refresh(): Promise<void>
  setUser(u: User | null): void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setUser(await api.auth.me())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setUser,
      refresh,
      async login(email, password) {
        const r = await api.auth.login(email, password)
        setUser(r.user)
        return r.user
      },
      async register(input) {
        const r = await api.auth.register(input)
        setUser(r.user)
        return r.user
      },
      async demoLogin(as) {
        if (api.mode !== 'demo') throw new Error('Accesso demo disponibile solo in modalità demo')
        const r = await api.auth.demoLogin!(as)
        setUser(r.user)
        return r.user
      },
      async logout() {
        await api.auth.logout()
        setUser(null)
      },
    }),
    [user, loading, refresh],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuori da AuthProvider')
  return v
}
