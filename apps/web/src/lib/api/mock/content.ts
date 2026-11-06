// Contenuti testuali del seed demo. Tutti i nomi sono inventati; nessuna poker room citata.
import type { Format, Level, PlanId } from '../types'

export interface PersonSeed {
  first: string
  last: string
  nick: string
  formats: Format[]
  level: Level
  plan: PlanId | null
}

// Il primo è lo studente demo (studente@demo.it).
export const STUDENTS: PersonSeed[] = [
  { first: 'Marco', last: 'Ferretti', nick: 'Brigante', formats: ['MTT', 'SPIN'], level: 'LOW', plan: 'pro' },
  { first: 'Giulia', last: 'Rinaldi', nick: 'GiuliaNuts', formats: ['MTT'], level: 'MID', plan: 'elite' },
  { first: 'Alessandro', last: 'Conti', nick: 'Ale_Shove', formats: ['SPIN'], level: 'MID', plan: 'pro' },
  { first: 'Davide', last: 'Marchetti', nick: 'zio_kicker', formats: ['CASH'], level: 'LOW', plan: 'base' },
  { first: 'Simone', last: 'Galli', nick: 'SqualoDiOstia', formats: ['MTT'], level: 'MID', plan: 'elite' },
  { first: 'Federico', last: 'Bassi', nick: 'FedeFold', formats: ['MTT'], level: 'MICRO', plan: 'base' },
  { first: 'Luca', last: 'Moretti', nick: 'LucaLaVarianza', formats: ['SPIN'], level: 'LOW', plan: 'pro' },
  { first: 'Andrea', last: 'Colombo', nick: 'ColomboRiver', formats: ['CASH'], level: 'MID', plan: 'pro' },
  { first: 'Stefano', last: 'Greco', nick: 'Stefanino3bet', formats: ['MTT', 'CASH'], level: 'LOW', plan: 'pro' },
  { first: 'Francesca', last: 'De Luca', nick: 'Fra_ICM', formats: ['MTT'], level: 'LOW', plan: 'pro' },
  { first: 'Riccardo', last: 'Fontana', nick: 'RickyChipEV', formats: ['SPIN'], level: 'HIGH', plan: 'elite' },
  { first: 'Gabriele', last: 'Lombardi', nick: 'Gabbo_Grind', formats: ['MTT'], level: 'LOW', plan: 'base' },
  { first: 'Valerio', last: 'Santoro', nick: 'ValeBluff', formats: ['CASH'], level: 'MICRO', plan: 'base' },
  { first: 'Nicola', last: 'Mariani', nick: 'Nik_Overbet', formats: ['CASH'], level: 'LOW', plan: 'pro' },
  { first: 'Paolo', last: 'Rizzi', nick: 'PaoloCheckRaise', formats: ['MTT'], level: 'MID', plan: 'pro' },
  { first: 'Emanuele', last: 'Caruso', nick: 'Ema_Spin', formats: ['SPIN'], level: 'LOW', plan: 'base' },
  { first: 'Tommaso', last: 'Ferri', nick: 'TommyTurbo', formats: ['SPIN', 'MTT'], level: 'MICRO', plan: 'base' },
  { first: 'Pietro', last: 'Gentile', nick: 'PierShark', formats: ['MTT'], level: 'HIGH', plan: 'elite' },
  { first: 'Michele', last: 'Leone', nick: 'MikeLeone', formats: ['CASH'], level: 'MID', plan: 'elite' },
  { first: 'Daniele', last: 'Villa', nick: 'DaniValue', formats: ['CASH'], level: 'LOW', plan: 'pro' },
  { first: 'Claudio', last: 'Serra', nick: 'ClaudioCooler', formats: ['MTT'], level: 'LOW', plan: 'base' },
  { first: 'Sara', last: 'Barbieri', nick: 'SaraSpin', formats: ['SPIN'], level: 'MID', plan: 'pro' },
  { first: 'Jacopo', last: 'Pellegrini', nick: 'Jack_Pelle', formats: ['MTT'], level: 'MICRO', plan: 'base' },
  { first: 'Edoardo', last: 'Testa', nick: 'EdoTesta', formats: ['SPIN'], level: 'LOW', plan: 'pro' },
  { first: 'Filippo', last: 'Monti', nick: 'FilMonti_MTT', formats: ['MTT'], level: 'MID', plan: 'pro' },
  { first: 'Giorgio', last: 'Cattaneo', nick: 'Giorgione', formats: ['CASH'], level: 'LOW', plan: null },
  { first: 'Roberto', last: 'Longo', nick: 'RobyLongStack', formats: ['MTT'], level: 'LOW', plan: 'base' },
  { first: 'Vincenzo', last: 'Esposito', nick: 'VinciNapoli', formats: ['SPIN'], level: 'MID', plan: 'elite' },
  { first: 'Salvatore', last: 'Russo', nick: 'Toto_AllIn', formats: ['MTT'], level: 'MICRO', plan: 'base' },
  { first: 'Enrico', last: 'Martini', nick: 'Rico_Martini', formats: ['CASH'], level: 'MID', plan: 'pro' },
  { first: 'Alberto', last: "D'Angelo", nick: 'Albi_Bubble', formats: ['MTT'], level: 'LOW', plan: 'pro' },
  { first: 'Ivan', last: 'Coppola', nick: 'IvanTheTilt', formats: ['SPIN'], level: 'LOW', plan: null },
  { first: 'Martina', last: 'Ferraro', nick: 'MartyFT', formats: ['MTT'], level: 'MID', plan: 'elite' },
  { first: 'Cristian', last: 'Bianco', nick: 'Cris_Bianco', formats: ['CASH'], level: 'MICRO', plan: 'base' },
  { first: 'Leonardo', last: 'Gatti', nick: 'LeoGatti', formats: ['MTT', 'SPIN'], level: 'LOW', plan: 'pro' },
  { first: 'Mirko', last: 'Sala', nick: 'MirkoMinRaise', formats: ['SPIN'], level: 'MICRO', plan: null },
  { first: 'Samuele', last: 'Fabbri', nick: 'SamuFabbri', formats: ['MTT'], level: 'LOW', plan: 'base' },
  { first: 'Manuel', last: 'Parisi', nick: 'ManuParisi', formats: ['CASH'], level: 'LOW', plan: 'pro' },
  { first: 'Elisa', last: 'Morelli', nick: 'Eli_Morelli', formats: ['SPIN'], level: 'LOW', plan: 'base' },
  { first: 'Kevin', last: 'Bruno', nick: 'KevBruno_Cash', formats: ['CASH'], level: 'MID', plan: null },
]

