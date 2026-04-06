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

---

## Yrkesprognoser — Arbetsförmedlingens Yrkesbarometer

Arbetsförmedlingen publicerar Yrkesbarometern **2 gånger per år** (Vår och Höst).
Från våren 2026 publiceras den i **juni och december** istället för mars/september.

Data hämtas som en bulk-JSON-fil — inget API-nyckel krävs.

---

### Script 3 — Yrkesprognoser (Arbetsförmedlingen)

**Källa:** `https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json`
**Uppdaterar:** tabellen `occupation_forecasts` i Supabase
**Hårdkodat i:** ej ännu — sparas bara i Supabase (framtida remake)

**När ska du köra det?**
Arbetsförmedlingen uppdaterar Yrkesbarometern **2 gånger per år**:
- **Juni** → kör scriptet och välj "Vår"-omgången
- **December** → kör scriptet och välj "Höst"-omgången

```powershell
node supabase/fetch-occupation-forecasts.js
```

**Flaggor:**
```powershell
# Testa utan att spara (rekommenderas första gången)
node supabase/fetch-occupation-forecasts.js --dry-run

# Visa råstrukturen på JSON-filen (felsökning om fältnamn ändrats)
node supabase/fetch-occupation-forecasts.js --explore --dry-run

# Spara även länsdata (inte bara nationell nivå)
node supabase/fetch-occupation-forecasts.js --all-regions
```

**OBS:** Kör `schema_occupation_forecasts.sql` i Supabase SQL Editor **innan** du kör scriptet första gången.

---

### Supabase-tabell: `occupation_forecasts`

| Kolumn                        | Beskrivning                                                         |
|-------------------------------|---------------------------------------------------------------------|
| `occupation_id`               | Internt ID (matchar E[]-arrayen)                                    |
| `ssyk_code`                   | SSYK-kod 2012                                                       |
| `region_id`                   | Regionkod — `"00"` = hela Sverige, annars länsnummer (t.ex. `"01"` = Stockholm) |
| `region_name`                 | Regionnamn i text (t.ex. `"Riket"` eller `"Stockholms län"`)        |
| `forecast_year`               | Året prognosen publicerades (t.ex. `2025`)                          |
| `forecast_term`               | Publiceringsomgång — `"Vår"` (juni) eller `"Höst"` (december)      |
| `job_opportunities`           | Hur lätt det är att **få jobb** som arbetssökande just nu (1–5, se skala nedan) |
| `job_opportunities_text`      | AF:s originaltext, t.ex. `"stora"` eller `"medelstora"`            |
| `recruitment_situation`       | Hur lätt det är för **arbetsgivare att rekrytera** just nu (1–5, se skala nedan) |
| `recruitment_situation_text`  | AF:s originaltext, t.ex. `"brist"` eller `"balans"`                |
| `five_year_forecast`          | Hur efterfrågan **förväntas förändras de nästa 5 åren** (1–5, se skala nedan) |
| `five_year_forecast_text`     | AF:s originaltext, t.ex. `"öka"` eller `"vara oförändrad"`         |
| `raw_data`                    | Hela originalposten från AF:s JSON (JSONB) — för framtida bruk     |

#### Skalförklaring

**job_opportunities** — ur jobsökarperspektiv:
| Värde | Betydelse |
|-------|-----------|
| 5 | Mycket goda chanser att få jobb |
| 4 | Stora / goda chanser |
| 3 | Medelstora chanser |
| 2 | Små chanser |
| 1 | Mycket små chanser |

**recruitment_situation** — ur arbetsgivarperspektiv (brist = svårt att hitta folk → bra för dig i yrket):
| Värde | Betydelse |
|-------|-----------|
| 1 | Stor brist — arbetsgivare hittar knappt personal |
| 2 | Brist |
| 3 | Balans |
| 4 | Överskott |
| 5 | Stort överskott — många söker få jobb |

**five_year_forecast** — hur efterfrågan på yrket förväntas förändras:
| Värde | Betydelse |
|-------|-----------|
| 5 | Öka kraftigt |
| 4 | Öka |
| 3 | Vara oförändrad |
| 2 | Minska |
| 1 | Minska kraftigt |

> **OBS:** I frontend-koden (`dem` och `future` i E[]-arrayen) är skalan **inverterad** —
> där är 5 = högst efterfrågan. Mapping görs när datan integreras i framtida remake.
>
> **OBS 2:** `"paradox"` i `recruitment_situation_text` är AF:s specialvärde för när
> rekryteringsläget är motstridigt. Siffran sparas då som `null`.

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
