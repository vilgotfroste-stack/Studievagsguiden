/**
 * fetch-occupation-workenv.js
 * ============================
 * Hämtar arbetsmiljödata från SCB:s Arbetsmiljöundersökning (AMU)
 * och importerar till Supabase-tabellen occupation_workenv.
 *
 * API: SCB PxWeb
 *   Metadata (GET):  https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0501/AM0501A/ArbmiljoYrk3
 *   Data    (POST):  samma URL
 *
 * AMU genomförs vartannat år. Senaste data: 2021.
 * Datan är på SSYK 3-siffernivå — IT-yrkena (2512/2516/2519)
 * delar alla gruppen 251 och får därmed identiska värden.
 *
 * Förutsättningar:
 *   1. Kör schema_occupation_workenv.sql i Supabase SQL Editor
 *   2. Sätt SUPABASE_SERVICE_KEY
 *
 * Kör (Windows PowerShell):
 *   $env:SUPABASE_SERVICE_KEY="din_nyckel"; node supabase/fetch-occupation-workenv.js
 *
 * Flaggor:
 *   --dry-run   Hämta och visa utan att spara
 *   --explore   Visa alla variabler och värden i SCB-tabellen (kör detta FÖRST)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SCB_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0501/AM0501A/ArbmiljoYrk3';

// ---------------------------------------------------------------
// Yrken — 4-siffrig SSYK mappas till 3-siffrig (AMU-nivå)
// ---------------------------------------------------------------
const OCCUPATION_MAP = [
  { id: 1,  name: 'Systemutvecklare',           ssyk: '2512', ssyk3: '251' },
  { id: 2,  name: 'Dataanalytiker',             ssyk: '2519', ssyk3: '251' },  // delar 251 med ovan
  { id: 3,  name: 'IT-säkerhetsspecialist',     ssyk: '2516', ssyk3: '251' },  // delar 251 med ovan
  { id: 9,  name: 'Redovisningsekonom',         ssyk: '3312', ssyk3: '331' },
  { id: 10, name: 'Controller',                 ssyk: '2412', ssyk3: '241' },
  { id: 11, name: 'Digital marknadsförare',     ssyk: '2431', ssyk3: '243' },
  { id: 12, name: 'HR-specialist',              ssyk: '2423', ssyk3: '242' },
  { id: 14, name: 'Sjuksköterska',              ssyk: '2221', ssyk3: '222' },
  { id: 16, name: 'Arbetsterapeut',             ssyk: '2272', ssyk3: '227' },
  { id: 17, name: 'Biomedicinsk analytiker',    ssyk: '3213', ssyk3: '321' },
  { id: 18, name: 'Tandhygienist',              ssyk: '3250', ssyk3: '325' },
  { id: 20, name: 'Grundskollärare',            ssyk: '2341', ssyk3: '234' },
  { id: 21, name: 'Gymnasielärare',             ssyk: '2330', ssyk3: '233' },
  { id: 22, name: 'Studie- och yrkesvägledare', ssyk: '2359', ssyk3: '235' },
  { id: 24, name: 'Byggingenjör',               ssyk: '3112', ssyk3: '311' },
  { id: 25, name: 'Fastighetsförvaltare',       ssyk: '3335', ssyk3: '333' },
];

// ---------------------------------------------------------------
// Kända variabelkoder för Arbetsmiljo-variabeln i ArbmiljoYrk3.
// Dessa verifieras/uppdateras via --explore första körningen.
//
// Kör: node supabase/fetch-occupation-workenv.js --explore --dry-run
// för att se exakta koder från SCB:s API.
// ---------------------------------------------------------------
const WORKENV_CODES = {
  stress_pct:                    null,  // fylls i efter --explore
  high_tempo_pct:                null,
  psychologically_demanding_pct: null,
  physically_demanding_pct:      null,
  low_influence_pct:             null,
};

// Nyckelord att söka efter i värdetexterna (används i --explore för att identifiera rätt koder)
const SEARCH_KEYWORDS = {
  stress_pct:                    ['stress'],
  high_tempo_pct:                ['tempo', 'arbetstakt'],
  psychologically_demanding_pct: ['psykisk', 'psyk'],
  physically_demanding_pct:      ['fysisk', 'fysiskt'],
  low_influence_pct:             ['påverka', 'inflytande'],
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------
// Hämta metadata från SCB
// ---------------------------------------------------------------
async function fetchMetadata() {
  const res = await fetch(SCB_URL, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Metadata fetch failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------
// Hämta data för ett SSYK3-kod och ett år
// ---------------------------------------------------------------
async function fetchWorkenvData(ssyk3, workenvCodes, year, variables) {
  // Hitta rätt variabelnamn dynamiskt
  const yrkeVar = variables.find(v =>
    v.values.some(val => val === ssyk3 || val.startsWith(ssyk3))
  );
  const tidVar = variables.find(v => v.code === 'Tid');
  const arbVar = variables.find(v =>
    v.code.toLowerCase().includes('arbets') ||
    v.code.toLowerCase().includes('miljo') ||
    v.code === 'ContentsCode'
  );

  if (!yrkeVar || !arbVar || !tidVar) {
    console.error('  Kunde inte hitta rätt variabler i metadata');
    return null;
  }

  const codesArr = Object.values(workenvCodes).filter(Boolean);
  if (codesArr.length === 0) {
    console.error('  Inga Arbetsmiljo-koder konfigurerade. Kör --explore för att hitta dem.');
    return null;
  }

  const query = {
    query: [
      { code: yrkeVar.code,  selection: { filter: 'item', values: [ssyk3] } },
      { code: arbVar.code,   selection: { filter: 'item', values: codesArr } },
      { code: 'Tid',         selection: { filter: 'item', values: [String(year)] } },
    ],
    response: { format: 'json' },
  };

  // Lägg till Kon=totalt om variabeln finns
  const konVar = variables.find(v => v.code === 'Kon');
  if (konVar) {
    const totalVal = konVar.values.find(v => v === '1+2' || v === 'TOT' || v === '0');
    if (totalVal) {
      query.query.push({ code: 'Kon', selection: { filter: 'item', values: [totalVal] } });
    }
  }

  const res = await fetch(SCB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  SCB API-fel ${res.status}:`, text.slice(0, 200));
    return null;
  }

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    console.warn(`  Ingen data för SSYK ${ssyk3} år ${year}`);
    return null;
  }

  // Bygg resultatobjekt — mappa kod → kolumnnamn
  const codeToField = Object.fromEntries(
    Object.entries(workenvCodes).filter(([, v]) => v).map(([k, v]) => [v, k])
  );

  const result = {};
  for (const row of data.data) {
    // Hitta vilken Arbetsmiljo-kod denna rad representerar
    const arbCode = row.key.find(k => codesArr.includes(k));
    if (arbCode && codeToField[arbCode]) {
      const val = row.values[0];
      result[codeToField[arbCode]] = (val === '..' || val == null) ? null : parseFloat(val);
    }
  }

  return result;
}

// ---------------------------------------------------------------
// Upsert till Supabase
// ---------------------------------------------------------------
async function upsertWorkenv(row) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/occupation_workenv?on_conflict=occupation_id,stat_year`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
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
  const dryRun  = args.includes('--dry-run');
  const explore = args.includes('--explore');

  if (!dryRun && SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Sätt SUPABASE_SERVICE_KEY innan du kör scriptet!');
    process.exit(1);
  }

  if (dryRun) console.log('*** DRY RUN — inget sparas ***\n');

  console.log('Hämtar metadata från SCB Arbetsmiljöundersökning...');
  const meta = await fetchMetadata();
  const variables = meta.variables;

  // ---- EXPLORE-LÄGE ----
  if (explore) {
    console.log('\n=== ALLA VARIABLER I SCB-TABELLEN ===\n');
    for (const v of variables) {
      console.log(`Variabel: "${v.code}" — ${v.text}`);
      v.values.forEach((val, i) => console.log(`  ${val.padEnd(20)} = ${v.valueTexts[i]}`));
      console.log('');
    }

    // Visa förslag på vilka koder som matchar våra nyckelord
    const arbVar = variables.find(v =>
      v.code.toLowerCase().includes('arbets') || v.code.toLowerCase().includes('miljo')
    );
    if (arbVar) {
      console.log('=== MATCHNINGAR MOT NYCKELORD ===\n');
      for (const [field, keywords] of Object.entries(SEARCH_KEYWORDS)) {
        const matches = arbVar.values
          .map((val, i) => ({ val, text: arbVar.valueTexts[i] }))
          .filter(({ text }) => keywords.some(kw => text.toLowerCase().includes(kw)));
        console.log(`${field}:`);
        matches.forEach(m => console.log(`  "${m.val}" = ${m.text}`));
        if (matches.length === 0) console.log('  (ingen matchning — kontrollera nyckelorden)');
        console.log('');
      }
      console.log('Uppdatera WORKENV_CODES i scriptet med rätt koder och kör sedan utan --explore.');
    }
    return;
  }

  // ---- NORMAL KÖRNING ----
  const codesConfigured = Object.values(WORKENV_CODES).some(Boolean);
  if (!codesConfigured) {
    console.error('\nWORKENV_CODES är tomma! Kör först:');
    console.error('  node supabase/fetch-occupation-workenv.js --explore --dry-run');
    console.error('Fyll sedan i koderna i WORKENV_CODES och kör igen.\n');
    process.exit(1);
  }

  // Hitta senaste tillgängliga år
  const tidVar = variables.find(v => v.code === 'Tid');
  const latestYear = tidVar ? tidVar.values[tidVar.values.length - 1] : '2021';
  console.log(`Statistikår: ${latestYear}`);
  console.log(`Hämtar data för ${OCCUPATION_MAP.length} yrken...\n`);

  // Cache per ssyk3 för att undvika dubbelanrop
  const cache = new Map();
  let ok = 0;
  let failed = 0;

  for (const occ of OCCUPATION_MAP) {
    process.stdout.write(
      `  [${String(occ.id).padStart(2)}] ${occ.name.padEnd(30)} SSYK3 ${occ.ssyk3} → `
    );

    let workenvData;
    if (cache.has(occ.ssyk3)) {
      workenvData = cache.get(occ.ssyk3);
      process.stdout.write('(cache) ');
    } else {
      workenvData = await fetchWorkenvData(occ.ssyk3, WORKENV_CODES, latestYear, variables);
      cache.set(occ.ssyk3, workenvData);
      await sleep(300);
    }

    if (!workenvData) {
      console.log('MISSLYCKADES');
      failed++;
      continue;
    }

    const summary = [
      `stress:${workenvData.stress_pct ?? '—'}%`,
      `tempo:${workenvData.high_tempo_pct ?? '—'}%`,
      `psyk:${workenvData.psychologically_demanding_pct ?? '—'}%`,
    ].join(' ');

    process.stdout.write(summary + ' → ');

    if (dryRun) {
      console.log('(dry-run)');
      ok++;
      continue;
    }

    const row = {
      occupation_id:   occ.id,
      occupation_name: occ.name,
      ssyk_code:       occ.ssyk,
      ssyk3_code:      occ.ssyk3,
      stat_year:       parseInt(latestYear, 10),
      ...workenvData,
      raw_data: workenvData,
    };

    try {
      await upsertWorkenv(row);
      console.log('ok');
      ok++;
    } catch (err) {
      console.log(`FEL: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nKlart! ${ok} lyckades, ${failed} misslyckades.`);
  if (ok > 0 && !dryRun) {
    console.log('Verifiera i Supabase Table Editor → occupation_workenv');
  }
}

main().catch(err => {
  console.error('\nOväntat fel:', err.message);
  process.exit(1);
});
