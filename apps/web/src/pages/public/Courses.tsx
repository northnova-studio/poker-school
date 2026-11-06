import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { COURSES } from '@/data/courses'
import type { CourseFormat, Level } from '@/lib/api/types'
import { FORMAT_LABEL, LEVEL_LABEL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { CourseCard } from '@/components/public/CourseCard'
import { CtaBand } from '@/components/public/Section'

const FORMATS: (CourseFormat | 'ANY')[] = ['ANY', 'MTT', 'SPIN', 'CASH', 'MENTAL', 'ALL']
const LEVELS: (Level | 'ANY')[] = ['ANY', 'MICRO', 'LOW', 'MID', 'HIGH']

export default function Courses() {
  const [format, setFormat] = useState<CourseFormat | 'ANY'>('ANY')
  const [level, setLevel] = useState<Level | 'ANY'>('ANY')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return COURSES.filter(
      (c) =>
        (format === 'ANY' || c.format === format) &&
        (level === 'ANY' || c.level === level) &&
        (!needle || [c.title, c.subtitle, c.description, ...c.tags].some((t) => t.toLowerCase().includes(needle))),
    )
  }, [format, level, q])

  return (
    <>
      <title>{`Video corsi di poker — ${BRAND.name}`}</title>
      <meta name="description" content="Video corsi MTT, Spin & Go, Cash game e mental game registrati dai fondatori: ICM, final table, heads-up, studio con i solver." />

      <section className="bg-bg pt-32 md:pt-40">
        <div className="pub-wrap grid gap-8 lg:grid-cols-12 lg:items-end">
          <h1 className="pub-display text-[clamp(3rem,9vw,8.5rem)] text-ink lg:col-span-8">Corsi.</h1>
          <p className="pub-lede lg:col-span-4">
            Si comprano una volta e restano tuoi. Ogni corso ha lezioni in anteprima gratuita, e alcuni sono inclusi nei piani Pro ed Elite.
          </p>
        </div>
      </section>

      <section aria-label="Catalogo corsi" className="bg-bg pb-24 pt-14 md:pb-32">
        <div className="pub-wrap">
          <div className="grid gap-5 border-y border-line py-6 lg:grid-cols-[1fr_auto_18rem] lg:items-end">
            <fieldset className="min-w-0">
              <legend className="text-sm text-muted">Formato</legend>
              <div className="pub-scroll-x relative -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={format === f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      'min-h-11 shrink-0 border px-4 text-sm font-medium transition-colors',
                      format === f ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink hover:border-accent',
                    )}
                    style={{ borderRadius: 'var(--r-card)' }}
                  >
                    {f === 'ANY' ? 'Tutti' : FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm text-muted">Livello</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level | 'ANY')}
                className="mt-2 block min-h-11 w-full border border-line bg-surface px-3 text-ink lg:w-40"
                style={{ borderRadius: 'var(--r-card)' }}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === 'ANY' ? 'Tutti i livelli' : LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-muted">Cerca</span>
              <span className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ICM, heads-up, tilt…"
                  className="block min-h-11 w-full border border-line bg-surface pl-9 pr-3 text-ink placeholder:text-muted"
                  style={{ borderRadius: 'var(--r-card)' }}
                />
              </span>
            </label>
          </div>
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {list.length === 1 ? '1 corso' : `${list.length} corsi`}
          </p>
          {list.length ? (
            <div className="mt-6 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-line p-10 text-center" style={{ borderRadius: 'var(--r-card)' }}>
              <p className="font-semibold text-ink">Nessun corso con questi filtri.</p>
              <button
                type="button"
                onClick={() => {
                  setFormat('ANY')
                  setLevel('ANY')
                  setQ('')
                }}
                className="mt-4 min-h-11 font-semibold text-accent underline underline-offset-4"
              >
                Azzera i filtri
              </button>
            </div>
          )}
        </div>
      </section>

      <CtaBand title="Preferisci un percorso guidato?" text="Con un piano hai lezioni live, hand review e un coach che ti dice quale corso fare e quando." to="/prezzi" cta="Vedi i piani" />
    </>
  )
}
