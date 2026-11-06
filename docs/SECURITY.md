# Sicurezza e GDPR — backend (apps/api)

Questo documento descrive le misure tecniche implementate e quello che resta da fare sul piano organizzativo/legale. Non sostituisce il parere di un consulente privacy/legale.

## 1. Dati trattati

| Categoria | Dove | Note |
|---|---|---|
| Account (email, nome, cognome, nickname, data di nascita) | `User` | La data di nascita serve alla verifica 18+. |
| Consensi | `User.termsAcceptedAt/termsVersion`, `privacyAcceptedAt/privacyVersion`, `marketingOptIn/marketingOptInAt`, `kycConsentAt`, `shareResultsPublicly`, `roastOptIn` | Ogni consenso ha timestamp e versione del documento accettato. |
| **Documenti d'identità e selfie** | storage (R2) cifrato + `KycFile` (metadati) | Dati personali ad alto rischio (possibile uso per furto d'identità; il selfie è un'immagine del volto). |
| Esito verifica | `KycSubmission` | Tipo documento, **solo ultime 4 cifre** del numero, esito, date, revisore. |
| Risultati di gioco e staking | `Session`, `StakingDeal`, `LedgerEntry` | Dati economici personali: accesso limitato. |
| Pagamenti | Stripe | Nessun dato di carta tocca il server (Stripe Checkout ospitato); in DB solo id cliente/abbonamento Stripe e importi. |
| Log | stdout del container | Redazione automatica di token, password, data di nascita, cifre del documento, firme dei link. |

## 2. Misure tecniche implementate

