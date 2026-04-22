/**
 * fetch-susa-programs.js
 * ======================
 * Hämtar alla svenska HS- och YH-program från SUSA navet (Skolverket)
 * och upsert:ar till Supabase-tabellen yh_schools.
 *
 * Kör EFTER migrate-add-school-type.sql i Supabase SQL Editor.
 *
 * Mac/Linux:
 *   SUPABASE_SERVICE_KEY=xxx node supabase/fetch-susa-programs.js
 *
 * Windows PowerShell:
 *   $env:SUPABASE_SERVICE_KEY="xxx"; node supabase/fetch-susa-programs.js
 *
 * Flaggor:
 *   --dry-run   Hämtar och loggar men sparar inget till Supabase
 *   --hs-only   Hämtar bara HS (hoppar över YH)
 *   --yh-only   Hämtar bara YH (hoppar över HS)
 */

const SUPABASE_URL        = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';
const BASE                = 'https://api.skolverket.se/susa-navet/emil3';
const PAGE_SIZE           = 2000;
const DELAY_MS            = 200;

const DRY_RUN  = process.argv.includes('--dry-run');
const HS_ONLY  = process.argv.includes('--hs-only');
const YH_ONLY  = process.argv.includes('--yh-only');

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  return res.json();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function sv(obj, arrKey = 'strings') {
  const arr = obj?.[arrKey] || [];
  return (arr.find(s => s.lang === 'swe') || arr.find(s => s.lang === 'eng') || arr[0])?.value || null;
}

function startDateToTerm(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return (d.getMonth() < 6 ? 'VT' : 'HT') + d.getFullYear();
}

// ── Paginerad hämtning ────────────────────────────────────────────────────────

async function fetchAllPages(endpoint, arrayKey, label) {
  const all = [];
  let page = 0;

  process.stdout.write(`  ${label} sida 0...`);
  const first = await apiFetch(`${endpoint}&page=0&size=${PAGE_SIZE}`);
  const items = first[arrayKey] || [];
  all.push(...items);

  const totalPages = first.page?.totalPages || 1;
  const totalElements = first.page?.totalElements || items.length;
  console.log(` ${items.length} st (totalt ${totalElements})`);

  for (page = 1; page < totalPages; page++) {
    await delay(DELAY_MS);
    process.stdout.write(`  ${label} sida ${page + 1}/${totalPages}...`);
    try {
      const data = await apiFetch(`${endpoint}&page=${page}&size=${PAGE_SIZE}`);
      const pageItems = data[arrayKey] || [];
      all.push(...pageItems);
      console.log(` ${pageItems.length} st`);
    } catch (e) {
      console.log(` ⚠ Misslyckades: ${e.message}`);
    }
  }

  return all;
}

// ── Providers ─────────────────────────────────────────────────────────────────

async function fetchProviderMap(schoolTypes) {
  const map = new Map();
  for (const type of schoolTypes) {
    console.log(`\n📡 Hämtar providers (${type})...`);
    const providers = await fetchAllPages(
      `/educationProviders?schoolType=${type}`,
      'educationProviders',
      `Providers ${type}`
    );
    for (const p of providers) {
      if (p.id) map.set(p.id, p);
    }
  }
  console.log(`   Totalt unika providers: ${map.size}`);
  return map;
}

// ── EducationInfos ────────────────────────────────────────────────────────────

async function fetchInfoMap(schoolType) {
  console.log(`\n📡 Hämtar educationInfos (${schoolType})...`);
  const infos = await fetchAllPages(
    `/educationInfos?schoolType=${schoolType}`,
    'educationInfos',
    `Infos ${schoolType}`
  );

  const map = new Map();
  let skipped = 0;

  for (const info of infos) {
    const cfg = info.content?.configuration?.code;
    // HS: bara program. YH: ta allt (YH är alltid program-baserat)
    if (schoolType === 'HS' && cfg !== 'program') { skipped++; continue; }
    if (info.id) map.set(info.id, info);
  }

  if (schoolType === 'HS') {
    console.log(`   HS: ${map.size} program, ${skipped} kurser filtrerade bort`);
  } else {
    console.log(`   YH: ${map.size} utbildningar`);
  }

  return map;
}

// ── Events ────────────────────────────────────────────────────────────────────

async function fetchEvents(schoolType, infoMap) {
  console.log(`\n📡 Hämtar educationEvents (${schoolType})...`);
  const events = await fetchAllPages(
    `/educationEvents?schoolType=${schoolType}`,
    'educationEvents',
    `Events ${schoolType}`
  );

  const matched = events.filter(ev => infoMap.has(ev.content?.education));
  console.log(`   ${matched.length} av ${events.length} matchade mot program-infos`);
  return matched;
}

// ── Bygg rad ──────────────────────────────────────────────────────────────────

