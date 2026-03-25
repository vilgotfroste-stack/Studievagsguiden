/**
 * fetch-myh-schools.js (v2)
 * ==========================
 * Hämtar YH-utbildningar från Skolverket Susa-navet API (v4) och importerar till Supabase.
 *
 * API: https://api.skolverket.se/planned-educations/v4/adult-education-events
 * Filter: typeOfSchool=yhprogram
 * Header: Accept: application/vnd.skolverket.plannededucations.api.v4.hal+json
 *
 * Kör lokalt (Node 18+ rekommenderas):
 *   SUPABASE_SERVICE_KEY=xxx node fetch-myh-schools.js
 *
 * Sätt SUPABASE_SERVICE_KEY till service_role-nyckeln från
 * Supabase > Settings > API (INTE anon-nyckeln).
 *
 * Obs: Kör `TRUNCATE yh_schools CASCADE;` i Supabase SQL-editorn
 * innan du kör detta skript för att rensa gammal data.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SKOLVERKET_BASE = 'https://api.skolverket.se/planned-educations/v4/adult-education-events';
const SKOLVERKET_HEADERS = {
  'Accept': 'application/vnd.skolverket.plannededucations.api.v4.hal+json',
};
const PAGE_SIZE = 100;

// ---------------------------------------------------------------
// Mappning: interna education_ids → sökord mot programtitlar
//
// ID-referens (från E-arrayen i HTML-filerna):
//   1  Systemutvecklare       (both: YH + Uni)
//   2  Dataanalytiker         (yh)
//   3  IT-säkerhetsspecialist (both: YH + Uni)
//   4  UX-designer            (yh)
//   7  DevOps / Cloud engineer(yh)
//   9  Redovisningsekonom     (yh)
//  10  Controller             (yh)
//  11  Digital marknadsförare (yh)
//  12  HR-specialist          (both: YH + Uni)
//  13  Projektledare          (yh)
//  25  Fastighetsförvaltare   (both: YH + Uni)
//  26  VVS-ingenjör           (yh)
//  27  Automationsingenjör    (yh)
// ---------------------------------------------------------------
const EDU_MAP = [
  // IT & Tech
  { ids: [1], label: 'Systemutvecklare',
    keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'applikationsutvecklare',
               '.net utvecklare', '.net cloud', 'java-utvecklare', 'programutvecklare'] },
  { ids: [1, 9, 10, 11], label: 'Webbutvecklare',
    keywords: ['webbutvecklare', 'webapplikationsutvecklare', 'fullstack', 'fullstackutvecklare',
               'backendutvecklare', 'frontendutvecklare'] },
  { ids: [2], label: 'Dataanalytiker',
    keywords: ['dataanalytiker', 'data analytics', 'business intelligence', 'BI-',
               'data engineer', 'dataingenjör', 'machine learning', 'AI-ingenjör', 'AI engineer',
               'systemvetare data'] },
  { ids: [3], label: 'IT-säkerhetsspecialist',
    keywords: ['IT-säkerhet', 'cybersecurity', 'informationssäkerhet', 'säkerhetsanalytiker',
               'nätverkssäkerhet', 'penetrationstest', 'cyber security', 'säkerhetsspecialist'] },
  { ids: [4], label: 'UX-designer',
    keywords: ['ux-designer', 'ux designer', 'ui-designer', 'användarupplevelse',
               'interaktionsdesign', 'tjänstedesign', 'service design', 'digital design'] },
  { ids: [7], label: 'DevOps / Cloud engineer',
    keywords: ['devops', 'cloud developer', 'cloud engineer', 'molnspecialist',
               'driftekniker', 'plattformsingenjör', 'site reliability', 'kubernetes',
               'molntjänster', 'nätverkstekniker', 'nätverksingenjör', 'IT-drift'] },

  // Ekonomi
  { ids: [9], label: 'Redovisningsekonom',
    keywords: ['redovisningsekonom', 'redovisning', 'löneadministratör', 'lönespecialist',
               'ekonomiassistent', 'löneadministration'] },
  { ids: [10], label: 'Controller',
    keywords: ['controller', 'business controller', 'finansanalytiker', 'ekonomistyrning',
               'financial controller'] },

  // Marknadsföring
  { ids: [11], label: 'Digital marknadsförare',
    keywords: ['digital marknadsföring', 'digital marknadsförare', 'content marketing',
               'sociala medier', 'e-handelsstrateg', 'growth hacker', 'seo specialist',
               'digital kommunikatör'] },

  // HR & Ledarskap
  { ids: [12], label: 'HR-specialist',
    keywords: ['HR-specialist', 'HR-generalist', 'personalarbete', 'human resources',
               'personalvetare', 'HR-koordinator', 'personaladministratör'] },
  { ids: [13], label: 'Projektledare',
    keywords: ['projektledare', 'projektledning', 'agil projektledare', 'scrum master',
               'projektkoordinator', 'förändringsledning'] },

  // Fastighet
  { ids: [25], label: 'Fastighetsförvaltare',
    keywords: ['fastighetsförvaltare', 'fastighetsadministration', 'fastighetsteknik',
               'förvaltare', 'fastighetsservice', 'fastighetsskötsel'] },

  // Teknik
  { ids: [26], label: 'VVS-ingenjör',
    keywords: ['VVS', 'VS-tekniker', 'energiingenjör', 'VVS-tekniker', 'installationsteknik',
               'rörteknik', 'rörläggare', 'kyl- och värmepumps'] },
  { ids: [27], label: 'Automationsingenjör',
    keywords: ['automation', 'automationsingenjör', 'PLC', 'robotik', 'automationstekniker',
               'industriautomation', 'mekatronik', 'reglerteknik'] },
];

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

function normalizeCity(raw) {
  if (!raw) return null;
  const c = String(raw).toLowerCase().trim();
  if (c.includes('stockholm'))                         return 'Stockholm';
  if (c.includes('göteborg') || c.includes('goteborg')) return 'Göteborg';
  if (c.includes('malmö') || c.includes('malmo'))      return 'Malmö';
  if (c.includes('linköping'))                         return 'Linköping';
  if (c.includes('örebro'))                            return 'Örebro';
  if (c.includes('umeå'))                              return 'Umeå';
  if (c.includes('västerås'))                          return 'Västerås';
  if (c.includes('helsingborg'))                       return 'Helsingborg';
  if (c.includes('norrköping'))                        return 'Norrköping';
  if (c.includes('jönköping'))                         return 'Jönköping';
  if (c.includes('lund'))                              return 'Lund';
  if (c.includes('borås'))                             return 'Borås';
  if (c.includes('sundsvall'))                         return 'Sundsvall';
  if (c.includes('gävle'))                             return 'Gävle';
  if (c.includes('distans') || c.includes('online'))   return 'Distans';
  // Kapitalisera första bokstaven
  return String(raw).trim().charAt(0).toUpperCase() + String(raw).trim().slice(1).toLowerCase();
}

function semesterLabel(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const month = d.getMonth() + 1; // 1–12
    const year  = d.getFullYear();
    return (month >= 8 ? 'HT' : 'VT') + year;
  } catch {
    return null;
  }
}

function matchesKeywords(title, keywords) {
  const t = (title || '').toLowerCase();
  return keywords.some(kw => t.includes(kw.toLowerCase()));
}

function assignEducationIds(title) {
  const ids = new Set();
  for (const mapping of EDU_MAP) {
    if (matchesKeywords(title, mapping.keywords)) {
      mapping.ids.forEach(id => ids.add(id));
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}

function skolverketToSchool(event) {
  const schoolName  = event.providerName   || 'Okänd skola';
  const programName = event.titleSv        || 'Okänt program';
  const cityRaw     = event.town           || event.municipality || '';
  const city        = normalizeCity(cityRaw);
  const municipality= event.municipality   || null;
  const myhId       = event.educationEventId;
  const studyMode   = event.distance === true ? 'distance' : 'campus';
  const pace        = parseFloat(event.paceOfStudy || '100');
  const studyPace   = (!isNaN(pace) && pace < 100) ? 'parttime' : 'fulltime';
  const credits     = event.credits ? parseInt(event.credits, 10) : null;
  const durationText= credits ? `${credits} YH-poäng` : null;

  const semLabel  = semesterLabel(event.semesterStartFrom);
  const startDates= semLabel ? [semLabel] : [];

  const educationIds = assignEducationIds(programName);

  return {
    school_name:   schoolName,
    program_name:  programName,
    website_url:   null,           // Inte tillgängligt i Susa-navet v4
    city:          city,
    municipality:  municipality,
    study_mode:    studyMode,
    study_pace:    studyPace,
    fee:           0,              // YH-utbildningar är alltid avgiftsfria
    start_dates:   startDates,
    duration_text: durationText,
    education_ids: educationIds,
    myh_id:        myhId,
    myh_area:      null,
    active:        true,
  };
}

// ---------------------------------------------------------------
// Skolverket API — hämta en sida med yhprogram
// ---------------------------------------------------------------
async function fetchSkolverketPage(page = 0) {
  const params = new URLSearchParams({
    typeOfSchool: 'yhprogram',
    size:  String(PAGE_SIZE),
    page:  String(page),
    sort:  'titleSv,asc',
  });
  const url = `${SKOLVERKET_BASE}?${params}`;

  const res = await fetch(url, {
    headers: SKOLVERKET_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Skolverket API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  // Respons-struktur: { status, message, body: { _embedded: { listedAdultEducationEvents: [...] }, page: { totalElements, totalPages } } }
  const body  = json.body || json;
  const items = body?._embedded?.listedAdultEducationEvents || [];
  const pageInfo = body?.page || {};

  return { items, totalPages: pageInfo.totalPages || 1, totalElements: pageInfo.totalElements || 0 };
}

// Hämta alla yhprogram
async function fetchAllYHPrograms() {
  const all = [];
  let page = 0;

  const first = await fetchSkolverketPage(0);
  all.push(...first.items);
  const { totalPages, totalElements } = first;

  console.log(`   API: ${totalElements} yhprogram-poster, ${totalPages} sidor`);

  for (page = 1; page < totalPages; page++) {
    const { items } = await fetchSkolverketPage(page);
    all.push(...items);
    process.stdout.write(`   Sida ${page + 1}/${totalPages} (${all.length}/${totalElements})...\r`);
    await new Promise(r => setTimeout(r, 150)); // paus
  }

  console.log(''); // ny rad
  return all;
}

// ---------------------------------------------------------------
// Supabase insert
// ---------------------------------------------------------------
async function insertSchools(schools) {
  if (schools.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(schools),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase insert error:', err.slice(0, 400));
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('Startar YH-import fran Skolverket Susa-navet API (v4)...\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('Satt miljovariabeln SUPABASE_SERVICE_KEY!');
    console.error('   Hitta den i Supabase > Settings > API > service_role');
    process.exit(1);
  }

  // Testa att API:et svarar
  console.log('Testar Skolverket API...');
  let allEvents;
  try {
    allEvents = await fetchAllYHPrograms();
    console.log(`API svarar — ${allEvents.length} yhprogram hämtade\n`);
  } catch (e) {
    console.error('Skolverket API svarar inte:', e.message);
    process.exit(1);
  }

  // Konvertera och filtrera — behåll bara poster som matchar minst ett education_id
  const schools = [];
  const skipped = [];

  for (const event of allEvents) {
    const school = skolverketToSchool(event);
    if (school.education_ids.length === 0) {
      skipped.push(school.program_name);
    } else {
      schools.push(school);
    }
  }

  console.log(`Totalt matchade: ${schools.length} utbildningar`);
  console.log(`Ej matchade (saknar nyckelord): ${skipped.length}\n`);

  if (schools.length === 0) {
    console.log('Inga utbildningar matchade. Kontrollera EDU_MAP-nyckelorden.');
    return;
  }

  // Importera i batchar om 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    await insertSchools(batch);
    inserted += batch.length;
    process.stdout.write(`Importerar... ${inserted}/${schools.length}\r`);
  }

  console.log('\nImport klar!');
  console.log('   Verifiera i Supabase > Table Editor > yh_schools');
  console.log(`   Totalt importerade: ${schools.length} utbildningar\n`);

  // Statistik per kategori
  console.log('Fordelning per utbildningskategori:');
  for (const mapping of EDU_MAP) {
    const count = schools.filter(s => s.education_ids.some(id => mapping.ids.includes(id))).length;
    if (count > 0) console.log(`   ${mapping.label}: ${count}`);
  }
}

main().catch(e => {
  console.error('Ovantat fel:', e.message);
  process.exit(1);
});
