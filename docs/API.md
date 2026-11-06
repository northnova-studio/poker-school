# API — Scuola di poker (TRIS)

Backend: `apps/api` (Node.js 22 + Express 5 + TypeScript + Prisma 7 + PostgreSQL).
Contratto unico con il frontend: `apps/web/src/lib/api/types.ts` (forme JSON) e `apps/web/src/lib/api/http.ts` (metodo + path + body).

## Convenzioni

- **Base URL**: `<VITE_API_URL>/api/v1` (es. `https://api.tris.poker/api/v1`).
- **Auth**: header `Authorization: Bearer <accessToken>` (JWT HS256, 15 minuti). Alla scadenza il client chiama `POST /auth/refresh` con il refresh token opaco (30 giorni, **ruotato a ogni uso**: il riuso di un token già usato revoca tutta la sessione).
- **Date**: stringhe ISO 8601 (`2026-11-06T20:00:00.000Z`); date di calendario `YYYY-MM-DD`.
- **Importi**: `number` in euro con 2 decimali (in DB `Decimal(12,2)`), mai centesimi.
- **Errori**: sempre `{"error":{"code":"…","message":"…"}}` (messaggi in italiano). Gli errori di validazione aggiungono `details: [{ path, message }]`.
- **Status**: `200` lettura/aggiornamento, `201` creazione, `204` nessun contenuto (logout, delete), `400` validazione, `401` non autenticato/token scaduto, `403` ruolo insufficiente, `404`, `409` conflitto/stato non valido, `410` documento cancellato per retention, `413` file troppo grande, `429` rate limit, `503` servizio esterno non configurato.

Ruoli nelle tabelle: **pubblico** (nessun token), **utente** (qualsiasi utente loggato), **staff** (COACH o ADMIN), **admin** (solo ADMIN).

Codici d'errore ricorrenti: `VALIDATION_ERROR`, `UNAUTHORIZED`, `INVALID_TOKEN`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `CORS_NOT_ALLOWED`, `INVALID_JSON`, `INTERNAL_ERROR`.

## Endpoint del contratto

### Autenticazione e profilo

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| POST | `/auth/register` | pubblico (rate limit) | `RegisterInput` | `201 AuthResponse` · `400 UNDERAGE` · `409 EMAIL_TAKEN / NICKNAME_TAKEN` |
| POST | `/auth/login` | pubblico (rate limit) | `{ email, password }` | `AuthResponse` · `401 INVALID_CREDENTIALS` |
| POST | `/auth/refresh` | pubblico | `{ refreshToken }` | `AuthResponse` (nuovi token) · `401 INVALID_REFRESH_TOKEN / REFRESH_TOKEN_REUSED / REFRESH_TOKEN_EXPIRED` |
| POST | `/auth/logout` | pubblico | `{ refreshToken }` | `204` (revoca il refresh token) |
| GET | `/auth/me` | utente | — | `User` |
| PATCH | `/me` | utente | `ProfilePatch` (campi non previsti come `role`/`plan` vengono ignorati) | `User` |

Registrazione: età calcolata da `birthDate` (Europe/Rome) → solo **18+**; password 8–128 caratteri (bcrypt); `acceptTerms` e `acceptPrivacy` devono essere `true` (salvati con timestamp e versione del documento); `marketingOptIn` facoltativo (timestamp).

```bash
curl -X POST $API/auth/register -H 'Content-Type: application/json' -d '{
  "email":"mario@example.com","password":"password-sicura","nickname":"mario_mtt",
  "firstName":"Mario","lastName":"Rossi","birthDate":"1995-05-20",
  "formats":["MTT"],"mainLevel":"LOW","acceptTerms":true,"acceptPrivacy":true}'
# → 201 {"user":{…User},"accessToken":"eyJ…","refreshToken":"q3…"}
```

### Verifica identità (KYC)

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| POST | `/kyc` | utente | **multipart/form-data**: `documentType`, `documentNumberLast4`, `consent` (`"true"`), `front`, `back?`, `selfie` | `201 KycSubmission` · `400 KYC_INVALID_FILE / KYC_MISSING_FILE` · `409 KYC_ALREADY_PENDING / KYC_ALREADY_APPROVED` · `413 LIMIT_FILE_SIZE` |
| GET | `/kyc/me` | utente | — | `KycSubmission` più recente oppure `null` |

