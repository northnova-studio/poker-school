// Client HTTP verso il backend reale (apps/api). Questo file È la specifica
// degli endpoint REST: metodo + path + body. Il backend deve rispettarli.
// Base URL: VITE_API_URL (es. https://api.tris.poker). Prefisso: /api/v1
import type { Api, AuthResponse, ID, KycSubmitInput, User } from './types'
import { ApiError } from './types'

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`
const ACCESS = 'tris.access'
const REFRESH = 'tris.refresh'

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
}

function saveTokens(r: AuthResponse) {
  store.set(ACCESS, r.accessToken)
  store.set(REFRESH, r.refreshToken)
  return r
}

let refreshing: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
  const rt = store.get(REFRESH)
  if (!rt) return false
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      saveTokens((await res.json()) as AuthResponse)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function req<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = {}
  const token = store.get(ACCESS)
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  if (res.status === 401 && retry && (await tryRefresh())) return req<T>(method, path, body, false)
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string } }
    throw new ApiError(res.status, err.error?.code ?? 'HTTP_ERROR', err.error?.message ?? `Errore ${res.status}`)
  }
  return data as T
}

const qs = (o?: object) => {
  if (!o) return ''
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

const get = <T>(p: string) => req<T>('GET', p)
const post = <T>(p: string, b?: unknown) => req<T>('POST', p, b ?? {})
const patch = <T>(p: string, b: unknown) => req<T>('PATCH', p, b)
const del = <T>(p: string) => req<T>('DELETE', p)

export const httpApi: Api = {
  mode: 'live',

  auth: {
    register: async (input) => saveTokens(await post<AuthResponse>('/auth/register', input)),
    login: async (email, password) => saveTokens(await post<AuthResponse>('/auth/login', { email, password })),
    logout: async () => {
      await post('/auth/logout', { refreshToken: store.get(REFRESH) }).catch(() => undefined)
      store.set(ACCESS, null)
      store.set(REFRESH, null)
    },
    me: async () => (store.get(ACCESS) ? get<User>('/auth/me').catch(() => null) : null),
    updateProfile: (p) => patch('/me', p),
  },

  kyc: {
    submit: (input: KycSubmitInput) => {
      const fd = new FormData()
      fd.set('documentType', input.documentType)
      fd.set('documentNumberLast4', input.documentNumberLast4)
      fd.set('consent', String(input.consent))
      fd.set('front', input.front)
      if (input.back) fd.set('back', input.back)
      fd.set('selfie', input.selfie)
      return post('/kyc', fd) // multipart/form-data
    },
    mine: () => get('/kyc/me'),
  },

  public: {
    coaches: () => get('/public/coaches'),
    stats: () => get('/public/stats'),
    leaderboard: (limit) => get(`/public/leaderboard${qs({ limit })}`),
  },

  plans: {
    list: () => get('/plans'),
    subscribe: (planId, interval) => post('/billing/subscribe', { planId, interval }),
  },

  courses: {
    list: (f) => get(`/courses${qs(f)}`),
    get: (slug) => get(`/courses/${encodeURIComponent(slug)}`),
    checkout: (courseId) => post(`/courses/${courseId}/checkout`),
    myPurchases: () => get('/me/purchases'),
    progress: (courseId) => get(`/courses/${courseId}/progress`),
    completeLesson: (courseId, lessonId) => post(`/courses/${courseId}/lessons/${lessonId}/complete`),
    videoAccess: (courseId, lessonId) => get(`/courses/${courseId}/lessons/${lessonId}/video`),
  },

  lessons: {
    list: (range) => get(`/lessons${qs(range)}`),
    book: (id) => post(`/lessons/${id}/book`),
    cancel: (id) => del(`/lessons/${id}/book`),
  },

  sessions: {
    list: () => get('/me/sessions'),
    create: (input) => post('/me/sessions', input),
    remove: (id) => del(`/me/sessions/${id}`),
  },

  stats: {
    me: (period, format) => get(`/me/stats${qs({ period, format })}`),
  },

  rank: {
    me: () => get('/me/rank'),
    leaderboard: (o) => get(`/leaderboard${qs(o)}`),
    xpEvents: () => get('/me/xp'),
  },

  card: {
    me: () => get('/me/card'),
    get: (userId) => get(`/cards/${userId}`),
  },

  dailySpot: {
    today: () => get('/daily-spot/today'),
    answer: (spotId, optionId) => post(`/daily-spot/${spotId}/answer`, { optionId }),
    streaks: () => get('/daily-spot/streaks'),
  },

  roast: {
    current: () => get('/roast/current'),
    vote: (spotId, kind) => post(`/roast/${spotId}/vote`, { kind }),
    submit: (input) => post('/roast', input),
  },

  deepRuns: {
    list: (o) => get(`/deep-runs${qs(o)}`),
    create: (input) => post('/deep-runs', input),
    update: (id, p) => patch(`/deep-runs/${id}`, p),
    rail: (id) => post(`/deep-runs/${id}/rail`),
    comment: (id, text) => post(`/deep-runs/${id}/comments`, { text }),
  },

  gaming: {
    events: () => get('/gaming/events'),
    join: (id) => post(`/gaming/events/${id}/join`),
    leave: (id) => del(`/gaming/events/${id}/join`),
    leaderboard: () => get('/gaming/leaderboard'),
  },

  handReviews: {
    mine: () => get('/me/hand-reviews'),
    create: (input) => post('/me/hand-reviews', input),
  },

  admin: {
    overview: () => get('/admin/overview'),
    players: {
      list: (f) => get(`/admin/players${qs(f)}`),
      get: (userId: ID) => get(`/admin/players/${userId}`),
      update: (userId, p) => patch(`/admin/players/${userId}`, p),
      addNote: (userId, text) => post(`/admin/players/${userId}/notes`, { text }),
      updateCard: (userId, attributes) => patch(`/admin/players/${userId}/card`, { attributes }),
    },
    kyc: {
      queue: (status) => get(`/admin/kyc${qs({ status })}`),
      // il backend restituisce { url } firmato e a scadenza breve
      fileUrl: async (submissionId, fileId) =>
        (await get<{ url: string }>(`/admin/kyc/${submissionId}/files/${fileId}`)).url,
      review: (id, decision, reason) => post(`/admin/kyc/${id}/review`, { decision, reason }),
    },
    staking: {
      deals: () => get('/admin/staking/deals'),
      create: (input) => post('/admin/staking/deals', input),
      update: (id, p) => patch(`/admin/staking/deals/${id}`, p),
      ledger: (dealId) => get(`/admin/staking/deals/${dealId}/ledger`),
      addEntry: (dealId, input) => post(`/admin/staking/deals/${dealId}/ledger`, input),
      settle: (dealId) => post(`/admin/staking/deals/${dealId}/settle`),
    },
    finance: {
      summary: (r) => get(`/admin/finance/summary${qs(r)}`),
      transactions: (r) => get(`/admin/finance/transactions${qs(r)}`),
      addTransaction: (input) => post('/admin/finance/transactions', input),
      removeTransaction: (id) => del(`/admin/finance/transactions/${id}`),
    },
    courses: {
      sales: () => get('/admin/courses/sales'),
    },
    lessons: {
      create: (input) => post('/admin/lessons', input),
      update: (id, p) => patch(`/admin/lessons/${id}`, p),
      remove: (id) => del(`/admin/lessons/${id}`),
    },
    handReviews: {
      queue: () => get('/admin/hand-reviews'),
      reply: (id, comment) => post(`/admin/hand-reviews/${id}/reply`, { comment }),
    },
    dailySpots: {
      create: (input) => post('/admin/daily-spots', input),
    },
  },
}
