# Studievägsguidens — Teknisk dokumentation

## Uppdatera utbildningsdatabasen (SUSA navet)

All utbildningsdata (YH + Högskola) hämtas från **Skolverkets SUSA navet API**
och lagras i Supabase-tabellen `yh_schools`.

Databasen innehåller ~11 000–14 000 program. Kör uppdateringen när:
- Ny termin börjar (HT/VT) och nya program tillkommer
- Program läggs till / tas bort av lärosäten
- Ca 2 gånger per år räcker

---

### Förutsättningar

```bash
# Mac/Linux
export SUPABASE_SERVICE_KEY="din_service_role_nyckel"

# Windows PowerShell
$env:SUPABASE_SERVICE_KEY = "din_service_role_nyckel"
```

Service role-nyckeln hittar du i **Supabase → Settings → API → service_role**.

---

### Steg 1 — Kör SQL-migrationer (bara första gången eller vid ny kolumn)

Öppna **Supabase → SQL Editor** och kör i ordning:

```sql
-- Lägger till school_type, hp_credits, susa_event_id m.fl.
-- (finns i supabase/migrate-add-school-type.sql)

-- Lägger till duration_years för längd-filter
-- (finns i supabase/migrate-add-duration-years.sql)
```

> Kör bara om kolumnerna saknas — `IF NOT EXISTS` skyddar mot dubbel-körning.

---

### Steg 2 — Importera alla program från SUSA navet

```bash
node supabase/fetch-susa-programs.js
```

Hämtar alla YH- och HS-program (providers → educationInfos → educationEvents),
matchar ihop dem och upsert:ar till `yh_schools` via `susa_event_id` som unik nyckel.

**Flaggor:**
```bash
node supabase/fetch-susa-programs.js --dry-run   # testa utan att spara
node supabase/fetch-susa-programs.js --hs-only   # bara högskola
node supabase/fetch-susa-programs.js --yh-only   # bara YH
```

Tar ca 10–20 minuter beroende på nätverkshastighet (paginerar ~2 000 poster/sida).

**Efter importen** — ta bort eventuella gamla rader som inte längre finns i SUSA:
```sql
-- Kör i Supabase SQL Editor
DELETE FROM yh_schools WHERE susa_event_id IS NULL;
```

---

### Steg 3 — Parsa behörighetskrav

```bash
node supabase/parse-requirements.js
```

Parsar `requirements`-råtexten (från SUSA) med regex och fyller `requirements_parsed` (JSONB).
Hanterar både gammalt YH-format och SUSA:s fritext-format.

```bash
node supabase/parse-requirements.js --dry-run      # testa utan att spara
node supabase/parse-requirements.js --force        # skriv över befintliga
node supabase/parse-requirements.js --limit 20     # bara 20 rader (för test)
```

---

### Steg 4 — Fyll i education_ids (Bransch/Yrke-filter)

**OBS:** Bransch/Yrke-filtren på /utbildningar använder keyword-matchning direkt mot
`program_name` och behöver inte education_ids för att fungera. Det här steget är
valfritt men förbättrar matchningskvaliteten om du vill använda `education_ids` kolumnen.

```bash
node supabase/update-education-ids.js
```

Matchar programnamn mot EDU_MAP (nyckelord per kategori) och fyller `education_ids`-arrayen.

---

### Supabase-tabell: `yh_schools`

Innehåller all utbildningsdata. Viktigaste kolumnerna:

| Kolumn | Beskrivning |
|--------|-------------|
| `id` | UUID — används i URL (?id=...) |
| `school_type` | `YH` eller `HS` |
| `program_name` | Utbildningens namn |
| `school_name` | Skolans/lärosätets namn |
| `city` | Studieort (lowercase) |
| `study_mode` | `campus` / `distance` / `hybrid` |
| `study_pace` | `fulltime` / `parttime` |
| `pace_of_study` | Studietakt i % (25/50/75/100) |
| `credits` | YH-poäng |
| `hp_credits` | Högskolepoäng (HS-program) |
| `duration_years` | Beräknad längd i år (används för längd-filter) |
| `duration_text` | Fritext, t.ex. "200 YH-poäng" |
| `education_level` | Nivåkod från SUSA (t.ex. G1N, A1N) |
| `fee` | Avgift i kr (0 = avgiftsfri) |
| `eligible_for_student_aid` | Boolean — CSN-berättigad |
| `start_dates` | Array, t.ex. `["HT2026"]` |
| `instruction_languages` | Array med språkkoder, t.ex. `["sv"]`, `["en"]` |
| `education_description` | Fritext — utbildningsbeskrivning |
| `requirements` | Råtext — behörighetskrav |
| `requirements_parsed` | Strukturerad JSONB (se nedan) |
| `education_ids` | Koppling till interna kategori-ID:n (EDU_MAP) |
| `website_url` | Länk till skolans/lärosätets sida |
| `contact_email` / `contact_phone` | Kontaktuppgifter |
| `susa_event_id` | Unikt ID från SUSA navet (används vid upsert) |
| `susa_education_id` | educationInfo-ID från SUSA |

