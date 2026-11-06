import { Link } from 'react-router-dom'
import type { Course } from '@/lib/api/types'
import { coachById } from '@/data/coaches'
import { FORMAT_LABEL, LEVEL_LABEL, fmtEur } from '@/lib/format'
import { cn } from '@/lib/cn'
import { CourseCover } from './CourseCover'

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} h ${m ? `${m} min` : ''}`.trim() : `${m} min`
}

export function CourseBadge({ course, className }: { course: Pick<Course, 'bestseller' | 'isNew'>; className?: string }) {
  if (!course.bestseller && !course.isNew) return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 text-xs font-semibold',
        course.bestseller ? 'bg-accent text-on-accent' : 'bg-accent-2 text-on-accent',
        className,
      )}
      style={{ borderRadius: 'calc(var(--r-card) * 0.6)' }}
    >
      {course.bestseller ? 'Bestseller' : 'Nuovo'}
    </span>
  )
}

/** Card corso del catalogo: copertina generativa, formato, livello, durata, prezzo. */
export function CourseCard({ course, className }: { course: Course; className?: string }) {
  const coach = coachById(course.coachId)
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-[16/10] overflow-hidden border border-line" style={{ borderRadius: 'var(--r-card)' }}>
        <CourseCover seed={course.coverSeed} format={course.format} className="transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]" />
        <CourseBadge course={course} className="absolute left-3 top-3" />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4 text-sm text-muted">
        <span>
          {FORMAT_LABEL[course.format]}, livello {LEVEL_LABEL[course.level]}
        </span>
        <span className="font-mono tabular">{fmtDuration(course.durationMin)}</span>
      </div>
      <h3 className="pub-h3 mt-2 text-2xl text-ink">
        <Link to={`/corsi/${course.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">
          {course.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-muted">{course.subtitle}</p>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">{coach ? `con ${coach.nickname === 'Staff' ? 'lo staff' : coach.nickname}` : ''}</span>
        <span className="font-mono text-lg font-bold tabular text-ink">{fmtEur(course.priceEur)}</span>
      </div>
    </article>
  )
}
