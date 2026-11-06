import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { seedBadges, seedCourses, seedPlans, seedStaff, DEV_PASSWORDS } from '../prisma/seed/base.js'

export const app = createApp()
export const api = () => request(app)
export { prisma }

/** Svuota tutte le tabelle (tranne lo storico migration) e ricrea i dati di base. */
export async function resetDb() {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  )
  if (rows.length) await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
  await seedPlans(prisma)
  await seedBadges(prisma)
  await seedStaff(prisma)
  await seedCourses(prisma)
}

let seq = 0
export function registerInput(over: Record<string, unknown> = {}) {
  seq++
  const id = `${Date.now().toString(36)}${seq}`
  return {
    email: `user${id}@test.local`,
    password: 'password-sicura',
    nickname: `user_${id}`,
    firstName: 'Mario',
    lastName: 'Test',
    birthDate: '1995-05-20',
    formats: ['MTT'],
    mainLevel: 'LOW',
    acceptTerms: true,
    acceptPrivacy: true,
    ...over,
  }
}

export interface Session {
  token: string
  refreshToken: string
  user: { id: string; role: string; [k: string]: unknown }
}

export async function registerStudent(over: Record<string, unknown> = {}): Promise<Session> {
  const res = await api().post('/api/v1/auth/register').send(registerInput(over))
  if (res.status !== 201) throw new Error(`register ${res.status}: ${JSON.stringify(res.body)}`)
  return { token: res.body.accessToken, refreshToken: res.body.refreshToken, user: res.body.user }
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await api().post('/api/v1/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`login ${res.status}: ${JSON.stringify(res.body)}`)
  return { token: res.body.accessToken, refreshToken: res.body.refreshToken, user: res.body.user }
}

export const loginAdmin = () => login('admin@tris.local', DEV_PASSWORDS.admin)
export const loginFounder = (local: 'fabri' | 'matteo' | 'lorenzo' = 'lorenzo') => login(`${local}@tris.local`, DEV_PASSWORDS.founder)

export async function setRole(userId: string, role: 'STUDENT' | 'COACH' | 'ADMIN') {
  await prisma.user.update({ where: { id: userId }, data: { role } })
}

export async function setPlan(userId: string, plan: 'base' | 'pro' | 'elite' | null) {
  await prisma.user.update({ where: { id: userId }, data: { plan, planInterval: plan ? 'month' : null } })
}

export const auth = (s: Session) => ({ Authorization: `Bearer ${s.token}` })

/** Data "YYYY-MM-DD" di N anni fa (+ offset in giorni). */
export function yearsAgo(years: number, plusDays = 0) {
  const d = new Date()
  const target = new Date(Date.UTC(d.getUTCFullYear() - years, d.getUTCMonth(), d.getUTCDate() + plusDays))
  return target.toISOString().slice(0, 10)
}

// File di prova con magic bytes reali
export const FILES = {
  jpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]), Buffer.from('jpeg-body-di-test')]),
  png: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
  pdf: Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n'),
  heic: Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(16)]),
  text: Buffer.from('questo non è un documento, è testo travestito da jpeg'),
}
