import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Caricamento dati per l'area riservata. Diverso da useAsync: durante un ricaricamento
 * mantiene i dati precedenti (niente flash di skeleton) ed espone `refreshing`.
 */
export function useData<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)
  const hasData = useRef(false)

  const reload = useCallback(async () => {
    const id = ++seq.current
    if (hasData.current) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const v = await fnRef.current()
      if (id !== seq.current) return
      hasData.current = true
      setData(v)
    } catch (e) {
      if (id === seq.current) setError(e as Error)
    } finally {
      if (id === seq.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, setData, error, loading, refreshing, reload }
}

/** Countdown aggiornato ogni minuto (o ogni secondo sotto l'ora). */
export function useCountdown(targetIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!targetIso) return
    const left = Date.parse(targetIso) - Date.now()
    const t = setInterval(() => setNow(Date.now()), left < 3_600_000 ? 1000 : 30_000)
    return () => clearInterval(t)
  }, [targetIso, now])
  if (!targetIso) return null
  const ms = Math.max(0, Date.parse(targetIso) - now)
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return { ms, d, h, m, s }
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}
