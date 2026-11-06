import { useState } from 'react'
import { PROOFS } from '@/data/proofs'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ProofLightbox, ProofTile } from '../Proofs'
import { SectionHeading } from '../Section'

const PREVIEW = PROOFS.filter((p) => p.who !== 'Studente').slice(0, 5)

export function ProofsPreview() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section aria-labelledby="prove-title" className="bg-bg py-24 md:py-36">
      <div className="pub-wrap">
        <SectionHeading
          id="prove-title"
          title="Prove, non promesse."
          lede="Screenshot, grafici e video delle nostre sessioni. Li mostriamo come prova di competenza: dicono cosa sappiamo fare, non quanto guadagnerai tu."
        />
        <div className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PREVIEW.map((p, i) => (
            <ProofTile key={p.id} proof={p} onOpen={() => setOpen(i)} className={cn(i === 0 && 'sm:col-span-2 lg:row-span-2 [&>button]:lg:aspect-auto [&>button]:lg:h-[calc(100%-4.5rem)]')} />
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-6">
          <p className="max-w-xl text-sm text-muted">Nickname degli avversari e loghi delle sale sono sempre oscurati.</p>
          <ButtonLink to="/risultati" variant="secondary">
            Tutte le prove
          </ButtonLink>
        </div>
      </div>
      <ProofLightbox items={PREVIEW} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </section>
  )
}
