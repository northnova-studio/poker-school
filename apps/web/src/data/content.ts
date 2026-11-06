// ─────────────────────────────────────────────────────────────────────────────
// TESTI DEL SITO PUBBLICO — manifesto, formati, programmi, FAQ, testimonianze.
// Regole (Decreto Dignità, DL 87/2018 art. 9): nessun nome/logo/link di poker
// room, nessun bonus, nessun invito a giocare o depositare, nessuna promessa di
// guadagno. Tutto ciò che è `placeholder: true` è un ESEMPIO: DA SOSTITUIRE.
// ─────────────────────────────────────────────────────────────────────────────
import type { Format } from '@/lib/api/types'
import type { FormatSlug } from '@/components/public/nav'
export type { FormatSlug } from '@/components/public/nav'
export { NAV_COACHING, NAV_MAIN } from '@/components/public/nav'

// ── HOME ─────────────────────────────────────────────────────────────────────
// I testi dell'hero sono in src/components/public/home/hero-content.ts (modulo minimo, nel JS iniziale).
export { HERO } from '@/components/public/home/hero-content'

export const MANIFESTO = {
  text: 'Non siamo ex giocatori che vendono strategie di dieci anni fa. Siamo ai tavoli adesso, ogni settimana, contro i regular più forti d’Italia. Studiamo come atleti: volume pianificato, review di ogni sessione, routine, mental. Poi la sessione finisce, si apre la lobby e ci prendiamo in giro fino alle tre di notte. È questo che insegniamo: prendere il gioco sul serio senza prendersi troppo sul serio.',
  athletes: {
    title: 'Da atleti',
    items: ['Volume pianificato a inizio mese', 'Review di ogni sessione, non solo di quelle andate male', 'Warm-up prima, cool-down dopo', 'Il mental si allena come un muscolo'],
  },
  friends: {
    title: 'Da amici',
    items: ['Roast settimanale delle mani giocate peggio', 'Lobby su Warzone dopo la sessione', 'Rail collettivo quando qualcuno va deep', 'Nessuno ha il diritto di tiltare da solo'],
  },
}

export const FORMAT_SUMMARY: {
  slug: FormatSlug
  format: Format
  name: string
  coach: string
  line: string
  points: string[]
}[] = [
  {
    slug: 'mtt',
    format: 'MTT',
    name: 'MTT',
    coach: 'Head coach: Matteo',
    line: 'Dal field di migliaia di iscritti ai nove del final table. Ogni fase ha le sue regole e le studiamo una per una.',
    points: ['ICM, bolla e pay jump', 'Final table e heads-up per il titolo', 'Deep run commentati mano per mano'],
  },
  {
    slug: 'spin',
    format: 'SPIN',
    name: 'Spin & Go',
    coach: 'Head coach: Fabri',
    line: 'Tre giocatori, stack corti, nessun posto dove nascondersi. Il moltiplicatore lo decide la ruota; come giochi il 3-handed lo decidi tu.',
    points: ['Ranges 3-handed e push/fold', 'Heads-up sotto i 15 bui', 'Varianza e gestione del bankroll'],
  },
  {
    slug: 'cash',
    format: 'CASH',
    name: 'Cash game',
    coach: 'Coach dedicato in arrivo, supervisione di Matteo',
    line: 'Mani, volume, bb/100: il formato dove la disciplina si vede in grafico dopo centomila mani.',
    points: ['6-max: single raised e 3-bet pot', 'Multitabling sostenibile', 'Review del database e dei leak'],
  },
]

export const NUMBERS: { value: number; suffix?: string; label: string }[] = [
  { value: 3, label: 'fondatori ancora in attività, ogni settimana' },
  { value: 3, label: 'formati coachati: MTT, Spin & Go, Cash' },
  { value: 7, label: 'tier nel ladder, da Fish a Legend' },
  { value: 1, label: 'Daily Spot al giorno, con la spiegazione di un coach' },
  { value: 0, label: 'bonus, codici o link di sale da gioco. Mai.' },
]

export const HOW_STEPS: { title: string; text: string; time: string }[] = [
  { title: 'Candidatura', text: 'Ci racconti formato, livello, volume e obiettivi. Niente test d’ingresso: vogliamo capire da dove parti.', time: '5 minuti' },
  { title: 'Verifica identità', text: 'Documento e selfie: siamo una scuola solo per maggiorenni. I file sono cifrati e li vede solo l’amministrazione.', time: '24–48 ore' },
  { title: 'Valutazione', text: 'Un coach guarda un campione delle tue mani e ti assegna livello di partenza e Player Card iniziale.', time: '1 settimana' },
  { title: 'Piano di studio', text: 'Lezioni, corsi e obiettivi di volume per le quattro settimane successive. Si rivede insieme ogni mese.', time: 'ogni mese' },
  { title: 'Rank', text: 'Ore di studio, sessioni registrate, hand review e Daily Spot valgono XP. Si sale da Fish a Legend, stagione dopo stagione.', time: 'ogni stagione' },
]

