// Componenti di verifica identità condivisi da /registrati e /app/verifica-identita.
// I file restano nel browser fino all'invio; in demo non lasciano mai il dispositivo.
import { useEffect, useId, useRef, useState } from 'react'
import { Camera, FileImage, IdCard, Lock, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react'
import type { DocumentType } from '@/lib/api/types'
import { DOC_LABEL } from '@/lib/app-format'
import { cn } from '@/lib/cn'
import { Checkbox, Field, Input } from './Controls'
import { Modal } from './Overlay'
import { Button } from '@/components/ui/Button'

export interface KycDraft {
  documentType: DocumentType
  last4: string
  front: File | null
  back: File | null
  selfie: File | null
  consent: boolean
}

export const emptyKyc = (): KycDraft => ({ documentType: 'ID_CARD', last4: '', front: null, back: null, selfie: null, consent: false })

export function kycErrors(d: KycDraft): Partial<Record<keyof KycDraft, string>> {
  const e: Partial<Record<keyof KycDraft, string>> = {}
  if (!/^[A-Za-z0-9]{4}$/.test(d.last4)) e.last4 = 'Inserisci esattamente 4 caratteri (cifre o lettere).'
  if (!d.front) e.front = 'Carica il fronte del documento.'
  if (d.documentType !== 'PASSPORT' && !d.back) e.back = 'Carica il retro del documento.'
  if (!d.selfie) e.selfie = 'Serve un selfie con il viso ben visibile.'
  if (!d.consent) e.consent = 'Serve il tuo consenso esplicito per procedere.'
  for (const f of [d.front, d.back, d.selfie]) if (f && f.size > 10 * 1024 * 1024) e.front = `Il file “${f.name}” supera i 10 MB.`
  return e
}

function usePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

export function FileDrop({ label, hint, file, onFile, error, accept = 'image/*,application/pdf' }: { label: string; hint?: string; file: File | null; onFile: (f: File | null) => void; error?: string; accept?: string }) {
  const id = useId()
  const [over, setOver] = useState(false)
  const preview = usePreview(file)
  const input = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-ink" id={`${id}-l`}>
        {label}
      </div>
      {file ? (
        <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface-2/60 p-2.5">
          {preview ? <img src={preview} alt={`Anteprima: ${label}`} className="h-16 w-24 rounded-[4px] object-cover" /> : <FileImage className="m-4 h-8 w-8 text-muted" aria-hidden />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-ink">{file.name}</div>
            <div className="font-mono text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button type="button" onClick={() => onFile(null)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface hover:text-danger" aria-label={`Rimuovi ${label}`}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
          className={cn(
            'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--r-card)] border border-dashed px-4 py-4 text-center transition-colors focus-within:border-accent',
            over ? 'border-accent bg-accent/5' : error ? 'border-danger/60' : 'border-line hover:border-muted',
          )}
        >
          <Upload className="h-5 w-5 text-muted" aria-hidden />
          <span className="text-sm text-ink">
            Trascina qui o <span className="font-semibold text-accent underline underline-offset-2">scegli un file</span>
          </span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
          <input
            ref={input}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            aria-labelledby={`${id}-l`}
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              onFile(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </label>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

/** Selfie con la fotocamera (getUserMedia). Nessun upload: il fotogramma diventa un File locale. */
export function CameraCapture({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (f: File) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<'idle' | 'starting' | 'live' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const start = async () => {
    setState('starting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 } }, audio: false })
      stream.current = s
      if (video.current) {
        video.current.srcObject = s
        await video.current.play().catch(() => undefined)
      }
      setState('live')
    } catch (e) {
      const name = (e as DOMException)?.name
      setMsg(
        name === 'NotAllowedError'
          ? 'Accesso alla fotocamera negato. Puoi consentirlo dalle impostazioni del browser o caricare una foto.'
          : name === 'NotFoundError'
            ? 'Nessuna fotocamera trovata su questo dispositivo: carica una foto.'
            : 'Fotocamera non disponibile in questo browser: carica una foto.',
      )
      setState('error')
    }
  }
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setState('idle')
  }
  useEffect(() => {
    if (open) void start()
    else stop()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    ctx.translate(c.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0)
    c.toBlob(
      (b) => {
        if (!b) return
        onCapture(new File([b], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        onClose()
      },
      'image/jpeg',
      0.88,
    )
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scatta il selfie"
      description="Viso al centro, buona luce, niente occhiali da sole. L’immagine resta sul tuo dispositivo fino all’invio."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={shoot} disabled={state !== 'live'} icon={<Camera className="h-4 w-4" aria-hidden />}>
            Scatta
          </Button>
        </>
      }
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[var(--r-card)] bg-surface-2">
        <video ref={video} playsInline muted className={cn('h-full w-full -scale-x-100 object-cover', state !== 'live' && 'invisible')} aria-label="Anteprima fotocamera" />
        <div aria-hidden className="pointer-events-none absolute inset-[12%_18%] rounded-[50%] border-2 border-dashed border-ink/60" />
        {state === 'starting' && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Attivo la fotocamera…</div>}
        {state === 'error' && (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink">
            <div>
              <p>{msg}</p>
              <button type="button" onClick={start} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-accent">
                <RefreshCw className="h-4 w-4" aria-hidden /> Riprova
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function KycFields({ value, onChange, showErrors }: { value: KycDraft; onChange: (d: KycDraft) => void; showErrors?: boolean }) {
  const [cam, setCam] = useState(false)
  const errs = showErrors ? kycErrors(value) : {}
  const set = <K extends keyof KycDraft>(k: K, v: KycDraft[K]) => onChange({ ...value, [k]: v })
  const selfiePreview = usePreview(value.selfie)
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Tipo di documento</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(DOC_LABEL) as DocumentType[]).map((t) => (
            <label key={t} className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--r-card)] border px-3 transition-colors focus-within:border-accent', value.documentType === t ? 'border-accent bg-accent/8 text-ink' : 'border-line text-muted hover:text-ink')}>
              <input type="radio" name="doctype" value={t} checked={value.documentType === t} onChange={() => onChange({ ...value, documentType: t, back: t === 'PASSPORT' ? null : value.back })} className="h-4 w-4 accent-[var(--c-accent)]" />
              <IdCard className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm font-medium">{DOC_LABEL[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Ultime 4 cifre del numero del documento" hint="Solo le ultime 4: per minimizzare i dati non chiediamo il numero completo." error={errs.last4} required>
        {(a) => <Input {...a} value={value.last4} maxLength={4} inputMode="text" autoComplete="off" className="max-w-40 font-mono uppercase tracking-[0.3em]" onChange={(e) => set('last4', e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4))} />}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FileDrop label="Fronte del documento" hint="JPG, PNG o PDF · max 10 MB" file={value.front} onFile={(f) => set('front', f)} error={errs.front} />
        {value.documentType !== 'PASSPORT' ? (
          <FileDrop label="Retro del documento" hint="JPG, PNG o PDF · max 10 MB" file={value.back} onFile={(f) => set('back', f)} error={errs.back} />
        ) : (
          <div className="flex items-center rounded-[var(--r-card)] border border-dashed border-line p-4 text-sm text-muted">Per il passaporto basta la pagina con la foto.</div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium text-ink">Selfie</div>
        <div className="flex flex-wrap items-center gap-3">
          {selfiePreview ? (
            <img src={selfiePreview} alt="Anteprima selfie" className="h-24 w-20 rounded-[var(--r-card)] object-cover" />
          ) : (
            <div className="grid h-24 w-20 place-items-center rounded-[var(--r-card)] border border-dashed border-line text-muted">
              <Camera className="h-6 w-6" aria-hidden />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setCam(true)} icon={<Camera className="h-4 w-4" aria-hidden />}>
              {value.selfie ? 'Rifai con la fotocamera' : 'Usa la fotocamera'}
            </Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-card)] px-3 text-sm font-semibold text-ink focus-within:outline-2 focus-within:outline-accent hover:text-accent">
              <Upload className="h-4 w-4" aria-hidden /> Carica una foto
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => e.target.files?.[0] && set('selfie', e.target.files[0])} />
            </label>
            {value.selfie && (
              <button type="button" onClick={() => set('selfie', null)} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted hover:text-danger">
                <Trash2 className="h-4 w-4" aria-hidden /> Rimuovi
              </button>
            )}
          </div>
        </div>
        {errs.selfie && <p className="mt-1.5 text-xs font-medium text-danger">{errs.selfie}</p>}
      </div>

      <KycNotice />

      <div>
        <Checkbox
          checked={value.consent}
          onChange={(e) => set('consent', e.target.checked)}
          label="Acconsento al trattamento dei miei dati e delle immagini del documento per la verifica dell’identità e della maggiore età."
          description="Consenso esplicito e revocabile. Senza verifica non possiamo attivare staking e lezioni live."
        />
        {errs.consent && <p className="mt-1.5 pl-8 text-xs font-medium text-danger">{errs.consent}</p>}
      </div>
      <CameraCapture open={cam} onClose={() => setCam(false)} onCapture={(f) => set('selfie', f)} />
    </div>
  )
}

export function KycNotice({ demo = true }: { demo?: boolean }) {
  return (
    <details className="group rounded-[var(--r-card)] border border-line bg-surface-2/40 px-4 py-3 text-sm">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 font-medium text-ink">
        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden /> Informativa breve sulla verifica (GDPR)
        <span className="ml-auto text-xs text-muted group-open:hidden">Apri</span>
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
        <li>Finalità: verificare identità e maggiore età. Base giuridica: consenso e obblighi di legge.</li>
        <li>Dati minimi: tipo di documento, ultime 4 cifre, immagini di fronte/retro e selfie.</li>
        <li>Accesso solo agli amministratori della scuola; ogni apertura dei file viene registrata.</li>
        <li>I file vengono cancellati dopo l’esito della verifica; resta solo lo stato (verificato/rifiutato).</li>
        <li>Puoi chiedere accesso, rettifica o cancellazione scrivendo alla scuola.</li>
        {demo && (
          <li className="flex items-start gap-1.5 text-ink">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> In questa demo i file non lasciano il tuo browser.
          </li>
        )}
      </ul>
    </details>
  )
}
