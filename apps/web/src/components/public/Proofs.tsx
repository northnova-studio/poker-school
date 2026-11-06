import { Suspense, lazy, useEffect, useState } from 'react'
import { ImageIcon, Play, Video } from 'lucide-react'
import type { Proof } from '@/data/proofs'
import { PlaceholderTag } from '@/components/ui/PlaceholderTag'
import { FORMAT_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'

export const proofMonth = (ym: string) => {
  const [y, mo] = ym.split('-').map(Number)
  return new Date(y, (mo || 1) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}
export const asset = (src: string) => `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`

const SLOT_TEXT: Record<Proof['kind'], string> = {
  image: 'Inserisci qui lo screenshot',
  video: 'Inserisci qui la clip',
  youtube: 'Inserisci qui l’ID del video YouTube',
}

/** Slot vuoto disegnato: crocini di taglio, griglia e istruzioni. */
export function ProofSlot({ proof, large = false }: { proof: Proof; large?: boolean }) {
  const Icon = proof.kind === 'image' ? ImageIcon : proof.kind === 'video' ? Video : Play
  return (
    <div className="pub-slot relative flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="pub-crop tl" aria-hidden />
      <span className="pub-crop tr" aria-hidden />
      <span className="pub-crop bl" aria-hidden />
      <span className="pub-crop br" aria-hidden />
      <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-accent/70 bg-bg/60 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn('font-display font-extrabold text-ink', large ? 'text-2xl' : 'text-base')}>{SLOT_TEXT[proof.kind]}</span>
      {large && <span className="max-w-sm text-sm text-muted">{proof.caption}</span>}
      <span className="rounded-sm bg-bg/70 px-2 py-1 font-mono text-[0.7rem] text-muted">
        {proof.kind === 'youtube' ? 'kind: youtube, src: ID' : `public/proofs/${proof.id}.${proof.kind === 'video' ? 'mp4' : 'jpg'}`}
      </span>
    </div>
  )
}

function ProofThumb({ proof }: { proof: Proof }) {
  if (!proof.src) return <ProofSlot proof={proof} />
  if (proof.kind === 'image') return <img src={asset(proof.src)} alt={`${proof.title}, ${proof.who}`} loading="lazy" className="h-full w-full object-cover" />
  if (proof.kind === 'youtube')
    return (
      <span className="relative block h-full w-full">
        <img src={`https://i.ytimg.com/vi/${proof.src}/hqdefault.jpg`} alt={`Anteprima video: ${proof.title}`} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent">
            <Play className="h-6 w-6" aria-hidden />
          </span>
        </span>
      </span>
    )
  return <video src={asset(proof.src)} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label={proof.title} />
}

export function ProofTile({ proof, onOpen, className }: { proof: Proof; onOpen: () => void; className?: string }) {
  return (
    <figure className={cn('group', className)}>
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden border border-line text-left transition-[border-color] duration-300 hover:border-accent"
        style={{ borderRadius: 'var(--r-card)' }}
        aria-label={`Apri: ${proof.title}, ${proof.who}`}
      >
        <ProofThumb proof={proof} />
      </button>
      <figcaption className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-ink">
            {proof.title}
            <PlaceholderTag show={proof.placeholder} />
          </span>
          <span className="shrink-0 text-sm text-muted">{proof.who}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {FORMAT_LABEL[proof.format]}, {proof.tag}, {proofMonth(proof.date)}
        </p>
      </figcaption>
    </figure>
  )
}

const LightboxImpl = lazy(() => import('./ProofLightbox'))

/** Lightbox caricato solo al primo click: Motion resta fuori dal bundle iniziale. */
export function ProofLightbox(props: { items: Proof[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (props.index !== null) setArmed(true)
  }, [props.index])
  if (!armed && props.index === null) return null
  return (
    <Suspense fallback={null}>
      <LightboxImpl {...props} />
    </Suspense>
  )
}