// ── Daily Spot: spot standard, risposte non controverse ─────────────────────
export interface SpotTemplate {
  key: string
  format: Format
  title: string
  situation: string
  heroCards: string
  board: string | null
  stacksBb: string
  options: { id: string; label: string }[]
  correct: string
  explanation: string
  coachId: string
  votes: number[] // distribuzione "di base" della community (stesso ordine delle opzioni)
}

export const SPOT_TEMPLATES: SpotTemplate[] = [
  {
    key: 'btn-10bb-a5o',
    format: 'MTT',
    title: 'Bottone a 10 bui',
    situation: 'MTT, livello con ante. Foldano tutti fino a te sul bottone. I bui hanno stack più profondi del tuo.',
    heroCards: 'Ah5c',
    board: null,
    stacksBb: 'Hero 10bb BTN · SB 35bb · BB 28bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Min-raise' },
      { id: 'c', label: 'All-in' },
    ],
    correct: 'c',
    explanation:
      "A5o a 10bb dal bottone è uno shove chiaro. Con le ante il piatto vale già circa 2,5bb e i bui possono chiamare solo con un range stretto. Il min-raise ti lascia senza fold equity se subisci un 3-bet; il fold butta una mano che sta nella parte alta del tuo range. In push/fold a 10bb dal BTN si va all-in con un range molto ampio.",
    coachId: 'c-matteo',
    votes: [9, 21, 70],
  },
  {
    key: 'bb-def-75s',
    format: 'MTT',
    title: 'Difesa del big blind',
    situation: 'MTT a metà torneo, ante in gioco. Il BTN apre a 2,2bb, lo SB folda. Sei in big blind.',
    heroCards: '7s5s',
    board: null,
    stacksBb: 'Hero 40bb BB · BTN 45bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Call' },
      { id: 'c', label: 'All-in' },
    ],
    correct: 'b',
    explanation:
      "Paghi 1,2bb per un piatto che vale già circa 4,7bb: ti serve poco più del 20% di equity. 75s gioca bene postflop (scale, colori, coppie con kicker che non domina) e contro un'apertura dal bottone il big blind difende molto. Lo shove da 40bb rischia troppo con una mano che prende valore soprattutto vedendo il flop.",
    coachId: 'c-matteo',
    votes: [24, 63, 13],
  },
  {
    key: 'bubble-kjo',
    format: 'MTT',
    title: 'Bolla contro il chip leader',
    situation:
      'Bolla dei premi: restano 19 giocatori, ne pagano 18. Il chip leader va all-in dallo small blind. Al tuo tavolo c’è uno stack da 3bb che deve ancora pagare i bui.',
    heroCards: 'KhJd',
    board: null,
    stacksBb: 'Hero 12bb BB · SB 60bb (ti copre) · short stack 3bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Call' },
    ],
    correct: 'a',
    explanation:
      'In chip EV KJo è un call contro uno shove largo dello SB. Ma in bolla, contro uno stack che ti copre, perdere vuol dire uscire a zero mentre uno stack da 3bb sta per bustare prima di te. Il risk premium dell’ICM alza parecchio l’equity che ti serve per chiamare: fold, e lascia scoppiare la bolla.',
    coachId: 'c-matteo',
    votes: [58, 42],
  },
  {
    key: 'satellite-aa',
    format: 'MTT',
    title: 'Satellite: assi da buttare?',
    situation:
      'Satellite con 11 ticket in palio, restano 12 giocatori. Lo stack più corto ha 2bb. Un avversario con più chip di te va all-in davanti a te.',
    heroCards: 'AsAc',
    board: null,
    stacksBb: 'Hero 30bb BTN · shover 35bb · short stack 2bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Call' },
    ],
    correct: 'a',
    explanation:
      'Nei satelliti ogni ticket vale uguale: con 30bb e uno stack da 2bb al tavolo il tuo posto è praticamente garantito. Chiamando non vinci nulla in più (un ticket resta un ticket), ma contro uno stack che ti copre puoi uscire se gli assi vengono battuti, cosa che succede quasi una volta su cinque. Fold di assi: lo spot più famoso dei satelliti.',
    coachId: 'c-lorenzo',
    votes: [47, 53],
  },
  {
    key: 'spin-hu-k7o',
    format: 'SPIN',
    title: 'Heads-up a 8 bui',
    situation: 'Spin & Go, heads-up. Sei di small blind (bottone) e tocca a te.',
    heroCards: 'Kd7c',
    board: null,
    stacksBb: 'Hero 8bb SB · BB 22bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Min-raise e fold al 3-bet' },
      { id: 'c', label: 'All-in' },
    ],
    correct: 'c',
    explanation:
      'A 8bb in heads-up K7o sta nella metà alta delle mani. Lo shove sfrutta la fold equity e ti fa realizzare tutta l’equity della mano. Min-raise per poi foldare a un 3-bet regala chip con una mano troppo forte; il fold è un errore grosso. In push/fold a 8bb dallo SB si va all-in con la maggior parte delle mani.',
    coachId: 'c-fabri',
    votes: [6, 19, 75],
  },
  {
    key: 'spin-bb-call-k8o',
    format: 'SPIN',
    title: 'Call dal big blind',
    situation: 'Spin & Go, heads-up. Lo small blind va all-in. Sei di big blind e devi decidere.',
    heroCards: 'Kh8s',
    board: null,
    stacksBb: 'SB 8bb all-in · Hero 30bb BB',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Call' },
    ],
    correct: 'b',
    explanation:
      'Paghi 7bb per un piatto finale di 16bb: ti serve circa il 44% di equity. K8o contro un range di shove largo a 8bb ne ha intorno al 55%. Call chiaro: a stack così corti i range di call dal big blind sono molto più larghi di quanto sembri.',
    coachId: 'c-fabri',
    votes: [31, 69],
  },
  {
    key: 'spin-chip-value',
    format: 'SPIN',
    title: 'Quanto vale una chip?',
    situation:
      'Spin & Go standard: tutto il montepremi va al primo classificato. Siete in tre con stack uguali. Hai QQ, ma la domanda è un’altra: come si comporta il valore delle chip in questo formato?',
    heroCards: 'QsQh',
    board: null,
    stacksBb: '3 giocatori · 25bb ciascuno',
    options: [
      { id: 'a', label: 'Lineare: chip EV e $EV coincidono' },
      { id: 'b', label: 'Ogni chip vale di più quante più ne hai' },
      { id: 'c', label: 'Conta solo sopravvivere, come in bolla' },
    ],
    correct: 'a',
    explanation:
      'Se paga solo il primo, la tua equity nel montepremi è proporzionale alle chip che hai: ICM e chip EV coincidono. Per questo negli Spin standard si gioca in chip EV e la pressione da bolla non esiste. Le cose cambiano solo nei formati in cui vengono pagati più posti.',
    coachId: 'c-fabri',
    votes: [61, 17, 22],
  },
  {
    key: 'btn-6bb-q7o',
    format: 'MTT',
    title: 'Corto sul bottone',
    situation: 'MTT, ante in gioco. Foldano tutti fino a te sul bottone.',
    heroCards: 'Qc7h',
    board: null,
    stacksBb: 'Hero 6bb BTN · SB 25bb · BB 40bb',
    options: [
      { id: 'a', label: 'Fold' },
      { id: 'b', label: 'Limp' },
      { id: 'c', label: 'All-in' },
    ],
    correct: 'c',
    explanation:
      'A 6bb con le ante il piatto (circa 2,5bb) vale quasi metà del tuo stack: vincerlo senza showdown è già un ottimo risultato e, quando vieni chiamato, Q7o ha raramente meno del 35% di equity. Lo shove dal bottone a 6bb è larghissimo; aspettare una mano migliore ti costa i bui.',
    coachId: 'c-matteo',
    votes: [14, 9, 77],
  },
  {
    key: 'cash-pot-odds',
    format: 'CASH',
    title: 'Quanta equity ti serve?',
    situation:
      'Cash 6-max. Al river il piatto è 40 € e il villain punta 40 € (puntata pot). Hai un bluff-catcher puro: o vinci o perdi. Qual è l’equity minima per chiamare in pareggio?',
    heroCards: 'JhJc',
    board: 'Ts8s4d2c3h',
    stacksBb: '100bb effettivi',
    options: [
      { id: 'a', label: '25%' },
      { id: 'b', label: '33%' },
      { id: 'c', label: '50%' },
    ],
    correct: 'b',
    explanation:
      'Paghi 40 € per un piatto finale di 120 € (40 + 40 + il tuo call da 40): 40 / 120 = 33%. Se il villain bluffa più di una volta su tre, il call è profittevole. Regola veloce: puntata pot → 33%, metà pot → 25%, due volte il pot → 40%.',
    coachId: 'c-lorenzo',
    votes: [18, 66, 16],
  },
  {
    key: 'cash-mdf',
    format: 'CASH',
    title: 'Difesa minima',
    situation:
      'Il villain punta metà piatto al river. Con che frequenza minima devi continuare (call o raise) perché i suoi bluff non diventino automaticamente profittevoli?',
    heroCards: 'Ad9d',
    board: 'Kc9h5s2d7c',
    stacksBb: '100bb effettivi',
    options: [
      { id: 'a', label: '50%' },
      { id: 'b', label: '67%' },
      { id: 'c', label: '75%' },
    ],
    correct: 'b',
    explanation:
      'MDF = piatto / (piatto + puntata) = 1 / 1,5 ≈ 67%. Se foldi più di un terzo del tuo range, ogni bluff del villain guadagna. Attenzione: l’MDF è un riferimento teorico; contro avversari che bluffano poco si può foldare di più.',
    coachId: 'c-lorenzo',
    votes: [29, 52, 19],
  },
  {
    key: 'cash-cbet-a72',
    format: 'CASH',
    title: 'C-bet su board secca',
    situation:
      'Cash 6-max, single raised pot. Hai aperto dal bottone e il big blind ha chiamato. Flop con l’asso, rainbow. Il BB fa check.',
    heroCards: 'KdQc',
    board: 'As7d2c',
    stacksBb: '100bb effettivi · piatto 5,5bb',
    options: [
      { id: 'a', label: 'Check' },
      { id: 'b', label: 'Bet 33%' },
      { id: 'c', label: 'Bet 125%' },
    ],
    correct: 'b',
    explanation:
      'Su A72 rainbow il range del bottone ha un vantaggio netto: molti più assi forti e coppie alte del big blind. La strategia standard è puntare piccolo con quasi tutto il range. Con KQ la puntata da un terzo fa foldare mani deboli che hanno comunque equity e costa poco; l’overbet polarizza senza motivo su una board così secca.',
    coachId: 'c-matteo',
    votes: [27, 58, 15],
  },
  {
    key: 'river-bluff-blocker',
    format: 'CASH',
    title: 'Il bluff giusto al river',
    situation:
      'Cash 6-max. Hai puntato flop e turn dal bottone, il big blind ha chiamato. Al river i progetti di colore a picche e di scala sono falliti e il BB fa check. Quale di queste mani è il candidato migliore per un bluff?',
    heroCards: '',
    board: '9s8s3d2cKh',
    stacksBb: '100bb effettivi · piatto 18bb',
    options: [
      { id: 'a', label: 'Q♠J♠' },
      { id: 'b', label: 'A♥9♥' },
      { id: 'c', label: 'Q♦J♦' },
    ],
    correct: 'c',
    explanation:
      'Q♠J♠ e Q♦J♦ hanno la stessa forza (nessuno showdown value): cambia solo il seme. Le mani con cui il BB folda al river sono soprattutto i progetti a picche falliti; con Q♠J♠ ne blocchi una parte, quindi il villain avrà più spesso una mano con cui chiamare. Con Q♦J♦ il suo range di fold resta intatto: è il bluff migliore. A9 invece ha showdown value: meglio checkare dietro.',
    coachId: 'c-matteo',
    votes: [38, 21, 41],
  },
]

