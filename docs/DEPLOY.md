# Deploy del backend (apps/api) — guida passo passo

GitHub Pages ospita solo il frontend statico: il backend (Node.js + Express + Prisma) va su un servizio che esegue container. Percorso consigliato: **Railway** (l'app Railway è già installata sull'organizzazione GitHub) con Postgres gestito, **Cloudflare R2** per i documenti KYC, **Stripe** per i pagamenti, **Bunny Stream** per i video. Alternativa: **Render** con il blueprint `apps/api/render.yaml`.

Tempo stimato per la prima messa online: 1–2 ore.

---

## 0. Prerequisiti e segreti da generare

Sul tuo computer (macOS/Linux, o Git Bash su Windows):

```bash
# Segreto per firmare i JWT (almeno 32 caratteri)
openssl rand -base64 48
# Chiave di cifratura dei documenti KYC: ESATTAMENTE 32 byte in base64
openssl rand -base64 32
```

> ⚠️ Salva **subito** `KYC_ENC_KEY` in un password manager condiviso tra i fondatori (es. Bitwarden/1Password). Se la chiave va persa i documenti già caricati non sono più leggibili; se trapela, i documenti sono leggibili da chi ha anche accesso al bucket. Non va mai nel repository né in chat.

Ti servono anche: una password admin robusta (≥ 12 caratteri) e una password iniziale per i fondatori (da cambiare al primo accesso con `POST /auth/change-password`).

## 1. Database Postgres

Scegli **una** opzione (tutte Postgres 16, regione UE):

- **Railway Postgres** (più semplice): nel progetto Railway → *New* → *Database* → *PostgreSQL*. La variabile `DATABASE_URL` si collega al servizio API con il riferimento `${{Postgres.DATABASE_URL}}`.
- **Neon**: crea il progetto in regione *Frankfurt*, copia la connection string **diretta** (non il pooler, oppure il pooler con `?pgbouncer=true` solo per il runtime) con `?sslmode=require`.
- **Supabase**: *Project Settings → Database → Connection string (URI)*, regione EU, aggiungi `?sslmode=require`.

Attiva i backup automatici (Railway: *Backups*; Neon/Supabase: point-in-time recovery sui piani a pagamento).

## 2. Cloudflare R2 (documenti d'identità)

1. Cloudflare dashboard → **R2** → *Create bucket* → nome es. `tris-kyc`, location *Europe (EU)* (giurisdizione UE).
2. Il bucket deve restare **privato**: non attivare "Public access" né domini pubblici. L'API scarica i file cifrati e li serve all'admin con link firmati a 5 minuti.
3. R2 → *Manage R2 API Tokens* → *Create API token* con permesso **Object Read & Write** limitato al solo bucket `tris-kyc`. Annota *Access Key ID* e *Secret Access Key*.
4. L'endpoint S3 è `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (per i bucket con giurisdizione UE: `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`).