export const COMMUNITY_FEATURES: { id: string; title: string; text: string }[] = [
  { id: 'card', title: 'Player Card', text: 'La tua carta stile Ultimate Team: overall e sei attributi aggiornati dai coach e dai tuoi dati. Bronzo, argento, oro. Icona è per i fondatori.' },
  { id: 'daily', title: 'Daily Spot', text: 'Uno spot al giorno, come Wordle. Rispondi, scopri cosa ha scelto la community e leggi la spiegazione del coach. La streak conta.' },
  { id: 'roast', title: 'Roast della settimana', text: 'La community vota lo spot giocato peggio e quello giocato meglio. Mani anonimizzate, commento dei fondatori, badge “Clown della settimana” solo per chi accetta.' },
  { id: 'deeprun', title: 'Deep Run Alert', text: 'Sei deep in un torneo? Attivi l’alert e la community ti raila. I coach commentano, lo storico resta nel profilo.' },
  { id: 'lobby', title: 'Lobby post-sessione', text: 'Serate Warzone, EA FC e tornei interni. E la Taglia sui fondatori: batti uno di noi in 1v1 e vinci una lezione 1:1.' },
]

export const TESTIMONIALS: { quote: string; who: string; detail: string; placeholder: boolean }[] = [
  // DA SOSTITUIRE con testimonianze reali (con consenso scritto). Niente cifre vinte.
  {
    quote: 'Il Daily Spot è diventato il mio caffè. Ho perso una streak di 23 giorni per un call di river e Fabri me l’ha ricordato per una settimana intera.',
    who: 'Studente Spin',
    detail: 'Livello Low, in scuola da 6 mesi',
    placeholder: true,
  },
  {
    quote: 'Prima studiavo quando avevo voglia. Adesso ho un piano scritto, una review ogni domenica e un rank che scende se salto le sessioni. Funziona più della forza di volontà.',
    who: 'Studente MTT',
    detail: 'Livello Mid, in scuola da 1 anno',
    placeholder: true,
  },
  {
    quote: 'Sono entrato per l’ICM, sono rimasto per la lobby. Ho battuto Matteo a Warzone una volta sola e ho ancora lo screenshot come sfondo.',
    who: 'Studente MTT',
    detail: 'Livello Low, in scuola da 4 mesi',
    placeholder: true,
  },
]

export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: 'Devo essere già un giocatore vincente per candidarmi?',
    a: 'No. Ci serve che tu sia maggiorenne, che giochi con regolarità e che abbia voglia di studiare. Il livello di partenza lo stabiliamo noi nella valutazione, e il piano parte da lì.',
  },
  {
    q: 'Promettete risultati o guadagni?',
    a: 'No, e diffida di chi lo fa. Il poker ha varianza e nessuna scuola seria può promettere guadagni. Promettiamo metodo, review fatte da chi gioca ai livelli più alti e un ambiente che ti fa studiare di più e meglio.',
  },
  {
    q: 'Collaborate con qualche sala da gioco?',
    a: 'No. Non abbiamo accordi con operatori, non pubblichiamo bonus, codici o link. È una scelta nostra ed è anche un obbligo di legge in Italia.',
  },
  {
    q: 'Perché chiedete documento e selfie?',
    a: 'Perché la scuola è riservata ai maggiorenni e lavoriamo su numeri e sessioni reali. I file sono cifrati, li vede solo l’amministrazione e vengono cancellati dopo la verifica secondo l’informativa privacy.',
  },
  {
    q: 'Quanto tempo serve a settimana?',
    a: 'Il piano si adatta a te. Come riferimento: due lezioni di gruppo, tre o quattro ore di studio individuale e il volume concordato con il coach. Chi lavora può fare il Base con meno ore.',
  },
  {
    q: 'Posso comprare un corso senza abbonamento?',
    a: 'Sì. Ogni corso si compra singolarmente e resta tuo. Alcuni corsi sono inclusi nei piani Pro ed Elite.',
  },
]

