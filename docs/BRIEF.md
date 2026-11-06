# BRIEF CONDIVISO — Scuola di poker (nome di lavoro: TRIS)

Documento di riferimento per tutti gli agenti. Lingua di tutti i deliverable: **italiano**.

## 1. Chi sono i clienti (i fondatori)

Tre amici, giocatori italiani **attualmente in attività ad alti livelli in Italia**, che aprono una scuola di poker online.

| Fondatore | Ruolo nella scuola |
|---|---|
| **Fabrizio ("Fabri")** | Head coach **Spin & Go** |
| **Matteo** | Head coach **MTT**, contenuti, sessioni **high stakes** (sweat/highstack) |
| **Lorenzo** | Gestionale, marketing, infrastruttura tech, contabilità. Ex pro player di Call of Duty, segue l'esports da anni. Gioca MTT (anche trasferte live, es. PokerStars Open Cannes). |

Formati coachati: **MTT, Spin & Go, Cash game**.

Posizionamento da valorizzare:
- **Tecnici e preparatissimi**, giocano oggi ai livelli più alti in Italia (non "ex" che vendono corsi vecchi).
- **Mentalità da atleti professionisti**: ambiente ipercompetitivo, volume, review, preparazione mentale, routine.
- **Gruppo di amici molto unito che scherza tanto**: community vera, si gioca ai videogiochi insieme (Warzone/COD, ecc.) dopo le sessioni. Ironia, sfottò, "roast" amichevoli.
- Hanno **molti video e screenshot** (risultati, deep run, sessioni) da usare come prove: il sito deve avere una sezione "Prove/Risultati" facile da riempire.

Contenuti: le statistiche/risultati reali dei fondatori NON li conosciamo. Nel sito usare valori di esempio marcati come segnaposto (vedi §7). Mai inventare risultati presentandoli come veri nei documenti: indicarli come "da inserire".

## 2. Nome di lavoro e 10 proposte di nome

Nome di lavoro usato nel sito: **TRIS** (sostituibile da un solo file di config `brand.ts`). Dominio dedicato verrà comprato dopo la scelta.

1. **TRIS** — tre fondatori, tre formati (MTT, Spin, Cash). "Fare tris". Italiano, corto, memorabile.
2. **RANKED** — linguaggio gaming (ranked mode), richiama il sistema di rank e la mentalità competitiva.
3. **Scuderia** — squadra corse / "scuderia" di giocatori (stable), atleti, eccellenza italiana.
4. **LOBBY** — doppio senso: lobby del client di poker + lobby dei videogiochi post-sessione.
5. **Varianza Club** — autoironico, community, "la varianza la combattiamo insieme".
6. **Overbet Academy** — tecnico, aggressivo, da reg.
7. **Lo Spogliatoio** — squadra, sfottò, preparazione pre-partita, ambiente da atleti.
8. **Deep Run Club** — l'obiettivo di ogni MTT player, si lega ai contenuti "deep run".
9. **Highstack** — ambizione high stakes, richiama le sessioni highstack di Matteo.
10. **Clutch** — gaming/sport: i momenti decisivi, ICM, final table, bolla.

## 3. Le 5 brand identity e le 5 palette

Gusto di Lorenzo (vincolante): direzione visiva **"adulta" e materica** (peso tipografico, contrasto, spazio); rifiuta template generici, gradienti standard, card bianche arrotondate su sfondo grigio, foto stock. **Preferisce palette ammorbidite e poco contrastate**: ha già bocciato un nero quasi puro + arancio segnaletico come "troppo forte". Apprezza effetti visivi legati al tema (qui: panno verde, fiches, carte, grafici di bankroll, HUD, lobby di gioco). Riferimenti animazione: motionsites.ai, reactbits.dev, marketplace Framer.

Ogni identità = nome + concept + palette + tipografia + tono di voce. Le 5 palette sono anche i temi CSS del sito (switch in pagina "Brand Lab").

**A. TRIS — "Athletic Lab"** (identità usata dal sito di default)
- Concept: laboratorio di performance; il poker trattato come sport. Tre semi/tre linee nel logo.
- Palette "Felt & Bone": `--bg #101814` (panno scurissimo), `--surface #17221D`, `--ink #ECE6D8` (osso), `--muted #9AA59D`, `--accent #C9A45C` (ottone smorzato), `--accent-2 #B85C45` (argilla/rosso fiche), `--line #2A3730`.
- Tipografia: display **Archivo** (pesi 800-900, anche Archivo Expanded/variabile width), testo **Inter Tight**, numeri/statistiche **JetBrains Mono**.
- Tono: diretto, tecnico, autoironico. "Studiamo come atleti. Ci prendiamo in giro come amici."

