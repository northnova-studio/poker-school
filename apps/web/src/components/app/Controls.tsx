// Controlli di form e navigazione dell'area riservata: Field, Input, Select, Textarea, Checkbox,
// Segmented (filtri), Tabs accessibili (WAI-ARIA), Menu a tendina.
import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const inputCls =
  'w-full min-h-11 rounded-[var(--r-card)] border border-line bg-surface-2 px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/70 transition-colors hover:border-muted/60 focus:border-accent disabled:opacity-60 aria-[invalid=true]:border-danger'

export interface FieldA11y {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  required,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  children: (a: FieldA11y) => ReactNode
  className?: string
  required?: boolean
}) {
  const id = useId()
  const hintId = hint ? `${id}-h` : undefined
  const errId = error ? `${id}-e` : undefined
  const described = [hintId, errId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-muted" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': described, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...p }: ComponentProps<'input'>) {
  return <input className={cn(inputCls, className)} {...p} />
}
export function Select({ className, children, ...p }: ComponentProps<'select'>) {
  return (
    <select className={cn(inputCls, 'cursor-pointer pr-8', className)} {...p}>
      {children}
    </select>
  )
}
export function Textarea({ className, ...p }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputCls, 'min-h-28 leading-relaxed', className)} {...p} />
}

export function Checkbox({ label, description, className, ...p }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--c-accent)]" aria-describedby={description ? `${id}-d` : undefined} {...p} />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium leading-snug text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div id={`${id}-l`} className="text-sm font-medium text-ink">
          {label}
        </div>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className="relative inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center"
      >
        <span className={cn('relative h-7 w-12 rounded-full border transition-colors', checked ? 'border-accent bg-accent' : 'border-line bg-surface-2')}>
          <span className={cn('absolute top-0.5 h-[1.375rem] w-[1.375rem] rounded-full transition-[left,background-color]', checked ? 'left-[1.4rem] bg-on-accent' : 'left-0.5 bg-muted')} />
        </span>
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-[var(--r-card)] border border-line bg-surface p-0.5', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 shrink-0 whitespace-nowrap rounded-[calc(var(--r-card)-1px)] font-medium transition-colors',
              size === 'sm' ? 'px-2.5 text-[0.82rem]' : 'px-3.5 text-sm',
              on ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length
    if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') n = 0
    if (e.key === 'End') n = tabs.length - 1
    if (n >= 0) {
      e.preventDefault()
      onChange(tabs[n].value)
      refs.current[n]?.focus()
    }
  }
  return (
    <div role="tablist" aria-label={label} className={cn('-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1', className)}>
      {tabs.map((t, i) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${id}-tab-${t.value}`}
            role="tab"
            type="button"
            aria-selected={on}
            aria-controls={`${id}-panel`}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative min-h-11 shrink-0 whitespace-nowrap px-3 text-sm font-medium transition-colors',
              on ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 font-mono text-xs text-muted">{t.count}</span>}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

/** Menu a tendina accessibile (pulsante + lista di azioni). */
export function Menu({ trigger, label, children, align = 'right' }: { trigger: ReactNode; label: string; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    const first = ref.current?.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])
  const onKey = (e: KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    }
  }
  return (
    <div ref={ref} className="relative">
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--r-card)] px-1.5 hover:bg-surface-2">
        {trigger}
      </button>
      {open && (
        <div role="menu" aria-label={label} onKeyDown={onKey} className={cn('absolute top-full z-50 mt-2 w-64 overflow-hidden rounded-[var(--r-card)] border border-line bg-surface py-1.5', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export const menuItemCls = 'flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-ink hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'
