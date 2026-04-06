/**
 * fetch-occupation-forecasts.js
 * ==============================
 * Hämtar yrkesprognoser från Arbetsförmedlingens Yrkesbarometer (öppen data)
 * och importerar dem till Supabase-tabellen occupation_forecasts.
 *
 * Datakälla (bulk-JSON, inget API-nyckel krävs):
 *   https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json
 *
 * Fältstruktur i JSON-filen (verifierad 2025-2):
 *   ssyk                    SSYK-kod (t.ex. "2512")
 *   lan                     Regionkod — "00" = Riket (nationell), annars länsnummer
 *   jobbmojligheter         Jobbtillfällen (text: "goda", "stora", "mycket goda", "små", etc.)
 *   rekryteringssituation   Rekryteringsläge (text: "brist", "balans", "överskott", etc.)
 *   prognos                 5-årsprognos (text: "öka", "vara oförändrad", "minska", etc.)
 *   omgang                  Publiceringsomgång (t.ex. "2025-2")
 *   yb_yrke                 Yrkesbenämning i Yrkesbarometern
 *
 * Yrkesbarometern uppdateras 2 gånger per år:
 *   omgang "YYYY-1" = Vår (publiceras juni)
 *   omgang "YYYY-2" = Höst (publiceras december)
 *
 * Förutsättningar:
 *   1. Kör schema_occupation_forecasts.sql i Supabase SQL Editor
 *   2. Sätt SUPABASE_SERVICE_KEY (se nedan)
 *
 * Kör (Windows PowerShell):
 *   $env:SUPABASE_SERVICE_KEY="din_nyckel"; node supabase/fetch-occupation-forecasts.js
 *
 * Kör (Mac/Linux):
 *   SUPABASE_SERVICE_KEY=din_nyckel node supabase/fetch-occupation-forecasts.js
 *
 * Flaggor:
 *   --dry-run      Hämta och visa data utan att spara till Supabase
 *   --explore      Visa råstrukturen på ett exempelobjekt (felsökning)
 *   --all-regions  Spara data för alla regioner (inte bara nationell nivå)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const YRKESBAROMETER_URL = 'https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json';

// ---------------------------------------------------------------
// Yrken vi hanterar — samma SSYK-koder som i occupation_stats
// ---------------------------------------------------------------
const OCCUPATION_MAP = [
  { id: 1,  name: 'Systemutvecklare',           ssyk: '2512' },
  { id: 2,  name: 'Dataanalytiker',             ssyk: '2519' },
  { id: 3,  name: 'IT-säkerhetsspecialist',     ssyk: '2516' },
  { id: 9,  name: 'Redovisningsekonom',         ssyk: '3312' },
  { id: 10, name: 'Controller',                 ssyk: '2412' },
  { id: 11, name: 'Digital marknadsförare',     ssyk: '2431' },
  { id: 12, name: 'HR-specialist',              ssyk: '2423' },
  { id: 14, name: 'Sjuksköterska',              ssyk: '2221' },
  { id: 16, name: 'Arbetsterapeut',             ssyk: '2272' },
  { id: 17, name: 'Biomedicinsk analytiker',    ssyk: '3213' },
  { id: 18, name: 'Tandhygienist',              ssyk: '3250' },
  { id: 20, name: 'Grundskollärare',            ssyk: '2341' },
  { id: 21, name: 'Gymnasielärare',             ssyk: '2330' },
  { id: 22, name: 'Studie- och yrkesvägledare', ssyk: '2359' },
  { id: 24, name: 'Byggingenjör',               ssyk: '3112' },
  { id: 25, name: 'Fastighetsförvaltare',       ssyk: '3335' },
];

const SSYK_TO_OCC = new Map(OCCUPATION_MAP.map(o => [o.ssyk, o]));

// ---------------------------------------------------------------
// Länsnummer → länsnamn
// ---------------------------------------------------------------
const LAN_NAMES = {
  '00': 'Riket',
  '01': 'Stockholms län',
  '03': 'Uppsala län',
  '04': 'Södermanlands län',
  '05': 'Östergötlands län',
  '06': 'Jönköpings län',
  '07': 'Kronobergs län',
  '08': 'Kalmar län',
  '09': 'Gotlands län',
  '10': 'Blekinge län',
  '12': 'Skåne län',
  '13': 'Hallands län',
  '14': 'Västra Götalands län',
  '17': 'Värmlands län',
  '18': 'Örebro län',
  '19': 'Västmanlands län',
  '20': 'Dalarnas län',
  '21': 'Gävleborgs län',
  '22': 'Västernorrlands län',
  '23': 'Jämtlands län',
  '24': 'Västerbottens län',
  '25': 'Norrbottens län',
};

// ---------------------------------------------------------------
// Textmappning → sifferskala
//
// jobbmojligheter (hur lätt det är att få jobb, ur jobsökarperspektiv):
//   5 = Mycket goda / Mycket stora
//   4 = Goda / Stora
//   3 = Varierande / Viss brist
//   2 = Lägre / Begränsade / Små
//   1 = Mycket lägre / Mycket begränsade / Mycket små
//
// rekryteringssituation (ur arbetsgivarperspektiv, brist = svårt att rekrytera):
//   1 = Stor brist   (hög efterfrågan på arbetstagare)
//   2 = Brist
//   3 = Balans
//   4 = Överskott
//   5 = Stort överskott
//
// prognos (5-årig efterfrågeprognos):
//   5 = Öka kraftigt
//   4 = Öka
//   3 = Vara oförändrad
//   2 = Minska
//   1 = Minska kraftigt
// ---------------------------------------------------------------

function parseJobbmojligheter(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (t.includes('mycket stora') || t.includes('mycket goda'))  return 5;
  if (t.includes('stora') || t.includes('goda'))                return 4;
  if (t.includes('varierande') || t.includes('viss'))           return 3;
  if (t.includes('mycket sm') || t.includes('mycket begr') || t.includes('mycket lägre')) return 1;
  if (t.includes('sm') || t.includes('begr') || t.includes('lägre'))                      return 2;
  return null;
}

function parseRekryteringssituation(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (t.includes('stor brist'))      return 1;
  if (t.includes('brist'))           return 2;
  if (t.includes('balans'))          return 3;
  if (t.includes('stort överskott')) return 5;
  if (t.includes('överskott'))       return 4;
  return null;
}

function parsePrognos(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (t.includes('öka kraftigt'))    return 5;
  if (t.includes('öka'))             return 4;
  if (t.includes('oförändrad'))      return 3;
  if (t.includes('minska kraftigt')) return 1;
  if (t.includes('minska'))          return 2;
  return null;
}

/**
 * Parsar omgångsfältet "2025-2" → { year: 2025, term: 'Höst' }
 * Omgång 1 = Vår, Omgång 2 = Höst
 */
