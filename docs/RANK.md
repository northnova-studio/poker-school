# Regole di Rank, XP e Player Card

Regole condivise: le implementano **identiche** il mock del frontend (`apps/web/src/lib/api/mock/`) e il backend (`apps/api`).

## XP per evento (`XpEventType`)

| Evento | XP | Note |
|---|---|---|
| `SESSION_LOGGED` | 20 + 1 ogni 10 giochi (max +30) | max 3 sessioni al giorno danno XP |
| `STUDY_HOURS` | 15 per ora | max 4 ore al giorno |
| `LESSON_ATTENDED` | 40 | |
| `HAND_REVIEW_SUBMITTED` | 25 | max 5 a settimana |
| `DAILY_SPOT_CORRECT` | 15 (risposta sbagliata: 5 per la partecipazione, registrato comunque come DAILY_SPOT_CORRECT con label "Daily Spot — tentativo") | |
| `DAILY_SPOT_STREAK` | 50 | ogni 7 giorni consecutivi |
| `DEEP_RUN` | 60 | quando un DeepRun passa a `FINAL_TABLE` o `WON` |
| `ROAST_VOTE` | 3 | max 10 a settimana |
| `GAMING_NIGHT` | 20 | partecipazione a evento gaming |
| `COURSE_COMPLETED` | 150 | |
| `BOUNTY_WON` | 200 | battere un fondatore in un `BOUNTY_1V1` |

## Tier e divisioni (XP della stagione)

Ogni tier ha 3 divisioni: III (più bassa) → II → I. Soglie di ingresso del tier; le divisioni dividono l'intervallo in tre parti uguali.

| Tier | XP minimo | XP massimo (escluso) |
|---|---|---|
| FISH | 0 | 300 |
| CALLING_STATION | 300 | 900 |
| REG | 900 | 2000 |
| GRINDER | 2000 | 3800 |
| SHARK | 3800 | 6500 |
| CRUSHER | 6500 | 10000 |
| LEGEND | 10000 | 14500 (oltre: resta LEGEND I) |

Esempio: REG va da 900 a 2000 → III: 900–1266, II: 1267–1632, I: 1633–1999.
`xpIntoDivision` = XP − inizio divisione; `xpForNextDivision` = ampiezza della divisione.

## Stagioni

- Stagioni **mensili** (`seasonName`: "Stagione N — Mese AAAA"), fine alle 23:59 dell'ultimo giorno del mese (Europe/Rome).
- **Soft reset**: a inizio stagione l'XP stagionale riparte dal 30% dell'XP finale della stagione precedente (arrotondato per difetto).
- La classifica (`LeaderboardEntry.position`) è per XP stagionale; `delta` = variazione di posizione rispetto a 7 giorni prima.

## Player Card

- Attributi 40–99: `pre`, `post`, `icm`, `agg`, `men`, `vol`. Li imposta un coach/admin; `vol` può essere calcolato dal volume degli ultimi 90 giorni.
- `overall` = arrotondamento di `0.20·pre + 0.20·post + 0.15·icm + 0.10·agg + 0.15·men + 0.20·vol`.
- Rarità: `< 65` BRONZE · `65–74` SILVER · `75–86` GOLD · `≥ 87` ICON. I fondatori sono ICON.

## Statistiche "simpatiche"

- `tiltIndex` = media del campo `tilt` delle sessioni del periodo.
- `riverSuckouts` = badBeats del periodo (alias simpatico).
- `funFacts`: 2–4 frasi generate dai dati, es. "3 bolle scoppiate questo mese: nuovo record personale", "Streak di 9 giorni: Fabri è preoccupato", "Tilt medio 1,4: monaco tibetano".
