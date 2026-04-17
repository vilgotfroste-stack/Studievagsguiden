# Sessionsbriefing — Nästa uppgift: URL-omstrukturering

Repo: `vilgotfroste-stack/Studievagsguiden`, branch: `main`. Jobba direkt på main.

## Vad som är byggt (KLART)

- `utbildningar.html` — YH-söksida (fd `behorighetskollen-sok.html`), URL: `/utbildningar`
- `behorighetskollen.html` — Behörighetskontroll per skola, URL: `/behorighetskollen?id=<uuid>`
- Båda har nav-meny, intresseanmälan-modal och Supabase-integration
- Supabase-tabell: `yh_schools` (~2 577 YH-utbildningar), nyckel: `sb_publishable_Vfm1BArZN_RAWrwTOzVGXA_WWvIk77V`

## Nästa session: URL-omstrukturering

Genomför i exakt denna ordning:

### 1. Radera `utbildningar.html` (gamla yrkessidan)
Filen är en duplikat av `yrken.html`. Ta bort den.

### 2. Döp om `behorighetskollen-sok.html` → `utbildningar.html`
Uppdatera SEO i filen:
- `<title>`: Hitta YH-utbildning — Sök bland 2 500+ program | Studievägsguiden
- `<meta name="description">`: Sök och filtrera bland 2 500+ yrkeshögskoleutbildningar efter stad, studieform och bransch. Kontrollera din behörighet direkt.
- `<link rel="canonical">`: https://www.studievagsguiden.se/utbildningar
- `<h1>`: Hitta YH-utbildning

### 3. Döp om `jamfor-utbildningar.html` → `jamfor-yrken.html`
Uppdatera SEO:
- `<title>`: Jämför yrken — Lön, stress och framtid | Studievägsguiden
- `<link rel="canonical">`: https://www.studievagsguiden.se/jamfor-yrken

### 4. Uppdatera `yrken.html` SEO
- `<title>`: Yrken — Lön, efterfrågan och utbildning | Studievägsguiden
- `<link rel="canonical">`: https://www.studievagsguiden.se/yrken
- `<meta name="description">`: Utforska yrken efter lön, efterfrågan, stress och flexibilitet. Jämför 29 yrken och hitta rätt utbildningsväg.

### 5. Lägg till CTA-knapp på `yrken.html`
Hitta befintlig "Jämför utbildningar"-knapp/länk och lägg till en till bredvid:
- Text: `Hitta YH-utbildningar →`
- `href="/utbildningar"`
- Samma stil som övriga CTA-knappar på sidan

### 6. Uppdatera `vercel.json`
- Ta bort **alla** rader där `source` börjar med `/utbildningar/` (undersidor — spamrisk)
- Byt `/behorighetskollen-sok` → `/utbildningar` (destination: `/utbildningar.html`)
- Byt `/jamfor-utbildningar` → `/jamfor-yrken` (destination: `/jamfor-yrken.html`)
- `/utbildningar` → `/utbildningar.html` (ny YH-söksida)
- Behåll: `/yrken`, `/behorighetskollen`

### 7. Uppdatera nav-menyn i ALLA HTML-filer i rotkatalogen
Nav-panelen (slide-in, `id="navPanel"`) finns på alla sidor. Gör dessa byten överallt:
- `href="/utbildningar"` text "Utbildningar & yrken" → `href="/yrken"` text "Yrken"
- `href="/jamfor-utbildningar"` → `href="/jamfor-yrken"` text "Jämför yrken"
- `href="/behorighetskollen-sok"` → `href="/utbildningar"` (text behålls "Behörighetskollen" eller byt till "YH-utbildningar")

Filer att uppdatera (alla i rotkatalogen):
`index.html`, `yrken.html`, `jamfor-yrken.html`, `utbildningar.html`, `behorighetskollen.html`, `skapa-min-plan.html`, `min-plan.html`, `komvux.html`, `csn-guide.html`, `din-studieplan.html`, `foreldre-som-studerar.html`, `haraduplugg.html`, `studieform.html`, `integritetspolicy.html`

### 8. Uppdatera `sitemap.xml`
- Byt `/utbildningar` → `/yrken`
- Ta bort alla rader med `/utbildningar/` (undersidor)
- Byt `/jamfor-utbildningar` → `/jamfor-yrken`
- Lägg till `/utbildningar` (ny YH-söksida)
- Lägg till `/behorighetskollen`

### 9. Commit och push till main

## Viktigt att veta
- Sajten är statisk HTML, deployad på Vercel — inga byggsteg
- Det finns redan en `yrken.html` — den ska INTE röras utöver SEO + CTA-knapp
- Nav-panelen på `utbildningar.html` och `behorighetskollen.html` är en nyare variant (byggd i föregående session) — kontrollera att den matchar index.html-versionen
- Alla `/utbildningar/[slug]`-undersidor i `utbildningar/`-mappen behöver INTE raderas fysiskt — de är bara döda URLs när vercel.json-raderna tas bort
