import { useId } from 'react'
import { fmtEur, fmtSignedEur } from '@/lib/app-format'
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Contenitore di sezione: superficie del tema, filo sottile, nessuna ombra. */
export function Panel({
  title,
  meta,
  actions,
  children,
  className,
  bodyClassName,
  as: As = 'section',
  flush,
}: {
  title?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  as?: 'section' | 'div' | 'article' | 'aside'
  flush?: boolean
}) {
  const id = useId()
  return (
    <As className={cn('min-w-0 rounded-[var(--r-card)] border border-line bg-surface', className)} aria-labelledby={title ? id : undefined}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 sm:px-5">
          {title && (
            <h2 id={id} className="font-sans text-[0.95rem] font-semibold tracking-tight text-ink">
              {title}
            </h2>
          )}
          {meta && <span className="text-sm text-muted">{meta}</span>}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-4 sm:p-5', title && !flush && 'pt-3 sm:pt-3', bodyClassName)}>{children}</div>
    </As>
  )
}

export function PageHeader({ title, description, actions, kicker }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4 sm:mb-8">
      <div className="min-w-0 flex-1">
        {kicker && <div className="mb-2 text-sm text-muted">{kicker}</div>}
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink" style={{ fontStretch: '112%' }}>
          {title}
        </h1>
        {description && <p className="mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'ink',
  icon,
  className,
  size = 'md',
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: 'ink' | 'success' | 'danger' | 'accent' | 'warning'
  icon?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const toneCls = { ink: 'text-ink', success: 'text-success', danger: 'text-danger', accent: 'text-accent', warning: 'text-warning' }[tone]
  return (
    <div className={cn('min-w-0 rounded-[var(--r-card)] border border-line bg-surface p-4', className)}>
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon && <span className="text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-2 font-mono font-semibold tracking-tight', toneCls, size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl sm:text-[1.7rem]')}>{value}</div>
      {sub && <div className="mt-1.5 text-sm text-muted">{sub}</div>}
    </div>
  )
}

export function Money({ value, className, decimals }: { value: number; className?: string; decimals?: boolean }) {
  const txt = decimals ? `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmtEur(Math.abs(value), true)}` : fmtSignedEur(value)
  return <span className={cn('font-mono tabular whitespace-nowrap', value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-muted', className)}>{txt}</span>
}

export function Chip({ children, tone = 'muted', className, icon }: { children: ReactNode; tone?: 'muted' | 'accent' | 'success' | 'danger' | 'warning' | 'accent2'; className?: string; icon?: ReactNode }) {
  const t = {
    muted: 'border-line text-muted',
    accent: 'border-accent/50 text-accent',
    accent2: 'border-accent-2/50 text-accent-2',
    success: 'border-success/50 text-success',
    danger: 'border-danger/50 text-danger',
    warning: 'border-warning/50 text-warning',
  }[tone]
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', t, className)}>
      {icon && <span aria-hidden className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      {children}
    </span>
  )
}

export function ProgressBar({ value, max = 100, label, className, tone = 'accent', height = 'h-2' }: { value: number; max?: number; label: string; className?: string; tone?: 'accent' | 'success' | 'accent2'; height?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className={cn('w-full overflow-hidden rounded-full bg-surface-2', height, className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', { accent: 'bg-accent', success: 'bg-success', accent2: 'bg-accent-2' }[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--r-card)] border border-dashed border-line px-6 py-10 text-center">
      <span className="text-muted [&>svg]:h-7 [&>svg]:w-7" aria-hidden>
        {icon ?? <Inbox />}
      </span>
      <div className="font-semibold text-ink">{title}</div>
      {text && <p className="max-w-[46ch] text-sm text-muted">{text}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[var(--r-card)] border border-danger/40 bg-surface px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
      <span className="flex-1 text-ink">{error.message || 'Qualcosa è andato storto.'}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 px-2 font-medium text-accent hover:underline">
          <RotateCcw className="h-4 w-4" aria-hidden /> Riprova
        </button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-[var(--r-card)] bg-surface-2/70', className)} />
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Caricamento" className="space-y-4">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}
