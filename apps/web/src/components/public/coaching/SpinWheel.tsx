import { useRef, useState } from 'react'
import { WHEEL_SEGMENTS, WheelGlyph } from '../FormatGlyphs'

// Pesi illustrativi: il moltiplicatore basso è di gran lunga il più frequente.
const WEIGHTS: Record<string, number> = { x2: 74, x3: 15, x5: 6, x10: 3.5, x25: 1.2, x100: 0.3 }
const MESSAGES: Record<string, string> = {
  x2: 'x2: il caso di gran lunga più frequente. Per questo si studia il 3-handed, non la ruota.',
  x3: 'x3: capita, ma non ci costruisci sopra un mese.',
  x5: 'x5: stack più profondi, il gioco cambia. Ne parliamo a lezione.',
  x10: 'x10: rari. Il torneo dura di più e conta ogni decisione postflop.',
  x25: 'x25: raro. Goditelo, poi torna al volume.',
  x100: 'x100: rarissimo, come un fold di Matteo preflop. Non costruirci sopra il bankroll.',
}

function pick(): number {
  const total = WHEEL_SEGMENTS.reduce((a, m) => a + WEIGHTS[m] / WHEEL_SEGMENTS.filter((x) => x === m).length, 0)
  let r = Math.random() * total
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    const m = WHEEL_SEGMENTS[i]
    r -= WEIGHTS[m] / WHEEL_SEGMENTS.filter((x) => x === m).length
    if (r <= 0) return i
  }
  return 0
}

/** Spin & Go: ruota del moltiplicatore interattiva (nessuna puntata, solo didattica). */
export function SpinWheel() {
  const [rot, setRot] = useState(-8)
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number>(0)

  const spin = () => {
    if (busy) return
    const i = pick()
    const n = WHEEL_SEGMENTS.length
    const target = -(i * 360) / n
    const base = rot - (((rot % 360) + 360) % 360)
    const next = base + 360 * 6 + ((target % 360) + 360) % 360
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setBusy(true)
    setResult(null)
    setRot(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => {
        setBusy(false)
        setResult(WHEEL_SEGMENTS[i])
      },
      reduce ? 50 : 3700,
    )
  }

  return (
    <div>
      <WheelGlyph className="mx-auto h-auto w-full max-w-[26rem]" rotation={rot} spinning />
      <div className="mt-6 flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          onClick={spin}
          disabled={busy}
          className="inline-flex min-h-12 items-center justify-center bg-accent px-6 font-semibold text-on-accent transition-[filter] hover:brightness-110 disabled:opacity-60"
          style={{ borderRadius: 'var(--r-card)' }}
        >
          {busy ? 'Gira…' : 'Gira la ruota'}
        </button>
        <p className="min-h-[3rem] max-w-sm text-sm text-muted" aria-live="polite">
          {result ? MESSAGES[result] : 'Simulazione didattica, nessuna puntata. Le frequenze sono indicative.'}
        </p>
      </div>
    </div>
  )
}
