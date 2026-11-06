import { useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Proof } from '@/data/proofs'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { FORMAT_LABEL } from '@/lib/format'
import { publicScrollLock } from '@/hooks/usePublicSmoothScroll'
import { ProofSlot, asset, proofMonth } from './Proofs'

/** Lightbox accessibile: Esc chiude, frecce navigano, focus intrappolato. */
export default function ProofLightbox({ items, index, onClose, onIndex }: { items: Proof[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const open = index !== null
  const proof = open ? items[index] : null

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement as HTMLElement
    publicScrollLock(true)
    const t = setTimeout(() => box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 30)
    return () => {
      clearTimeout(t)
      publicScrollLock(false)
      lastFocus.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
      if (e.key === 'Tab' && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>('button, iframe, video, a')
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, onIndex])

  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {proof && index !== null && (
        <motion.div
          ref={box}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 z-[90] flex flex-col bg-bg/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          data-lenis-prevent
        >
          <div className="pub-wrap flex h-[72px] shrink-0 items-center justify-between gap-4">
            <p className="font-mono text-sm text-muted tabular">
              {index + 1} / {items.length}
            </p>
            <button type="button" data-autofocus onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink hover:border-accent" aria-label="Chiudi">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pub-wrap flex min-h-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => onIndex((index - 1 + items.length) % items.length)}
              className="hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-accent sm:grid"
              aria-label="Prova precedente"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <motion.div
              key={proof.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto aspect-video max-h-full w-full max-w-5xl overflow-hidden border border-line"
              style={{ borderRadius: 'var(--r-card)' }}
            >
              {!proof.src ? (
                <ProofSlot proof={proof} large />
              ) : proof.kind === 'image' ? (
                <img src={asset(proof.src)} alt={`${proof.title}, ${proof.who}`} className="h-full w-full object-contain" />
              ) : proof.kind === 'video' ? (
                <video src={asset(proof.src)} controls playsInline className="h-full w-full bg-bg object-contain" aria-label={proof.title} />
              ) : (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${proof.src}?rel=0`}
                  title={proof.title}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
            </motion.div>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % items.length)}
              className="hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-accent sm:grid"
              aria-label="Prova successiva"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pub-wrap shrink-0 py-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="lightbox-title" className="pub-h3 text-2xl text-ink">
                  {proof.title}
                  <PlaceholderTag show={proof.placeholder} />
                </h2>
                <p className="mt-1 text-muted">
                  {proof.who}, {FORMAT_LABEL[proof.format]}, {proof.tag}, {proofMonth(proof.date)}
                </p>
                <p className="mt-2 max-w-2xl text-sm text-muted">{proof.caption}</p>
              </div>
              <div className="flex gap-2 sm:hidden">
                <button type="button" onClick={() => onIndex((index - 1 + items.length) % items.length)} className="grid h-12 w-12 place-items-center rounded-full border border-line" aria-label="Prova precedente">
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button type="button" onClick={() => onIndex((index + 1) % items.length)} className="grid h-12 w-12 place-items-center rounded-full border border-line" aria-label="Prova successiva">
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </MotionConfig>
  )
}
