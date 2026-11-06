import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Clock3, ShieldX, Send } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth'
import { useData } from '@/hooks/useData'
import { DOC_LABEL, fmtRelative } from '@/lib/app-format'
import { fmtDateTime } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { ErrorState, PageHeader, PageSkeleton, Panel } from '@/components/app/Panel'
import { KycFields, KycNotice, emptyKyc, kycErrors } from '@/components/app/Kyc'
import { toast } from '@/components/app/Overlay'

export default function VerifyIdentity() {
  const { refresh } = useAuth()
  const { data: sub, loading, error, reload, setData } = useData(() => api.kyc.mine(), [])
  const [draft, setDraft] = useState(emptyKyc())
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(false)

  const submit = async () => {
    setTried(true)
    if (Object.keys(kycErrors(draft)).length) {
      toast.error('Controlla i campi evidenziati')
      return
    }
    setBusy(true)
    try {
      const s = await api.kyc.submit({ documentType: draft.documentType, documentNumberLast4: draft.last4, front: draft.front!, back: draft.back ?? undefined, selfie: draft.selfie!, consent: draft.consent })
      setData(s)
      setRetry(false)
      setDraft(emptyKyc())
      await refresh()
      toast.success('Documenti inviati', 'Un admin li controllerà a breve.')
    } catch (e) {
      toast.error('Invio non riuscito', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const status = sub?.status ?? 'NONE'
  const showForm = status === 'NONE' || (status === 'REJECTED' && retry)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Verifica identità" description="Controlliamo identità e maggiore età una sola volta. I documenti vengono cancellati dopo l’esito." />

      {sub && !showForm && (
        <Panel className="mb-6">
          <div className="flex flex-wrap items-start gap-4">
            {status === 'APPROVED' && <BadgeCheck className="h-10 w-10 shrink-0 text-success" aria-hidden />}
            {status === 'PENDING' && <Clock3 className="h-10 w-10 shrink-0 text-warning" aria-hidden />}
            {status === 'REJECTED' && <ShieldX className="h-10 w-10 shrink-0 text-danger" aria-hidden />}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {status === 'APPROVED' ? 'Identità verificata' : status === 'PENDING' ? 'Documenti in verifica' : 'Verifica non superata'}
              </h2>
              <p className="mt-1 text-muted">
                {status === 'APPROVED' && 'Tutto a posto: hai accesso completo a lezioni live, staking e classifiche pubbliche.'}
                {status === 'PENDING' && `Inviati ${fmtRelative(sub.submittedAt)}. Di solito rispondiamo entro 24 ore.`}
                {status === 'REJECTED' && 'Un admin ha controllato i documenti e non è riuscito a verificarli.'}
              </p>
              {status === 'REJECTED' && sub.rejectionReason && (
                <p className="mt-3 rounded-[var(--r-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">
                  <span className="font-semibold">Motivo:</span> {sub.rejectionReason}
                </p>
              )}
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Documento</dt>
                  <dd className="text-ink">
                    {DOC_LABEL[sub.documentType]} <span className="font-mono">··{sub.documentNumberLast4}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Inviato</dt>
                  <dd className="text-ink">{fmtDateTime(sub.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Esito</dt>
                  <dd className="text-ink">{sub.reviewedAt ? fmtDateTime(sub.reviewedAt) : 'in attesa'}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {status === 'REJECTED' && (
                  <Button onClick={() => setRetry(true)} icon={<Send className="h-4 w-4" aria-hidden />}>
                    Ricarica i documenti
                  </Button>
                )}
                <Link to="/app" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-accent hover:underline">
                  Torna alla dashboard
                </Link>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {showForm && (
        <Panel title="Carica i documenti" meta="Circa 2 minuti">
          <KycFields value={draft} onChange={setDraft} showErrors={tried} />
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-5">
            {retry && (
              <Button variant="ghost" onClick={() => setRetry(false)}>
                Annulla
              </Button>
            )}
            <Button onClick={submit} disabled={busy} icon={<Send className="h-4 w-4" aria-hidden />}>
              {busy ? 'Invio…' : 'Invia per la verifica'}
            </Button>
          </div>
        </Panel>
      )}
      {!showForm && status !== 'APPROVED' && (
        <div className="mt-6">
          <KycNotice demo={api.mode === 'demo'} />
        </div>
      )}
    </div>
  )
}
