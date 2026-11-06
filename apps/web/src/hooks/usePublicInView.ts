import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** true quando l'elemento entra nel viewport (una sola volta di default). */
export function usePublicInView(ref: RefObject<Element | null>, opts: { once?: boolean; margin?: string; threshold?: number } = {}) {
  const { once = true, margin = '0px 0px -12% 0px', threshold = 0.15 } = opts
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) setInView(false)
      },
      { rootMargin: margin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, once, margin, threshold])
  return inView
}

/** Luce che segue il puntatore: scrive --mx/--my sull'elemento (niente re-render). */
export function usePublicLamp(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(pointer: coarse)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
    }
  }, [ref])
}
