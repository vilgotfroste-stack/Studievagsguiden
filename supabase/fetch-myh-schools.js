/**
 * fetch-myh-schools.js
 * =====================
 * Hämtar YH-utbildningar från Skolverkets officiella API och importerar till Supabase.
 *
 * API: https://api.skolverket.se/planned-educations/v4/adult-education-events?typeOfSchool=yhprogram
 * Hämtar ALLA ~2582 program i bulk, matchar mot EDU_MAP och infogar i Supabase.
 *
 * Kör lokalt (Node 18+ rekommenderas):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="din_nyckel_här"; node supabase/fetch-myh-schools.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=din_nyckel_här node supabase/fetch-myh-schools.js
 *
 * Sätt SUPABASE_SERVICE_KEY till service_role-nyckeln från
 * Supabase → Settings → API (INTE anon-nyckeln).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SKOLVERKET_BASE = 'https://api.skolverket.se/planned-educations/v4/adult-education-events';
const SKOLVERKET_HEADERS = {
  'Accept': 'application/vnd.skolverket.plannededucations.api.v4.hal+json',
  'User-Agent': 'Mozilla/5.0',
};
const PAGE_SIZE = 100;

// ---------------------------------------------------------------
// Mappning: interna education_ids → nyckelord mot programtitlar
// ---------------------------------------------------------------
const EDU_MAP = [
  // IT & Tech
  { ids: [1],  label: 'Systemutvecklare/Webbutvecklare',
    keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'webbutvecklare', 'programmerare', 'fullstack', 'backend', 'frontend', 'applikationsutvecklare', '.net', 'java', 'python'] },
  { ids: [2],  label: 'Dataanalytiker/BI',
    keywords: ['dataanalytiker', 'data analytics', 'business intelligence', 'bi-utvecklare', 'dataingenjör', 'machine learning', 'ai-ingenjör', 'data science', 'datavetenskap'] },
  { ids: [3],  label: 'IT-säkerhetsspecialist',
    keywords: ['it-säkerhet', 'cybersecurity', 'informationssäkerhet', 'säkerhetsanalytiker', 'nätverkssäkerhet', 'penetrationstest', 'cyber security'] },
  { ids: [4],  label: 'UX/UI-designer',
    keywords: ['ux', 'ux-designer', 'ui-designer', 'användarupplevelse', 'interaktionsdesign', 'digital design', 'tjänstedesign', 'webdesign'] },
  { ids: [5],  label: 'Spelutvecklare',
    keywords: ['spelutvecklare', 'game developer', 'speldesign', 'spelindustrin', 'game design'] },
  { ids: [7],  label: 'DevOps/Molnspecialist',
    keywords: ['devops', 'cloud', 'molntjänster', 'driftekniker', 'infrastruktur', 'kubernetes', 'aws', 'azure', 'systemadministratör', 'nätverkstekniker'] },

  // Ekonomi & Juridik
  { ids: [9],  label: 'Redovisningsekonom',
    keywords: ['redovisningsekonom', 'redovisning', 'bokföring', 'löneadministratör', 'lönespecialist', 'ekonomiassistent', 'ekonomi'] },
  { ids: [10], label: 'Controller',
    keywords: ['controller', 'ekonomistyrning', 'business controller', 'finansanalytiker', 'financial controller'] },
  { ids: [8],  label: 'Jurist',
    keywords: ['jurist', 'paralegal', 'rättsvetenskap', 'juridik'] },

  // Ledarskap & HR
  { ids: [11], label: 'Kommunikatör/PR',
    keywords: ['kommunikatör', 'pr', 'informatör', 'kommunikation', 'copywriter', 'innehållsstrateg'] },
  { ids: [12], label: 'HR-specialist',
    keywords: ['hr', 'personalarbete', 'human resources', 'personalvetare', 'personalutvecklare'] },
  { ids: [13], label: 'Projektledare',
    keywords: ['projektledare', 'projektledning', 'agil', 'scrum', 'projektkoordinator', 'förändringsledning'] },

  // Digital marknadsföring
  { ids: [6],  label: 'Digital marknadsförare',
    keywords: ['digital marknadsföring', 'marknadsförare', 'content marketing', 'sociala medier', 'seo', 'e-handel', 'growth hacker'] },

  // Bygg & Fastighet
  { ids: [25], label: 'Fastighetsmäklare/Förvaltare',
    keywords: ['fastighetsförvaltare', 'fastighet', 'fastighetsteknik', 'fastighetsmäklare', 'fastighetsadministration'] },
  { ids: [26], label: 'VVS-ingenjör',
    keywords: ['vvs', 'ventilation', 'rörläggare', 'energiingenjör', 'vvs-tekniker', 'energispecialist', 'installationsteknik'] },

  // Industri & Teknik
  { ids: [27], label: 'Automationsingenjör',
    keywords: ['automation', 'automationsingenjör', 'plc', 'robotik', 'automationstekniker', 'industriautomation', 'mekatronik'] },
  { ids: [28], label: 'Elektriker/Elkraft',
    keywords: ['elektriker', 'elkraft', 'elteknik', 'elinstallation', 'elmontör'] },
  { ids: [29], label: 'Logistiker',
    keywords: ['logistiker', 'logistik', 'supply chain', 'transportledning', 'inköpare', 'inköp och logistik'] },

  // Vård & Omsorg
  { ids: [14], label: 'Sjuksköterska/Vård',
    keywords: ['sjuksköterska', 'undersköterska', 'vård och omsorg', 'sjukvård', 'hälso- och sjukvård', 'specialistsjuksköterska'] },
  { ids: [15], label: 'Tandhygienist',
    keywords: ['tandhygienist', 'dental', 'tandvård', 'tandsköterska'] },

  // Pedagogik & Samhälle
  { ids: [16], label: 'Lärare/Förskollärare',
    keywords: ['lärare', 'förskollärare', 'pedagog', 'utbildningsledare', 'fritidspedagog'] },
  { ids: [17], label: 'Socionom/Socialt arbete',
    keywords: ['socionom', 'socialt arbete', 'socialsekreterare', 'behandlingspedagog', 'socialpedagog'] },

  // Kreativa yrken
  { ids: [18], label: 'Grafisk designer',
    keywords: ['grafisk design', 'grafisk designer', 'visuell kommunikation', 'art director'] },
  { ids: [19], label: 'Fotograf/Film',
    keywords: ['fotograf', 'filmproduktion', 'rörlig bild', 'media och kommunikation', 'film och tv'] },

  // Besöksnäring
  { ids: [20], label: 'Kock/Restaurang',
    keywords: ['kock', 'restaurang', 'livsmedelsteknolog', 'konditor', 'gastronomi'] },
  { ids: [21], label: 'Eventkoordinator',
    keywords: ['eventkoordinator', 'event', 'mötesbranschen', 'konferens', 'turism'] },

  // Miljö & Hållbarhet
  { ids: [22], label: 'Miljösamordnare',
    keywords: ['miljösamordnare', 'hållbarhet', 'miljö', 'klimat', 'cirkulär ekonomi'] },

  // Handel
  { ids: [23], label: 'Butikschef/Detaljhandel',
    keywords: ['butikschef', 'detaljhandel', 'retail', 'handelsadministration'] },
  { ids: [24], label: 'Inköpare',
    keywords: ['inköpare', 'upphandlare', 'upphandling', 'kategorichef'] },
];

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

function normalizeCity(cityStr) {
  if (!cityStr) return null;
  const c = cityStr.toLowerCase().trim();
  if (c.includes('stockholm'))                          return 'stockholm';
  if (c.includes('göteborg') || c.includes('goteborg')) return 'goteborg';
  if (c.includes('malmö') || c.includes('malmo'))       return 'malmo';
  if (c.includes('linköping') || c.includes('linkoping')) return 'linkoping';
  if (c.includes('örebro') || c.includes('orebro'))     return 'orebro';
  if (c.includes('umeå') || c.includes('umea'))         return 'umea';
  if (c.includes('västerås') || c.includes('vasteras')) return 'vasteras';
  if (c.includes('helsingborg'))                         return 'helsingborg';
  if (c.includes('norrköping') || c.includes('norrkoping')) return 'norrkoping';
  if (c.includes('jönköping') || c.includes('jonkoping')) return 'jonkoping';
  if (c.includes('lund'))                               return 'lund';
  if (c.includes('sundsvall'))                          return 'sundsvall';
  if (c.includes('gävle'))                              return 'gavle';
  if (c.includes('borås'))                              return 'boras';
  if (c.includes('distans') || c.includes('online') || c.includes('internet')) return 'distans';
  return cityStr.trim().toLowerCase();
}

function mapStudyModeFromDistance(distance) {
  // Skolverket: distance är boolean (true = distans, false = campus)
  if (distance === true || distance === 'true') return 'distance';
  return 'campus';
}

function mapStudyPaceFromPace(paceOfStudy) {
  // Skolverket: paceOfStudy är troligen ett heltal, t.ex. 100, 75, 50
  const p = parseInt(paceOfStudy, 10);
  if (!isNaN(p) && p < 100) return 'parttime';
  if (typeof paceOfStudy === 'string') {
    const s = paceOfStudy.toLowerCase();
    if (s.includes('deltid') || s.includes('50') || s.includes('75')) return 'parttime';
  }
  return 'fulltime';
}

function matchesKeywords(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.some(kw => t.includes(kw.toLowerCase()));
}

function assignEducationIds(programName) {
  const matched = [];
  for (const mapping of EDU_MAP) {
    if (matchesKeywords(programName, mapping.keywords)) {
      matched.push(...mapping.ids);
    }
  }
  return [...new Set(matched)];
}

// ---------------------------------------------------------------
// Skolverket API-hämtning (HAL+JSON, paginerad)
// ---------------------------------------------------------------

async function fetchSkolverketPage(pageIndex) {
  const url = `${SKOLVERKET_BASE}?typeOfSchool=yhprogram&page=${pageIndex}&size=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: SKOLVERKET_HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Skolverket API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllFromSkolverket() {
  console.log('📡 Hämtar sida 0...');
  const firstRaw = await fetchSkolverketPage(0);

  // API svarar med { status, message, body: { _embedded: { listedAdultEducationEvents: [...] }, page: {...} } }
  const firstPage = firstRaw.body || firstRaw;

  const embedded = firstPage._embedded || {};
  const embeddedKey = Object.keys(embedded).find(k =>
    k.includes('event') || k.includes('education') || k.includes('adult') || k.includes('listed')
  );
  if (!embeddedKey) {
    console.log('   Råsvar:', JSON.stringify(firstRaw).slice(0, 600));
    throw new Error('Kunde inte hitta rätt nyckel i _embedded. Se råsvar ovan.');
  }

  const items = embedded[embeddedKey];
  const allItems = [...items];

  const pageInfo = firstPage.page || {};
  const totalElements = pageInfo.totalElements || items.length;
  const totalPages = pageInfo.totalPages || Math.ceil(totalElements / PAGE_SIZE) || 1;

  console.log(`   Totalt: ${totalElements} program, ${totalPages} sidor`);

  // Hämta resterande sidor
  for (let p = 1; p < totalPages; p++) {
    process.stdout.write(`   Sida ${p + 1}/${totalPages}... `);
    await new Promise(r => setTimeout(r, 200));
    try {
      const raw = await fetchSkolverketPage(p);
      const pageData = raw.body || raw;
      const pageItems = (pageData._embedded || {})[embeddedKey] || [];
      allItems.push(...pageItems);
      console.log(`${pageItems.length} st`);
    } catch (e) {
      console.log(`\n   ⚠ Sida ${p} misslyckades: ${e.message}`);
    }
  }

  return allItems;
}

// ---------------------------------------------------------------
// Konvertera Skolverket-objekt till yh_schools-struktur
// ---------------------------------------------------------------
function skolverketToSchool(edu, eduIds) {
  // Fälten från Skolverket (baserat på bekräftad API-spec)
  const schoolName  = edu.providerName  || 'Okänd skola';
  const programName = edu.titleSv       || edu.title || 'Okänt program';
  const cityRaw     = edu.town          || edu.municipality || '';
  const city        = normalizeCity(cityRaw);
  const myhId       = String(edu.educationEventId || edu.id || Math.random());

  const studyMode   = mapStudyModeFromDistance(edu.distance);
  const studyPace   = mapStudyPaceFromPace(edu.paceOfStudy);

  // Startdatum från semesterStartFrom, t.ex. "2025-08-25" → "HT2025"
  let startDates = [];
  const rawDate = edu.semesterStartFrom || edu.startDate || edu.startFrom;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        startDates = [(d.getMonth() < 6 ? 'VT' : 'HT') + d.getFullYear()];
      }
    } catch {}
  }

  // Längd / poäng
  const credits = edu.credits;
  const durationText = credits ? `${credits} YH-poäng` : null;

  return {
    school_name:   schoolName,
    program_name:  programName,
    website_url:   null,  // Skolverket ger ej URL direkt
    city:          city,
    study_mode:    studyMode,
    study_pace:    studyPace,
    fee:           0,     // YH är alltid avgiftsfri
    start_dates:   startDates,
    duration_text: durationText,
    education_ids: eduIds,
    myh_id:        myhId,
    myh_area:      null,
    active:        true,
  };
}

// ---------------------------------------------------------------
// Supabase upsert (batchar om 50)
// ---------------------------------------------------------------
async function upsertSchools(schools) {
  if (schools.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
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
  console.log('🚀 Startar YH-import från Skolverkets API...\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('❌ Sätt miljövariabeln SUPABASE_SERVICE_KEY!');
    console.error('   Supabase → Settings → API → service_role');
    console.error('\n   PowerShell:');
    console.error('   $env:SUPABASE_SERVICE_KEY="din_nyckel_här"; node supabase/fetch-myh-schools.js');
    process.exit(1);
  }

  // Hämta alla program från Skolverket
  let allPrograms;
  try {
    allPrograms = await fetchAllFromSkolverket();
    console.log(`\n✅ Hämtade ${allPrograms.length} program totalt\n`);
  } catch (e) {
    console.error('❌ Skolverket API misslyckades:', e.message);
    process.exit(1);
  }

  // Logga ett exempelfält så vi ser faktiska fältnamn
  if (allPrograms.length > 0) {
    console.log('🔍 Exempelpost (fält):', Object.keys(allPrograms[0]).join(', '));
    console.log('   Exempelpost (värden):', JSON.stringify(allPrograms[0]).slice(0, 300), '\n');
  }

  // Matcha program mot EDU_MAP
  let matched = 0;
  let unmatched = 0;
  const schools = [];

  for (const edu of allPrograms) {
    const title = edu.titleSv || edu.title || '';
    const eduIds = assignEducationIds(title);

    if (eduIds.length > 0) {
      schools.push(skolverketToSchool(edu, eduIds));
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`📊 Matchning:`);
  console.log(`   Matchade:   ${matched} program (läggs in i Supabase)`);
  console.log(`   Omatchade:  ${unmatched} program (hoppar över)\n`);

  if (schools.length === 0) {
    console.log('⚠ Inga matchade utbildningar. Kontrollera exempelposten ovan — fältnamnen kan skilja sig.');
    return;
  }

  // Importera i batchar
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    await upsertSchools(batch);
    inserted += batch.length;
    process.stdout.write(`📥 ${inserted}/${schools.length}... `);
  }

  console.log('\n\n🎉 Import klar!');
  console.log('   Verifiera i Supabase → Table Editor → yh_schools');
  console.log(`   Totalt importerade: ${schools.length} matchade utbildningar av ${allPrograms.length} totalt`);

  console.log('\n📊 Fördelning per kategori:');
  for (const mapping of EDU_MAP) {
    const count = schools.filter(s => s.education_ids.some(id => mapping.ids.includes(id))).length;
    if (count > 0) console.log(`   ${mapping.label}: ${count}`);
  }
}

main().catch(e => {
  console.error('❌ Oväntat fel:', e.message);
  process.exit(1);
});
