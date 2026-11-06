import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { loadGsap, prefersReducedMotion } from './usePublicGsap'

type LenisT = InstanceType<typeof import('lenis')['default']>
let lenis: LenisT | null = null

/** Istanza Lenis attiva (null con reduced motion o prima del caricamento). */
export const getLenis = () => lenis

export function publicScrollLock(lock: boolean) {
  if (lenis) {
    if (lock) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}

/**
 * Smooth scroll Lenis sincronizzato con GSAP ScrollTrigger, solo nel layout
 * pubblico. Caricato dopo il primo paint (import dinamico) e disattivato con
 * prefers-reduced-motion.
 */
export function usePublicSmoothScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (prefersReducedMotion()) return
    let cancelled = false
    let tick: ((t: number) => void) | null = null
    let gsapRef: Awaited<ReturnType<typeof loadGsap>> | null = null
    const start = async () => {
      const [{ default: Lenis }, k] = await Promise.all([import('lenis'), loadGsap()])
      if (cancelled) return
      gsapRef = k
      lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.4 })
      lenis.on('scroll', k.ScrollTrigger.update)
      tick = (t: number) => lenis?.raf(t * 1000)
      k.gsap.ticker.add(tick)
      k.gsap.ticker.lagSmoothing(0)
    }
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    if (idle) idle(() => void start())
    else setTimeout(() => void start(), 200)
    return () => {
      cancelled = true
      if (tick && gsapRef) gsapRef.gsap.ticker.remove(tick)
      lenis?.destroy()
      lenis = null
    }
  }, [])

  // cambio pagina: torna in cima (anche con Lenis) e ricalcola i trigger
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        setTimeout(() => {
          if (lenis) lenis.scrollTo(el, { offset: -80 })
          else el.scrollIntoView()
        }, 350)
        return
      }
    }
    lenis?.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
  }, [pathname, hash])
}
