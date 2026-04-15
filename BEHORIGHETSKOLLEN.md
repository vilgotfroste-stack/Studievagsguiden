# Behörighetskollen — Sessionsbriefing

## Vad som är byggt
Ny undersida på studievägsguiden.se där användaren söker en YH-utbildning, skriver in gymnasieprogram + betyg och får svar om hen är behörig.

## Datalagret (KLART)
**Supabase-tabell:** `yh_schools` — 2577 YH-utbildningar från Skolverkets API

**Nyckelkolumner:**
- `requirements` — råtext från API (behörighetskrav)
- `requirements_parsed` — strukturerad JSONB, t.ex:
```json
{
  "has_gymnasieexamen_requirement": true,
  "reell_kompetens_accepted": true,
  "recommended_programs": ["Teknikprogrammet"],
  "required_courses": [
    { "name": "Matematik", "level": "2", "points": 100 },
    { "name": "Engelska", "level": "6", "points": 100 }
  ],
  "other_requirements": null
}
```
- `website_url`, `city`, `municipality`, `study_mode`, `study_pace`, `online`, `education_ids`, `myh_id`

**Scripts (supabase/):**
- `fetch-myh-schools.js` — hämtar alla utbildningar från Skolverket
- `fetch-yh-requirements.js` — berikar varje rad med requirements via detalj-endpoint
- `parse-requirements.js` — parsar requirements-text med regex till JSONB

## Nästa session: Bygg frontend

### Sida 1 — Sök/filtrera utbildningar
- Filterpanel: stad, distans/campus, bransch (education_ids), studietakt
- Kortlista med utbildningar från Supabase
- Klick på utbildning → Sida 2
- Design: samma tema/struktur som befintlig site (se `js/utbildningar-shared.js`)

### Sida 2 — Behörighetskollen
- Tillbaka-knapp till Sida 1
- Formulär: välj gymnasieprogram + kryssa i/ange betyg per kurs
- Logik: jämför ifyllda kurser mot `requirements_parsed.required_courses`
- Tre möjliga utfall:
  1. ✅ "Du är behörig"
  2. ❌ "Du behöver komplettera på Komvux" (visa vilka kurser saknas)
  3. 🔄 "Du kan ansöka via reell kompetens" (om `reell_kompetens_accepted: true` och gymnasieexamen saknas)
- Länk till skolans hemsida (`website_url`) för meritpoäng

### Viktigt att känna till
- `education_ids: []` = utbildningen saknar kategoritillhörighet (importerad men ej matchad mot EDU_MAP)
- Betyg spelar ej roll för YH-behörighet — godkänt (E) räcker
- Reell kompetens (punkt 4) kan ej automatiseras — bara flaggas
- Meritpoäng hanteras ej — länka till `website_url`

## Filstruktur
```
js/utbildningar-shared.js   ← befintlig design-logik, EDU_MAP, lönedata
supabase/                   ← datascripts (kör ej igen om ej nödvändigt)
```

## Branch/deploy
- Utveckla på ny branch, skicka PR till `main`
- Supabase URL: `https://qofvdpvxrvvjalgdiflg.supabase.co`
