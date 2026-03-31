/**
 * explore-scb-api.js
 * ==================
 * Utforskar SCB:s API för att hitta rätt tabell med åldersuppdelad lönedata.
 *
 * Kör:
 *   node supabase/explore-scb-api.js
 */

const BASE = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A';

async function get(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} för ${url}`);
  return res.json();
}

async function main() {
  // ── Steg 1: Lista alla tabeller i AM0110A ──────────────────────────────
  console.log('=== Tabeller i AM/AM0110/AM0110A ===\n');
  const tables = await get(BASE);
  for (const t of tables) {
    console.log(`  ${t.id.padEnd(35)} "${t.text}"`);
  }

  // ── Steg 2: Kolla variabler i befintlig tabell (LoneSpridSektYrk4AN) ──
  console.log('\n=== Variabler i LoneSpridSektYrk4AN (nuvarande tabell) ===\n');
  const current = await get(`${BASE}/LoneSpridSektYrk4AN`);
  for (const v of current.variables) {
    console.log(`  code="${v.code}"  text="${v.text}"`);
    if (v.values.length <= 20) {
      for (let i = 0; i < v.values.length; i++) {
        console.log(`    ${v.values[i].padEnd(10)} = ${v.valueTexts?.[i] ?? ''}`);
      }
    } else {
      console.log(`    (${v.values.length} värden, visar första 5:)`);
      for (let i = 0; i < 5; i++) {
        console.log(`    ${v.values[i].padEnd(10)} = ${v.valueTexts?.[i] ?? ''}`);
      }
    }
    console.log('');
  }

  // ── Steg 3: Hitta tabeller som troligen har åldersdata ────────────────
  console.log('\n=== Tabeller som kan ha åldersdata (söker "Ald" eller "ålder") ===\n');
  const candidates = tables.filter(t =>
    t.id.toLowerCase().includes('ald') ||
    t.text.toLowerCase().includes('ålder') ||
    t.text.toLowerCase().includes('alder')
  );
  if (candidates.length === 0) {
    console.log('  Inga direkta träffar. Kolla tabellistan ovan manuellt.');
  } else {
    for (const t of candidates) {
      console.log(`  ${t.id.padEnd(35)} "${t.text}"`);
    }
  }
}

main().catch(err => {
  console.error('Fel:', err.message);
  process.exit(1);
});