**`requirements_parsed`-struktur:**
```json
{
  "has_gymnasieexamen_requirement": true,
  "reell_kompetens_accepted": true,
  "recommended_programs": ["Teknikprogrammet"],
  "required_courses": [
    { "name": "Matematik", "level": "2" }
  ],
  "other_requirements": null
}
```

---

### Filterfunktioner (/utbildningar)

| Filter | Supabase-query |
|--------|----------------|
| Utbildningstyp | `school_type=eq.YH` / `eq.HS` |
| Fritextsökning | `or=(program_name.ilike.*X*,school_name.ilike.*X*,education_description.ilike.*X*)` |
| Studieform | `study_mode=eq.campus` / `distance` / `hybrid` |
| Stad | `city=ilike.*X*` |
| Studietakt | `pace_of_study=eq.100` (25/50/75/100) |
| Utbildningslängd | `duration_years=lte.1` / `gte.1&lte.2` etc. |
| Undervisningsspråk | `or=(instruction_languages.cs.{sv},...)` / `cs.{en}` |
| Utbildningsnivå | `or=(education_level.ilike.G*,...)` / `ilike.A*` etc. |
| Bransch / Yrke | `or=(program_name.ilike.*kw1*,program_name.ilike.*kw2*,...)` |
| Startdatum | `start_dates=cs.{"HT2026"}` |
| Studiemedel | `eligible_for_student_aid=eq.true` |
| Avgiftsfri | `fee=eq.0` |

Resultat pagineras med `limit=24&offset=N` + `Prefer: count=exact`.

---

## Uppdatera lönestatistik

SCB publicerar ny lönestatistik ungefär **en gång per år** (brukar komma på hösten).
När ny data finns tillgänglig kör du båda scripten nedan för att uppdatera Supabase,
sedan hårdkodar du de nya värdena i JS-filen.

---

### Script 1 — Medianlön, percentiler (P25/P75)

**Källa:** SCB `LoneSpridSektYrk4AN`
**Uppdaterar:** kolumnerna `monthly_salary`, `median_salary`, `p25_salary`, `p75_salary` i tabellen `occupation_stats`

```bash
node supabase/fetch-occupation-stats.js
```

---

### Script 2 — Lön per åldersgrupp

**Källa:** SCB `LonYrkeAlder4AN`
**Uppdaterar:** kolumnerna `age_18_24`, `age_25_34`, `age_35_44`, `age_45_54`, `age_55_64` i tabellen `occupation_stats`

```bash
node supabase/fetch-age-salary.js
```

---

### Kör båda på en gång

```bash
node supabase/fetch-occupation-stats.js; node supabase/fetch-age-salary.js
```

---

## Yrkesprognoser — Arbetsförmedlingens Yrkesbarometer

Arbetsförmedlingen publicerar Yrkesbarometern **2 gånger per år** (juni och december).

```bash
node supabase/fetch-occupation-forecasts.js
node supabase/fetch-occupation-forecasts.js --dry-run   # testa
node supabase/fetch-occupation-forecasts.js --all-regions
```

---

## Behörighetskollen (/behorighetskollen)

Detaljsida per program. Användaren bockar av kurser → systemet visar om hen är behörig.

Behöver `requirements_parsed` vara ifylld — kör `parse-requirements.js` (se ovan).

**Logiken:**
1. Om `has_gymnasieexamen_requirement = true` och gymnasieexamen saknas:
   - `reell_kompetens_accepted = true` → "Ansök via reell kompetens"
   - Annars → "Du saknar behörighet"
2. Alla `required_courses` avbockade → "Du är behörig"
3. Kurser saknas → lista vad som behövs kompletteras på Komvux

---

## Git-branches

Alla ändringar görs på feature-branch `claude/add-university-programs-tv9J8` och mergas till `main`.
Gamla `claude/`-branches kan tas bort via **GitHub → Code → Branches** när de är mergade.
