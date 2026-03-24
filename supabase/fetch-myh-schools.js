/**
 * fetch-myh-schools.js
 * =====================
 * Hämtar YH-utbildningar från Skolverkets Susa-navet API v3
 * (api.skolverket.se/planned-educations) och importerar till Supabase.
 *
 * OBS: api.myh.se blockerar icke-browser-anrop. Använd Skolverket istället.
 * Docs: https://api.skolverket.se/planned-educations/swagger-ui/index.html
 *
 * Kör lokalt (Node 18+ rekommenderas):
 *   SUPABASE_SERVICE_KEY=xxx node fetch-myh-schools.js
 *
 * Sätter miljövariabeln SUPABASE_SERVICE_KEY (service_role-nyckeln från
 * Supabase > Settings > API — INTE anon-nyckeln).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const SKOLVERKET_BASE = 'https://api.skolverket.se/planned-educations/v3';
const ACCEPT_HEADER = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';
const PAGE_SIZE = 100;

// ---------------------------------------------------------------
// Mappning: våra interna education_ids → sökord
// Används för att matcha Skolverkets utbildningsnamn mot våra yrken
// ---------------------------------------------------------------
const EDU_MAP = [
  { ids: [1],  keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'webbutvecklare', 'programmerare'] },
  { ids: [2],  keywords: ['dataanalytiker', 'data analytics', 'business intelligence'] },
  { ids: [3],  keywords: ['IT-säkerhet', 'cybersecurity', 'informationssäkerhet', 'säkerhetsanalytiker'] },
  { ids: [4],  keywords: ['UX', 'UX/UI', 'användarupplevelse', 'interaktionsdesign', 'gränssnitt'] },
  { ids: [7],  keywords: ['DevOps', 'cloud', 'molntjänster', 'driftekniker', 'infrastruktur'] },
  { ids: [9],  keywords: ['redovisningsekonom', 'redovisning', 'bokföring', 'löneadministratör'] },
  { ids: [10], keywords: ['controller', 'ekonomistyrning'] },
  { ids: [11], keywords: ['digital marknadsföring', 'marknadsförare', 'e-handel', 'content'] },
  { ids: [12], keywords: ['HR', 'personalarbete', 'human resources', 'personalvetare'] },
  { ids: [13], keywords: ['projektledare', 'projektledning', 'agil', 'scrum'] },
  { ids: [25], keywords: ['fastighetsförvaltare', 'fastighet', 'fastighetsteknik'] },
  { ids: [26], keywords: ['VVS', 'ventilation', 'rörläggare', 'energiingenjör'] },
  { ids: [27], keywords: ['automation', 'automationsingenjör', 'PLC', 'robotik'] },
];

// Städer vi normaliserar till
const CITY_MAP = {
  stockholm: ['stockholm'],
  goteborg: ['göteborg', 'goteborg', 'gothenburg'],
  malmo: ['malmö', 'malmo'],
  linkoping: ['linköping', 'linkoping'],
  orebro: ['örebro', 'orebro'],
  umea: ['umeå', 'umea'],
};

function normalizeCity(ort) {
  if (!ort) return null;
  const o = ort.toLowerCase().trim();
  for (const [key, variants] of Object.entries(CITY_MAP)) {
    if (variants.some(v => o.includes(v))) return key;
  }
  if (o.includes('distans')) return 'distans';
  return ort.trim();
}

// Matcha Skolverkets studieform mot vår
function mapStudyMode(forms) {
  if (!forms || forms.length === 0) return 'campus';
  const f = forms.map(x => (x.code || x.name || x).toLowerCase()).join(' ');
  if (f.includes('distans')) return 'distance';
  if (f.includes('hybrid') || f.includes('kombination')) return 'hybrid';
  return 'campus';
}

// Matcha studietakt
function mapStudyPace(pace) {
  if (!pace) return 'fulltime';
  const p = String(pace).toLowerCase();
  if (p.includes('deltid') || p.includes('50') || p.includes('75')) return 'parttime';
  return 'fulltime';
}

// Kontrollera om ett utbildningsnamn matchar våra nyckelord
function matchesKeywords(name, keywords) {
  const n = (name || '').toLowerCase();
  return keywords.some(kw => n.includes(kw.toLowerCase()));
}

// Hämta en sida YH-utbildningar från Skolverket
async function fetchPage(page = 0) {
  const url = `${SKOLVERKET_BASE}/school-units?schoolForm=YH&page=${page}&size=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: {
      'Accept': ACCEPT_HEADER,
      'User-Agent': 'Studievagsguiden/1.0 (https://studievagsguiden.se)',
    }
  });
  if (!res.ok) throw new Error(`Skolverket API: HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// Hämta utbildningstillfällen för en skolenhet
async function fetchEducations(schoolUnitCode) {
  const url = `${SKOLVERKET_BASE}/school-units/${schoolUnitCode}/courses?schoolForm=YH`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': ACCEPT_HEADER }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data._embedded?.courses || data.courses || data || [];
  } catch {
    return [];
  }
}

// Konvertera Skolverket-objekt till vår yh_schools-struktur
function skolverketToSchool(item, course, eduIds) {
  const schoolName  = item.name || item.unitName || 'Okänd skola';
  const programName = course.subjectName || course.name || course.courseName || 'Okänt program';
  const city        = normalizeCity(item.municipality?.name || item.postalAddress?.city || item.ort);
  const studyMode   = mapStudyMode(course.studyForms || course.forms);
  const studyPace   = mapStudyPace(course.studyPace || course.pace || course.extent);
  const fee         = parseInt(course.fee || course.cost || 0) || 0;
  const websiteUrl  = item.webAddress || item.url || item.website || null;
  const myhId       = String(course.code || course.id || item.code || item.unitCode || '');
  const duration    = course.duration || course.studyPeriod || null;

  // Startdatum
  let startDates = [];
  if (course.startDate) {
    const d = new Date(course.startDate);
    if (!isNaN(d)) {
      startDates.push((d.getMonth() < 6 ? 'VT' : 'HT') + d.getFullYear());
    }
  }
  if (course.startDates && Array.isArray(course.startDates)) {
    course.startDates.forEach(sd => {
      const d = new Date(sd);
      if (!isNaN(d)) startDates.push((d.getMonth() < 6 ? 'VT' : 'HT') + d.getFullYear());
    });
  }
  startDates = [...new Set(startDates)];

  return {
    school_name:   schoolName,
    program_name:  programName,
    website_url:   websiteUrl,
    city:          city,
    study_mode:    studyMode,
    study_pace:    studyPace,
    fee:           fee,
    start_dates:   startDates,
    duration_text: duration,
    education_ids: eduIds,
    myh_id:        myhId,
    myh_area:      course.educationalArea || course.area || null,
    active:        true,
  };
}

// Upsert till Supabase
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
    console.error('Supabase insert error:', await res.text());
  }
}

// ---------------------------------------------------------------
// Alternativ: enkel sökning direkt mot Skolverket med q-parameter
// ---------------------------------------------------------------
async function fetchBySearch(query) {
  // Skolverket stöder /v3/courses?schoolForm=YH&q=...
  const url = `${SKOLVERKET_BASE}/courses?schoolForm=YH&q=${encodeURIComponent(query)}&size=${PAGE_SIZE}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': ACCEPT_HEADER }
    });
    if (!res.ok) {
      // Fallback: prova utan q-parameter och filtrera manuellt
      return { courses: [], query };
    }
    const data = await res.json();
    const courses = data._embedded?.courses || data.courses || [];
    return { courses, query };
  } catch (e) {
    console.warn(`  ⚠ Sökning "${query}": ${e.message}`);
    return { courses: [], query };
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('🚀 Startar YH-import från Skolverket Susa-navet API v3...\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('❌ Sätt SUPABASE_SERVICE_KEY miljövariabeln!');
    console.error('   Hitta den i Supabase > Settings > API > service_role');
    process.exit(1);
  }

  const allSchools = new Map(); // myh_id+school_name → school object

  // Steg 1: Sök per utbildningskategori
  for (const mapping of EDU_MAP) {
    for (const keyword of mapping.keywords) {
      console.log(`🔍 Söker: "${keyword}"...`);
      const { courses } = await fetchBySearch(keyword);

      let added = 0;
      for (const course of courses) {
        const programName = course.subjectName || course.name || course.courseName || '';
        if (!matchesKeywords(programName, mapping.keywords)) continue;

        const schoolName = course.provider?.name || course.schoolUnit?.name || 'Okänd skola';
        const key = `${course.code || course.id || ''}_${schoolName}`;

        if (allSchools.has(key)) {
          const existing = allSchools.get(key);
          existing.education_ids = [...new Set([...existing.education_ids, ...mapping.ids])];
        } else {
          // Bygg ett förenklat school-objekt direkt från course-data
          const city = normalizeCity(
            course.provider?.municipality?.name ||
            course.municipality?.name ||
            course.city
          );
          allSchools.set(key, {
            school_name:   schoolName,
            program_name:  programName,
            website_url:   course.provider?.webAddress || course.url || null,
            city:          city,
            study_mode:    mapStudyMode(course.studyForms || course.forms),
            study_pace:    mapStudyPace(course.studyPace || course.extent),
            fee:           parseInt(course.fee || 0) || 0,
            start_dates:   course.startDate
              ? [(new Date(course.startDate).getMonth() < 6 ? 'VT' : 'HT') + new Date(course.startDate).getFullYear()]
              : [],
            duration_text: course.duration || null,
            education_ids: [...mapping.ids],
            myh_id:        String(course.code || course.id || Math.random()),
            myh_area:      course.educationalArea || null,
            active:        true,
          });
          added++;
        }
      }
      console.log(`   → ${courses.length} träffar, ${added} nya utbildningar`);
      await new Promise(r => setTimeout(r, 100)); // paus mellan anrop
    }
  }

  const schools = Array.from(allSchools.values());
  console.log(`\n✅ Totalt ${schools.length} unika YH-utbildningar`);

  if (schools.length === 0) {
    console.log('\n⚠ Inga utbildningar hittades. Kontrollera att Skolverket API svarar.');
    console.log('  Prova: curl -H "Accept: application/vnd.skolverket.plannededucations.api.v3.hal+json" \\');
    console.log('    "https://api.skolverket.se/planned-educations/v3/courses?schoolForm=YH&size=5"');
    return;
  }

  // Importera i batchar
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    await upsertSchools(batch);
    inserted += batch.length;
    console.log(`📥 Importerade ${inserted}/${schools.length}...`);
  }

  console.log('\n🎉 Import klar!');
  console.log('Verifiera i Supabase: Table Editor → yh_schools');
}

main().catch(e => {
  console.error('❌ Fel:', e.message);
  process.exit(1);
});
