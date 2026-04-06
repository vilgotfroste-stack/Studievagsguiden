/**
 * fetch-occupation-forecasts.js
 * ==============================
 * Hämtar yrkesprognoser från Arbetsförmedlingens Yrkesbarometer (öppen data)
 * och importerar dem till Supabase-tabellen occupation_forecasts.
 *
 * Datakälla (bulk-JSON, inget API-nyckel krävs):
 *   https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json
 *
 * Yrkesbarometern uppdateras 2 gånger per år:
 *   - Vår (mars/juni)
 *   - Höst (september/december)
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
 *   --dry-run   Hämta och visa data utan att spara till Supabase
 *   --explore   Visa råstrukturen på ett exempelobjekt (felsökning)
 *   --national  Spara bara nationella data (region_id=0), hoppa över länsdata [DEFAULT]
 *   --all-regions  Spara data för alla regioner (kan ge många rader)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const YRKESBAROMETER_URL = 'https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json';

// ---------------------------------------------------------------
// Yrken vi hanterar — samma SSYK-koder som i occupation_stats
// ---------------------------------------------------------------
const OCCUPATION_MAP = [
  // IT & Teknik
  { id: 1,  name: 'Systemutvecklare',           ssyk: '2512' },
  { id: 2,  name: 'Dataanalytiker',             ssyk: '2519' },
  { id: 3,  name: 'IT-säkerhetsspecialist',     ssyk: '2516' },
  // Ekonomi & Business
  { id: 9,  name: 'Redovisningsekonom',         ssyk: '3312' },
  { id: 10, name: 'Controller',                 ssyk: '2412' },
  { id: 11, name: 'Digital marknadsförare',     ssyk: '2431' },
  { id: 12, name: 'HR-specialist',              ssyk: '2423' },
  // Vård & Hälsa
  { id: 14, name: 'Sjuksköterska',              ssyk: '2221' },
  { id: 16, name: 'Arbetsterapeut',             ssyk: '2272' },
  { id: 17, name: 'Biomedicinsk analytiker',    ssyk: '3213' },
  { id: 18, name: 'Tandhygienist',              ssyk: '3250' },
  // Samhälle & Utbildning
  { id: 20, name: 'Grundskollärare',            ssyk: '2341' },
  { id: 21, name: 'Gymnasielärare',             ssyk: '2330' },
  { id: 22, name: 'Studie- och yrkesvägledare', ssyk: '2359' },
  // Bygg & Fastighet
  { id: 24, name: 'Byggingenjör',               ssyk: '3112' },
  { id: 25, name: 'Fastighetsförvaltare',       ssyk: '3335' },
];

const SSYK_TO_OCC = new Map(OCCUPATION_MAP.map(o => [o.ssyk, o]));

// ---------------------------------------------------------------
// Fältnamn-kandidater (Arbetsförmedlingen kan byta namn)
// Arrayen är i prioritetsordning — första träff används.
// ---------------------------------------------------------------
const FIELD_CANDIDATES = {
  ssyk: [
    'ssyk_code', 'ssyk', 'yrkesgrupp_kod', 'Yrkesgrupp_kod',
    'occupation_group_ssyk', 'ssykKod', 'ssyk_id',
  ],
  occName: [
    'occupation_group', 'yrkesgrupp', 'Yrkesgrupp',
    'occupationGroup', 'occupation_group_name',
  ],
  regionId: [
    'region_id', 'lan_id', 'lan_kod', 'regionId',
    'county_code', 'county_id', 'lanKod',
  ],
  regionName: [
    'region', 'lan', 'Lan', 'regionName', 'county', 'county_name',
  ],
  year: ['year', 'ar', 'År', 'forecast_year', 'publicYear'],
  term: ['term', 'termin', 'Termin', 'period', 'Period'],
  jobOpp: [
    'job_opportunities', 'jobbopp', 'prognos_jobbopp',
    'job_barometer', 'jobbOpp', 'JobbOpp',
    'assessment_of_job_opportunities',
  ],
  recruitment: [
    'recruitment_situation', 'rekrytering', 'prognos_rekrytering',
    'Rekrytering', 'recruitmentSituation',
    'assessment_of_recruitment_situation',
  ],
  fiveYear: [
    'five_year_forecast', 'prognos_5ar', 'fem_ar', 'femAr',
    'five_year_assessment', 'fiveYearForecast', 'langsiktigPrognos',
    'five_year_outlook', 'demand_5_years',
  ],
};

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

/**
 * Hitta värdet i ett objekt givet en lista av möjliga fältnamn.
 * Returnerar [fältnamn, värde] eller [null, undefined].
 */
