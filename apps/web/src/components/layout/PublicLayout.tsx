import { Suspense, lazy, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { SiteHeader } from '@/components/public/SiteHeader'
import { usePublicSmoothScroll } from '@/hooks/usePublicSmoothScroll'
import { prefersReducedMotion } from '@/hooks/usePublicGsap'
import '@/styles/public.css'

// Il footer sta sotto la piega: chunk separato, fuori dal JS iniziale.
const SiteFooter = lazy(() => import('@/components/public/SiteFooter').then((m) => ({ default: m.SiteFooter })))

/** Segnaposto durante il caricamento di una pagina: tre carte coperte. */
function PageLoader() {
  return (
    <div role="status" className="grid min-h-[70vh] place-items-center">
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="pub-card-back block h-12 w-9 animate-pulse" style={{ animationDelay: `${i * 150}ms`, borderWidth: '0.25rem' }} />
        ))}
      </div>
      <span className="sr-only">Caricamento della pagina</span>
    </div>
  )
}

// Motion importato in modo dinamico: oggi il chunk è già in pagina (React vive lì per il
// manualChunks del config), ma così la transizione non vincola il bundle iniziale.
const loadAnimate = () => import('motion/react').then((m) => m.animate)

/**
 * Transizione di pagina con Motion: un sipario di panno copre la vecchia
 * pagina prima del paint e si ritira verso l'alto scoprendo la nuova, che
 * entra in dissolvenza. Solo opacità sul <main>: un transform romperebbe i
 * pin di ScrollTrigger e gli elementi position: fixed.
 */
function usePageTransition(main: RefObject<HTMLElement | null>, curtain: RefObject<HTMLDivElement | null>) {
  const { pathname } = useLocation()
  // pathname precedente: niente sipario al primo caricamento (anche col doppio effetto di StrictMode)
  const prev = useRef(pathname)

  useLayoutEffect(() => {
    if (prev.current === pathname) return
    prev.current = pathname
    const c = curtain.current
    const m = main.current
    if (!c || !m || prefersReducedMotion()) return
    c.style.transform = 'scaleY(1)'
    m.style.opacity = '0'
    let stop = () => {}
    let cancelled = false
    loadAnimate()
      .then((animate) => {
        if (cancelled) return
        const a = animate(c, { transform: ['scaleY(1)', 'scaleY(0)'] }, { duration: 0.65, ease: [0.83, 0, 0.17, 1], delay: 0.05 })
        const b = animate(m, { opacity: [0, 1] }, { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.25 })
        stop = () => {
          a.stop()
          b.stop()
        }
      })
      .catch(() => {
        c.style.transform = ''
        m.style.opacity = ''
      })
    return () => {
      cancelled = true
      stop()
      m.style.opacity = ''
      c.style.transform = ''
    }
  }, [pathname, curtain, main])
}

export default function PublicLayout() {
  const outlet = useOutlet()
  const main = useRef<HTMLElement>(null)
  const curtain = useRef<HTMLDivElement>(null)
  usePublicSmoothScroll()
  usePageTransition(main, curtain)

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-accent focus:px-4 focus:py-3 focus:font-semibold focus:text-on-accent"
      >
        Vai al contenuto
      </a>
      <SiteHeader />
      <main ref={main} id="contenuto" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
      </main>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
      <div ref={curtain} className="pub-curtain pub-felt fixed inset-0 z-[65]" aria-hidden>
        <div className="grid h-full place-items-center">
          <svg viewBox="0 0 36 36" className="h-12 w-12" aria-hidden>
            <rect x="5" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
            <rect x="15" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent)" />
            <rect x="25" y="7" width="6" height="22" rx="1.5" fill="var(--c-accent-2)" />
          </svg>
        </div>
      </div>
    </div>
  )
}