File: max 8 MB ciascuno, tipo riconosciuto dai **magic bytes** (JPEG, PNG, WEBP, HEIC, PDF; il selfie deve essere un'immagine); `back` obbligatorio tranne per `PASSPORT`. I file vengono cifrati (AES-256-GCM) prima di essere salvati.

```bash
curl -X POST $API/kyc -H "Authorization: Bearer $TOKEN" \
  -F documentType=ID_CARD -F documentNumberLast4=1234 -F consent=true \
  -F front=@fronte.jpg -F back=@retro.jpg -F selfie=@selfie.jpg
```

### Pubblico

| Metodo | Path | Ruolo | Query | Risposta |
|---|---|---|---|---|
| GET | `/public/coaches` | pubblico | — | `Coach[]` (statistiche dei fondatori marcate `placeholder: true` finché non si inseriscono i dati reali) |
| GET | `/public/stats` | pubblico | — | `PublicStats` (numeri reali aggregati, `placeholder: false`) |
| GET | `/public/leaderboard` | pubblico | `limit` (1–100, default 10) | `LeaderboardEntry[]` — **solo** membri con `shareResultsPublicly = true` |

### Piani e pagamenti

| Metodo | Path | Ruolo | Body | Risposta |
|---|---|---|---|---|
| GET | `/plans` | pubblico | — | `Plan[]` (prezzi da config/env, salvati nel DB dal seed) |
| POST | `/billing/subscribe` | utente | `{ planId, interval }` | `{ checkoutUrl, user: null }` → redirect a Stripe Checkout · `503 PAYMENTS_NOT_CONFIGURED` ("Pagamenti non configurati") senza Stripe · `503 PRICE_NOT_CONFIGURED` · `409 ALREADY_SUBSCRIBED` |
| POST | `/billing/webhook` | Stripe (firma `Stripe-Signature`) | raw body | `{ received: true }` · `400 INVALID_SIGNATURE` |

Webhook gestiti: `checkout.session.completed` (corso → `Purchase` + `Transaction` COURSE; abbonamento → `Subscription` + piano utente), `customer.subscription.created/updated/deleted` (stato e piano), `invoice.paid` (`Transaction` MEMBERSHIP per ogni rinnovo). Idempotenti (tabella `WebhookEvent`).

### Corsi e video

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| GET | `/courses` | pubblico | `format?`, `level?`, `q?` | `Course[]` |
| GET | `/courses/:slug` | pubblico | — | `Course` |
| POST | `/courses/:courseId/checkout` | utente | — | `CheckoutResult` `{ checkoutUrl, purchase: null }` · `409 ALREADY_OWNED` · `503 PAYMENTS_NOT_CONFIGURED` |
| GET | `/me/purchases` | utente | — | `Purchase[]` |
| GET | `/courses/:courseId/progress` | utente | — | `CourseProgress` |
| POST | `/courses/:courseId/lessons/:lessonId/complete` | utente (accesso al corso o lezione in anteprima) | — | `CourseProgress` (+ XP `STUDY_HOURS`, `COURSE_COMPLETED` al 100%) |
| GET | `/courses/:courseId/lessons/:lessonId/video` | utente (accesso al corso o lezione `preview`) | — | `VideoAccess` `{ lessonId, url, expiresAt }` · `403 COURSE_LOCKED` |

Accesso a un corso: acquisto, oppure piano dell'utente incluso in `includedInPlans`, oppure ruolo COACH/ADMIN. Con Bunny Stream configurato `url` è l'embed firmato (`token = SHA256(chiave + videoId + expires)`); altrimenti punta a `/video/placeholder` (pagina HTML segnaposto).

### Lezioni di gruppo

| Metodo | Path | Ruolo | Query | Risposta |
|---|---|---|---|---|
| GET | `/lessons` | pubblico (token facoltativo) | `from?`, `to?` (ISO; default −30 / +90 giorni) | `GroupLesson[]` — `meetingUrl`/`recordingUrl` solo per prenotati e staff; `bookedByMe` solo se loggato |
| POST | `/lessons/:id/book` | utente | — | `GroupLesson` · `403 PLAN_REQUIRED` · `409 LESSON_FULL` · `400 LESSON_STARTED` |
| DELETE | `/lessons/:id/book` | utente | — | `GroupLesson` |

### Sessioni, statistiche, rank, player card

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| GET | `/me/sessions` | utente | — | `Session[]` (dalla più recente) |
| POST | `/me/sessions` | utente | `SessionInput` (+ `itm?` facoltativo, vedi sotto) | `201 Session` (+ XP; se `staked` e c'è un accordo ACTIVE dello stesso formato, crea il `SESSION_RESULT` nel ledger) |
| DELETE | `/me/sessions/:id` | utente (proprietario) | — | `204` · `409 SESSION_SETTLED` se già inclusa in un settlement |
| GET | `/me/stats` | utente | `period` (`7d`,`30d`,`90d`,`ytd`,`all`; default `30d`), `format` (`MTT`,`SPIN`,`CASH`,`ALL`) | `PlayerStats` |
| GET | `/me/rank` | utente | — | `RankInfo` (con tutti i badge, `earnedAt: null` se non ottenuti) |
| GET | `/leaderboard` | utente | `format?`, `limit?` (default 50) | `LeaderboardEntry[]` (studenti; solo XP, nessun dato economico) |
| GET | `/me/xp` | utente | — | `XpEvent[]` (ultimi 200) |
| GET | `/me/card` | utente | — | `PlayerCard` |
| GET | `/cards/:userId` | utente | — | `PlayerCard` |

Regole XP/tier/stagioni/Player Card: implementate **identiche** a `docs/RANK.md` (funzioni pure in `src/modules/rank/domain.ts` e `src/modules/cards/domain.ts`, coperte da test). Divisioni: intervallo del tier diviso in tre parti con arrotondamento (`REG`: III 900–1266, II 1267–1632, I 1633–1999).

Note su `PlayerStats`:
- `roi`, `abi` solo su sessioni MTT/Spin; `bb100` solo cash (`bbWon`, oppure `profit / avgBuyIn` se `bbWon` è nullo).
- `itmPct` (solo MTT): il contratto non registra quanti tornei sono andati a premio, quindi è `null` salvo che le sessioni riportino il campo **facoltativo** `itm` (estensione retro-compatibile, stesso nome usato dal mock). Il backend non stima il valore, per non mostrare una percentuale fuorviante.
- `hoursStudied` = lezioni video completate + lezioni di gruppo con presenza; `attendancePct` = presenze / prenotazioni di lezioni già svolte.
- `profitSeries` cumulata per giorno (Europe/Rome), `volumeSeries` giochi al giorno (mani per il cash).

### Community

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| GET | `/daily-spot/today` | utente | — | `DailySpot` (spot più recente con data ≤ oggi); soluzione e distribuzione solo dopo aver risposto · `404 NO_DAILY_SPOT` |
| POST | `/daily-spot/:spotId/answer` | utente | `{ optionId }` | `DailySpotResult` · `409 ALREADY_ANSWERED` (una risposta per utente) · `409 SPOT_NOT_ACTIVE` · `400 INVALID_OPTION` |
| GET | `/daily-spot/streaks` | utente | — | `DailySpotStreakEntry[]` (top 50) |
| GET | `/roast/current` | utente | — | `RoastSpot[]` della settimana ISO corrente (o dell'ultima con spot) |
| POST | `/roast/:spotId/vote` | utente | `{ kind: "WORST" \| "BEST" }` | `RoastSpot` · `409 ALREADY_VOTED` (un voto per utente per spot) |
| POST | `/roast` | utente | `RoastSubmitInput` | `201 RoastSpot` · `400 ANONYMIZATION_REQUIRED` se `confirmAnonymized` è `false` |
| GET | `/deep-runs` | utente | `activeOnly?` (`true`) | `DeepRun[]` |
| POST | `/deep-runs` | utente | `DeepRunInput` | `201 DeepRun` |
| PATCH | `/deep-runs/:id` | proprietario o staff | `DeepRunPatch` | `DeepRun` (+60 XP una sola volta al passaggio a `FINAL_TABLE`/`WON`) |
| POST | `/deep-runs/:id/rail` | utente | — | `DeepRun` (rail unico per utente, idempotente) |
| POST | `/deep-runs/:id/comments` | utente | `{ text }` | `201 DeepRun` |
| GET | `/gaming/events` | utente | — | `GamingEvent[]` (ultimi 30 giorni + futuri) |
| POST | `/gaming/events/:id/join` | utente | — | `GamingEvent` (+20 XP) · `409 EVENT_FULL` |
| DELETE | `/gaming/events/:id/join` | utente | — | `GamingEvent` (XP revocato se l'evento non è ancora iniziato) |
| GET | `/gaming/leaderboard` | utente | — | `GamingLeaderboardEntry[]` |
| GET | `/me/hand-reviews` | utente | — | `HandReview[]` |
| POST | `/me/hand-reviews` | utente | `HandReviewInput` | `201 HandReview` (+25 XP, max 5 a settimana) |

Privacy Roast: `submittedByUserId` è restituito solo se il membro ha dato il consenso (`playedByMember`), a lui stesso e allo staff; altrimenti `null`.

### Gestionale (admin / staff)

| Metodo | Path | Ruolo | Body / query | Risposta |
|---|---|---|---|---|
| GET | `/admin/overview` | admin | — | `AdminOverview` |
| GET | `/admin/players` | admin | `PlayerFilters` (+ `limit?`, `offset?` facoltativi) | `Paginated<PlayerRow>` |
| GET | `/admin/players/:userId` | admin | — | `PlayerDetail` (statistiche `period=all`) |
| PATCH | `/admin/players/:userId` | admin | `{ role?, plan?, coachId?, mainLevel? }` | `User` · `409 LAST_ADMIN` |
| POST | `/admin/players/:userId/notes` | staff | `{ text }` | `201 { id, authorId, text, createdAt }` |
| PATCH | `/admin/players/:userId/card` | staff | `{ attributes: { pre, post, icm, agg, men, vol } }` (40–99) | `PlayerCard` |
| GET | `/admin/kyc` | admin | `status?` | `(KycSubmission & { user })[]` |
| GET | `/admin/kyc/:submissionId/files/:fileId` | admin | — | `{ url, expiresAt }` — link firmato HMAC valido 5 minuti · `410 KYC_FILES_PURGED` |
| POST | `/admin/kyc/:id/review` | admin | `{ decision: "APPROVED" \| "REJECTED", reason? }` | `KycSubmission` · `409 KYC_ALREADY_REVIEWED` |
| GET | `/admin/staking/deals` | admin | — | `StakingDeal[]` |
| POST | `/admin/staking/deals` | admin | `StakingDealInput` | `201 StakingDeal` · `400 INVALID_SHARES` |
| PATCH | `/admin/staking/deals/:id` | admin | `{ status?, schoolSharePct?, playerSharePct?, maxAbi?, notes? }` | `StakingDeal` |
| GET | `/admin/staking/deals/:dealId/ledger` | admin | — | `LedgerEntry[]` |
| POST | `/admin/staking/deals/:dealId/ledger` | admin | `LedgerEntryInput` (non `SETTLEMENT`) | `201 { deal, entry }` |
| POST | `/admin/staking/deals/:dealId/settle` | admin | — | `{ deal, entry }` · `409 NOTHING_TO_SETTLE` |
| GET | `/admin/finance/summary` | admin | `from`, `to` (ISO; default ultimi 12 mesi) | `FinanceSummary` |
| GET | `/admin/finance/transactions` | admin | `from`, `to` | `Transaction[]` |
| POST | `/admin/finance/transactions` | admin | `TransactionInput` | `201 Transaction` |
| DELETE | `/admin/finance/transactions/:id` | admin | — | `204` · `409 STRIPE_TRANSACTION` (i movimenti Stripe non si cancellano) |
| GET | `/admin/courses/sales` | admin | — | `CourseSalesRow[]` |
| POST | `/admin/lessons` | staff | `GroupLessonInput` | `201 GroupLesson` |
| PATCH | `/admin/lessons/:id` | staff | `Partial<GroupLessonInput>` (+ `recordingUrl`) | `GroupLesson` |
| DELETE | `/admin/lessons/:id` | staff | — | `204` |
| GET | `/admin/hand-reviews` | staff | — | `HandReview[]` |
| POST | `/admin/hand-reviews/:id/reply` | staff | `{ comment }` | `HandReview` |
| POST | `/admin/daily-spots` | staff | DailySpot + `correctOptionId`, `explanation` | `201 DailySpot` · `409 SPOT_DATE_TAKEN` |

Staking (convenzione del contratto: `amount` positivo = verso la scuola):
- `TRANSFER_TO_PLAYER` è salvato sempre negativo, `RETURN_FROM_PLAYER` sempre positivo (il segno inviato viene normalizzato); `SESSION_RESULT`/`ADJUSTMENT` mantengono il segno.
- `makeup = max(0, −somma dei risultati (SESSION_RESULT + ADJUSTMENT) registrati dopo l'ultimo SETTLEMENT)`.
- `settle` divide il netto positivo dall'ultimo settlement secondo `schoolSharePct`: crea una entry `SETTLEMENT` con `amount` = quota scuola e una `Transaction` INCOME/STAKING; con netto ≤ 0 risponde `409`.
- `capitalAllocated` = somma dei trasferimenti, `capitalReturned` = somma delle restituzioni, `netResult` = somma dei `SESSION_RESULT`, `schoolProfit` = somma dei settlement.

Overview: `mrr` = abbonamenti ACTIVE/TRIALING/PAST_DUE (annuali / 12); `revenue30d` = entrate degli ultimi 30 giorni escluso lo staking; `churn30dPct` = abbonamenti cancellati negli ultimi 30 giorni / attivi all'inizio della finestra; `stakingCapitalOut` = Σ(capitale allocato − restituito) sugli accordi non chiusi; `stakingNet*` = risultati staked (sessioni + rettifiche).

```bash
curl $API/admin/overview -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST $API/admin/staking/deals/$DEAL/settle -H "Authorization: Bearer $ADMIN_TOKEN"
# → {"deal":{…,"makeup":0,"schoolProfit":250},"entry":{"type":"SETTLEMENT","amount":250,…}}
```

## Endpoint extra (non nel contratto, retro-compatibili)

| Metodo | Path | Ruolo | Scopo |
|---|---|---|---|
| GET | `/health` (senza prefisso) | pubblico | healthcheck con ping al DB (Railway/Render/Docker) |
| GET | `/api/v1/health` | pubblico | servizi configurati (pagamenti, video, provider KYC) |
| POST | `/auth/change-password` | utente | `{ currentPassword, newPassword }` → `204`, revoca tutte le sessioni |
| GET | `/kyc/files/:fileId?exp&a&sig` | link firmato | serve il documento decifrato (aperto dal browser dell'admin; nessun Bearer) |
| POST | `/kyc/webhook/:provider` | provider (HMAC) | esito da Veriff/Sumsub/Didit (stub, vedi SECURITY.md) |
| GET | `/video/placeholder?lesson=` | pubblico | pagina segnaposto quando il video non è configurato |
| POST | `/admin/players/:userId/purchases` | admin | `{ courseId, amountEur?, provider? }` acquisto MANUAL senza Stripe |
| POST | `/admin/players/:userId/subscription` | admin | `{ planId, interval, amountEur?, recordIncome? }` abbonamento MANUAL (entra nell'MRR) |
| POST | `/admin/lessons/:id/attendance` | staff | `{ userIds }` presenze → XP `LESSON_ATTENDED` |
| POST | `/admin/gaming/events` | staff | crea evento lobby (premi in denaro rifiutati) |
| POST | `/admin/gaming/events/:id/results` | staff | `{ results: [{ userId, points, won, bountyClaimed }] }` → classifica gaming + XP `BOUNTY_WON` |
| PATCH | `/admin/roast/:id` | staff | `{ founderComment?, hidden? }` commento dei fondatori / moderazione |

Campo extra facoltativo: `Session.itm` (tornei MTT chiusi a premio; in input e in output solo se valorizzato) per un ITM% reale.

## Differenze note rispetto al contratto

- Nessun endpoint mancante: tutti i metodi di `http.ts` sono implementati.
- `apps/web/src/data/courses.ts` genera id lezione **duplicati** nel corso "Deep Run Lab" (i capitoli "Deep run 1-5" e "Deep run 6-10" producono entrambi `dr-dee-1`, `dr-dee-2`): nel backend i duplicati del secondo capitolo diventano `dr-dee-1-b`, `dr-dee-2-b`. Conviene correggere l'id nel frontend (es. prefisso per capitolo).
- Gli id lezione con spazi (`icm-la -1`, `icm-la -2`, `spin-il -1`, …) sono mantenuti identici: il client li passa nel path senza `encodeURIComponent`, ma `fetch` li codifica (`%20`) e il backend li decodifica correttamente.
- `GET /admin/kyc/:id/files/:fileId` restituisce anche `expiresAt` oltre a `url` (campo in più, ignorato dal client).
