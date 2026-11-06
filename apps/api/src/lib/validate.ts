import type { z } from 'zod'
import { badRequest } from './errors.js'

/** Valida un input con zod; in caso di errore → 400 VALIDATION_ERROR con il dettaglio dei campi. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data)
  if (!r.success) {
    const fields = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    const first = fields[0]
    throw badRequest(first ? `Dati non validi: ${first.path || 'body'} — ${first.message}` : 'Dati non validi', 'VALIDATION_ERROR', fields)
  }
  return r.data
}

/** Parametro di route come stringa (con Express 5 i tipi possono essere string | string[]). */
export function param(req: { params: Record<string, string | string[] | undefined> }, name: string): string {
  const v = req.params[name]
  return Array.isArray(v) ? v.join('/') : String(v ?? '')
}
