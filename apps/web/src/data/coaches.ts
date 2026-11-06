import type { Coach } from '@/lib/api/types'
// I tre fondatori + staff. Tutte le statistiche sono ESEMPI (placeholder: true): DA SOSTITUIRE.
export const COACHES: Coach[] = [
  {
    id: 'c-fabri',
    name: 'Fabrizio',
    nickname: 'Fabri',
    role: 'Head coach Spin & Go',
    formats: ['SPIN'],
    bio: 'Grinda Spin & Go ai livelli più alti in Italia. Ossessionato da push/fold, ranges 3-handed e dalla gestione della varianza. In lobby è quello che non ammette mai di aver perso.',
    avatarSeed: 'fabri',
    stats: [
      { label: 'Spin giocati (12 mesi)', value: '48.000+', placeholder: true },
      { label: 'Buy-in medio', value: '€50', placeholder: true },
      { label: 'chip EV/game', value: '+42', placeholder: true },
    ],
  },
  {
    id: 'c-matteo',
    name: 'Matteo',
    nickname: 'Matte',
    role: 'Head coach MTT · contenuti · high stakes',
    formats: ['MTT', 'CASH'],
    bio: 'MTT regular ai buy-in alti del circuito italiano. Final table, ICM, sessioni highstack in diretta: è lui che commenta i deep run frame per frame. Fuori dal tavolo: il peggior perdente a Warzone.',
    avatarSeed: 'matteo',
    stats: [
      { label: 'ABI', value: '€110', placeholder: true },
      { label: 'ROI (24 mesi)', value: '38%', placeholder: true },
      { label: 'Final table (2026)', value: '27', placeholder: true },
    ],
  },
  {
    id: 'c-lorenzo',
    name: 'Lorenzo',
    nickname: 'Lollo',
    role: 'Performance, community & operations',
    formats: ['MTT'],
    bio: 'MTT player ed ex pro player di Call of Duty: porta nella scuola metodo da esport — routine, review, volume e mental. Tiene in piedi gestionale, numeri e community. Organizza la lobby post-sessione (e la vince).',
    avatarSeed: 'lorenzo',
    stats: [
      { label: 'Trasferte live (2026)', value: '6', placeholder: true },
      { label: 'Anni da pro esport', value: '5', placeholder: true },
      { label: 'Lobby vinte', value: 'troppe', placeholder: true },
    ],
  },
  {
    id: 'c-staff',
    name: 'Staff tecnico',
    nickname: 'Staff',
    role: 'Coach cash game (in arrivo)',
    formats: ['CASH'],
    bio: 'Il coach dedicato al cash game 6-max verrà annunciato al lancio.',
    avatarSeed: 'staff',
    stats: [],
  },
]
export const coachById = (id: string) => COACHES.find((c) => c.id === id)
