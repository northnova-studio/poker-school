// BOZZE dei testi legali — DA VALIDARE con un legale prima della pubblicazione.
// I dati tra [parentesi quadre] vanno sostituiti con quelli reali.
export type LegalSlug = 'privacy' | 'termini' | 'gioco-responsabile' | 'cookie'

export type LegalBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] } | { type: 'link'; text: string; href: string; label: string }

export interface LegalPage {
  slug: LegalSlug
  title: string
  intro: string
  updated: string
  sections: { title: string; blocks: LegalBlock[] }[]
}

export const LEGAL: Record<LegalSlug, LegalPage> = {
  'gioco-responsabile': {
    slug: 'gioco-responsabile',
    title: 'Gioco responsabile',
    intro:
      'Insegniamo poker come disciplina di studio e di competizione. Proprio per questo prendiamo sul serio i rischi del gioco con vincite in denaro. Questa pagina spiega cosa facciamo noi, quali sono i segnali di allarme e a chi rivolgersi.',
    updated: 'novembre 2026',
    sections: [
      {
        title: 'Solo maggiorenni',
        blocks: [
          { type: 'p', text: 'La scuola è riservata a persone maggiorenni. Verifichiamo l’età e l’identità di ogni membro con documento e selfie prima di dare accesso ai contenuti riservati. Il gioco con vincite in denaro è vietato ai minori.' },
        ],
      },
      {
        title: 'Cosa facciamo, e cosa no',
        blocks: [
          {
            type: 'ul',
            items: [
              'Offriamo solo formazione: corsi, lezioni, review e community. Non organizziamo gioco e non raccogliamo puntate.',
              'Non abbiamo accordi con sale da gioco e non pubblichiamo loghi, link, bonus o codici promozionali.',
              'Non promettiamo guadagni. I risultati che mostriamo sono prove di competenza dei coach, non aspettative per chi studia.',
              'Parliamo di bankroll, pause, sonno e limiti di volume come parte del metodo. I coach possono suggerire di fermarsi.',
              'I premi della community (Taglia sui fondatori, classifiche) sono solo lezioni o badge, mai denaro.',
            ],
          },
        ],
      },
      {
        title: 'Segnali di rischio',
        blocks: [
          { type: 'p', text: 'Fermati e chiedi aiuto se ti riconosci in uno o più di questi comportamenti:' },
          {
            type: 'ul',
            items: [
              'giochi più tempo o più soldi di quanto avevi deciso;',
              'cerchi di recuperare subito le perdite giocando ancora;',
              'usi soldi destinati ad altre spese, o ne chiedi in prestito per giocare;',
              'nascondi a familiari o amici quanto giochi;',
              'senti irritazione, ansia o tristezza quando non puoi giocare;',
              'il gioco toglie spazio a lavoro, studio, sonno o relazioni.',
            ],
          },
          { type: 'p', text: 'Se è così, sospendi lo studio e il gioco e parlane con un professionista. Scrivici pure: ti aiutiamo a mettere in pausa l’abbonamento senza costi.' },
        ],
      },
      {
        title: 'Autoesclusione',
        blocks: [
          {
            type: 'p',
            text: 'I concessionari autorizzati in Italia devono offrire strumenti di autolimitazione (limiti di deposito e di tempo) e di autoesclusione, temporanea o a tempo indeterminato, dal proprio conto di gioco. L’autoesclusione può riguardare anche tutti i concessionari autorizzati tramite il registro gestito dall’Agenzia delle Dogane e dei Monopoli. Le modalità aggiornate si trovano sul sito istituzionale di ADM.',
          },
          { type: 'link', text: 'Agenzia delle Dogane e dei Monopoli, sito istituzionale:', href: 'https://www.adm.gov.it', label: 'www.adm.gov.it' },
        ],
      },
      {
        title: 'A chi rivolgersi',
        blocks: [
          {
            type: 'p',
            text: 'Telefono Verde Nazionale per le problematiche legate al gioco d’azzardo dell’Istituto Superiore di Sanità: 800 55 88 22. È un numero verde, quindi gratuito, con operatori che orientano verso i servizi del territorio.',
          },
          {
            type: 'link',
            text: 'Pagina dell’Istituto Superiore di Sanità sul Telefono Verde:',
            href: 'https://www.iss.it/dipendenze/-/asset_publisher/zwfXwoiZC6zu/content/telefono-verde-nazionale-per-le-problematiche-legate-al-gioco-d-azzardo-tvnga-800-55-88-22',
            label: 'iss.it',
          },
          { type: 'p', text: 'Puoi rivolgerti anche ai Servizi per le Dipendenze (SerD) della tua ASL, che offrono assistenza gratuita e riservata, e al tuo medico di base.' },
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Informativa privacy',
    intro: 'Come trattiamo i tuoi dati personali ai sensi del Regolamento (UE) 2016/679 (GDPR) e del D.lgs. 196/2003.',
    updated: 'novembre 2026',
    sections: [
      { title: 'Titolare del trattamento', blocks: [{ type: 'p', text: '[Ragione sociale], [indirizzo], P. IVA [numero], email [indirizzo email privacy]. Il titolare può nominare un responsabile della protezione dei dati: [nome e contatti, se nominato].' }] },
      {
        title: 'Quali dati raccogliamo',
        blocks: [
          {
            type: 'ul',
            items: [
              'Dati dell’account: nome, cognome, email, nickname, data di nascita, formati di gioco e livello.',
              'Dati di verifica dell’identità: tipo di documento, ultime quattro cifre del numero, immagini del documento e selfie.',
              'Dati di utilizzo: sessioni registrate, statistiche, risposte al Daily Spot, partecipazione alle lezioni e alla community.',
              'Dati di pagamento: gestiti dal fornitore di pagamento; noi riceviamo solo l’esito e i dati di fatturazione.',
              'Dati tecnici: log di accesso e preferenze salvate nel browser (per esempio il tema grafico).',
            ],
          },
        ],
      },
      {
        title: 'Perché li trattiamo e su quale base',
        blocks: [
          {
            type: 'ul',
            items: [
              'Erogare il servizio di formazione e gestire l’account: esecuzione del contratto.',
              'Verificare età e identità: obbligo di legge e legittimo interesse a riservare il servizio ai maggiorenni.',
              'Adempimenti fiscali e contabili: obbligo di legge.',
              'Classifiche pubbliche, Roast e prove degli studenti: consenso, revocabile in qualsiasi momento dal profilo.',
              'Comunicazioni promozionali sui nostri corsi: consenso facoltativo.',
            ],
          },
        ],
      },
      {
        title: 'Verifica dell’identità',
        blocks: [
          {
            type: 'p',
            text: 'I file del documento e del selfie sono cifrati, accessibili solo all’amministrazione o al fornitore di verifica incaricato, e cancellati entro [N] giorni dall’esito della verifica. Conserviamo solo l’esito, la data e le ultime quattro cifre del documento.',
          },
        ],
      },
      {
        title: 'Per quanto tempo',
        blocks: [{ type: 'p', text: 'Per la durata dell’account e, dopo la chiusura, per il tempo necessario agli obblighi di legge (per esempio dieci anni per i documenti contabili). I dati di utilizzo vengono anonimizzati o cancellati entro [N] mesi dalla chiusura dell’account.' }],
      },
      {
        title: 'A chi li comunichiamo',
        blocks: [
          { type: 'p', text: 'A fornitori che agiscono come responsabili del trattamento: hosting, fornitore di verifica dell’identità, fornitore di pagamento, piattaforma video, servizio email. L’elenco aggiornato è disponibile su richiesta. Se un fornitore si trova fuori dallo Spazio economico europeo, il trasferimento avviene con le garanzie previste dal GDPR.' },
        ],
      },
      {
        title: 'I tuoi diritti',
        blocks: [
          { type: 'p', text: 'Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento (artt. 15–22 GDPR), e revocare i consensi in qualsiasi momento, scrivendo a [indirizzo email privacy]. Hai diritto di proporre reclamo al Garante per la protezione dei dati personali.' },
        ],
      },
    ],
  },
  termini: {
    slug: 'termini',
    title: 'Termini e condizioni',
    intro: 'Le regole del servizio di formazione. Usando il sito e l’area riservata accetti questi termini.',
    updated: 'novembre 2026',
    sections: [
      { title: 'Il servizio', blocks: [{ type: 'p', text: 'Offriamo formazione sul poker: video corsi, lezioni di gruppo, coaching individuale, review e una community. Non organizziamo gioco con vincite in denaro e non siamo affiliati a sale da gioco.' }] },
      {
        title: 'Chi può iscriversi',
        blocks: [{ type: 'p', text: 'Solo persone maggiorenni che completano la verifica dell’identità. Possiamo rifiutare o sospendere un’iscrizione se i dati non sono veritieri o se ci sono segnali di gioco problematico.' }],
      },
      {
        title: 'Account',
        blocks: [{ type: 'ul', items: ['L’account è personale e non può essere condiviso.', 'Sei responsabile della riservatezza delle credenziali.', 'Le lezioni e i corsi non possono essere registrati, copiati o ridistribuiti.'] }],
      },
      {
        title: 'Piani, acquisti e recesso',
        blocks: [
          { type: 'p', text: 'I piani si rinnovano automaticamente alla scadenza (mensile o annuale) finché non disdici dall’area riservata. I corsi acquistati singolarmente restano accessibili finché il servizio è attivo.' },
          {
            type: 'p',
            text: 'Per i consumatori vale il diritto di recesso di 14 giorni previsto dal Codice del consumo. Per i contenuti digitali, se chiedi di accedere subito al corso e riconosci che così perdi il diritto di recesso, il recesso non si applica dopo l’inizio della fruizione. [Da verificare con il legale.]',
          },
        ],
      },
      {
        title: 'Nessuna garanzia di risultato',
        blocks: [{ type: 'p', text: 'Il poker comporta varianza e rischio economico. La formazione migliora le decisioni ma non garantisce risultati né guadagni. I risultati mostrati sul sito sono dei coach o di studenti che hanno dato il consenso e non rappresentano un’aspettativa.' }],
      },
      {
        title: 'Comportamento nella community',
        blocks: [{ type: 'ul', items: ['Rispetto per tutti i membri, i coach e gli avversari.', 'Nelle mani condivise vanno oscurati nickname e avatar di altri giocatori.', 'Vietato pubblicare link, bonus o codici di sale da gioco.', 'Il Roast è facoltativo: si critica la giocata, mai la persona.'] }],
      },
      {
        title: 'Accordi di staking',
        blocks: [{ type: 'p', text: 'Eventuali accordi di backing sono regolati da contratti separati e individuali, non fanno parte dei piani e non sono un prodotto in vendita.' }],
      },
      {
        title: 'Legge applicabile',
        blocks: [{ type: 'p', text: 'Si applica la legge italiana. Per i consumatori è competente il foro di residenza o domicilio del consumatore.' }],
      },
    ],
  },
  cookie: {
    slug: 'cookie',
    title: 'Cookie e archiviazione locale',
    intro: 'Quali informazioni salviamo nel tuo browser e perché.',
    updated: 'novembre 2026',
    sections: [
      {
        title: 'Strumenti tecnici',
        blocks: [
          {
            type: 'ul',
            items: [
              'Sessione e accesso all’area riservata: necessari per farti restare collegato.',
              'Preferenza del tema grafico (chiave “tris.theme” in archiviazione locale): ricorda l’identità visiva scelta.',
              'In modalità demo i dati di prova restano solo nel tuo browser.',
            ],
          },
          { type: 'p', text: 'Questi strumenti non richiedono consenso perché servono a fornire il servizio che hai chiesto.' },
        ],
      },
      {
        title: 'Contenuti di terze parti',
        blocks: [{ type: 'p', text: 'Alcuni video sono ospitati su YouTube in modalità a privacy avanzata (youtube-nocookie.com) e vengono caricati solo quando apri il video. Da quel momento si applicano le regole di Google.' }],
      },
      {
        title: 'Statistiche e profilazione',
        blocks: [{ type: 'p', text: 'Al momento non usiamo cookie di profilazione né strumenti di analisi di terze parti. Se li introdurremo, ti chiederemo il consenso con un banner prima di attivarli.' }],
      },
      { title: 'Come gestirli', blocks: [{ type: 'p', text: 'Puoi cancellare cookie e archiviazione locale dalle impostazioni del browser. Cancellandoli potresti dover rifare l’accesso.' }] },
    ],
  },
}