**B. RANKED — "Esports Ladder"**
- Palette "Night Queue": `#13151D` bg, `#1B1E29` surface, `#E6E9F2` ink, `#8E94A8` muted, `#8C7CF0` accent (viola smorzato), `#9ACD6B` accent-2 (lime smorzato), `#2A2E3D` line.
- Tipografia: **Chakra Petch** display, **Inter** testo.
- Tono: gaming, season, ladder, "GG".

**C. Scuderia — "Racing Team"**
- Palette "Asfalto & Rosso corsa": `#1A1A1C` bg, `#232326` surface, `#EFEBE4` ink, `#9C978F` muted, `#B8433A` accent (rosso corsa smorzato), `#D8B45A` accent-2 (giallo segnale smorzato), `#33332F` line.
- Tipografia: **Barlow Condensed** display, **Barlow** testo.
- Tono: squadra corse, box, telemetria, "giro veloce". (Evitare cavallini e qualunque richiamo a marchi Ferrari.)

**D. LOBBY — "Late Night Club"**
- Palette "Post-sessione": `#1C1520` bg, `#261D2B` surface, `#F1E9E4` ink, `#A3949F` muted, `#D9809F` accent (rosa neon smorzato), `#62B3A5` accent-2 (teal), `#372B3C` line.
- Tipografia: **Unbounded** display, **DM Sans** testo.
- Tono: notturno, community, "dopo la sessione si gioca".

**E. Varianza Club — "Editoriale ironico"** (unica chiara: differenzia da tutti i siti poker scuri)
- Palette "Carta & Fiches": `#F3EEE4` bg, `#FBF8F2` surface, `#1D1D1B` ink, `#6B675F` muted, `#2F5D8A` accent (blu fiche), `#C2483A` accent-2 (rosso fiche), `#D9CFBF` line; senape `#D9A441` come terzo accento.
- Tipografia: **Instrument Serif** display, **Instrument Sans** testo.
- Tono: editoriale, ironico, da rivista sportiva.

## 4. Struttura del sito (mappa)

Pubblico:
- **Home**: hero animato forte (es. carte/fiches/linee di bankroll che si compongono; testo enorme), manifesto (atleti + amici), i tre formati, i tre fondatori, prove/risultati, come funziona, community (rank, lobby gaming), corsi, testimonianze, FAQ, CTA "Candidati".
- **/coaching/mtt**, **/coaching/spin**, **/coaching/cash**: programma, curriculum, head coach, livelli (micro → high), formato lezioni, requisiti, CTA.
- **/team**: i fondatori (schede stile "player card"), filosofia, momenti fuori dai tavoli (gaming post-sessione).
- **/risultati** (Prove): galleria filtrabile di screenshot/video (deep run, grafici, sessioni) con lightbox; dati da `src/data/proofs.ts`.
- **/corsi**: shop video corsi (catalogo, filtri per formato/livello, pagina corso con curriculum, anteprima, prezzo, acquisto).
- **/community**: rank/ladder pubblico, Daily Spot, Spot della settimana (roast), lobby gaming, Discord.
- **/prezzi**: piani di membership (es. Base / Pro / Elite + coaching 1:1) e lezioni di gruppo.
- **/candidati** o **/registrati**: registrazione con verifica identità (documento + selfie), 18+.
- **/brand-lab**: pagina interna per provare dal vivo le 5 identità/palette e i 10 nomi sul sito.
- Pagine legali: privacy, termini, gioco responsabile (18+, link ADM/gioco responsabile, nessuna promozione di sale da gioco).

Area studente (dopo login): dashboard, le mie statistiche, il mio rank, player card, sessioni (log risultati), corsi acquistati (player video), calendario lezioni di gruppo + prenotazione, hand review (invio mani), Daily Spot, community, profilo e stato verifica identità.

Area admin (gestionale): panoramica KPI, giocatori (lista + dettaglio con P&L), verifiche identità (coda KYC approva/rifiuta), staking/investimenti (capitale investito per giocatore, makeup, split profitti, andamento), finanze scuola (ricavi per fonte, costi, cash flow), corsi e vendite, lezioni/calendario, coach, impostazioni.

## 5. Feature community e "divertenti"

Richiesta esplicita: sistema di rank + **5 feature proposte da noi**. Sono queste:

0. **Sistema di Rank / Ladder a stagioni** (richiesto): XP da ore di studio, sessioni registrate, mani inviate in review, presenze alle lezioni, Daily Spot, sfide. Divisioni: **Fish → Calling Station → Reg → Grinder → Shark → Crusher → Legend** (con sotto-livelli III/II/I). Stagioni mensili, classifica, badge.
1. **Player Card stile FIFA Ultimate Team**: carta del giocatore con overall e 6 attributi (Preflop, Postflop, ICM, Aggressività, Mental, Volume) aggiornati da coach + dati; rarità (bronzo/argento/oro/icona); condivisibile sui social (virale).
2. **Daily Spot**: uno spot al giorno (stile Wordle) con streak, classifica, spiegazione del coach; risultato condivisibile.
3. **Roast della settimana / Spot del disonore**: la community vota lo spot giocato peggio (mani anonimizzate) e quello giocato meglio; commento ironico dei fondatori. Badge "Clown della settimana" (consensuale, solo membri che accettano).
4. **Deep Run Alert / Rail**: quando uno studente è deep in un MTT attiva l'alert; la community lo "raila" (tifo), i coach possono commentare; storico dei deep run nel profilo.
5. **Lobby post-sessione (gaming)**: calendario serate videogiochi (Warzone/COD, FIFA, ecc.), classifica gaming interna, **"Taglia sui fondatori"** (batti un fondatore in un 1v1 e vinci una lezione gratis), link Discord.

Statistiche "simpatiche" nel profilo: tilt-o-metro, contatore bad beat/cooler, "bolle scoppiate", ore di studio, streak di sessioni, "river subiti del mese", percentuale presenze.

## 6. Admin: cosa deve poter monitorare

Per ogni giocatore: formato (MTT/Spin/Cash), livello/stake, coach, stato KYC, piano, risultati (vincite, perdite, profitto netto), volume (tornei/spin/mani), metriche (ROI e ABI per MTT, ROI/chip EV per Spin, bb/100 per cash), **capitale investito dalla scuola (staking/backing)**, makeup, quota profitti scuola/giocatore, andamento nel tempo (grafici). Totali scuola: P&L staking, ricavi da membership/corsi/lezioni, costi, cash flow, coorti/retention.

## 7. Dati segnaposto e onestà

- Tutti i numeri sui fondatori (risultati, ROI, vincite) nel sito sono **esempi**: nei file dati marcarli con `placeholder: true` e commento `// DA SOSTITUIRE con i dati reali`; in UI mostrare una piccola etichetta "esempio" quando `placeholder` è vero.
- Niente foto stock: usare grafica generativa/SVG/canvas, carte, fiches, grafici, slot "inserisci il tuo screenshot" ben disegnati.

## 8. Vincoli legali da tenere presenti ovunque

- **Italia — Decreto Dignità (DL 87/2018, art. 9)**: divieto di qualunque forma di pubblicità, anche indiretta, di giochi con vincite in denaro, incluse sponsorizzazioni e social. Quindi: niente loghi/link/codici affiliazione/bonus di poker room, niente "deposita qui", niente glorificazione delle vincite come promessa. Contenuti formativi/tecnici sì, con attenzione. Messaggi 18+ e gioco responsabile.
- **Clip di spot giocati da altri reg**: anonimizzare nickname e avatar (dati personali/diffamazione/T&C delle room), criticare la giocata e non la persona.
- **Verifica identità (KYC)**: dati personali sensibili ai sensi del GDPR → minimizzazione, cifratura a riposo, accesso solo admin, retention limitata, informativa, possibilità di provider esterno (Veriff/Sumsub/Didit/Onfido). Solo maggiorenni.
- **Staking/backing**: contratti chiari, nessuna raccolta di risparmio dal pubblico, trattamento fiscale da verificare con commercialista.

## 9. Architettura tecnica

Monorepo `poker-school/`:
- `apps/web` — **React + Vite + TypeScript + Tailwind v4**, React Router; animazioni **Lenis** (smooth scroll), **GSAP + ScrollTrigger** (sequenze scroll), **Motion** (transizioni componenti); grafici **Recharts**; icone **lucide-react**. Mobile-first (375px → 1440px). Budget: LCP < 2s su 4G, JS iniziale < 150KB gzip (code splitting per route, three.js solo se dinamico). WCAG AA, target ≥44px, focus visibili, `prefers-reduced-motion` rispettato.
  - Hosting: **GitHub Pages** (statico) → HashRouter o fallback 404, `base` configurabile.
  - **Demo mode**: se `VITE_API_URL` non è impostata, il frontend usa un **mock API in-browser** (dati seed + localStorage) così tutto è navigabile su Pages. Banner discreto "Demo". In demo nessun documento viene inviato da nessuna parte.
- `apps/api` — **Node.js + Express + TypeScript + Prisma + PostgreSQL** (stack di Lorenzo). Auth JWT (access+refresh, bcrypt/argon2), ruoli `STUDENT | COACH | ADMIN`, upload documenti KYC (cifrati, storage S3-compatibile/locale), adapter per provider KYC, corsi/lezioni/video (URL firmati Bunny Stream/Mux/Vimeo), Stripe Checkout + webhook (opzionale via env), stats/rank/XP, admin. Deploy: Docker + Render/Railway/Fly + Postgres Neon/Supabase. GitHub Pages NON può ospitare il backend.
- Contratto API unico: `apps/web/src/lib/api/types.ts` + `docs/API.md`. Frontend mock e backend reale implementano lo stesso contratto.