function buildRow(event, info, provider, schoolType) {
  const ec  = event.content  || {};
  const ic  = info?.content  || {};
  const pc  = provider?.content || {};
  const ext = ec.extensions?.find(e => e.type === 'UHEventExtension') || {};

  // Stad
  const cityRaw = sv(ec.locations?.[0]?.studyLocation) ||
                  pc.contactAddress?.town || null;

  // Studieform
  const isDistance = !!(ec.distance || ext.itdistance);
  const studyMode  = isDistance ? 'distance' : 'campus';

  // Studietakt
  const pace     = ec.paceOfStudy?.percentage;
  const studyPace = (pace && pace < 100) ? 'parttime' : 'fulltime';

  // Startdatum → term
  const startTerm = startDateToTerm(ec.execution?.start);
  const startDates = startTerm ? [startTerm] : [];

  // Avgift
  const feeExt = ext.tuitionFee;
  let fee = 0;
  if (feeExt?.value === true) fee = feeExt.total || feeExt.first || null;
  else if (feeExt?.value === false) fee = 0;

  // HP / YH-poäng
  const creditsVal = ic.credits?.credits || null;
  const creditsSystem = ic.credits?.system?.code || null;
  const isHP = creditsSystem === 'hp';

  // Beskrivning
  const description = sv(ic.description) || null;

  // Behörighet (råtext från HS-extension)
  const eligibilityModel = ext.admissionDetails?.eligibilityModelSB?.value || null;

  return {
    // Grundinfo
    school_name:              sv(pc.name) || 'Okänd skola',
    program_name:             sv(ic.title) || 'Okänt program',
    website_url:              sv(ec.url, 'urls') || sv(pc.url, 'urls') || null,
    contact_email:            pc.emailAddresses?.[0] || null,
    contact_phone:            sv(pc.phones?.[0]?.number) || null,

    // Plats
    city:                     cityRaw?.toLowerCase().trim() || null,
    municipality:             ec.locations?.[0]?.areaCode || null,

    // Studieform
    study_mode:               studyMode,
    study_pace:               studyPace,
    online:                   isDistance,

    // Avgift
    fee:                      fee ?? 0,

    // Datum
    start_dates:              startDates,

    // Längd
    duration_text:            creditsVal ? `${creditsVal} ${isHP ? 'hp' : 'YH-poäng'}` : null,
    credits:                  (!isHP && creditsVal) ? creditsVal : null,
    hp_credits:               (isHP  && creditsVal) ? creditsVal : null,
    pace_of_study:            pace || null,

    // Kategorier (tom för SUSA-import, fylls in separat)
    education_ids:            [],

    // Status
    active:                   !ec.isCancelled,
    eligible_for_student_aid: schoolType === 'YH' ? true : null,

    // Innehåll
    education_description:    description,
    requirements:             eligibilityModel,
    instruction_languages:    ec.languageOfInstructions || null,
    organizer_name:           sv(pc.name) || null,

    // SUSA navet-specifikt
    school_type:              schoolType,
    education_level:          ic.educationLevels?.[0]?.code || null,
    susa_event_id:            event.id,
    susa_education_id:        info?.id || null,

    // YH legacy
    myh_id:                   null,
    myh_area:                 null,
    areas_of_interest:        null,
    logo_url:                 null,
  };
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('\n  Supabase fel:', err.slice(0, 300));
  }
}

async function upsertAll(rows) {
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    await upsertBatch(rows.slice(i, i + BATCH));
    done += Math.min(BATCH, rows.length - i);
    process.stdout.write(`\r  💾 ${done}/${rows.length} sparade...`);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 SUSA navet — import av HS + YH program\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR' && !DRY_RUN) {
    console.error('❌ Sätt SUPABASE_SERVICE_KEY eller kör med --dry-run');
    process.exit(1);
  }

  if (DRY_RUN)  console.log('ℹ️  DRY-RUN — inget sparas till Supabase\n');
  if (HS_ONLY)  console.log('ℹ️  HS-ONLY — hoppar över YH\n');
  if (YH_ONLY)  console.log('ℹ️  YH-ONLY — hoppar över HS\n');

  const schoolTypes = HS_ONLY ? ['HS'] : YH_ONLY ? ['YH'] : ['HS', 'YH'];

  // 1. Providers
  const providerMap = await fetchProviderMap(schoolTypes);

  // 2. Infos + Events per schoolType
  const allRows = [];

  for (const type of schoolTypes) {
    const infoMap = await fetchInfoMap(type);
    const events  = await fetchEvents(type, infoMap);

    console.log(`\n🔧 Bygger rader för ${type}...`);
    for (const ev of events) {
      const info     = infoMap.get(ev.content?.education);
      const provId   = ev.content?.providers?.[0];
      const provider = providerMap.get(provId);
      allRows.push(buildRow(ev, info, provider, type));
    }
    console.log(`   ${allRows.length} rader totalt hittills`);
  }

  // 3. Statistik
  const hsCount = allRows.filter(r => r.school_type === 'HS').length;
  const yhCount = allRows.filter(r => r.school_type === 'YH').length;
  console.log(`\n📊 Sammanfattning:`);
  console.log(`   HS-program : ${hsCount}`);
  console.log(`   YH-program : ${yhCount}`);
  console.log(`   Totalt     : ${allRows.length}`);

  // 4. Visa 3 exempel
  console.log('\n🔍 Exempelrader:');
  for (const row of allRows.slice(0, 3)) {
    console.log(`  [${row.school_type}] ${row.program_name} — ${row.school_name} (${row.city || '?'})`);
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry-run klar — kör utan --dry-run för att spara');
    return;
  }

  // 5. Upsert
  console.log('\n💾 Sparar till Supabase...');
  await upsertAll(allRows);

  console.log('\n🎉 Import klar!');
  console.log(`   ${hsCount} HS-program + ${yhCount} YH-program importerade`);
  console.log('\n📌 Nästa steg:');
  console.log('   1. Verifiera i Supabase → Table Editor → yh_schools');
  console.log('   2. Om allt ser bra ut, kör i Supabase SQL Editor:');
  console.log('      DELETE FROM yh_schools WHERE susa_event_id IS NULL;');
  console.log('      (tar bort gamla YH-rader från gamla API:et)');
}

main().catch(e => {
  console.error('❌ Oväntat fel:', e.message);
  process.exit(1);
});