// ── Roast della settimana (mani anonimizzate) ───────────────────────────────
export const ROAST_SEEDS = [
  {
    title: 'Il call che nessuno ha capito',
    format: 'MTT' as Format,
    heroCards: 'Td6d',
    board: 'AhKh7c2s4d',
    description:
      'Torneo da 22 €, 60bb effettivi. Villain A apre da UTG, l’eroe difende in big blind con T6 di quadri. Check-call al flop, check-call al turn e al river chiama un overbet da due volte il piatto con dieci alto. Showdown: il villain aveva AK.',
    founderComment:
      'Difendere T6s in BB ci sta. Chiamare tre street senza coppia e senza progetto contro un UTG che overbetta il river: questa la incorniciamo. Apprezziamo la fiducia nel dieci alto. — Matteo',
    playedByMember: false,
    worst: 41,
    best: 3,
  },
  {
    title: 'Slowplay di set fino al disastro',
    format: 'CASH' as Format,
    heroCards: '8h8c',
    board: 'Js9d8sTs2h',
    description:
      'Cash 6-max, 100bb. L’eroe fa set di otto su J-9-8 con due picche e checka “per intrappolare”. Turn T di picche: colore e scala completati. L’eroe ora punta il piatto e al river va all-in. Il villain mostra la scala.',
    founderComment:
      'Su una board così bagnata lo slowplay del set è un regalo: si punta il flop e ci si fa pagare dai progetti. Il resto è stato un incidente stradale con il set in mano. — Fabri',
    playedByMember: true,
    worst: 33,
    best: 2,
  },
  {
    title: 'La mano dopo il bad beat',
    format: 'CASH' as Format,
    heroCards: 'Jc4c',
    board: null,
    description:
      'L’eroe perde un piatto grosso con AA contro 72o (scala al river). Alla mano successiva, da UTG+1, 4-betta all-in 100bb con J4 di fiori contro il 3-bet del villain B.',
    founderComment:
      'Il bad beat ci sta, fa parte del gioco. La mano dopo no: per questo nel corso di mental game c’è la pausa obbligatoria di 5 minuti dopo un cooler. — Lollo',
    playedByMember: false,
    worst: 37,
    best: 1,
  },
  {
    title: 'Tre street di value sottile',
    format: 'CASH' as Format,
    heroCards: 'KsTc',
    board: 'Kd8c4h2s3d',
    description:
      'Cash 6-max, BTN contro BB. Board secca, l’eroe ha top pair kicker medio e punta piccolo su tutte e tre le street. Il villain paga fino al river con K9.',
    founderComment:
      'Sizing piccolo, range di call largo, il villain paga con K più deboli e coppie medie. Value sottile fatto come si deve: niente fuochi d’artificio, solo soldi. — Matteo',
    playedByMember: true,
    worst: 2,
    best: 29,
  },
  {
    title: 'Shove heads-up da manuale',
    format: 'SPIN' as Format,
    heroCards: 'Qd6s',
    board: null,
    description:
      'Spin da 25 €, heads-up per il titolo. L’eroe ha 9bb di small blind e va all-in con Q6o invece di limpare e foldare. Il villain chiama con A3 e l’eroe vince il flip.',
    founderComment:
      'A 9bb Q6o è uno shove standard: zero dubbi, zero tank. Il flip vinto è un bonus, la decisione era giusta comunque. — Fabri',
    playedByMember: false,
    worst: 4,
    best: 24,
  },
]

