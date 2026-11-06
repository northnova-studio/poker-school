// Seed di base (anche in produzione): piani, badge, admin, fondatori, coach staff, corsi.
// Idempotente: si può rilanciare senza duplicare nulla.
import bcrypt from 'bcryptjs'
import { env } from '../../src/config/env.js'
import { PLAN_DEFINITIONS } from '../../src/config/plans.js'
import { randomToken } from '../../src/lib/crypto.js'
import type { PrismaClient, Prisma } from '../../src/generated/prisma/client.js'
import { COURSES } from './courses-data.js'

type Db = PrismaClient

const ROUNDS = env.isTest ? 4 : 12
const DEV = !env.isProd

export const DEV_PASSWORDS = {
  admin: 'TrisAdmin!2026',
  founder: 'TrisFounder!2026',
  student: 'TrisStudent!2026',
}

export const BADGES: { key: string; name: string; description: string; icon: string; rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' }[] = [
  { key: 'first-session', name: 'Primo grind', description: 'Hai registrato la tua prima sessione', icon: 'play', rarity: 'COMMON' },
  { key: 'course-complete', name: 'Studente modello', description: 'Hai completato un corso', icon: 'graduation-cap', rarity: 'COMMON' },
  { key: 'streak-7', name: 'Una settimana di fila', description: '7 Daily Spot consecutivi', icon: 'flame', rarity: 'RARE' },
  { key: 'deep-run', name: 'Deep run', description: 'Sei arrivato al tavolo finale', icon: 'trophy', rarity: 'RARE' },
  { key: 'bounty-hunter', name: 'Cacciatore di taglie', description: 'Hai battuto un fondatore in un 1v1', icon: 'crosshair', rarity: 'EPIC' },
  { key: 'clown-week', name: 'Clown della settimana', description: 'Lo spot più votato del Roast (solo con consenso)', icon: 'drama', rarity: 'EPIC' },
  { key: 'legend', name: 'Leggenda', description: 'Hai raggiunto il tier LEGEND', icon: 'crown', rarity: 'LEGENDARY' },
]

// DA SOSTITUIRE con i dati reali: statistiche dei fondatori sono esempi (placeholder: true)
export const FOUNDERS = [
  {
    id: 'c-fabri',
    local: 'fabri',
    firstName: 'Fabrizio',
    nickname: 'Fabri',
    title: 'Head coach Spin & Go',
    formats: ['SPIN'] as const,
    mainLevel: 'HIGH' as const,
    bio: 'Grinda Spin & Go ai livelli più alti in Italia. Ossessionato da push/fold, ranges 3-handed e dalla gestione della varianza. In lobby è quello che non ammette mai di aver perso.',
    avatarSeed: 'fabri',
    displayOrder: 1,
    stats: [
      { label: 'Spin giocati (12 mesi)', value: '48.000+', placeholder: true },
      { label: 'Buy-in medio', value: '€50', placeholder: true },
      { label: 'chip EV/game', value: '+42', placeholder: true },
    ],
    card: { mainFormat: 'SPIN' as const, pre: 92, post: 88, icm: 90, agg: 91, men: 86, vol: 97 },
  },
  {
    id: 'c-matteo',
    local: 'matteo',
    firstName: 'Matteo',
    nickname: 'Matte',
    title: 'Head coach MTT · contenuti · high stakes',
    formats: ['MTT', 'CASH'] as const,
    mainLevel: 'HIGH' as const,
    bio: 'MTT regular ai buy-in alti del circuito italiano. Final table, ICM, sessioni highstack in diretta: è lui che commenta i deep run frame per frame. Fuori dal tavolo: il peggior perdente a Warzone.',
    avatarSeed: 'matteo',
    displayOrder: 2,
    stats: [
      { label: 'ABI', value: '€110', placeholder: true },
      { label: 'ROI (24 mesi)', value: '38%', placeholder: true },
      { label: 'Final table (2026)', value: '27', placeholder: true },
    ],
    card: { mainFormat: 'MTT' as const, pre: 91, post: 93, icm: 95, agg: 88, men: 87, vol: 90 },
  },
  {
    id: 'c-lorenzo',
    local: 'lorenzo',
    firstName: 'Lorenzo',
    nickname: 'Lollo',
    title: 'Performance, community & operations',
    formats: ['MTT'] as const,
    mainLevel: 'MID' as const,
    bio: 'MTT player ed ex pro player di Call of Duty: porta nella scuola metodo da esport — routine, review, volume e mental. Tiene in piedi gestionale, numeri e community. Organizza la lobby post-sessione (e la vince).',
    avatarSeed: 'lorenzo',
    displayOrder: 3,
    stats: [
      { label: 'Trasferte live (2026)', value: '6', placeholder: true },
      { label: 'Anni da pro esport', value: '5', placeholder: true },
      { label: 'Lobby vinte', value: 'troppe', placeholder: true },
    ],
    card: { mainFormat: 'MTT' as const, pre: 86, post: 85, icm: 87, agg: 90, men: 95, vol: 84 },
  },
]

const emailDomain = () => process.env.SEED_EMAIL_DOMAIN?.trim() || 'tris.local'

function legal(now: Date) {
  return {
    termsAcceptedAt: now,
    termsVersion: env.LEGAL_TERMS_VERSION,
    privacyAcceptedAt: now,
    privacyVersion: env.LEGAL_PRIVACY_VERSION,
  }
}

