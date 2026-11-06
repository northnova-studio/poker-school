import { isDemo } from '@/lib/api/client'
// Banner discreto: in demo nessun dato lascia il browser.
export function DemoBanner() {
  if (!isDemo) return null
  return (
    <div className="fixed bottom-3 left-3 z-[60] rounded-full border border-line bg-surface/90 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-wider text-muted backdrop-blur">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" />
      Demo · i dati restano nel tuo browser
    </div>
  )
}
