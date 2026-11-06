// STUB — da implementare (agente "app"): mock completo dell'interfaccia Api
// con dati seed realistici e persistenza in localStorage.
import type { Api } from '../types'

export const mockApi = new Proxy({} as Api, {
  get(_t, prop) {
    if (prop === 'mode') return 'demo'
    return new Proxy(
      {},
      {
        get() {
          return () => Promise.reject(new Error('Mock API non ancora implementata'))
        },
      },
    )
  },
})
