/**
 * test-age-salary.js
 * ==================
 * Testar SCB-tabellen LonYrkeAlder4AN (åldersuppdelad lönedata).
 * Visar vilka åldersgrupper som finns och hämtar testdata för ett yrke.
 *
 * Kör:
 *   node supabase/test-age-salary.js
 */

const BASE = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A';
const TABLE = 'LonYrkeAlder4AN';
const URL = `${BASE}/${TABLE}`;

// Testkör med Systemutvecklare (SSYK 2512)
const TEST_SSYK = '2512';

async function get(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  // ── Steg 1: Metadata ───────────────────────────────────────────────────
  console.log(`=== Variabler i ${TABLE} ===\n`);
  const meta = await get(URL);
  for (const v of meta.variables) {
    console.log(`  code="${v.code}"  text="${v.text}"`);
    for (let i = 0; i < v.values.length; i++) {
      console.log(`    ${String(v.values[i]).padEnd(12)} = ${v.valueTexts?.[i] ?? ''}`);
    }
    console.log('');
  }

  // ── Steg 2: Testfråga för Systemutvecklare (2512) ──────────────────────
  console.log(`=== Testfråga: SSYK ${TEST_SSYK} (Systemutvecklare), alla åldersgrupper ===\n`);

  // Hitta åldervariabeln och senaste år
  const alderVar = meta.variables.find(v =>
    v.code.toLowerCase().includes('alder') || v.text.toLowerCase().includes('ålder')
  );
  const tidVar = meta.variables.find(v => v.code === 'Tid');
  const contentVar = meta.variables.find(v => v.code === 'ContentsCode');

  if (!alderVar) {
    console.error('Hittade ingen åldersvariabel! Variabler:', meta.variables.map(v => v.code));
    return;
  }

  const latestYear = tidVar.values[tidVar.values.length - 1];
  console.log(`Åldersgrupper: ${alderVar.values.join(', ')}`);
  console.log(`Senaste år: ${latestYear}`);
  console.log(`Åldervariabelkod: ${alderVar.code}\n`);

  // Hitta månadslön ContentCode
  const manadsIdx = contentVar.valueTexts.findIndex(t => t === 'Månadslön');
  const manadsCode = contentVar.values[manadsIdx];
  console.log(`Månadslön ContentCode: ${manadsCode}\n`);

  const query = {
    query: [
      { code: 'Yrke2012',    selection: { filter: 'item', values: [TEST_SSYK] } },
      { code: 'Sektor',      selection: { filter: 'item', values: ['0'] } },   // samtliga
      { code: 'Kon',         selection: { filter: 'item', values: ['1+2'] } }, // totalt
      { code: alderVar.code, selection: { filter: 'item', values: alderVar.values } }, // alla åldrar
      { code: 'ContentsCode',selection: { filter: 'item', values: [manadsCode] } },
      { code: 'Tid',         selection: { filter: 'item', values: [latestYear] } },
    ],
    response: { format: 'json' },
  };

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`SCB API-fel ${res.status}:`, text.slice(0, 300));
    return;
  }

  const data = await res.json();

  if (!data.data || data.data.length === 0) {
    console.log('Ingen data returnerades från SCB.');
    return;
  }

  console.log('Resultat:\n');
  for (const row of data.data) {
    const alderKod = row.key[alderVar.code === alderVar.code ? 3 : 3]; // ålder är 4:e nyckeln
    // row.key = [Yrke2012, Sektor, Kon, Alder, Tid]
    const keys = row.key;
    const lön = row.values[0];
    console.log(`  Ålder index ${keys.join(' / ')} → lön: ${lön} kr`);
  }

  // Visa rådata för felsökning
  console.log('\nRådata (första raden):');
  console.log(JSON.stringify(data.data[0], null, 2));
  console.log('\nKolumnordning:', data.columns?.map(c => c.code + '(' + c.text + ')').join(', '));
}

main().catch(err => {
  console.error('Fel:', err.message);
  process.exit(1);
});
