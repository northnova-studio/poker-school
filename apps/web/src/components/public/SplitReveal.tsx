import type { CSSProperties } from 'react'

/**
 * Testo diviso in parole/lettere per il reveal CSS (.pub-split-char). Ogni
 * parola fa da maschera e va a capo in modo naturale (mobile → desktop).
 * Gli screen reader leggono il testo intero (sr-only); la versione animata è
 * aria-hidden.
 */
export function SplitReveal({ text, delay = 0, step = 28, className }: { text: string; delay?: number; step?: number; className?: string }) {
  let i = 0
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, wi) => (
          <span key={wi}>
            <span className="inline-block overflow-hidden whitespace-nowrap pb-[0.08em] align-top">
              {Array.from(word).map((ch, ci) => (
                <span
                  key={ci}
                  className="pub-split-char"
                  style={{ ['--i' as string]: i++, ['--d' as string]: `${delay}ms`, animationDelay: `calc(var(--i) * ${step}ms + var(--d))` } as CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </span>
  )
}
