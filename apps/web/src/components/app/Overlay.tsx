// Modal accessibile (dialog nativo: focus trap, Esc, sfondo inerte) e Toast con regione aria-live.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, Info, Sparkles, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const opener = useRef<Element | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement
      d.showModal()
    }
    if (!open && d.open) {
      d.close()
      ;(opener.current as HTMLElement | null)?.focus?.()
    }
  }, [open])
  useEffect(() => () => ref.current?.close(), [])
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-[var(--r-card)] border border-line bg-surface p-0 text-ink backdrop:bg-bg/80 backdrop:backdrop-blur-[2px]',
        'open:animate-[dlg-in_.22s_ease-out]',
        w,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-t`} className="font-display text-xl font-bold tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={`${id}-d`} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface-2 hover:text-ink">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
      <style>{`@keyframes dlg-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){dialog{animation:none!important}}`}</style>
    </dialog>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────
type Tone = 'success' | 'error' | 'info' | 'xp'
interface ToastItem {
  id: number
  tone: Tone
  title: string
  text?: string
}
let items: ToastItem[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
function push(tone: Tone, title: string, text?: string, ms = 4200) {
  const id = ++seq
  items = [...items.slice(-3), { id, tone, title, text }]
  emit()
  setTimeout(() => dismiss(id), ms)
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}
export const toast = {
  success: (title: string, text?: string) => push('success', title, text),
  error: (title: string, text?: string) => push('error', title, text, 6000),
  info: (title: string, text?: string) => push('info', title, text),
  xp: (xp: number, text?: string) => push('xp', `+${xp} XP`, text, 5000),
}

export function Toaster() {
  const list = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => items,
    () => items,
  )
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const icon = { success: CheckCircle2, error: XCircle, info: Info, xp: Sparkles }
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-3 bottom-24 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end lg:bottom-6">
      <AnimatePresence initial={false}>
        {list.map((t) => {
          const I = icon[t.tone]
          return (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--r-card)] border bg-surface px-4 py-3',
                t.tone === 'error' ? 'border-danger/50' : t.tone === 'xp' ? 'border-accent/60' : 'border-line',
              )}
            >
              <I className={cn('mt-0.5 h-5 w-5 shrink-0', { success: 'text-success', error: 'text-danger', info: 'text-accent-3', xp: 'text-accent' }[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className={cn('text-sm font-semibold', t.tone === 'xp' ? 'font-mono text-accent' : 'text-ink')}>{t.title}</div>
                {t.text && <div className="mt-0.5 text-sm text-muted">{t.text}</div>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Chiudi notifica" className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-ink">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Mostra un errore di API come toast con il messaggio italiano dell'ApiError. */
export function toastError(e: unknown, fallback = 'Operazione non riuscita') {
  toast.error(fallback, e instanceof Error ? e.message : undefined)
}
