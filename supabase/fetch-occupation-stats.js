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
// Mappning: interna occupation_id → SSYK-kod (Yrke2012 i SCB API) + namn
// id 23 (Personalvetare) slås ihop med id 12 (HR-specialist) och ingår inte här.
//
// Koder verifierade mot SCB API-metadata (GET LoneSpridSektYrk4AN).
// Notering: SCB använder variabeln "Yrke2012", inte "Ssyk4".
// ---------------------------------------------------------------
// 17 yrken med egna unika SSYK-koder verifierade mot SCB API.
// Lägg till nya yrken här + kör scriptet för att uppdatera Supabase.
const OCCUPATION_MAP = [
  // IT & Teknik
  { id: 1,  name: 'Systemutvecklare',           ssyk: '2512' },  // Mjukvaru- och systemutvecklare m.fl.
  { id: 2,  name: 'Dataanalytiker',             ssyk: '2519' },  // Övriga IT-specialister
  { id: 3,  name: 'IT-säkerhetsspecialist',     ssyk: '2516' },  // IT-säkerhetsspecialister
  // Ekonomi & Business
  { id: 9,  name: 'Redovisningsekonom',         ssyk: '3312' },  // Redovisningsekonomer
  { id: 10, name: 'Controller',                 ssyk: '2412' },  // Controller
  { id: 11, name: 'Digital marknadsförare',     ssyk: '2431' },  // Marknadsanalytiker och marknadsförare m.fl.
  { id: 12, name: 'HR-specialist',              ssyk: '2423' },  // Personal- och HR-specialister
  // Vård & Hälsa
  { id: 14, name: 'Sjuksköterska',              ssyk: '2221' },  // Grundutbildade sjuksköterskor
  { id: 16, name: 'Arbetsterapeut',             ssyk: '2272' },  // Arbetsterapeuter
  { id: 17, name: 'Biomedicinsk analytiker',    ssyk: '3213' },  // Biomedicinska analytiker m.fl.
  { id: 18, name: 'Tandhygienist',              ssyk: '3250' },  // Tandhygienister
  // Samhälle & Utbildning
  { id: 20, name: 'Grundskollärare',            ssyk: '2341' },  // Grundskollärare
  { id: 21, name: 'Gymnasielärare',             ssyk: '2330' },  // Gymnasielärare
  { id: 22, name: 'Studie- och yrkesvägledare', ssyk: '2359' },  // Studie- och yrkesvägledare
  // Bygg & Fastighet
  { id: 24, name: 'Byggingenjör',               ssyk: '3112' },  // Ingenjörer och tekniker inom bygg och anläggning
  { id: 25, name: 'Fastighetsförvaltare',       ssyk: '3334' },  // Fastighetsförvaltare
];

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hämtar metadata från SCB-tabellen för att få korrekta variabelkoder och värden.
 * Returnerar { ssykVar, ssykValues, sektorVar, sektorValues, tidValues }
 */
async function fetchSCBMetadata() {
  const res = await fetch(SCB_URL, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Metadata fetch failed: ${res.status}`);
  const meta = await res.json();

  console.log('SCB-tabellens variabler:');
  for (const v of meta.variables) {
    console.log(`  code="${v.code}" text="${v.text}" values=[${v.values.slice(0,5).join(',')}${v.values.length > 5 ? '...' : ''}]`);
  }
  console.log('');

  return meta.variables;
}

/**
 * Hämtar lönedata från SCB för en SSYK-kod.
 * Returnerar { monthly_salary, median_salary, p25_salary, p75_salary } eller null vid fel.
 */
async function fetchSCBSalary(ssykCode, variables) {
  // Hitta variabelkoderna dynamiskt från metadata
  const ssykVar    = variables.find(v => v.values.includes(ssykCode));
  const tidVar     = variables.find(v => v.code === 'Tid' || v.code === 'tid' || v.text.toLowerCase().includes('år'));
  const sektorVar  = variables.find(v => v.code.toLowerCase().includes('sektor') || v.text.toLowerCase().includes('sektor'));
  const contentVar = variables.find(v => v.code === 'ContentsCode');

  if (!ssykVar) {
    console.error(`  Hittar ingen variabel med värdet ${ssykCode} i metadata`);
    return null;
  }

  // Hitta senaste tillgängliga år
  const latestYear = tidVar ? tidVar.values[tidVar.values.length - 1] : STAT_YEAR;

  // Hitta "samtliga sektorer" — oftast första värdet eller det med lägst kod
  const sektorValue = sektorVar ? sektorVar.values[0] : null;

  const konVar = variables.find(v => v.code === 'Kon');

  const query = {
    query: [
      {
        code: 'Yrke2012',
        selection: { filter: 'item', values: [ssykCode] },
      },
      {
        code: 'Sektor',
        selection: { filter: 'item', values: ['0'] },  // samtliga sektorer
      },
      ...(konVar ? [{
        code: 'Kon',
        selection: { filter: 'item', values: ['1+2'] },  // totalt (ej uppdelat på kön)
      }] : []),
      {
        code: 'ContentsCode',
        selection: { filter: 'item', values: Object.values(SCB_CONTENTS) },
      },
      {
        code: 'Tid',
        selection: { filter: 'item', values: [latestYear] },
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/occupation_stats?on_conflict=occupation_id`, {
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

  // Hämta metadata för att få korrekta variabelkoder
  const variables = await fetchSCBMetadata();

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
      salaryData = await fetchSCBSalary(occ.ssyk, variables);
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