function parseOmgang(omgang) {
  if (!omgang) return { year: null, term: null };
  const match = String(omgang).match(/^(\d{4})-(\d)$/);
  if (!match) return { year: null, term: String(omgang) };
  const year = parseInt(match[1], 10);
  const term = match[2] === '1' ? 'Vår' : 'Höst';
  return { year, term };
}

// ---------------------------------------------------------------
// Hämta JSON-filen
// ---------------------------------------------------------------
async function fetchYrkesbarometer() {
  console.log('Laddar ner yrkesbarometern från Arbetsförmedlingen...');
  console.log(`URL: ${YRKESBAROMETER_URL}`);
  console.log('');

  const res = await fetch(YRKESBAROMETER_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Studievagsguiden/1.0 (education data tool)',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const records = Array.isArray(data) ? data : (data.data || data.records || data.items || []);

  if (records.length === 0) {
    throw new Error('Fick tom array — oväntat format i JSON-filen?');
  }

  console.log(`✓ Hämtade ${records.length.toLocaleString('sv')} rader totalt.`);
  return records;
}

// ---------------------------------------------------------------
// Upsert till Supabase
// ---------------------------------------------------------------
async function upsertForecast(row) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/occupation_forecasts` +
    `?on_conflict=occupation_id,region_id,forecast_year,forecast_term`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        ...row,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------
// Huvud
// ---------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun     = args.includes('--dry-run');
  const explore    = args.includes('--explore');
  const allRegions = args.includes('--all-regions');

  if (!dryRun && SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Sätt SUPABASE_SERVICE_KEY innan du kör scriptet!');
    console.error('Använd --dry-run för att testa utan att spara.');
    process.exit(1);
  }

  if (dryRun) console.log('*** DRY RUN — inget sparas till Supabase ***\n');

  const records = await fetchYrkesbarometer();

  // Visa råstruktur om --explore
  if (explore) {
    console.log('=== RÅSTRUKTUR FÖR FÖRSTA POSTEN ===');
    console.log(JSON.stringify(records[0], null, 2));
    console.log('\nAlla fältnamn:');
    console.log(' ', Object.keys(records[0]).join('\n  '));
    console.log('');
  }

  // Filtrera: bara våra SSYK-koder + (om ej --all-regions) bara nationell nivå (lan="00")
  const ourSsyk = new Set(OCCUPATION_MAP.map(o => o.ssyk));

  const relevant = records.filter(r => {
    if (!ourSsyk.has(String(r.ssyk || '').trim())) return false;
    if (!allRegions) return String(r.lan || '').trim() === '00';
    return true;
  });

  const regionLabel = allRegions ? 'alla regioner' : 'nationell nivå';
  console.log(`Filtrerade ${relevant.length} rader för våra ${ourSsyk.size} SSYK-koder (${regionLabel}).\n`);

  if (relevant.length === 0) {
    console.warn('VARNING: Inga matchande rader! Kör med --explore för att se strukturen.');
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;

  for (const r of relevant) {
    const ssyk = String(r.ssyk || '').trim();
    const occ  = SSYK_TO_OCC.get(ssyk);
    if (!occ) continue;

    const lanKod    = String(r.lan || '00').trim();
    const regionName = LAN_NAMES[lanKod] || `Län ${lanKod}`;
    const { year, term } = parseOmgang(r.omgang);

    const jobOppText   = r.jobbmojligheter      ? String(r.jobbmojligheter)      : null;
    const rekrText     = r.rekryteringssituation ? String(r.rekryteringssituation): null;
    const prognosText  = r.prognos               ? String(r.prognos)               : null;

    const row = {
      occupation_id:   occ.id,
      occupation_name: occ.name,
      ssyk_code:       ssyk,
      region_id:       lanKod,
      region_name:     regionName,
      forecast_year:   year,
      forecast_term:   term,

      job_opportunities:          parseJobbmojligheter(jobOppText),
      job_opportunities_text:     jobOppText,

      recruitment_situation:      parseRekryteringssituation(rekrText),
      recruitment_situation_text: rekrText,

      five_year_forecast:         parsePrognos(prognosText),
      five_year_forecast_text:    prognosText,

      raw_data: r,
    };

    process.stdout.write(
      `  [${String(occ.id).padStart(2)}] ${occ.name.padEnd(30)} SSYK ${ssyk}` +
      ` | ${regionName.padEnd(22)} | ${(term ? `${year} ${term}` : '?').padEnd(10)}` +
      ` | jobbopp:${String(row.job_opportunities ?? '—').padEnd(2)} (${(jobOppText ?? '—').padEnd(18)})` +
      ` rekr:${String(row.recruitment_situation ?? '—').padEnd(2)} (${(rekrText ?? '—').padEnd(16)})` +
      ` 5år:${String(row.five_year_forecast ?? '—')} (${prognosText ?? '—'})` +
      ` → `
    );

    if (dryRun) {
      console.log('(dry-run)');
      ok++;
      continue;
    }

    try {
      await upsertForecast(row);
      console.log('ok');
      ok++;
    } catch (err) {
      console.log(`FEL: ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Klart! ${ok} lyckades, ${failed} misslyckades.`);

  if (ok > 0 && !dryRun) {
    console.log('\nVerifiera datan i Supabase Table Editor → occupation_forecasts');
  }
}

main().catch(err => {
  console.error('\nOväntat fel:', err.message);
  process.exit(1);
});
