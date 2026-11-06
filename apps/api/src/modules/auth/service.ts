import bcrypt from 'bcryptjs'
import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { badRequest, conflict, unauthorized } from '../../lib/errors.js'
import { randomToken, sha256Hex } from '../../lib/crypto.js'
import { signAccessToken } from '../../lib/jwt.js'
import { ageOn, addDays, romeDateKey } from '../../lib/dates.js'
import { toUserDto } from '../../lib/dto.js'
import { logger } from '../../lib/logger.js'
import type { User } from '../../generated/prisma/client.js'
import type { profilePatchSchema, registerSchema } from './schemas.js'

const BCRYPT_ROUNDS = env.isTest ? 4 : 12
// Hash fittizio per uniformare i tempi di risposta quando l'email non esiste
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-password', BCRYPT_ROUNDS)

export const MIN_AGE = 18

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS)

export function isAdult(birthDate: string, today = romeDateKey()): boolean {
  const d = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== birthDate) return false
  return ageOn(birthDate, today) >= MIN_AGE
}

interface ClientInfo {
  ip?: string
  userAgent?: string
}

async function issueTokens(user: User, info: ClientInfo, familyId?: string) {
  const refreshToken = randomToken(32)
  const row = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256Hex(refreshToken),
      familyId: familyId ?? randomToken(12),
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
      ip: info.ip ?? null,
      userAgent: info.userAgent?.slice(0, 255) ?? null,
    },
  })
  return { user: toUserDto(user), accessToken: signAccessToken(user.id, user.role), refreshToken, rowId: row.id }
}

const strip = <T extends { rowId: string }>({ rowId: _r, ...rest }: T) => rest

export async function register(input: z.output<typeof registerSchema>, info: ClientInfo) {
  if (!isAdult(input.birthDate)) throw badRequest('Devi essere maggiorenne (18+) per iscriverti', 'UNDERAGE')
  const [byEmail, byNick] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findFirst({ where: { nickname: { equals: input.nickname, mode: 'insensitive' } } }),
  ])
  if (byEmail) throw conflict('Esiste già un account con questa email', 'EMAIL_TAKEN')
  if (byNick) throw conflict('Nickname già in uso', 'NICKNAME_TAKEN')
  const now = new Date()
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      nickname: input.nickname,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: new Date(`${input.birthDate}T00:00:00Z`),
      avatarSeed: input.nickname.toLowerCase(),
      formats: input.formats,
      mainLevel: input.mainLevel,
      discordHandle: input.discordHandle ?? null,
      termsAcceptedAt: now,
      termsVersion: env.LEGAL_TERMS_VERSION,
      privacyAcceptedAt: now,
      privacyVersion: env.LEGAL_PRIVACY_VERSION,
      marketingOptIn: input.marketingOptIn,
      marketingOptInAt: input.marketingOptIn ? now : null,
      lastLoginAt: now,
    },
  })
  logger.info({ userId: user.id }, 'registrazione')
  return strip(await issueTokens(user, info))
}

export async function login(email: string, password: string, info: ClientInfo) {
  const user = await prisma.user.findUnique({ where: { email } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok || user.disabledAt) throw unauthorized('Email o password non corretti', 'INVALID_CREDENTIALS')
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  return strip(await issueTokens(updated, info))
}

/**
 * Rotazione del refresh token: quello usato viene revocato e sostituito.
 * Se arriva un token già revocato (riuso → possibile furto) si revoca l'intera famiglia.
 */
export async function refresh(token: string, info: ClientInfo) {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256Hex(token) }, include: { user: true } })
  if (!row) throw unauthorized('Sessione non valida', 'INVALID_REFRESH_TOKEN')
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { familyId: row.familyId, revokedAt: null }, data: { revokedAt: new Date() } })
    logger.warn({ userId: row.userId }, 'riuso di refresh token revocato: famiglia revocata')
    throw unauthorized('Sessione non valida', 'REFRESH_TOKEN_REUSED')
  }
  if (row.expiresAt < new Date() || row.user.disabledAt) throw unauthorized('Sessione scaduta', 'REFRESH_TOKEN_EXPIRED')
  // revoca atomica: se due richieste concorrenti usano lo stesso token, solo una vince
  const res = await prisma.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } })
  if (res.count !== 1) throw unauthorized('Sessione non valida', 'REFRESH_TOKEN_REUSED')
  const issued = await issueTokens(row.user, info, row.familyId)
  await prisma.refreshToken.update({ where: { id: row.id }, data: { replacedById: issued.rowId } })
  return strip(issued)
}

export async function logout(token: string | null | undefined) {
  if (!token) return
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha256Hex(token), revokedAt: null }, data: { revokedAt: new Date() } })
}

export async function updateProfile(user: User, patch: z.output<typeof profilePatchSchema>) {
  if (patch.nickname && patch.nickname.toLowerCase() !== user.nickname.toLowerCase()) {
    const taken = await prisma.user.findFirst({ where: { nickname: { equals: patch.nickname, mode: 'insensitive' }, id: { not: user.id } } })
    if (taken) throw conflict('Nickname già in uso', 'NICKNAME_TAKEN')
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: patch })
  return toUserDto(updated)
}

/** Extra: cambio password (revoca tutte le sessioni attive). */
export async function changePassword(user: User, currentPassword: string, newPassword: string) {
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw unauthorized('Password attuale non corretta', 'INVALID_CREDENTIALS')
  if (currentPassword === newPassword) throw badRequest('La nuova password deve essere diversa', 'SAME_PASSWORD')
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
}