// ── Hand review ──────────────────────────────────────────────────────────────
export const HAND_REVIEW_SEEDS: { format: Format; title: string; description: string; hh: string; comment: string }[] = [
  {
    format: 'MTT',
    title: 'AQs in 3-bet pot fuori posizione',
    description: 'Ho 3-bettato dal BB contro l’apertura del CO e al turn ho subito un check-raise. Fold giusto?',
    hh: `MTT 22 € — Livello 14 (400/800, ante 100)
Hero (BB) 32.400 · Villain1 (CO) 41.800
Preflop: Villain1 rilancia a 1.760, Hero 3-bet a 6.400, Villain1 call
Flop (13.600): Q♦ 7♣ 3♠ — Hero punta 4.100, Villain1 call
Turn (21.800): 9♦ — Hero punta 7.200, Villain1 all-in, Hero ?
Hero: A♠ Q♠`,
    comment:
      'Linea preflop ottima. Al turn la seconda puntata da 7.200 polarizza poco: con top pair top kicker preferisco check-call per tenere dentro i bluff del CO. Dopo il check-raise è un call: 33% di equity richiesta e il villain qui shova anche J-T e progetti di colore.',
  },
  {
    format: 'SPIN',
    title: '3-handed: limp dello SB e iso del BB',
    description: 'Non capisco come giocare il flop dopo aver limpato dallo SB a 18bb.',
    hh: `Spin & Go 10 € — 3 giocatori
Hero (SB) 18bb · Villain1 (BB) 25bb · Villain2 (BTN) 7bb
Preflop: Villain2 fold, Hero limp, Villain1 rilancia a 3bb, Hero call
Flop (6bb): K♥ 8♦ 4♣ — Hero check, Villain1 punta 2bb, Hero ?
Hero: 9♥ 8♣`,
    comment:
      'Il limp-call ci sta. Sul flop seconda coppia con kicker debole: il call è standard, il check-raise rende la mano un bluff. Attenzione allo stack da 7bb: in questi spot l’ICM degli Spin con premi multipli conta poco, ma il BTN corto ti fa preferire linee a varianza più bassa.',
  },
  {
    format: 'CASH',
    title: 'River overbet con il colore minimo',
    description: 'Ho chiuso il colore al river ma il villain overbetta: call o fold?',
    hh: `Cash 6-max NL25 — 100bb
Hero (BTN) · Villain1 (BB)
Preflop: Hero rilancia a 2,5bb, Villain1 call
Flop (5,5bb): T♣ 7♣ 2♦ — Villain1 check, Hero punta 2bb, Villain1 call
Turn (9,5bb): K♠ — check, check
River (9,5bb): 4♣ — Villain1 punta 19bb, Hero ?
Hero: 6♣ 5♣`,
    comment:
      'Il check dietro al turn ha senso. Al river il colore basso è un bluff-catcher: il BB a questi limiti overbetta molto più spesso per valore. Contro il pool NL25 è un fold disciplinato, anche se fa male.',
  },
  {
    format: 'MTT',
    title: 'Final table: shove o call con 15bb?',
    description: 'Final table, 6 rimasti, stack corto a 4bb. Ho shovato A9o dal CO, era troppo?',
    hh: `MTT 55 € — Final table, 6 giocatori
Hero (CO) 15bb · BTN 38bb · SB 4bb · BB 22bb
Preflop: Hero all-in 15bb, BTN call, SB fold, BB fold
Hero: A♦ 9♣ — BTN: A♠ J♠`,
    comment:
      'Con uno stack da 4bb al tavolo la pressione ICM su di te è alta. A9o dal CO a 15bb è uno shove corretto in chip EV, ma qui un open-raise piccolo con fold a un re-shove era più prudente. Errore piccolo: risultato sfortunato, decisione difendibile.',
  },
  {
    format: 'CASH',
    title: 'Check-raise al flop fuori posizione',
    description: 'Ho fatto check-raise con il progetto di scala: troppo aggressivo?',
    hh: `Cash 6-max NL50 — 100bb
Hero (BB) · Villain1 (CO)
Preflop: Villain1 rilancia a 2,5bb, Hero call
Flop (5,5bb): 9♠ 8♦ 2♣ — Hero check, Villain1 punta 1,8bb, Hero rilancia a 6bb, Villain1 call
Turn (17,5bb): A♥ — Hero ?
Hero: 7♦ 6♦`,
    comment:
      'Il check-raise con OESD al flop è ottimo. L’asso al turn favorisce il CO: qui preferisco check e decidere in base alla puntata. Il barrel funziona solo con un piano chiaro per il river.',
  },
  {
    format: 'SPIN',
    title: 'Heads-up a 12bb: min-raise o shove?',
    description: 'Con 12bb heads-up non so mai se min-raisare o andare all-in.',
    hh: `Spin & Go 25 € — Heads-up
Hero (SB) 12bb · Villain1 (BB) 38bb
Preflop: Hero ?
Hero: J♥ 8♥`,
    comment:
      'A 12bb J8s si gioca bene con il min-raise: fa pagare le mani peggiori e ti lascia giocare postflop in posizione. Lo shove è accettabile ma spreca il valore della mano. Rivedi il capitolo “HU a 25bb” del corso Spin.',
  },
]

