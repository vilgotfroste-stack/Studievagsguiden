# Studievägsguidens — Teknisk dokumentation

## Uppdatera lönestatistik

SCB publicerar ny lönestatistik ungefär **en gång per år** (brukar komma på hösten).
När ny data finns tillgänglig kör du båda scripten nedan för att uppdatera Supabase,
sedan hårdkodar du de nya värdena i JS-filen.

---

### Förutsättningar

- Node.js 18 eller senare
- Din Supabase `service_role`-nyckel (hämtas i Supabase → Settings → API)
- Sätt nyckeln i terminalen **innan** du kör något script (se nedan)

**Windows PowerShell — sätt nyckeln (kör detta först, tryck Enter):**
```powershell
$env:SUPABASE_SERVICE_KEY = "din_service_role_nyckel_här"
```

**Mac/Linux:**
```bash
export SUPABASE_SERVICE_KEY="din_service_role_nyckel_här"
```

---

### Script 1 — Medianlön, percentiler (P25/P75)

**Källa:** SCB `LoneSpridSektYrk4AN`
**Uppdaterar:** kolumnerna `monthly_salary`, `median_salary`, `p25_salary`, `p75_salary` i tabellen `occupation_stats`
**Hårdkodat i:** `SALD`-objektet i `js/utbildningar-shared.js`

```powershell
node supabase/fetch-occupation-stats.js
```

Efter körning — kopiera de nya värdena till `SALD` i `js/utbildningar-shared.js`:
```js
const SALD = {
  1: { p25: XXXXX, med: XXXXX, p75: XXXXX },
  // ...
};
```

---

### Script 2 — Lön per åldersgrupp

**Källa:** SCB `LonYrkeAlder4AN`
**Uppdaterar:** kolumnerna `age_18_24`, `age_25_34`, `age_35_44`, `age_45_54`, `age_55_64` i tabellen `occupation_stats`
**Hårdkodat i:** `SALA`-objektet i `js/utbildningar-shared.js`

```powershell
node supabase/fetch-age-salary.js
```

Efter körning — kopiera de nya värdena till `SALA` i `js/utbildningar-shared.js`:
```js
const SALA = {
  1: { a1824: XXXXX, a2534: XXXXX, a3544: XXXXX, a4554: XXXXX, a5564: XXXXX },
  // ...
};
```

---

### Kör båda på en gång

```powershell
node supabase/fetch-occupation-stats.js; node supabase/fetch-age-salary.js
```

---

### Yrken och SSYK-koder

| ID | Yrke                        | SSYK |
|----|-----------------------------|------|
| 1  | Systemutvecklare            | 2512 |
| 2  | Dataanalytiker              | 2519 |
| 3  | IT-säkerhetsspecialist      | 2516 |
| 9  | Redovisningsekonom          | 3312 |
| 10 | Controller                  | 2412 |
| 11 | Digital marknadsförare      | 2431 |
| 12 | HR-specialist               | 2423 |
| 14 | Sjuksköterska               | 2221 |
| 16 | Arbetsterapeut              | 2272 |
| 17 | Biomedicinsk analytiker     | 3213 |
| 18 | Tandhygienist               | 3250 |
| 20 | Grundskollärare             | 2341 |
| 21 | Gymnasielärare              | 2330 |
| 22 | Studie- och yrkesvägledare  | 2359 |
| 24 | Byggingenjör                | 3112 |
| 23 | Fastighetsförvaltare        | 3335 |

> **OBS:** Fastighetsförvaltare använder SSYK 3335. SSYK 3334 är Fastighetsmäklare (fel kod).

---

### Supabase-tabell: `occupation_stats`

| Kolumn          | Beskrivning                        |
|-----------------|------------------------------------|
| `occupation_id` | Internt ID (matchar E[]-arrayen)   |
| `monthly_salary`| Genomsnittlig månadslön (SCB)      |
| `median_salary` | Medianlön (SCB)                    |
| `p25_salary`    | 25:e percentilen                   |
| `p75_salary`    | 75:e percentilen                   |
| `age_18_24`     | Genomsnittslön, 18–24 år           |
| `age_25_34`     | Genomsnittslön, 25–34 år           |
| `age_35_44`     | Genomsnittslön, 35–44 år           |
| `age_45_54`     | Genomsnittslön, 45–54 år           |
| `age_55_64`     | Genomsnittslön, 55–64 år           |
| `stat_year`     | Statistikår (t.ex. 2024)           |
