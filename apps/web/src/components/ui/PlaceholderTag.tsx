import { cn } from '@/lib/cn'
// Etichetta mostrata accanto ai dati di esempio (placeholder: true). DA RIMUOVERE coi dati reali.
export function PlaceholderTag({ show = true, className }: { show?: boolean; className?: string }) {
  if (!show) return null
  return (
    <span
      title="Dato di esempio: da sostituire con i dati reali"
      className={cn('ml-1.5 inline-block rounded-sm border border-dashed border-muted/60 px-1 py-px align-middle font-mono text-[0.6rem] uppercase tracking-wider text-muted', className)}
    >
      esempio
    </span>
  )
}