export async function seedPlans(db: Db) {
  for (const p of PLAN_DEFINITIONS) {
    const data = {
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      tagline: p.tagline,
      features: p.features,
      highlighted: p.highlighted,
      sortOrder: p.sortOrder,
    }
    await db.plan.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data })
  }
}

export async function seedBadges(db: Db) {
  for (const [i, b] of BADGES.entries()) {
    await db.badge.upsert({ where: { key: b.key }, create: { ...b, sortOrder: i }, update: { ...b, sortOrder: i } })
  }
}

export async function seedStaff(db: Db) {
  const now = new Date()
  const founderPassword = process.env.SEED_FOUNDER_PASSWORD || (DEV ? DEV_PASSWORDS.founder : undefined)
  if (!founderPassword) throw new Error('In produzione imposta SEED_FOUNDER_PASSWORD (password iniziale dei fondatori, da cambiare al primo accesso)')
  const founderHash = await bcrypt.hash(founderPassword, ROUNDS)

  for (const f of FOUNDERS) {
    const base = {
      nickname: f.nickname,
      firstName: f.firstName,
      formats: [...f.formats],
      mainLevel: f.mainLevel,
      bio: f.bio,
      avatarSeed: f.avatarSeed,
      role: 'ADMIN' as const, // i fondatori gestiscono anche il gestionale
    }
    await db.user.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        email: `${f.local}@${emailDomain()}`,
        passwordHash: founderHash,
        lastName: '(da inserire)',
        birthDate: new Date('1990-01-01T00:00:00Z'), // DA SOSTITUIRE
        shareResultsPublicly: true,
        roastOptIn: true,
        ...legal(now),
        ...base,
      },
      update: base,
    })
    const profile = { title: f.title, stats: f.stats as unknown as Prisma.InputJsonValue, displayOrder: f.displayOrder, isPublic: true, isFounder: true }
    await db.coachProfile.upsert({ where: { userId: f.id }, create: { userId: f.id, ...profile }, update: profile })
    await db.playerCard.upsert({
      where: { userId: f.id },
      create: { userId: f.id, ...f.card, volAuto: false },
      update: {},
    })
  }

  // Coach cash (da annunciare): account senza accesso finché non gli si assegna una password
  await db.user.upsert({
    where: { id: 'c-staff' },
    create: {
      id: 'c-staff',
      email: `staff@${emailDomain()}`,
      passwordHash: await bcrypt.hash(randomToken(24), ROUNDS),
      nickname: 'Staff',
      firstName: 'Staff tecnico',
      lastName: 'TRIS',
      birthDate: new Date('1990-01-01T00:00:00Z'),
      role: 'COACH',
      avatarSeed: 'staff',
      formats: ['CASH'],
      mainLevel: 'MID',
      bio: 'Il coach dedicato al cash game 6-max verrà annunciato al lancio.',
      ...legal(now),
    },
    update: {},
  })
  await db.coachProfile.upsert({
    where: { userId: 'c-staff' },
    create: { userId: 'c-staff', title: 'Coach cash game (in arrivo)', stats: [], displayOrder: 4, isPublic: true },
    update: {},
  })

  // Admin tecnico (ADMIN_EMAIL / ADMIN_PASSWORD; default solo in sviluppo)
  const adminEmail = (env.ADMIN_EMAIL ?? (DEV ? `admin@${emailDomain()}` : undefined))?.toLowerCase()
  const adminPassword = env.ADMIN_PASSWORD ?? (DEV ? DEV_PASSWORDS.admin : undefined)
  if (!adminEmail || !adminPassword) throw new Error('In produzione ADMIN_EMAIL e ADMIN_PASSWORD sono obbligatorie per il seed')
  if (env.isProd && adminPassword.length < 12) throw new Error('ADMIN_PASSWORD deve avere almeno 12 caratteri in produzione')
  const existing = await db.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
  } else {
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, ROUNDS),
        nickname: 'admin',
        firstName: 'Admin',
        lastName: 'TRIS',
        birthDate: new Date('1990-01-01T00:00:00Z'),
        role: 'ADMIN',
        avatarSeed: 'admin',
        formats: ['MTT'],
        mainLevel: 'MID',
        ...legal(now),
      },
    })
  }
  return { adminEmail }
}

export async function seedCourses(db: Db) {
  for (const [ci, c] of COURSES.entries()) {
    const data = {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
      format: c.format,
      level: c.level,
      coachId: c.coachId,
      priceEur: c.priceEur,
      includedInPlans: c.includedInPlans,
      tags: c.tags,
      coverSeed: c.coverSeed,
      bestseller: Boolean(c.bestseller),
      isNew: Boolean(c.isNew),
      createdAt: new Date(Date.UTC(2026, 9, 1, 12, ci)), // ordine di catalogo stabile
    }
    await db.course.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data })
    for (const [pi, chapter] of c.chapters.entries()) {
      const chId = `${c.id}-ch${pi + 1}`
      await db.courseChapter.upsert({
        where: { id: chId },
        create: { id: chId, courseId: c.id, title: chapter.title, position: pi },
        update: { title: chapter.title, position: pi },
      })
      for (const [li, l] of chapter.lessons.entries()) {
        const ld = { title: l.title, durationMin: l.durationMin, preview: l.preview, position: li, chapterId: chId, courseId: c.id }
        await db.courseLesson.upsert({ where: { id: l.id }, create: { id: l.id, ...ld }, update: ld })
      }
    }
  }
}

export async function seedBase(db: Db) {
  await seedPlans(db)
  await seedBadges(db)
  const staff = await seedStaff(db)
  await seedCourses(db)
  return staff
}
