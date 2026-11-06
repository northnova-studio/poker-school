import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

// GSAP + ScrollTrigger caricati in modo dinamico: non pesano sul JS iniziale.
// Tutti i componenti pubblici passano da qui, così il modulo è uno solo
// (stessa istanza di ScrollTrigger sincronizzata con Lenis nel layout).
type GsapMod = typeof import('gsap')['gsap']
type STMod = typeof import('gsap/ScrollTrigger')['ScrollTrigger']
export interface GsapKit {
  gsap: GsapMod
  ScrollTrigger: STMod
}

let kit: Promise<GsapKit> | null = null
export function loadGsap(): Promise<GsapKit> {
  kit ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, st]) => {
    g.gsap.registerPlugin(st.ScrollTrigger)
    return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger }
  })
  return kit
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Esegue `setup` dentro un gsap.context legato a `scope` dopo il caricamento
 * dinamico di GSAP. Il cleanup revert-a tutto (animazioni e ScrollTrigger).
 * Con prefers-reduced-motion la funzione non viene eseguita: i componenti
 * devono avere uno stato finale leggibile senza animazioni.
 */
export function usePublicGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (k: GsapKit, el: HTMLElement) => void | (() => void),
  deps: unknown[] = [],
) {
  const setupRef = useRef(setup)
  setupRef.current = setup
  // useLayoutEffect: il cleanup (revert dei pin) avviene PRIMA che React rimuova
  // i nodi dal DOM, altrimenti il pin-spacer di ScrollTrigger rompe lo smontaggio.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    let ctx: { revert(): void } | null = null
    let extra: void | (() => void)
    let cancelled = false
    void loadGsap().then((k) => {
      const el = scope.current
      if (cancelled || !el) return
      ctx = k.gsap.context(() => {
        extra = setupRef.current(k, el)
      }, el)
      // nuove sezioni pinnate cambiano l'altezza della pagina
      requestAnimationFrame(() => k.ScrollTrigger.refresh())
    })
    return () => {
      cancelled = true
      if (typeof extra === 'function') extra()
      ctx?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