Variabili: `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

## 3. Deploy su Railway

1. Railway → *New Project* → *Deploy from GitHub repo* → scegli il repository dell'organizzazione `northnova-studio`.
2. Nel servizio creato: **Settings → Source → Root Directory** = `apps/api`.
3. **Settings → Config-as-code**: percorso del file = `/apps/api/railway.json` (il percorso del file di config non segue la Root Directory). Il file imposta build da `Dockerfile`, healthcheck su `/health`, riavvio in caso di errore e redeploy solo quando cambia `apps/api/**`.
4. **Variables** (tab del servizio) — incolla almeno:

   | Variabile | Valore |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (o la stringa Neon/Supabase) |
   | `JWT_ACCESS_SECRET` | output di `openssl rand -base64 48` |
   | `KYC_ENC_KEY` | output di `openssl rand -base64 32` |
   | `PUBLIC_API_URL` | URL pubblico del servizio (passo 5), es. `https://tris-api.up.railway.app` |
   | `FRONTEND_URL` | `https://northnova-studio.github.io/poker-school` (o il dominio dedicato) |
   | `CORS_ORIGINS` | `https://northnova-studio.github.io` (+ dominio dedicato quando c'è) |
   | `STORAGE_DRIVER` | `s3` + tutte le `S3_*` del passo 2 |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | account admin tecnico |
   | `SEED_FOUNDER_PASSWORD` | password iniziale dei 3 fondatori |
   | `SEED_EMAIL_DOMAIN` | dominio delle email dei fondatori (`fabri@…`, `matteo@…`, `lorenzo@…`) |

   L'elenco completo e commentato è in `apps/api/.env.example`.
5. **Settings → Networking → Generate Domain** (o *Custom Domain*, es. `api.tuodominio.it` con record CNAME). Copia l'URL in `PUBLIC_API_URL`.
6. Il primo deploy parte da solo: il container esegue `prisma migrate deploy` (crea le tabelle) e avvia il server. Verifica: `curl https://<dominio>/health` → `{"status":"ok","db":"ok",…}`.
7. **Seed dei dati di base** (piani, badge, corsi, fondatori, admin) — una volta sola, *dentro* il container in esecuzione (CLI Railway):

   ```bash
   railway link            # seleziona progetto e servizio
   railway ssh             # shell nel container del servizio
   node dist/prisma/seed.js
   ```

   (Non usare `railway run`: esegue il comando sul tuo computer, non nel container.)

   In produzione **non** crea i dati demo (studenti finti, sessioni…) salvo `SEED_DEMO=true`. Il seed è idempotente.

Repliche: i job (retention KYC ogni 6 ore, cambio stagione ogni ora) girano nel processo. Con più di una replica lascia `JOBS_ENABLED=true` su una sola, oppure crea un *Cron* Railway con `npm run job:kyc-retention` e `npm run job:season`. Anche il rate limit è in memoria: con più repliche serve uno store condiviso (Redis).

## 3-bis. Alternativa: Render

1. Render → *New* → *Blueprint* → repository dell'organizzazione → **Blueprint Path** = `apps/api/render.yaml`.
2. Il blueprint crea il servizio web Docker (regione Frankfurt) e un Postgres 16 gestito, collega `DATABASE_URL` e genera `JWT_ACCESS_SECRET`. Le variabili con `sync: false` (KYC_ENC_KEY, S3_*, Stripe, Bunny, admin) vanno compilate a mano nella schermata di creazione.
3. Seed: *Shell* del servizio → `node dist/prisma/seed.js`.
4. Verifica i piani (`starter`, `basic-256mb`) sul listino attuale di Render prima di confermare.

## 4. Stripe (facoltativo, consigliato)

Senza `STRIPE_SECRET_KEY` l'API risponde `503 Pagamenti non configurati` al checkout (il resto funziona; l'admin può registrare acquisti/abbonamenti manuali).

1. Dashboard Stripe (prima in **modalità test**) → *Product catalog*:
   - 3 prodotti abbonamento: **Base**, **Pro**, **Elite**, ciascuno con due prezzi ricorrenti in EUR: mensile (39 / 89 / 249) e annuale (390 / 890 / 2490). Copia i `price_…` in `STRIPE_PRICE_BASE_MONTH`, `STRIPE_PRICE_BASE_YEAR`, `STRIPE_PRICE_PRO_MONTH`, … I prezzi devono coincidere con `PLAN_*` (listino mostrato sul sito).
   - I corsi non richiedono prodotti: il checkout usa il prezzo del corso nel database.
2. *Developers → API keys*: copia la **Secret key** in `STRIPE_SECRET_KEY`.
3. *Developers → Webhooks → Add endpoint*: URL `https://<PUBLIC_API_URL>/api/v1/billing/webhook`, eventi:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.
   Copia il *Signing secret* (`whsec_…`) in `STRIPE_WEBHOOK_SECRET`.
4. *Settings → Customer portal*: attivalo per permettere disdetta/cambio carta (link da aggiungere nel profilo utente).
5. Prova con la carta `4242 4242 4242 4242`, poi ripeti i passi in **modalità live** con chiavi e webhook live.

Nessun dato di carta passa dal server: il pagamento avviene su Stripe Checkout.

## 5. Bunny Stream (video dei corsi, facoltativo)

1. bunny.net → *Stream* → *Add Video Library* (regione EU).
2. Library → *Security*: attiva **Embed view token authentication**; copia la *Token Authentication Key* in `BUNNY_STREAM_TOKEN_KEY` e l'ID della library in `BUNNY_STREAM_LIBRARY_ID`.
3. In *Security → Allowed referrers* aggiungi `northnova-studio.github.io` (e il dominio dedicato).
4. Carica i video e collega ogni lezione al suo GUID: per ora da SQL/Prisma Studio (`npm run prisma:studio` in locale puntando al DB di produzione) impostando `videoProvider = BUNNY` e `videoId = <GUID>` sulla tabella `CourseLesson`.
5. Senza Bunny le lezioni restituiscono un URL a una pagina segnaposto ("video in arrivo").

## 6. Collegare il frontend su GitHub Pages

1. Repository su GitHub → **Settings → Secrets and variables → Actions → Variables** → *New repository variable*:
   - `VITE_API_URL` = `https://<PUBLIC_API_URL>` (senza `/api/v1` e senza `/` finale).
   - (con dominio dedicato) `VITE_BASE` = `/`.
2. Rilancia il workflow **"Sito → GitHub Pages"** (*Actions → Run workflow*) o fai un push su `main`: con `VITE_API_URL` valorizzata il sito esce dalla modalità demo e usa il backend.
3. Nel backend `CORS_ORIGINS` deve contenere l'**origine** del sito: `https://northnova-studio.github.io` (solo schema + host, senza `/poker-school`). Con un dominio dedicato aggiungilo separato da virgola.
4. `FRONTEND_URL` = URL completo del sito (con il percorso), usato per i redirect di Stripe (`/app/profilo?checkout=success`, `/app/corsi/<slug>?checkout=success`).

## 7. Sviluppo locale

```bash
cd apps/api
cp .env.example .env              # e imposta DATABASE_URL del tuo Postgres locale
npm ci
npm run prisma:generate           # genera il client Prisma in src/generated
npm run prisma:migrate            # applica le migration (prisma migrate dev)
npm run prisma:seed               # base + dati demo (password stampate a fine seed)
npm run dev                       # http://localhost:4000
```

Oppure tutto in Docker: `docker compose up -d --build` dalla radice del repo, poi `docker compose exec api node dist/prisma/seed.js`.

Test: crea un database dedicato (es. `poker_school_test`), copia `.env.test.example` in `.env.test` con `TEST_DATABASE_URL`, poi `npm test` (il DB di test viene **azzerato** a ogni esecuzione).

> Reti con egress limitato: se `prisma generate`/`migrate` non riescono a scaricare lo Schema Engine da `binaries.prisma.sh`, `npm run db:migrate:sql` applica le stesse migration SQL via `pg` registrandole in `_prisma_migrations` (compatibile con un successivo `prisma migrate deploy`).

## 8. Checklist di go-live

**Sicurezza e configurazione**
- [ ] `NODE_ENV=production`; `JWT_ACCESS_SECRET` e `KYC_ENC_KEY` generati casualmente e salvati nel password manager.
- [ ] `STORAGE_DRIVER=s3` su bucket R2 **privato** in UE; nessun accesso pubblico al bucket.
- [ ] `CORS_ORIGINS` contiene solo le origini del sito; `PUBLIC_API_URL` e `FRONTEND_URL` corretti (HTTPS).
- [ ] Seed eseguito; login admin e fondatori provato; password dei fondatori cambiate.
- [ ] `GET /health` risponde `ok`; il healthcheck di Railway/Render è verde.
- [ ] Backup automatici del database attivi e un restore provato almeno una volta.

**Pagamenti e contenuti**
- [ ] Stripe in live: price ID dei 6 prezzi, webhook live con i 6 eventi, prova di acquisto reale con rimborso.
- [ ] Bunny Stream: token authentication attiva, referrer consentiti, `videoId` assegnati alle lezioni.
- [ ] Prezzi `PLAN_*` allineati a Stripe e al listino approvato (oggi provvisori).
- [ ] Dati segnaposto dei fondatori (statistiche, cognomi, date di nascita nel seed) sostituiti con quelli reali o rimossi.

**Legale e GDPR** (dettagli in `docs/SECURITY.md`)
- [ ] Informativa privacy (inclusa la sezione verifica identità), termini, cookie policy pubblicati e versioni in `LEGAL_TERMS_VERSION` / `LEGAL_PRIVACY_VERSION`.
- [ ] DPIA per il trattamento dei documenti d'identità; registro dei trattamenti; DPA firmati con Railway/Render, Cloudflare, Stripe, Bunny, provider KYC.
- [ ] Policy di conservazione `KYC_RETENTION_DAYS` approvata (default 30 giorni dall'esito).
- [ ] Nessun riferimento promozionale a operatori di gioco (Decreto Dignità); messaggi 18+ e gioco responsabile.
- [ ] Accordi di staking firmati e trattamento fiscale verificato con il commercialista.

**Frontend**
- [ ] Variabile `VITE_API_URL` impostata, workflow Pages rilanciato, banner "Demo" sparito, login/registrazione/upload KYC provati dal sito pubblicato.