export const COACH_NOTES = [
  'Ottimo volume a ottobre. ABI un po’ alto rispetto al bankroll: riportiamolo nella fascia concordata.',
  'Da lavorare: difese del big blind contro il bottone. Assegnato il modulo 2 di MTT Fondamenta.',
  'Tilt dopo i bad beat: proposto il protocollo “pausa 5 minuti” del corso di mental game.',
  'Molto solido in ICM. Prossimo passo: aggressività in final table da big stack.',
  'Review di 40 mani fatta in call. Leak principale: troppo passivo al river.',
  'Ha chiesto di salire di limite: ok dopo altri 20k mani in positivo.',
  'Presente a tutte le lezioni del mese, ottimo atteggiamento.',
]

export const TOURNAMENT_NAMES = [
  'Sunday Special 55 €',
  'Main domenicale 109 €',
  'Bounty Hunter 22 €',
  'Turbo serale 11 €',
  'High Roller 215 €',
  'Mini Main 5,50 €',
  'Festival Main Event 109 €',
  'Hyper serale 33 €',
]

export const DEEP_RUN_COMMENTS = [
  ['c-matteo', 'Ora non regalare niente: guarda bene gli stack corti prima di aprire.'],
  ['c-fabri', 'RAIL! Con 15bb niente call leggeri, mi raccomando.'],
  ['c-lorenzo', 'Tutta la lobby ti guarda. Respira, niente fretta.'],
  ['peer', 'Vai che questa è la volta buona'],
  ['peer', 'Mandaci lo screen del final table!'],
  ['peer', 'Railo dal divano, forza'],
] as const

export const STUDY_LABELS = ['Studio con il solver', 'Review del database', 'Video corso', 'Studio ranges preflop', 'Session review']
