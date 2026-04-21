/**
 * fetch-susa-test.js
 * ==================
 * Testar SUSA navet API — hämtar första sidan med HS + YH och loggar rådata.
 * Inget sparas till Supabase. Syfte: bekräfta att rätt utbildningar syns.
 *
 * Kör:
 *   node supabase/fetch-susa-test.js
 *
 * Byt SUSA_BASE_URL till den URL du hittade i Skolverkets API-docs.
 */

// ⚠️ Fyll i rätt bas-URL från SUSA navet API-dokumentationen
const SUSA_BASE_URL = 'https://SUSA_NAVET_URL_HÄR/educationEvents';

const PAGE_SIZE = 20; // liten för test

async function fetchPage(schoolTypes, page = 0) {
  const typeParams = schoolTypes.map(t => `schoolType=${t}`).join('&');
  const url = `${SUSA_BASE_URL}?${typeParams}&page=${page}&size=${PAGE_SIZE}`;

  console.log(`\n📡 Anropar: ${url}\n`);

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
  }

  return res.json();
}

async function main() {
  console.log('🔍 SUSA navet — testköring (ingen Supabase-skrivning)\n');

  let data;
  try {
    data = await fetchPage(['HS', 'YH'], 0);
  } catch (e) {
    console.error('❌ API-anrop misslyckades:', e.message);
    process.exit(1);
  }

  // Visa paginerings-info
  const pageInfo = data.page || {};
  console.log('📊 Paginering:');
  console.log(`   totalElements : ${pageInfo.totalElements ?? '?'}`);
  console.log(`   totalPages    : ${pageInfo.totalPages ?? '?'}`);
  console.log(`   pageSize      : ${pageInfo.size ?? PAGE_SIZE}`);

  const events = data.educationEvents || [];
  console.log(`\n✅ Antal utbildningar på sida 0: ${events.length}`);

  if (events.length === 0) {
    console.log('\n⚠ Inga event returnerades. Kontrollera URL och schoolType-paramrar.');
    console.log('Råsvar:', JSON.stringify(data).slice(0, 800));
    return;
  }

  // Visa tillgängliga toppfält
  const firstContent = events[0]?.content || events[0] || {};
  console.log('\n🔑 Fält i content:', Object.keys(firstContent).join(', '));

  // Visa de 5 första utbildningarna
  console.log('\n--- 5 första utbildningarna ---\n');
  for (const ev of events.slice(0, 5)) {
    const c = ev.content || ev;

    const title   = getLangValue(c.title)   || '(inget namn)';
    const city    = c.locations?.[0]?.town  || '(ingen stad)';
    const pace    = c.paceOfStudy?.percentage != null ? `${c.paceOfStudy.percentage}%` : '?';
    const start   = c.execution?.start      || '?';
    const end     = c.execution?.end        || '?';
    const url     = getLangValue(c.url, 'urls', 'value') || '(ingen url)';
    const schoolType = detectSchoolType(c);

    console.log(`[${schoolType}] ${title}`);
    console.log(`  Stad      : ${city}`);
    console.log(`  Studietakt: ${pace}`);
    console.log(`  Period    : ${start} → ${end}`);
    console.log(`  URL       : ${url}`);
    console.log(`  Provider  : ${c.providers?.join(', ') || '?'}`);
    console.log(`  id        : ${ev.id}`);
    console.log();
  }

  // Råstruktur på första posten — för felsökning
  console.log('--- Råstruktur (första posten, komprimerad) ---');
  console.log(JSON.stringify(events[0], null, 2).slice(0, 2000));
}

// Hjälp: plocka ut sv-värde ur {strings:[{lang,value}]} eller {urls:[{lang,value}]}
function getLangValue(obj, arrayKey = 'strings', valueKey = 'value', preferLang = 'sv') {
  if (!obj) return null;
  const arr = obj[arrayKey] || obj.strings || obj.urls || [];
  const sv  = arr.find(s => s.lang === preferLang);
  return (sv || arr[0])?.[valueKey] || null;
}

function detectSchoolType(content) {
  // SUSA navet lägger HS-extensions i extensions[1], YH saknar det
  const exts = content.extensions || [];
  const hasHsExt = exts.some(e => e.admissionDetails || e.applicationDetails);
  return hasHsExt ? 'HS' : 'YH';
}

main().catch(e => {
  console.error('❌ Oväntat fel:', e.message);
  process.exit(1);
});
