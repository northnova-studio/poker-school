// Programmi di coaching per formato (MTT, Spin & Go, Cash). Caricato solo dalla pagina /coaching/:format.
import type { Format, Level } from '@/lib/api/types'
import type { FormatSlug } from '@/components/public/nav'

// ── COACHING PER FORMATO ─────────────────────────────────────────────────────
export interface FormatLevel {
  level: Level
  stakes: string
  title: string
  focus: string[]
}

export interface FormatPage {
  slug: FormatSlug
  format: Format
  name: string
  title: string
  lede: string
  headCoachId: string
  supportCoachIds: string[]
  coachNote?: string
  visualCaption: string
  forWho: { title: string; text: string }[]
  levels: FormatLevel[]
  lessons: { title: string; text: string; cadence: string }[]
  outcomes: string[]
  faqs: { q: string; a: string }[]
}

export const FORMAT_PAGES: Record<FormatSlug, FormatPage> = {
  mtt: {
    slug: 'mtt',
    format: 'MTT',
    name: 'MTT',
    title: 'Da migliaia di iscritti a nove sedie.',
    lede: 'Il coaching tornei di Matteo: early stage solido, bolla senza panico, final table giocati come se ci fossi già stato. Perché lui ci sta, ogni settimana.',
    headCoachId: 'c-matteo',
    supportCoachIds: ['c-lorenzo'],
    visualCaption: 'Un torneo domenicale tipo: il field si restringe, fase dopo fase, fino al tavolo finale.',
    forWho: [
      { title: 'Chi grinda volume', text: 'Giochi molti tornei a settimana e vuoi trasformare il volume in decisioni migliori, non solo in più ore.' },
      { title: 'Chi si blocca in bolla', text: 'Arrivi spesso a ridosso dei premi e lì le decisioni diventano difficili. L’ICM si studia, non si improvvisa.' },
      { title: 'Chi vuole salire di buy-in', text: 'Vuoi passare ai livelli successivi con un piano di bankroll e di studio, non con un colpo di fortuna.' },
    ],
    levels: [
      { level: 'MICRO', stakes: 'buy-in fino a 5 €', title: 'Fondamenta', focus: ['Open ranges per posizione', 'C-bet in single raised pot', 'Pianificare volume e pause'] },
      { level: 'LOW', stakes: '5–20 €', title: 'Costruire lo stack', focus: ['3-bet pot e difese', 'Gioco da medium stack', 'Prime nozioni di ICM'] },
      { level: 'MID', stakes: '20–100 €', title: 'Late stage', focus: ['Bolla e pay jump', 'Pressione da big stack', 'Final table e heads-up'] },
      { level: 'HIGH', stakes: '100 € e oltre', title: 'High stakes', focus: ['Sessioni highstack commentate', 'Exploit sui pool più forti', 'Preparazione delle serie'] },
    ],
    lessons: [
      { title: 'Lezioni di gruppo', text: 'Teoria e spot reali, 90 minuti, massimo 20 posti. Tutte registrate.', cadence: '2 a settimana' },
      { title: 'Sessioni highstack', text: 'Matteo gioca e commenta in differita, con la lobby oscurata. Vedi come ragiona un reg high stakes mentre decide.', cadence: '1 al mese' },
      { title: 'Hand review', text: 'Invii le mani, un coach risponde per iscritto o in video entro 72 ore.', cadence: 'secondo il piano' },
      { title: 'Deep run lab', text: 'Quando qualcuno della scuola va deep, la final table si rivede insieme mano per mano.', cadence: 'quando succede' },
    ],
    outcomes: ['Un piano di studio scritto per il tuo livello', 'Ranges di riferimento per ogni fase del torneo', 'Review mensile dei numeri con il coach', 'Player Card aggiornata e accesso al rank'],
    faqs: [
      { q: 'Serve un tracker o un solver?', a: 'Un tracker sì, per le review. Il solver no all’inizio: nel corso “Studiare con i solver” ti spieghiamo quando inizia a servire e come usarlo senza perdere ore.' },
      { q: 'Giocate anche live?', a: 'Sì, alcuni di noi fanno trasferte live. Le review dei tornei live si fanno come quelle online, con la stessa struttura.' },
      { q: 'Quanti tornei devo giocare?', a: 'Il volume si concorda con il coach in base al tuo tempo e al tuo bankroll. Meglio meno tornei giocati bene che tanti in autopilota.' },
    ],
  },
  spin: {
    slug: 'spin',
    format: 'SPIN',
    name: 'Spin & Go',
    title: 'La ruota decide il premio. Tu decidi tutto il resto.',
    lede: 'Il metodo di Fabri per il formato hyper-turbo a tre giocatori: ranges 3-handed, push/fold, heads-up a stack corti e una gestione della varianza che ti tiene lucido anche nei mesi storti.',
    headCoachId: 'c-fabri',
    supportCoachIds: [],
    visualCaption: 'Il moltiplicatore è casuale e quasi sempre basso. Per questo si studia la parte che dipende da te.',
    forWho: [
      { title: 'Chi gioca tanti spin', text: 'Fai volume ma non sai dove perdi chip EV. Partiamo dai numeri e troviamo i leak.' },
      { title: 'Chi soffre la varianza', text: 'I jackpot falsano la percezione dei risultati. Ti insegniamo a leggere i dati giusti e a gestire i downswing.' },
      { title: 'Chi arriva dagli MTT', text: 'Conosci il push/fold ma il 3-handed iper-aggressivo è un altro sport. Lo impari dalla base.' },
    ],
    levels: [
      { level: 'MICRO', stakes: 'buy-in fino a 5 €', title: 'Il formato', focus: ['Push/fold di base', 'Ranges dal bottone', 'Bankroll e volume'] },
      { level: 'LOW', stakes: '5–15 €', title: '3-handed', focus: ['Small blind: limp o raise', 'Difesa del big blind', 'Heads-up a 25 bui'] },
      { level: 'MID', stakes: '15–50 €', title: 'Endgame', focus: ['Heads-up sotto i 12 bui', 'Min-raise contro shove', 'Exploit sui pool'] },
      { level: 'HIGH', stakes: '50 € e oltre', title: 'High stakes', focus: ['Review dei regular più forti', 'Adattamento ai singoli avversari', 'Volume sostenibile nel lungo periodo'] },
    ],
    lessons: [
      { title: 'Lezioni di gruppo', text: 'Spot 3-handed e heads-up con i range a schermo, 75 minuti, massimo 20 posti. Registrate.', cadence: '2 a settimana' },
      { title: 'Sweat session', text: 'Giochi qualche spin mentre Fabri ti guarda e ti ferma sugli spot chiave. Poi si commenta.', cadence: 'secondo il piano' },
      { title: 'Review dei numeri', text: 'chip EV, risultati al netto dei jackpot, distribuzione dei moltiplicatori: i dati veri del tuo mese.', cadence: '1 al mese' },
      { title: 'Hand review', text: 'Invii le mani heads-up che ti hanno fatto dubitare, un coach risponde entro 72 ore.', cadence: 'secondo il piano' },
    ],
    outcomes: ['Charts 3-handed e heads-up per il tuo livello', 'Un report mensile di chip EV e volume', 'Piano di bankroll scritto', 'Player Card aggiornata e accesso al rank'],
    faqs: [
      { q: 'Gli spin non sono solo fortuna?', a: 'Il moltiplicatore sì, è casuale. Le decisioni no: su migliaia di partite chi gioca meglio il 3-handed e l’heads-up si vede nei numeri. Noi lavoriamo su quella parte.' },
      { q: 'Quanti spin devo giocare per vedere un miglioramento?', a: 'Dipende dal volume e dalla varianza, ed è proprio per questo che guardiamo il chip EV e non solo i risultati. Nessuno può promettere un risultato in un numero di partite.' },
      { q: 'Usate charts o software?', a: 'Sì, charts di riferimento che costruiamo e semplifichiamo con te. Ti spieghiamo anche quali strumenti di studio servono e quali sono superflui.' },
    ],
  },
  cash: {
    slug: 'cash',
    format: 'CASH',
    name: 'Cash game',
    title: 'Centomila mani non mentono.',
    lede: 'Il cash game 6-max è il formato dove la disciplina si vede in grafico. Single raised pot, 3-bet pot, multitabling e review del database: un percorso costruito per durare.',
    headCoachId: 'c-staff',
    supportCoachIds: ['c-matteo'],
    coachNote: 'Il coach cash dedicato verrà annunciato al lancio. Nel frattempo il programma è supervisionato da Matteo.',
    visualCaption: 'Più tavoli, stesso metodo. La winrate si misura in bb/100 su campioni grandi, non in serate.',
    forWho: [
      { title: 'Chi gioca micro e low', text: 'Vuoi una base solida tra NL2 e NL50 prima di pensare a salire.' },
      { title: 'Chi multitabla', text: 'Giochi molti tavoli e vuoi decisioni più veloci senza perdere qualità.' },
      { title: 'Chi viene dai tornei', text: 'Stack profondi, posizione e range ampi: il cash ti obbliga a giocare postflop. Lo studiamo insieme.' },
    ],
    levels: [
      { level: 'MICRO', stakes: 'NL2–NL10', title: 'Basi 6-max', focus: ['Open ranges e 3-bet', 'C-bet in posizione', 'Routine e numero di tavoli'] },
      { level: 'LOW', stakes: 'NL10–NL50', title: 'Postflop', focus: ['Turn barrel e river', 'Check-raise fuori posizione', 'Thin value'] },
      { level: 'MID', stakes: 'NL50–NL200', title: '3-bet pot', focus: ['Range vs range nei 3-bet pot', 'Exploit dei regular', 'Database e leak finder'] },
      { level: 'HIGH', stakes: 'NL200 e oltre', title: 'High stakes', focus: ['Spot ad alta frequenza', 'Adattamento ai singoli', 'Gestione del volume e della varianza'] },
    ],
    lessons: [
      { title: 'Lezioni di gruppo', text: 'Spot postflop con analisi range contro range, 90 minuti, massimo 20 posti. Registrate.', cadence: '1 a settimana' },
      { title: 'Database review', text: 'Analizziamo il tuo database, troviamo i leak più costosi e li trasformiamo in obiettivi di studio.', cadence: '1 al mese' },
      { title: 'Hand review', text: 'Invii le mani, un coach risponde entro 72 ore.', cadence: 'secondo il piano' },
      { title: 'Sweat session', text: 'Il coach ti guarda multitablare e ti ferma sugli spot che contano.', cadence: 'secondo il piano' },
    ],
    outcomes: ['Un piano di studio scritto per il tuo limite', 'Report mensile su bb/100 e leak', 'Ranges di riferimento 6-max', 'Player Card aggiornata e accesso al rank'],
    faqs: [
      { q: 'Il cash è già attivo?', a: 'Il programma è attivo con supervisione di Matteo. Il coach dedicato verrà annunciato al lancio e chi entra prima avrà la precedenza nelle sessioni 1:1.' },
      { q: 'Quante mani servono per valutare la mia winrate?', a: 'Molte più di quanto si pensi: la varianza nel cash è alta anche su decine di migliaia di mani. Per questo guardiamo anche le metriche di processo, non solo il risultato.' },
      { q: 'Lavorate anche su zoom/fast-fold?', a: 'Sì, i principi sono gli stessi. Adattiamo ranges e volume al formato che giochi.' },
    ],
  },
}