// ── TEAM ─────────────────────────────────────────────────────────────────────
export const FOUNDER_EXTRA: Record<string, { position: string; headline: string; focus: string[]; offTable: string }> = {
  'c-fabri': {
    position: 'SPIN',
    headline: 'Head coach Spin & Go',
    focus: ['Push/fold e ranges 3-handed', 'Heads-up a stack corti', 'Gestione della varianza'],
    offTable: 'In lobby è quello che non ammette mai di aver perso. Ha una teoria sul perché ogni sconfitta a EA FC era “un cooler”.',
  },
  'c-matteo': {
    position: 'MTT',
    headline: 'Head coach MTT, contenuti, high stakes',
    focus: ['ICM e final table', 'Sessioni highstack commentate', 'Contenuti video e deep run lab'],
    offTable: 'Il peggior perdente a Warzone della storia della scuola. Ha chiesto di non scriverlo. Lo abbiamo scritto.',
  },
  'c-lorenzo': {
    position: 'OPS',
    headline: 'Performance, community, operations e tech',
    focus: ['Routine, review e mental da esport', 'Gestionale, numeri e infrastruttura', 'Community, marketing e lobby'],
    offTable: 'Ex pro player di Call of Duty. Organizza la lobby post-sessione e, per puro caso, la vince quasi sempre.',
  },
}

export const PHILOSOPHY: { title: string; text: string }[] = [
  { title: 'Si insegna quello che si gioca', text: 'Le strategie che spieghiamo sono quelle che usiamo questa settimana, ai tavoli dove giochiamo. Quando il gioco cambia, cambiano anche le lezioni.' },
  { title: 'Il processo prima del risultato', text: 'Una sessione si giudica dalle decisioni, non dal saldo. Review, numeri di processo e routine contano più del colpo della serata.' },
  { title: 'Il gruppo alza il livello', text: 'Si studia di più quando qualcuno ti aspetta alla lezione, ti raila nel deep run e ti prende in giro se salti la review.' },
]

export const VALUES: { title: string; text: string }[] = [
  { title: 'Onestà sui numeri', text: 'Mostriamo prove, non promesse. Niente screenshot ritagliati ad arte, niente “guadagna X al mese”.' },
  { title: 'Rispetto per gli avversari', text: 'Nelle clip e nelle review i nickname degli altri giocatori sono sempre oscurati. Si critica la giocata, non la persona.' },
  { title: 'Gioco sostenibile', text: 'Bankroll, pause, sonno e vita fuori dal tavolo fanno parte del metodo. Se il gioco smette di essere sano, ci si ferma.' },
  { title: 'Ironia obbligatoria', text: 'Ci prendiamo in giro tutti, fondatori compresi. Chi non regge un roast può sempre non iscriversi al Roast: è facoltativo.' },
]

export const OFF_TABLE: { title: string; text: string; when: string }[] = [
  { title: 'Warzone del martedì', text: 'Squad miste fondatori e studenti. Chi muore per primo scrive il riassunto della lezione.', when: 'martedì, dopo la sessione' },
  { title: 'EA FC del giovedì', text: 'Torneo a eliminazione diretta. Fabri contesta ogni gol subito.', when: 'giovedì sera' },
  { title: 'Taglia sui fondatori', text: 'Batti uno di noi in 1v1 e vinci una lezione 1:1. Premi solo in lezioni, mai in denaro.', when: 'tutto l’anno' },
]

// Altri testi: src/pages/public/coaching-content.ts (programmi per formato),
// src/pages/public/pricing-content.ts, src/components/public/community/community-content.ts,
// src/pages/public/legal-content.ts.

// ── RANK (soglie da docs/RANK.md) ────────────────────────────────────────────
export const TIER_INFO: { tier: 'FISH' | 'CALLING_STATION' | 'REG' | 'GRINDER' | 'SHARK' | 'CRUSHER' | 'LEGEND'; min: number; max: number; text: string }[] = [
  { tier: 'FISH', min: 0, max: 300, text: 'Appena arrivato. Tutti siamo stati fish, qualcuno lo è ancora a Warzone.' },
  { tier: 'CALLING_STATION', min: 300, max: 900, text: 'Chiami tutto, anche il cameriere. Però ti presenti alle lezioni.' },
  { tier: 'REG', min: 900, max: 2000, text: 'Registri le sessioni, mandi le mani in review, rispondi al Daily Spot.' },
  { tier: 'GRINDER', min: 2000, max: 3800, text: 'Volume e costanza: il motore della scuola.' },
  { tier: 'SHARK', min: 3800, max: 6500, text: 'Le tue review le leggono anche gli altri studenti.' },
  { tier: 'CRUSHER', min: 6500, max: 10000, text: 'Top della stagione. Fabri inizia a preoccuparsi.' },
  { tier: 'LEGEND', min: 10000, max: 14500, text: 'Pochissimi. Si entra nella storia del Discord. Oltre 14.500 XP resti Legend I.' },
]
