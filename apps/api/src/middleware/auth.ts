import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { forbidden, unauthorized } from '../lib/errors.js'
import type { Role } from '../generated/prisma/client.js'

function bearer(req: Request): string | null {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim() || null
}

async function resolveUser(req: Request) {
  const token = bearer(req)
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload) throw unauthorized('Token non valido o scaduto', 'INVALID_TOKEN')
  // L'utente viene riletto dal DB: ruolo aggiornato e account disattivati bloccati subito.
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.disabledAt) throw unauthorized('Account non attivo', 'INVALID_TOKEN')
  return user
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req)
  if (!user) throw unauthorized()
  req.user = user
  next()
}

/**
 * Autenticazione facoltativa: senza header si prosegue come anonimi; con un token
 * scaduto/non valido si risponde 401, così il client esegue il refresh e riprova.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req)
  if (user) req.user = user
  next()
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized()
    if (!roles.includes(req.user.role)) throw forbidden()
    next()
  }
}

/** Utente autenticato (da usare solo dopo requireAuth). */
export function me(req: Request) {
  if (!req.user) throw unauthorized()
  return req.user
}

export const isStaff = (role: Role) => role === 'ADMIN' || role === 'COACH'

// Guardie da applicare per singola route (i router condividono il prefisso /api/v1).
export const adminOnly = [requireAuth, requireRole('ADMIN')]
export const staffOnly = [requireAuth, requireRole('ADMIN', 'COACH')]
