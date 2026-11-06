import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ISSUER = 'tris-api'
const AUDIENCE = 'tris-web'

export interface AccessPayload {
  sub: string
  role: string
}

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE })
    if (typeof p === 'string' || !p.sub) return null
    return { sub: p.sub, role: String((p as { role?: string }).role ?? '') }
  } catch {
    return null
  }
}
