// Punto d'ingresso unico per le API. Usa SEMPRE `import { api } from '@/lib/api/client'`.
// - Se VITE_API_URL è impostata → backend reale (httpApi).
// - Altrimenti → DEMO: mock in-browser con dati seed + localStorage (caricato in lazy,
//   così non pesa sul bundle iniziale).
import type { Api } from './types'
import { httpApi } from './http'

export const isDemo = !import.meta.env.VITE_API_URL

let impl: Promise<Api> | null = null
function load(): Promise<Api> {
  impl ??= isDemo ? import('./mock').then((m) => m.mockApi) : Promise.resolve(httpApi)
  return impl
}

// Proxy pigro: api.auth.login(...) carica l'implementazione al primo uso.
function lazy(path: string[]): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (typeof prop === 'symbol' || prop === 'then') return undefined
      if (path.length === 0 && prop === 'mode') return isDemo ? 'demo' : 'live'
      return lazy([...path, prop])
    },
    apply(_t, _this, args: unknown[]) {
      return load().then((root) => {
        let parent: unknown = null
        let fn: unknown = root
        for (const p of path) {
          parent = fn
          fn = (fn as Record<string, unknown>)[p]
        }
        if (typeof fn !== 'function') throw new Error(`API non disponibile: ${path.join('.')}`)
        return (fn as (...a: unknown[]) => unknown).apply(parent, args)
      })
    },
  })
}

export const api = lazy([]) as Api
export * from './types'
