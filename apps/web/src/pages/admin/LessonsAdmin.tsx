import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { GroupLesson, GroupLessonInput, Level, PlanId } from '@/lib/api/types'
import { useData } from '@/hooks/useData'
import { COACHES, coachById } from '@/data/coaches'
import { FORMAT_SHORT, PLAN_LABEL, fmtDuration, fmtTime, fmtWeekday } from '@/lib/app-format'
import { LEVEL_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, ProgressBar } from '@/components/app/Panel'
import { Field, Input, Segmented, Select, Textarea } from '@/components/app/Controls'
import { Modal, toast, toastError } from '@/components/app/Overlay'

const toLocal = (iso: string) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const blank = (): GroupLessonInput => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  d.setHours(21, 0, 0, 0)
  return { title: '', description: '', format: 'MTT', level: 'LOW', coachId: 'c-matteo', startsAt: d.toISOString(), durationMin: 90, capacity: 30, minPlan: 'pro', meetingUrl: '' }
}

export default function LessonsAdmin() {
  const [when, setWhen] = useState<'next' | 'past'>('next')
  const { data, loading, error, reload, setData } = useData(() => api.lessons.list({ from: new Date(Date.now() - 70 * 86_400_000).toISOString() }), [])
  const [editing, setEditing] = useState<{ id: string | null; v: GroupLessonInput } | null>(null)
  const [del, setDel] = useState<GroupLesson | null>(null)
  const [busy, setBusy] = useState(false)
  if (loading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error ?? new Error('Errore')} onRetry={reload} />
  const now = Date.now()
  const list = when === 'next' ? data.filter((l) => Date.parse(l.startsAt) >= now) : data.filter((l) => Date.parse(l.startsAt) < now).reverse()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    try {
      const v = { ...editing.v, meetingUrl: editing.v.meetingUrl || null }
      const l = editing.id ? await api.admin.lessons.update(editing.id, v) : await api.admin.lessons.create(v)
      setData(editing.id ? data.map((x) => (x.id === l.id ? l : x)) : [...data, l].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
      toast.success(editing.id ? 'Lezione aggiornata' : 'Lezione creata')
      setEditing(null)
    } catch (err) {
      toastError(err, 'Lezione non salvata')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!del) return
    const l = del
    setDel(null)
    try {
      await api.admin.lessons.remove(l.id)
      setData(data.filter((x) => x.id !== l.id))
      toast.success('Lezione eliminata', l.bookedCount ? `${l.bookedCount} prenotazioni annullate` : undefined)
    } catch (err) {
      toastError(err, 'Eliminazione non riuscita')
    }
  }
  const v = editing?.v

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lezioni di gruppo"
        description="Calendario delle live: crea, modifica, controlla i posti. Il link della call lo vedono solo i prenotati."
        actions={
          <Button onClick={() => setEditing({ id: null, v: blank() })} icon={<Plus className="h-4 w-4" aria-hidden />}>
            Nuova lezione
          </Button>
        }
      />
      <Segmented label="Periodo" value={when} onChange={setWhen} options={[{ value: 'next', label: 'In programma' }, { value: 'past', label: 'Passate' }]} />
      <Panel flush>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((l) => (
              <li key={l.id} className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[130px_1fr_200px_auto] md:items-center">
                <div>
                  <div className="font-mono text-sm text-ink">{fmtTime(l.startsAt)}</div>
                  <div className="text-xs capitalize text-muted">{fmtWeekday(l.startsAt)}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{l.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <Chip tone="accent">{FORMAT_SHORT[l.format]}</Chip>
                    <Chip>{LEVEL_LABEL[l.level]}</Chip>
                    <Chip>{PLAN_LABEL[l.minPlan]}+</Chip>
                    <span className="self-center text-muted">
                      {coachById(l.coachId)?.nickname} · {fmtDuration(l.durationMin)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>Prenotati</span>
                    <span className="font-mono text-ink">
                      {l.bookedCount}/{l.capacity}
                    </span>
                  </div>
                  <ProgressBar value={l.bookedCount} max={l.capacity} label={`Prenotati ${l.title}`} tone={l.bookedCount >= l.capacity ? 'accent2' : 'accent'} />
                </div>
                <div className="flex gap-1 md:justify-end">
                  <button type="button" onClick={() => setEditing({ id: l.id, v: { title: l.title, description: l.description, format: l.format, level: l.level, coachId: l.coachId, startsAt: l.startsAt, durationMin: l.durationMin, capacity: l.capacity, minPlan: l.minPlan, meetingUrl: l.meetingUrl } })} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Modifica ${l.title}`}>
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setDel(l)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-card)] text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Elimina ${l.title}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState title="Nessuna lezione" />
          </div>
        )}
      </Panel>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifica lezione' : 'Nuova lezione'} size="lg">
        {v && editing && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Titolo">{(a) => <Input {...a} required value={v.title} onChange={(e) => setEditing({ ...editing, v: { ...v, title: e.target.value } })} />}</Field>
            <Field label="Descrizione">{(a) => <Textarea {...a} value={v.description} onChange={(e) => setEditing({ ...editing, v: { ...v, description: e.target.value } })} className="min-h-20" />}</Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Formato">
                {(a) => (
                  <Select {...a} value={v.format} onChange={(e) => setEditing({ ...editing, v: { ...v, format: e.target.value as GroupLessonInput['format'] } })}>
                    {(['MTT', 'SPIN', 'CASH', 'MENTAL'] as const).map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_SHORT[f]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Livello">
                {(a) => (
                  <Select {...a} value={v.level} onChange={(e) => setEditing({ ...editing, v: { ...v, level: e.target.value as Level } })}>
                    {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABEL[l]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Coach">
                {(a) => (
                  <Select {...a} value={v.coachId} onChange={(e) => setEditing({ ...editing, v: { ...v, coachId: e.target.value } })}>
                    {COACHES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Data e ora">{(a) => <Input {...a} type="datetime-local" required value={toLocal(v.startsAt)} onChange={(e) => e.target.value && setEditing({ ...editing, v: { ...v, startsAt: new Date(e.target.value).toISOString() } })} />}</Field>
              <Field label="Durata (min)">{(a) => <Input {...a} type="number" min={15} step={15} value={v.durationMin} onChange={(e) => setEditing({ ...editing, v: { ...v, durationMin: Number(e.target.value) } })} />}</Field>
              <Field label="Posti">{(a) => <Input {...a} type="number" min={1} value={v.capacity} onChange={(e) => setEditing({ ...editing, v: { ...v, capacity: Number(e.target.value) } })} />}</Field>
              <Field label="Piano minimo">
                {(a) => (
                  <Select {...a} value={v.minPlan} onChange={(e) => setEditing({ ...editing, v: { ...v, minPlan: e.target.value as PlanId } })}>
                    {(['base', 'pro', 'elite'] as PlanId[]).map((p) => (
                      <option key={p} value={p}>
                        {PLAN_LABEL[p]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Link della call" className="sm:col-span-2" hint="Visibile solo a chi prenota.">
                {(a) => <Input {...a} type="url" value={v.meetingUrl ?? ''} onChange={(e) => setEditing({ ...editing, v: { ...v, meetingUrl: e.target.value } })} placeholder="https://…" />}
              </Field>
            </div>
            <div className={cn('flex justify-end gap-2 border-t border-line pt-4')}>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Annulla
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvo…' : editing.id ? 'Salva le modifiche' : 'Crea la lezione'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminare la lezione?" description={del ? `${del.title} · ${fmtWeekday(del.startsAt)}` : undefined} size="sm" footer={<><Button variant="ghost" onClick={() => setDel(null)}>Annulla</Button><Button variant="danger" onClick={remove}>Elimina</Button></>}>
        <p className="text-sm text-muted">{del?.bookedCount ? `${del.bookedCount} prenotazioni verranno annullate.` : 'Nessuno ha ancora prenotato.'}</p>
      </Modal>
    </div>
  )
}