function findField(obj, candidates) {
  for (const key of candidates) {
    if (key in obj) return [key, obj[key]];
  }
  return [null, undefined];
}

/**
 * Normalisera ett skala-värde till integer eller null.
 * Hanterar siffror, strängar, och möjliga textbedömningar.
 */
function parseScale(val) {
  if (val === null || val === undefined || val === '' || val === '..') return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/**
 * Analysera fältstrukturen i en exempelrad och returnera mappning.
 */
function detectFieldMapping(sample) {
  const mapping = {};
  const detected = [];
  const missing = [];

  for (const [fieldName, candidates] of Object.entries(FIELD_CANDIDATES)) {
    const [found] = findField(sample, candidates);
    if (found) {
      mapping[fieldName] = found;
      detected.push(`  ${fieldName.padEnd(12)} → "${found}"`);
    } else {
      missing.push(fieldName);
    }
  }

  return { mapping, detected, missing };
}

/**
 * Hämta yrkesbarometer JSON-filen.
 */
async function fetchYrkesbarometer() {
  console.log(`Laddar ner yrkesbarometern från Arbetsförmedlingen...`);
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
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${YRKESBAROMETER_URL}`);
  }

  const data = await res.json();

  // Data kan vara antingen ett array direkt eller { data: [...] }
  const records = Array.isArray(data) ? data : (data.data || data.records || data.items || []);

  if (records.length === 0) {
    throw new Error('Fick tom array från Arbetsförmedlingen — oväntat format?');
  }

  console.log(`✓ Hämtade ${records.length.toLocaleString('sv')} rader totalt.`);
  return records;
}

/**
 * Upsert en prognos-rad i Supabase.
 */
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
// Huvudfunktion
// ---------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const exploreMode = args.includes('--explore');
  const allRegions = args.includes('--all-regions');
  const nationalOnly = !allRegions;

  if (!dryRun && SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Sätt SUPABASE_SERVICE_KEY innan du kör scriptet!');
    console.error('Eller använd --dry-run för att bara testa utan att spara.');
    process.exit(1);
  }

  if (dryRun) console.log('*** DRY RUN — inget sparas till Supabase ***\n');

  // 1. Hämta data
  const records = await fetchYrkesbarometer();

  // 2. Identifiera fältstruktur från första posten
  const sample = records[0];
  const { mapping, detected, missing } = detectFieldMapping(sample);

  console.log('Identifierade fält i JSON-filen:');
  detected.forEach(d => console.log(d));
  if (missing.length > 0) {
    console.log(`\n  Saknas (ej kritiskt om de inte används): ${missing.join(', ')}`);
  }
  console.log('');

  // 3. Visa råstruktur om --explore
  if (exploreMode) {
    console.log('=== RÅSTRUKTUR FÖR FÖRSTA POSTEN ===');
    console.log(JSON.stringify(sample, null, 2));
    console.log('');
    console.log('Alla fältnamn i filen:');
    console.log(' ', Object.keys(sample).join('\n  '));
    console.log('');
  }

  if (!mapping.ssyk) {
    console.error('KRITISKT: Kan inte hitta SSYK-fältet i JSON-filen!');
    console.error('Kör med --explore för att se råstrukturen och uppdatera FIELD_CANDIDATES.ssyk.');
    process.exit(1);
  }

  // 4. Filtrera relevanta SSYK-koder och (om nationalOnly) nationell nivå
  const ourSsyk = new Set(OCCUPATION_MAP.map(o => o.ssyk));

  const relevant = records.filter(r => {
    const ssyk = String(r[mapping.ssyk] || '').trim();
    if (!ourSsyk.has(ssyk)) return false;

    if (nationalOnly && mapping.regionId) {
      const regionId = String(r[mapping.regionId] || '').trim();
      // Nationell = region_id "0" eller "00" eller tom
      return regionId === '0' || regionId === '00' || regionId === '';
    }
    return true;
  });

  console.log(`Filtrerade ${relevant.length} rader för våra ${ourSsyk.size} SSYK-koder` +
    (nationalOnly ? ' (nationell nivå)' : ' (alla regioner)') + '.');

  if (relevant.length === 0) {
    console.warn('\nVARNING: Inga matchande rader hittades!');
    console.warn('Kontrollera SSYK-koderna och kör med --explore för att se strukturen.');

    // Visa vilka SSYK-koder som faktiskt finns i filen
    const foundSsyk = new Set(records.map(r => String(r[mapping.ssyk] || '')));
    const ourMissing = [...ourSsyk].filter(s => !foundSsyk.has(s));
    if (ourMissing.length > 0) {
      console.warn(`\nSSSYK-koder vi söker efter men ej fann i filen: ${ourMissing.join(', ')}`);
    }
    const sampleSsyk = [...foundSsyk].slice(0, 10);
    console.warn(`\nExempel på SSYK-koder som finns i filen: ${sampleSsyk.join(', ')}`);
    process.exit(1);
  }

  console.log('');

  // 5. Bearbeta och (eventuellt) spara
  let ok = 0;
  let failed = 0;

  for (const r of relevant) {
    const ssyk = String(r[mapping.ssyk] || '').trim();
    const occ  = SSYK_TO_OCC.get(ssyk);
    if (!occ) continue;

    const [, jobOpp]       = findField(r, FIELD_CANDIDATES.jobOpp);
    const [, recruitment]  = findField(r, FIELD_CANDIDATES.recruitment);
    const [, fiveYear]     = findField(r, FIELD_CANDIDATES.fiveYear);
    const [, year]         = findField(r, FIELD_CANDIDATES.year);
    const [, term]         = findField(r, FIELD_CANDIDATES.term);
    const [, regionId]     = findField(r, FIELD_CANDIDATES.regionId);
    const [, regionName]   = findField(r, FIELD_CANDIDATES.regionName);

    const row = {
      occupation_id:   occ.id,
      occupation_name: occ.name,
      ssyk_code:       ssyk,
      region_id:       String(regionId ?? '0'),
      region_name:     String(regionName ?? 'Riket'),
      forecast_year:   year ? parseInt(year, 10) : null,
      forecast_term:   term ? String(term) : null,
      job_opportunities:      parseScale(jobOpp),
      recruitment_situation:  parseScale(recruitment),
      five_year_forecast:     parseScale(fiveYear),
      raw_data:               r,
    };

    const regionLabel = row.region_id === '0' ? 'Riket' : `Län ${row.region_id}`;
    const period = [row.forecast_year, row.forecast_term].filter(Boolean).join(' ') || '?';

    process.stdout.write(
      `  [${String(occ.id).padStart(2)}] ${occ.name.padEnd(30)} SSYK ${ssyk}` +
      ` | ${regionLabel.padEnd(20)} | ${period.padEnd(10)}` +
      ` | jobbopp:${row.job_opportunities ?? '—'} rekr:${row.recruitment_situation ?? '—'} 5år:${row.five_year_forecast ?? '—'}` +
      ` → `
    );

    if (dryRun) {
      console.log('(dry-run, ej sparad)');
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
    console.log('');
    console.log('Verifiera datan i Supabase Table Editor → occupation_forecasts');
    console.log('');
    console.log('Skalförklaring (Arbetsförmedlingens bedömning):');
    console.log('  1 = Stor brist (hög efterfrågan på arbetstagare)');
    console.log('  2 = Brist');
    console.log('  3 = Balans');
    console.log('  4 = Överskott');
    console.log('  5 = Stor överskott');
  }
}

main().catch(err => {
  console.error('\nOväntat fel:', err.message);
  process.exit(1);
});
