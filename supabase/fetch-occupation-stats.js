/**
 * fetch-occupation-stats.js
 * ==========================
 * Hämtar lönestatistik från SCB:s PxWeb API och importerar till Supabase.
 *
 * API: POST https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A/LoneSpridSektYrk4AN
 * Hämtar månadslön, medianlön, P25 och P75 per SSYK-kod.
 *
 * Kör lokalt (Node 18+ rekommenderas):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="din_nyckel_här"; node supabase/fetch-occupation-stats.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=din_nyckel_här node supabase/fetch-occupation-stats.js
 *
 * Sätt SUPABASE_SERVICE_KEY till service_role-nyckeln från
 * Supabase → Settings → API (INTE anon-nyckeln).
 *
 * Notera: Scriptet behöver bara köras när SCB publicerar ny statistik (~1 gång/år).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SCB_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A/LoneSpridSektYrk4AN';

// SCB ContentsCode för respektive lönemått
const SCB_CONTENTS = {
  monthly_salary: '000007CD',   // Månadslön (medelvärde)
  median_salary:  '000007CE',   // Medianlön
  p25_salary:     '000007CG',   // P25 (undre kvartil)
  p75_salary:     '000007CH',   // P75 (övre kvartil)
};

const STAT_YEAR = '2024';

// ---------------------------------------------------------------
// Mappning: interna occupation_id → SSYK-kod + namn
// id 23 (Personalvetare) slås ihop med id 12 (HR-specialist) och ingår inte här.
// ---------------------------------------------------------------
const OCCUPATION_MAP = [
  // IT & Teknik
  { id: 1,  name: 'Systemutvecklare',          ssyk: '2512' },
  { id: 2,  name: 'Dataanalytiker',            ssyk: '2519' },
  { id: 3,  name: 'IT-säkerhetsspecialist',    ssyk: '2516' },
  { id: 4,  name: 'UX/UI-designer',            ssyk: '2166' },
  { id: 5,  name: 'Civilingenjör',             ssyk: '2141' },
  { id: 6,  name: 'Högskoleingenjör',          ssyk: '3114' },
  { id: 7,  name: 'DevOps / Cloud engineer',   ssyk: '2514' },
  // Ekonomi & Business
  { id: 8,  name: 'Civilekonom',               ssyk: '2413' },
  { id: 9,  name: 'Redovisningsekonom',        ssyk: '2411' },
  { id: 10, name: 'Controller',                ssyk: '2412' },
  { id: 11, name: 'Digital marknadsförare',    ssyk: '2431' },
  { id: 12, name: 'HR-specialist',             ssyk: '2423' },
  { id: 13, name: 'Projektledare',             ssyk: '2421' },
  // Vård & Hälsa
  { id: 14, name: 'Sjuksköterska',             ssyk: '2221' },
  { id: 15, name: 'Fysioterapeut',             ssyk: '2264' },
  { id: 16, name: 'Arbetsterapeut',            ssyk: '2265' },
  { id: 17, name: 'Biomedicinsk analytiker',   ssyk: '3213' },
  { id: 18, name: 'Tandhygienist',             ssyk: '3251' },
  // Samhälle & Människor
  { id: 19, name: 'Socionom',                  ssyk: '2635' },
  { id: 20, name: 'Grundskollärare',           ssyk: '2341' },
  { id: 21, name: 'Gymnasielärare',            ssyk: '2330' },
  { id: 22, name: 'Studie- och yrkesvägledare', ssyk: '2635' },  // delar SSYK med Socionom
  // Tekniska / Praktiska
  { id: 24, name: 'Byggingenjör',              ssyk: '2142' },
  { id: 25, name: 'Fastighetsförvaltare',      ssyk: '3334' },
  { id: 26, name: 'VVS-ingenjör',              ssyk: '2143' },
  { id: 27, name: 'Automationsingenjör',       ssyk: '2151' },
  // Övriga
  { id: 28, name: 'Kriminolog',                ssyk: '2632' },
  { id: 29, name: 'Beteendevetare',            ssyk: '2634' },
];

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hämtar lönedata från SCB för en SSYK-kod.
 * Returnerar { monthly_salary, median_salary, p25_salary, p75_salary } eller null vid fel.
 */
