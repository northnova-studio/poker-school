# TRIS — Scuola di poker (nome di lavoro)

Sito pubblico, area studenti con feature community, gestionale admin e backend di una scuola di poker online (MTT, Spin & Go, Cash).

> Il nome **TRIS** è provvisorio: si cambia in un solo file, `apps/web/src/config/brand.ts`. La pagina `/brand-lab` permette di provare dal vivo le 5 identità visive e i 10 nomi proposti.

## Struttura

```
apps/
  web/   Frontend — React + Vite + TypeScript + Tailwind v4, GSAP/Lenis/Motion, Recharts
  api/   Backend — Node.js + Express + TypeScript + Prisma + PostgreSQL
docs/
  BRIEF.md     brief di progetto (fondatori, posizionamento, feature, vincoli)
  RANK.md      regole di XP, rank, stagioni e Player Card
  API.md       endpoint del backend
  DEPLOY.md    come mettere online backend, storage documenti, pagamenti
  SECURITY.md  misure di sicurezza e GDPR
.github/workflows/pages.yml   deploy automatico del frontend su GitHub Pages
```

## Modalità demo vs produzione

- **Demo** (default su GitHub Pages): se la variabile `VITE_API_URL` non è impostata, il frontend usa un'API simulata nel browser con dati di esempio. Tutto è cliccabile; nessun dato lascia il browser (nemmeno i documenti di identità caricati in prova).
  - Studente demo: `studente@demo.it` / `demo1234`
  - Admin demo: `admin@demo.it` / `demo1234`
- **Produzione**: deploy del backend (vedi `docs/DEPLOY.md`), poi in GitHub → Settings → Secrets and variables → Actions → **Variables** impostare `VITE_API_URL` (es. `https://api.tuodominio.it`). Al push successivo il sito userà il backend reale.

## Sviluppo locale

```bash
# frontend
cd apps/web && npm install && npm run dev          # http://localhost:5173

# backend (serve PostgreSQL: docker compose up -d db, oppure locale)
cd apps/api && cp .env.example .env && npm install
npx prisma migrate dev && npm run prisma:seed && npm run dev
```

## Pubblicazione

- Ogni push su `main` che tocca `apps/web` pubblica il sito su **https://northnova-studio.github.io/poker-school/**.
- Dominio dedicato: aggiungerlo in Settings → Pages → Custom domain e impostare la variabile di repo `VITE_BASE` = `/`.
- GitHub Pages ospita solo il frontend statico: il backend va su Railway/Render (vedi `docs/DEPLOY.md`).

## Da fare prima del go-live

- **Scegliere il nome definitivo**: "Tris" è anche il nome di una scommessa ippica nazionale e va evitato (vedi la ricerca di mercato); cambiare `BRAND` in `apps/web/src/config/brand.ts`
- Mettere online il backend (`docs/DEPLOY.md`) e impostare `VITE_API_URL`
- Aggiungere nell'area profilo la **funzione di recesso online** richiesta dal nuovo art. 54-bis del Codice del Consumo (in vigore dal 19 giugno 2026) e la casella di rinuncia al recesso per i contenuti digitali al checkout
- Far validare a un legale testi legali, contratto di staking e informativa KYC; fare la DPIA

## Da sostituire prima del lancio

- Statistiche e risultati dei fondatori (segnati con l'etichetta "esempio"): `apps/web/src/data/coaches.ts`
- Prove (screenshot e video): `apps/web/public/proofs/` + `apps/web/src/data/proofs.ts`, con nickname degli avversari e loghi delle room oscurati
- Prezzi: `apps/web/src/data/plans.ts`, `apps/web/src/data/courses.ts`
- Testi legali (bozze da validare con un legale): pagina `/legal/*`
- Email, link social e Discord: `apps/web/src/config/brand.ts`