**Autenticazione e sessioni**
- Password con bcrypt (12 round; libreria senza build nativa), minimo 8 caratteri. Login con tempo di risposta uniforme (hash fittizio se l'email non esiste) e messaggio generico.
- Access token JWT HS256 di 15 minuti (`iss`/`aud` verificati), ruolo riletto dal DB a ogni richiesta (un utente disattivato o declassato perde subito l'accesso).
- Refresh token opaco (256 bit) di 30 giorni: in DB solo l'**hash SHA-256**; rotazione a ogni uso con revoca atomica; il **riuso** di un token già ruotato revoca l'intera famiglia (furto sospetto). Logout e cambio password revocano i token.
- Rate limit su login (10/15 min per IP), registrazione (5/ora), refresh e upload KYC (10/ora).
- Ruoli `STUDENT | COACH | ADMIN` con guardie per singola route; i dati KYC, lo staking e le finanze sono **solo ADMIN**; impossibile rimuovere l'ultimo admin.

**Verifica identità (KYC)**
- Upload in memoria (multer, nessun file temporaneo su disco), massimo 8 MB per file, tipo verificato dai **magic bytes** (JPEG, PNG, WEBP, HEIC, PDF), selfie solo immagine.
- **Cifratura AES-256-GCM lato server** prima di salvare: IV casuale da 12 byte per file, tag di autenticazione salvato in DB, AAD = id del file (un blob spostato su un altro record non si decifra), hash SHA-256 del contenuto verificato alla decifratura. Chiave da `KYC_ENC_KEY` (32 byte), mai nel DB né nello storage.
- Storage separato dal database (Cloudflare R2, bucket privato UE); il provider di storage vede solo ciphertext.
- Visualizzazione admin tramite **link firmato HMAC-SHA256** (chiave derivata con HKDF o `KYC_URL_SIGNING_SECRET`) valido **5 minuti** e legato all'admin che l'ha richiesto; il file viene decifrato al volo con `Cache-Control: no-store`, CSP `sandbox`, `Referrer-Policy: no-referrer`.
- **Registro accessi** `KycAccessLog`: emissione del link (`URL_ISSUED`), file servito (`FILE_SERVED`), revisione (`REVIEWED`), esito da provider (`PROVIDER_WEBHOOK`), cancellazione (`FILES_PURGED`), con admin, IP, user agent e data. Il registro sopravvive alla cancellazione dei file (accountability, art. 5.2 GDPR).
- **Retention**: un job (ogni 6 ore, oppure `npm run job:kyc-retention` da cron) cancella dallo storage e dal DB i documenti delle verifiche concluse da più di `KYC_RETENTION_DAYS` giorni (default 30). Restano solo esito, date, tipo documento e ultime 4 cifre.
- Minimizzazione: si conservano solo le ultime 4 cifre del numero di documento; nessun OCR, nessun dato biometrico estratto.
- Provider esterni (Veriff/Sumsub/Didit) predisposti come adapter: webhook con firma HMAC verificata a tempo costante e idempotenza. Con un provider esterno i documenti restano presso di lui (valutare se disattivare l'upload diretto).

**Applicazione**
- `helmet` (header di sicurezza), CORS con allowlist (`CORS_ORIGINS`), `x-powered-by` disattivato, limite di 200 KB sui body JSON.
- Validazione di ogni input con zod; query Prisma parametrizzate (nessun SQL concatenato con input utente).
- Webhook Stripe e KYC verificati sul **corpo raw** con firma; eventi idempotenti (`WebhookEvent`).
- Errori senza stack trace verso il client; log strutturati (pino) con redazione dei campi sensibili.
- `AuditLog` per le azioni amministrative (revisione KYC, staking, finanze, modifiche a utenti e Player Card).
- Container non-root, immagine di runtime senza dipendenze di sviluppo, healthcheck.
- Classifiche pubbliche solo con consenso (`shareResultsPublicly`); nel Roast l'autore resta anonimo senza `roastOptIn`; nessun dato economico nelle classifiche.

**Contenuti e vincoli di settore**
- Premi della lobby gaming in denaro rifiutati dalla validazione; nessun riferimento a operatori di gioco nel backend (Decreto Dignità).
- Registrazione consentita solo ai maggiorenni (età calcolata sulla data di nascita, fuso Europe/Rome).

## 3. Cosa resta da fare (organizzativo / legale)

- **DPIA** (valutazione d'impatto, art. 35 GDPR): obbligatoria in pratica per il trattamento sistematico di documenti d'identità e selfie. Valutare anche se il selfie configuri dato biometrico (lo diventa se si fa confronto automatico del volto, es. con provider esterni).
- **Base giuridica e informativa** specifica per la verifica identità (finalità: verifica maggiore età e identità dei membri, eventuali obblighi per staking), tempi di conservazione, diritti dell'interessato; testo del consenso allineato al campo `consent` dell'upload.
- **Registro dei trattamenti** (art. 30) e **nomina dei responsabili** (art. 28) con DPA firmati: hosting (Railway/Render), database (Neon/Supabase se usati), Cloudflare R2, Stripe, Bunny, provider KYC, eventuale Discord. Verificare trasferimenti extra-UE (SCC/DPF) e scegliere regioni UE.
- Designazione interna di chi è **autorizzato** al trattamento dei documenti (gli ADMIN) con istruzioni scritte; valutare un ruolo dedicato "KYC reviewer" invece di dare l'accesso a tutti gli admin.
- Procedura di **data breach** (notifica al Garante entro 72 ore) e di **rotazione delle chiavi** (`JWT_ACCESS_SECRET`: invalida tutte le sessioni; `KYC_ENC_KEY`: richiede ri-cifratura dei documenti ancora conservati — script da preparare se necessario).
- Esercizio dei diritti: export dei dati personali e cancellazione dell'account (endpoint non ancora previsti dal contratto: da aggiungere, con cancellazione o anonimizzazione di sessioni, community e storage).
- **Cookie/local storage**: il frontend salva i token in `localStorage`; valutare cookie `HttpOnly` + CSRF se si passa a un dominio dedicato condiviso con l'API, e una CSP rigorosa sul sito per ridurre il rischio XSS.
- 2FA (TOTP) per gli account ADMIN; verifica dell'email in registrazione; reset password via email (oggi non presenti).
- Rate limit distribuito (Redis) e WAF se si scala su più repliche; monitoraggio errori (es. Sentry, con scrubbing dei dati personali).
- Staking: contratti scritti, nessuna raccolta di risparmio dal pubblico, trattamento fiscale da verificare con il commercialista; i dati economici dei giocatori vanno citati nell'informativa.
- Penetration test / revisione di sicurezza prima del lancio pubblico; aggiornamento periodico delle dipendenze (`npm audit`).

## 4. Rotazione e gestione dei segreti

| Segreto | Dove | Effetto della rotazione |
|---|---|---|
| `JWT_ACCESS_SECRET` | env provider | Tutti gli access token diventano invalidi (gli utenti ripetono il login dopo al massimo un refresh fallito). |
| `KYC_ENC_KEY` | env provider + password manager | I file cifrati con la vecchia chiave non si decifrano più: ruotare solo dopo che la retention ha svuotato lo storage o con uno script di ri-cifratura. |
| `KYC_URL_SIGNING_SECRET` | env (facoltativo) | Invalida i link firmati in circolazione (scadono comunque in 5 minuti). |
| `STRIPE_*`, `S3_*`, `BUNNY_*`, `KYC_WEBHOOK_SECRET` | env provider | Aggiornare anche il pannello del servizio esterno. |
