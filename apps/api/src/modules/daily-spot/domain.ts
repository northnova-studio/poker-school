// Daily Spot — funzioni pure: streak e distribuzione delle risposte.
import { round1 } from '../../lib/money.js'

/**
 * Streak = numero di Daily Spot consecutivi a cui l'utente ha risposto, contando
 * all'indietro dallo spot più recente. Se lo spot di oggi non ha ancora risposta
 * lo streak resta vivo e si conta da quello precedente.
 * @param spotDatesDesc date "YYYY-MM-DD" degli spot pubblicati fino a oggi, dalla più recente
 * @param answered date degli spot a cui l'utente ha risposto
 * @param today "YYYY-MM-DD" (Europe/Rome)
 */
export function computeStreak(spotDatesDesc: string[], answered: Set<string>, today: string): number {
  let i = 0
  if (spotDatesDesc[0] === today && !answered.has(today)) i = 1
  let streak = 0
  for (; i < spotDatesDesc.length; i++) {
    if (!answered.has(spotDatesDesc[i])) break
    streak++
  }
  return streak
}

/** Percentuale di risposte per opzione (tutte le opzioni presenti, somma ≈ 100). */
export function answerDistribution(optionIds: string[], answers: { optionId: string }[]): Record<string, number> {
  const total = answers.length
  const out: Record<string, number> = {}
  for (const id of optionIds) {
    const n = answers.filter((a) => a.optionId === id).length
    out[id] = total ? round1((n / total) * 100) : 0
  }
  return out
}
