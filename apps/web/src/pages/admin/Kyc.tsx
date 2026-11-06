import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, FileX2, Lock, Minus, Plus, RotateCcw, ShieldCheck, X, ZoomIn } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { KycSubmission, User } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { DOC_LABEL, fmtRelative } from '@/lib/app-format'
import { fmtDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { Field, Segmented, Textarea } from '@/components/app/Controls'
import { Modal, toast, toastError } from '@/components/app/Overlay'
import { useAdminShell } from '@/components/app/AppContext'
import { KycChip } from '@/components/admin/AdminBits'

type Item = KycSubmission & { user: Pick<User, 'id' | 'nickname' | 'firstName' | 'lastName' | 'email'> }
type Filter = 'PENDING' | 'REJECTED' | 'APPROVED' | 'ALL'
const KIND_LABEL = { FRONT: 'Fronte', BACK: 'Retro', SELFIE: 'Selfie' }
const QUICK = ['Foto del documento sfocata: carica un’immagine leggibile.', 'Il selfie non corrisponde alla foto del documento.', 'Documento scaduto.', 'Mancano il retro o una parte del documento.']

export default function Kyc() {
  const { refreshCounts } = useAdminShell()
  const [filter, setFilter] = useState<Filter>('PENDING')
  const { data, loading, error, reload, refreshing } = useData(() => api.admin.kyc.queue(filter === 'ALL' ? undefined : filter), [filter])
  const [sel, setSel] = useState<string | null>(null)
  const current = data?.find((x) => x.id === sel) ?? data?.[0] ?? null

  if (loading && !data) return <PageSkeleton />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <PageHeader title="Verifiche KYC" description="Controlla documento e selfie, poi approva o rifiuta con un motivo chiaro. Solo gli admin vedono questa pagina." />
      <aside className="flex gap-3 rounded-[var(--r-card)] border border-line bg-surface px-4 py-3 text-sm" aria-label="Nota GDPR">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-muted">
          <span className="font-semibold text-ink">Dati personali sensibili.</span> Ogni apertura di un file viene registrata (chi, quando, quale file). I documenti vengono eliminati subito dopo l’esito, come da policy di conservazione: resta solo lo stato della verifica.
          {api.mode === 'demo' && ' In demo le immagini sono fac-simile generati nel browser.'}
        </p>
      </aside>
      <Segmented
        label="Filtra le verifiche"
        value={filter}
        onChange={(f) => {
          setFilter(f)
          setSel(null)
        }}
        options={[
          { value: 'PENDING', label: 'In attesa' },
          { value: 'REJECTED', label: 'Rifiutate' },
          { value: 'APPROVED', label: 'Approvate' },
          { value: 'ALL', label: 'Tutte' },
        ]}
      />
      <div className={cn('grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]', refreshing && 'opacity-70')}>
        <Panel title="Coda" meta={`${data?.length ?? 0}`} flush>
          {data?.length ? (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {data.map((k) => (
                <li key={k.id}>
                  <button type="button" onClick={() => setSel(k.id)} aria-current={current?.id === k.id ? 'true' : undefined} className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5', current?.id === k.id ? 'bg-surface-2' : 'hover:bg-surface-2/50')}>
                    <Avatar seed={k.user.nickname.toLowerCase()} label={k.user.nickname} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{k.user.nickname}</div>
                      <div className="truncate text-xs text-muted">
                        {DOC_LABEL[k.documentType]} · {fmtRelative(k.submittedAt)}
                      </div>
                    </div>
                    <KycChip s={k.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState icon={<ShieldCheck />} title={filter === 'PENDING' ? 'Coda vuota' : 'Nessuna verifica'} text={filter === 'PENDING' ? 'Tutte le verifiche sono state esaminate.' : undefined} />
            </div>
          )}
        </Panel>
        {current ? (
          <Detail
            key={current.id}
            k={current}
            onDone={async () => {
              await reload()
              await refreshCounts()
              setSel(null)
            }}
          />
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </div>
  )
}

function Detail({ k, onDone }: { k: Item; onDone: () => Promise<void> }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const [viewer, setViewer] = useState<string | null>(null)
  const [reject, setReject] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = k.status === 'PENDING'

  useEffect(() => {
    if (!pending) return
    let alive = true
    void (async () => {
      const out: Record<string, string | null> = {}
      for (const f of k.files) {
        try {
          out[f.fileId] = await api.admin.kyc.fileUrl(k.id, f.fileId)
        } catch {
          out[f.fileId] = null
        }
      }
      if (alive) setUrls(out)
    })()
    return () => {
      alive = false
    }
  }, [k, pending])

  const review = async (decision: 'APPROVED' | 'REJECTED') => {
    setBusy(true)
    try {
      await api.admin.kyc.review(k.id, decision, decision === 'REJECTED' ? reason : undefined)
      toast.success(decision === 'APPROVED' ? `${k.user.nickname} verificato` : `Verifica di ${k.user.nickname} rifiutata`, 'File eliminati secondo la policy.')
      setReject(false)
      await onDone()
    } catch (e) {
      toastError(e, 'Esito non salvato')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar seed={k.user.nickname.toLowerCase()} label={k.user.nickname} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {k.user.firstName} {k.user.lastName}
          </h2>
          <div className="text-sm text-muted">
            <Link to={`/admin/giocatori/${k.userId}`} className="text-accent hover:underline">
              {k.user.nickname}
            </Link>{' '}
            · {k.user.email}
          </div>
        </div>
        <KycChip s={k.status} />
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Documento</dt>
          <dd className="text-ink">{DOC_LABEL[k.documentType]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Ultime 4 cifre</dt>
          <dd className="font-mono text-ink">{k.documentNumberLast4}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Inviato</dt>
          <dd className="text-ink">{fmtDateTime(k.submittedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Provider</dt>
          <dd className="text-ink">{k.provider === 'MANUAL' ? 'Revisione manuale' : k.provider}</dd>
        </div>
      </dl>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-ink">File</h3>
      {pending ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {k.files.map((f) => {
            const url = urls[f.fileId]
            return (
              <li key={f.fileId}>
                <button type="button" disabled={!url} onClick={() => setViewer(f.fileId)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--r-card)] border border-line bg-surface-2" aria-label={`Apri ${KIND_LABEL[f.kind]} con zoom`}>
                  {url === undefined && <span className="absolute inset-0 grid place-items-center text-xs text-muted">Carico…</span>}
                  {url === null && <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted">File non disponibile in questa sessione</span>}
                  {url && <img src={url} alt={`${KIND_LABEL[f.kind]} del documento di ${k.user.nickname}`} className={cn('h-full w-full', f.kind === 'SELFIE' ? 'object-cover' : 'object-contain')} />}
                  {url && (
                    <span className="absolute right-2 top-2 rounded-full bg-bg/80 p-1.5 text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ZoomIn className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </button>
                <div className="mt-1.5 flex justify-between text-xs text-muted">
                  <span>{KIND_LABEL[f.kind]}</span>
                  <span className="font-mono">{Math.round(f.sizeBytes / 1024)} KB</span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-dashed border-line p-4 text-sm text-muted">
          <FileX2 className="h-5 w-5" aria-hidden />
          File eliminati dopo l’esito ({k.reviewedAt ? fmtDateTime(k.reviewedAt) : '—'}). Restano solo i metadati.
        </div>
      )}

      {k.rejectionReason && (
        <p className="mt-4 rounded-[var(--r-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Motivo del rifiuto:</span> {k.rejectionReason}
        </p>
      )}

      {pending && (
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-5">
          <Button variant="secondary" onClick={() => setReject(true)} disabled={busy} icon={<X className="h-4 w-4" aria-hidden />}>
            Rifiuta
          </Button>
          <Button onClick={() => review('APPROVED')} disabled={busy} icon={<Check className="h-4 w-4" aria-hidden />}>
            {busy ? 'Salvo…' : 'Approva'}
          </Button>
        </div>
      )}

      <Viewer url={viewer ? urls[viewer] ?? null : null} title={viewer ? KIND_LABEL[k.files.find((f) => f.fileId === viewer)?.kind ?? 'FRONT'] : ''} onClose={() => setViewer(null)} />

      <Modal
        open={reject}
        onClose={() => setReject(false)}
        title="Rifiuta la verifica"
        description={`Il motivo lo vedrà ${k.user.nickname} nella pagina di verifica.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReject(false)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={() => review('REJECTED')} disabled={busy || reason.trim().length < 5}>
              Rifiuta la verifica
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setReason(q)} className={cn('min-h-11 rounded-full border px-3 text-left text-xs', reason === q ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink')}>
                {q}
              </button>
            ))}
          </div>
          <Field label="Motivo" hint="Almeno 5 caratteri, scritto per il giocatore.">
            {(a) => <Textarea {...a} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </Panel>
  )
}

function Viewer({ url, title, onClose }: { url: string | null; title: string; onClose: () => void }) {
  const [z, setZ] = useState(1)
  useEffect(() => setZ(1), [url])
  return (
    <Modal open={!!url} onClose={onClose} title={title} description="Usa + e − (o la rotella con Ctrl) per lo zoom." size="xl">
      <div className="mb-3 flex items-center gap-2">
        <Button size="sm" variant="secondary" className="min-h-11 min-w-11" onClick={() => setZ((v) => Math.max(0.5, v - 0.25))} aria-label="Riduci zoom" icon={<Minus className="h-4 w-4" aria-hidden />} />
        <span className="w-14 text-center font-mono text-sm" aria-live="polite">
          {Math.round(z * 100)}%
        </span>
        <Button size="sm" variant="secondary" className="min-h-11 min-w-11" onClick={() => setZ((v) => Math.min(4, v + 0.25))} aria-label="Aumenta zoom" icon={<Plus className="h-4 w-4" aria-hidden />} />
        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setZ(1)} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
          Adatta
        </Button>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden /> accesso registrato
        </span>
      </div>
      <div
        className="max-h-[68vh] overflow-auto rounded-[var(--r-card)] bg-surface-2"
        tabIndex={0}
        aria-label="Area immagine, scorri per spostarti"
        onWheel={(e) => {
          if (!e.ctrlKey) return
          e.preventDefault()
          setZ((v) => Math.min(4, Math.max(0.5, v - e.deltaY * 0.002)))
        }}
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') setZ((v) => Math.min(4, v + 0.25))
          if (e.key === '-') setZ((v) => Math.max(0.5, v - 0.25))
        }}
      >
        {url && <img src={url} alt={title} style={{ width: `${z * 100}%`, maxWidth: 'none' }} className="mx-auto block" />}
      </div>
    </Modal>
  )
}