async function fetchSCBSalary(ssykCode) {
  const query = {
    query: [
      {
        code: 'Ssyk4',
        selection: { filter: 'item', values: [ssykCode] },
      },
      {
        code: 'Sektor',
        selection: { filter: 'item', values: ['0'] },  // 0 = samtliga sektorer
      },
      {
        code: 'ContentsCode',
        selection: {
          filter: 'item',
          values: Object.values(SCB_CONTENTS),
        },
      },
      {
        code: 'Tid',
        selection: { filter: 'item', values: [STAT_YEAR] },
      },
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
    console.error(`  SCB API error ${res.status} för SSYK ${ssykCode}:`, text.slice(0, 200));
    return null;
  }

  const data = await res.json();

  // SCB PxWeb returnerar data i data[].values[], ett värde per ContentsCode i ordning
  if (!data.data || data.data.length === 0) {
    console.warn(`  Ingen data från SCB för SSYK ${ssykCode}`);
    return null;
  }

  // Värdena kommer i samma ordning som ContentsCode i queryn
  const values = data.data[0].values;
  const [monthly, median, p25, p75] = values.map(v => (v === '..' ? null : Math.round(Number(v))));

  return {
    monthly_salary: monthly,
    median_salary:  median,
    p25_salary:     p25,
    p75_salary:     p75,
  };
}

/**
 * Upsert en rad i occupation_stats via Supabase REST API.
 */
async function upsertToSupabase(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/occupation_stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Prefer': 'resolution=merge-duplicates',  // upsert på occupation_id (UNIQUE)
    },
    body: JSON.stringify({
      ...row,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------
// Huvudloop
// ---------------------------------------------------------------

async function main() {
  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Sätt SUPABASE_SERVICE_KEY innan du kör scriptet!');
    process.exit(1);
  }

  console.log(`Hämtar lönedata från SCB för ${OCCUPATION_MAP.length} yrken (år ${STAT_YEAR})...`);
  console.log('');

  // Samla unika SSYK-koder för att minimera API-anrop
  // (t.ex. id 19 och 22 delar SSYK 2635 — hämtas bara en gång)
  const ssykCache = new Map();

  let ok = 0;
  let failed = 0;

  for (const occ of OCCUPATION_MAP) {
    process.stdout.write(`  [${occ.id.toString().padStart(2)}] ${occ.name.padEnd(30)} SSYK ${occ.ssyk} → `);

    let salaryData;
    if (ssykCache.has(occ.ssyk)) {
      salaryData = ssykCache.get(occ.ssyk);
      process.stdout.write('(cache) ');
    } else {
      salaryData = await fetchSCBSalary(occ.ssyk);
      ssykCache.set(occ.ssyk, salaryData);
      await sleep(300);  // var snäll mot SCB:s API
    }

    if (!salaryData) {
      console.log('MISSLYCKADES');
      failed++;
      continue;
    }

    const row = {
      occupation_id:   occ.id,
      occupation_name: occ.name,
      ssyk_code:       occ.ssyk,
      stat_year:       parseInt(STAT_YEAR),
      ...salaryData,
    };

    try {
      await upsertToSupabase(row);
      console.log(`ok  (lön: ${salaryData.monthly_salary?.toLocaleString('sv')} kr, median: ${salaryData.median_salary?.toLocaleString('sv')} kr)`);
      ok++;
    } catch (err) {
      console.log(`SUPABASE FEL: ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Klart! ${ok} lyckades, ${failed} misslyckades.`);

  if (ok > 0) {
    console.log('');
    console.log('Nästa steg:');
    console.log('  1. Verifiera datan i Supabase Table Editor → occupation_stats');
    console.log('  2. HTML-filerna hämtar nu s1 från Supabase istället för hårdkodade värden');
  }
}

main().catch(err => {
  console.error('Oväntat fel:', err);
  process.exit(1);
});
