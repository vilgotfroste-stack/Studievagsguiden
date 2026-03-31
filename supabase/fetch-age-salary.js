/**
 * fetch-age-salary.js
 * ====================
 * Hämtar åldersuppdelad lönestatistik från SCB:s LonYrkeAlder4AN
 * och importerar till Supabase (kolumner age_18_24 … age_55_64).
 *
 * Förutsätter att schema_age_salary.sql redan körts i Supabase SQL Editor.
 *
 * Kör:
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="din_nyckel_här"; node supabase/fetch-age-salary.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=din_nyckel_här node supabase/fetch-age-salary.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SCB_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A/LonYrkeAlder4AN';
const MANADS_LON_CODE = '000007BN';
const STAT_YEAR = '2024';

// Åldersgrupper vi hämtar (65-66/65-68 hoppas över — ofta saknad data)
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64'];

// Samma yrken som i fetch-occupation-stats.js MINUS Fysioterapeut (borttagen)
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Hämtar månadslön per åldersgrupp för en SSYK-kod.
 * Returnerar t.ex. { age_18_24: 37000, age_25_34: 48300, ... } eller null vid fel.
 */
async function fetchAgeSalary(ssykCode) {
  const query = {
    query: [
      { code: 'Yrke2012',      selection: { filter: 'item', values: [ssykCode] } },
      { code: 'Sektor',        selection: { filter: 'item', values: ['0'] } },    // samtliga sektorer
      { code: 'Kon',           selection: { filter: 'item', values: ['1+2'] } },  // totalt
      { code: 'Alder',         selection: { filter: 'item', values: AGE_GROUPS } },
      { code: 'ContentsCode',  selection: { filter: 'item', values: [MANADS_LON_CODE] } },
      { code: 'Tid',           selection: { filter: 'item', values: [STAT_YEAR] } },
    ],
    response: { format: 'json' },
  };

  const res = await fetch(SCB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  SCB API-fel ${res.status} för SSYK ${ssykCode}:`, text.slice(0, 200));
    return null;
  }

  const data = await res.json();

  if (!data.data || data.data.length === 0) {
    console.warn(`  Ingen data från SCB för SSYK ${ssykCode}`);
    return null;
  }

  // Bygg ett objekt { age_18_24: xxx, age_25_34: xxx, ... }
  const result = {};
  for (const row of data.data) {
    const ageGroup = row.key[3]; // Alder är 4:e nyckeln (Sektor/Yrke2012/Kon/Alder/Tid)
    const val = row.values[0];
    const colName = `age_${ageGroup.replace('-', '_')}`;
    result[colName] = val === '..' ? null : Math.round(Number(val));
  }

  return result;
}

/**
 * Uppdaterar age-kolumnerna för ett occupation_id i Supabase.
 */
async function upsertAgeSalary(occupationId, ageData) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/occupation_stats?occupation_id=eq.${occupationId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        ...ageData,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH failed (${res.status}): ${text}`);
  }
}

async function main() {
  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Sätt SUPABASE_SERVICE_KEY innan du kör scriptet!');
    process.exit(1);
  }

  console.log(`Hämtar åldersuppdelad lönedata från SCB för ${OCCUPATION_MAP.length} yrken (år ${STAT_YEAR})...`);
  console.log('Åldersgrupper:', AGE_GROUPS.join(', '));
  console.log('');

  const ssykCache = new Map();
  let ok = 0;
  let failed = 0;

  for (const occ of OCCUPATION_MAP) {
    process.stdout.write(`  [${String(occ.id).padStart(2)}] ${occ.name.padEnd(30)} SSYK ${occ.ssyk} → `);

    let ageData;
    if (ssykCache.has(occ.ssyk)) {
      ageData = ssykCache.get(occ.ssyk);
      process.stdout.write('(cache) ');
    } else {
      ageData = await fetchAgeSalary(occ.ssyk);
      ssykCache.set(occ.ssyk, ageData);
      await sleep(300);
    }

    if (!ageData) {
      console.log('MISSLYCKADES (SCB)');
      failed++;
      continue;
    }

    // Visa löner per åldersgrupp
    const summary = AGE_GROUPS
      .map(ag => {
        const col = `age_${ag.replace('-', '_')}`;
        return ageData[col] != null ? `${ag}: ${ageData[col].toLocaleString('sv')}` : `${ag}: -`;
      })
      .join(' | ');
    process.stdout.write(summary + ' → ');

    try {
      await upsertAgeSalary(occ.id, ageData);
      console.log('ok');
      ok++;
    } catch (err) {
      console.log(`SUPABASE FEL: ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Klart! ${ok} lyckades, ${failed} misslyckades.`);
  console.log('');
  console.log('Kopiera outputen ovan och skicka till Claude för att hårdkoda SALA-objektet i utbildningar-shared.js.');
}

main().catch(err => {
  console.error('Oväntat fel:', err);
  process.exit(1);
});
