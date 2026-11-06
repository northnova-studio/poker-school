export function Spinner({ label = 'Caricamento' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="text-sm">{label}…</span>
    </div>
  )
}
