/**
 * fetch-myh-schools.js
 * =====================
 * Hämtar YH-utbildningar från MYH:s officiella API och importerar till Supabase.
 *
 * MYH API: https://api.myh.se/Education/V1/GetEducations
 * Kräver browser-liknande headers (User-Agent, Referer, Origin).
 *
 * Kör lokalt (Node 18+ rekommenderas):
 *   SUPABASE_SERVICE_KEY=xxx node fetch-myh-schools.js
 *
 * Sätt SUPABASE_SERVICE_KEY till service_role-nyckeln från
 * Supabase > Settings > API (INTE anon-nyckeln).
 *
 * Valfritt: SUPABASE_URL om du har ett eget projekt
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';

const MYH_API_BASE = 'https://api.myh.se/Education/V1/GetEducations';
const PAGE_SIZE = 100;

// Browser-liknande headers — MYH blockerar utan dessa
const MYH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.myh.se/',
  'Origin': 'https://www.myh.se',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
};

// ---------------------------------------------------------------
// Mappning: interna education_ids (1–29) → sökord mot MYH
// ---------------------------------------------------------------
const EDU_MAP = [
  // IT & Tech
  { ids: [1],  label: 'Systemutvecklare/Webbutvecklare',
    keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'webbutvecklare', 'programmerare', 'fullstack', 'backend', 'frontend', 'applikationsutvecklare'] },
  { ids: [2],  label: 'Dataanalytiker/BI',
    keywords: ['dataanalytiker', 'data analytics', 'business intelligence', 'BI-utvecklare', 'dataingenjör', 'machine learning', 'AI-ingenjör'] },
  { ids: [3],  label: 'IT-säkerhetsspecialist',
    keywords: ['IT-säkerhet', 'cybersecurity', 'informationssäkerhet', 'säkerhetsanalytiker', 'nätverkssäkerhet', 'penetrationstest'] },
  { ids: [4],  label: 'UX/UI-designer',
    keywords: ['UX', 'UX-designer', 'UI-designer', 'användarupplevelse', 'interaktionsdesign', 'digital design', 'tjänstedesign'] },
  { ids: [5],  label: 'Spelutvecklare',
    keywords: ['spelutvecklare', 'game developer', 'speldesign', 'spelindustrin'] },
  { ids: [6],  label: 'Digital marknadsförare',
    keywords: ['digital marknadsföring', 'marknadsförare', 'content marketing', 'sociala medier', 'SEO', 'SEM', 'e-handel', 'growth'] },
  { ids: [7],  label: 'DevOps/Molnspecialist',
    keywords: ['DevOps', 'cloud', 'molntjänster', 'driftekniker', 'infrastruktur', 'Kubernetes', 'AWS', 'Azure', 'systemadministratör'] },

  // Ekonomi & Juridik
  { ids: [9],  label: 'Redovisningsekonom',
    keywords: ['redovisningsekonom', 'redovisning', 'bokföring', 'löneadministratör', 'lönespecialist', 'ekonomiassistent'] },
  { ids: [10], label: 'Controller',
    keywords: ['controller', 'ekonomistyrning', 'business controller', 'finansanalytiker', 'financial controller'] },
  { ids: [8],  label: 'Jurist',
    keywords: ['jurist', 'paralegal', 'rättsvetenskap', 'juridik'] },

  // Ledarskap & HR
  { ids: [12], label: 'HR-specialist',
    keywords: ['HR', 'personalarbete', 'human resources', 'personalvetare', 'personalutvecklare', 'arbetsgivarvarumärke'] },
  { ids: [13], label: 'Projektledare',
    keywords: ['projektledare', 'projektledning', 'agil', 'scrum', 'projektkoordinator', 'förändringsledning'] },

  // Bygg & Fastighet
  { ids: [25], label: 'Fastighetsmäklare/Förvaltare',
    keywords: ['fastighetsförvaltare', 'fastighet', 'fastighetsteknik', 'fastighetsmäklare', 'fastighetsadministration'] },
  { ids: [26], label: 'VVS-ingenjör',
    keywords: ['VVS', 'ventilation', 'rörläggare', 'energiingenjör', 'VVS-tekniker', 'energispecialist', 'installationsteknik'] },

  // Industri & Teknik
  { ids: [27], label: 'Automationsingenjör',
    keywords: ['automation', 'automationsingenjör', 'PLC', 'robotik', 'automationstekniker', 'industriautomation'] },
  { ids: [28], label: 'Elektriker/Elkraftsutbildning',
    keywords: ['elektriker', 'elkraft', 'elteknik', 'elinstallation', 'elmontör'] },
  { ids: [29], label: 'Logistiker',
    keywords: ['logistiker', 'logistik', 'supply chain', 'transportledning', 'inköpare', 'inköp och logistik'] },

  // Vård & Omsorg
  { ids: [14], label: 'Sjuksköterska/Vård',
    keywords: ['sjuksköterska', 'undersköterska', 'vård och omsorg', 'sjukvård', 'hälso- och sjukvård'] },
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
    keywords: ['kock', 'restaurang', 'livsmedelsteknolog', 'café', 'konditor', 'gastronomi'] },
  { ids: [21], label: 'Eventkoordinator',
    keywords: ['eventkoordinator', 'event', 'mötesbranschen', 'konferens', 'turism och resor'] },

  // Miljö & Hållbarhet
  { ids: [22], label: 'Miljösamordnare',
    keywords: ['miljösamordnare', 'hållbarhet', 'miljö', 'klimat', 'cirkulär ekonomi'] },

  // Handel
  { ids: [23], label: 'Butikschef/Detaljhandel',
    keywords: ['butikschef', 'detaljhandel', 'retail', 'handelsadministration', 'e-handel och handel'] },
  { ids: [24], label: 'Inköpare',
    keywords: ['inköpare', 'upphandlare', 'upphandling', 'kategorichef'] },

  // Kommunikation
  { ids: [11], label: 'Kommunikatör/PR',
    keywords: ['kommunikatör', 'PR', 'informatör', 'kommunikation', 'copywriter', 'innehållsstrateg'] },
];

// ---------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------

function normalizeCity(cityStr) {
  if (!cityStr) return null;
  const c = cityStr.toLowerCase().trim();
  if (c.includes('stockholm'))                      return 'stockholm';
  if (c.includes('göteborg') || c.includes('goteborg')) return 'goteborg';
  if (c.includes('malmö') || c.includes('malmo'))   return 'malmo';
  if (c.includes('linköping') || c.includes('linkoping')) return 'linkoping';
  if (c.includes('örebro') || c.includes('orebro')) return 'orebro';
  if (c.includes('umeå') || c.includes('umea'))     return 'umea';
  if (c.includes('västerås'))                       return 'vasteras';
  if (c.includes('helsingborg'))                    return 'helsingborg';
  if (c.includes('norrköping'))                     return 'norrkoping';
  if (c.includes('jönköping'))                      return 'jonkoping';
  if (c.includes('distans') || c.includes('online')) return 'distans';
  return cityStr.trim();
}

function mapStudyMode(myhEducation) {
  // MYH returnerar t.ex. StudyForms: ["Distans", "Campus"] eller liknande
  const forms = (myhEducation.StudyForms || myhEducation.studyForms || [])
    .map(f => (f.Name || f.name || f).toLowerCase());

  if (forms.some(f => f.includes('distans'))) {
    if (forms.some(f => f.includes('campus'))) return 'hybrid';
    return 'distance';
  }
  return 'campus';
}

function mapStudyPace(myhEducation) {
  // MYH: Pace, StudyPace, Extent — t.ex. 100 = heltid, 50/75 = deltid
  const pace = myhEducation.Pace || myhEducation.pace || myhEducation.StudyPace || 100;
  const p = parseInt(pace, 10);
  if (!isNaN(p) && p < 100) return 'parttime';
  const str = String(myhEducation.Pace || myhEducation.StudyPaceName || '').toLowerCase();
  if (str.includes('deltid') || str.includes('50') || str.includes('75')) return 'parttime';
  return 'fulltime';
}

function matchesKeywords(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.some(kw => t.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------
// MYH API-anrop
// ---------------------------------------------------------------

async function fetchMYHPage(query, pageIndex = 1) {
  const params = new URLSearchParams({
    Text: query,
    PageIndex: String(pageIndex),
    PageSize: String(PAGE_SIZE),
  });
  const url = `${MYH_API_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    headers: MYH_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MYH API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Hämta alla sidor för en sökning
async function fetchAllForQuery(query) {
  const results = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchMYHPage(query, page);
    // MYH svarar t.ex: { TotalCount, PageIndex, PageSize, Educations: [...] }
    const educations = data.Educations || data.educations || data.Items || data.items || [];
    results.push(...educations);

    const total = data.TotalCount || data.totalCount || 0;
    totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    page++;

    if (educations.length < PAGE_SIZE) break; // sista sidan
    await new Promise(r => setTimeout(r, 150)); // paus
  } while (page <= totalPages && page <= 10); // max 10 sidor per sökning

  return results;
}

// ---------------------------------------------------------------
// Konvertera MYH-objekt till vår yh_schools-struktur
// ---------------------------------------------------------------
function myhToSchool(edu, eduIds) {
  // MYH-fälten kan variera — vi försöker alla kända varianter
  const schoolName  = edu.ProviderName  || edu.providerName  || edu.SchoolName  || edu.schoolName  || 'Okänd skola';
  const programName = edu.EducationName || edu.educationName || edu.Name        || edu.name        || 'Okänt program';
  const cityRaw     = edu.Municipality  || edu.municipality  || edu.City        || edu.city        || '';
  const city        = normalizeCity(typeof cityRaw === 'object' ? cityRaw.Name || cityRaw.name : cityRaw);
  const websiteUrl  = edu.Url           || edu.url           || edu.Website     || edu.website     || null;
  const myhId       = String(edu.Id     || edu.id            || edu.EducationId || edu.educationId || Math.random());
  const fee         = parseInt(edu.Fee  || edu.fee           || 0)              || 0;
  const myhArea     = edu.EducationalAreaName || edu.educationalAreaName || edu.Area || null;

  const studyMode   = mapStudyMode(edu);
  const studyPace   = mapStudyPace(edu);

  // Startdatum
  let startDates = [];
  const rawDates = edu.StartDates || edu.startDates || (edu.StartDate ? [edu.StartDate] : []);
  for (const sd of rawDates) {
    try {
      const d = new Date(sd);
      if (!isNaN(d.getTime())) {
        startDates.push((d.getMonth() < 6 ? 'VT' : 'HT') + d.getFullYear());
      }
    } catch {}
  }
  startDates = [...new Set(startDates)];

  // Längd
  const duration = edu.Duration || edu.duration || edu.LengthText || edu.Points
    ? (edu.Points || edu.points ? `${edu.Points || edu.points} YH-poäng` : edu.Duration || edu.duration)
    : null;

  return {
    school_name:   schoolName,
    program_name:  programName,
    website_url:   websiteUrl,
    city:          city,
    study_mode:    studyMode,
    study_pace:    studyPace,
    fee:           fee,
    start_dates:   startDates,
    duration_text: duration || null,
    education_ids: eduIds,
    myh_id:        myhId,
    myh_area:      myhArea,
    active:        true,
  };
}

// ---------------------------------------------------------------
// Supabase upsert
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
    console.error('Supabase insert error:', err.slice(0, 300));
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('🚀 Startar YH-import från MYH:s officiella API...\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR') {
    console.error('❌ Sätt miljövariabeln SUPABASE_SERVICE_KEY!');
    console.error('   Hitta den i Supabase → Settings → API → service_role');
    process.exit(1);
  }

  // Verifiera att MYH API svarar
  console.log('🔌 Testar MYH API...');
  try {
    const test = await fetchMYHPage('systemutvecklare', 1);
    const count = test.TotalCount || test.totalCount || '?';
    console.log(`✅ MYH API svarar — TotalCount för "systemutvecklare": ${count}\n`);
  } catch (e) {
    console.error('❌ MYH API svarar inte:', e.message);
    console.error('   Kontrollera nätverket eller att api.myh.se är nåbart.');
    process.exit(1);
  }

  // Samla ihop alla utbildningar, dedupliserade på myh_id
  const allSchools = new Map(); // myh_id → school object

  for (const mapping of EDU_MAP) {
    console.log(`\n📚 ${mapping.label} (ids: ${mapping.ids.join(', ')})`);

    for (const keyword of mapping.keywords) {
      process.stdout.write(`   🔍 "${keyword}"... `);
      try {
        const educations = await fetchAllForQuery(keyword);

        let added = 0;
        let merged = 0;

        for (const edu of educations) {
          // Filtrera — utbildningsnamnet måste faktiskt matcha
          const name = edu.EducationName || edu.educationName || edu.Name || edu.name || '';
          if (!matchesKeywords(name, mapping.keywords)) continue;

          const myhId = String(edu.Id || edu.id || edu.EducationId || Math.random());

          if (allSchools.has(myhId)) {
            // Slå ihop education_ids
            const existing = allSchools.get(myhId);
            const merged_ids = [...new Set([...existing.education_ids, ...mapping.ids])];
            existing.education_ids = merged_ids;
            merged++;
          } else {
            allSchools.set(myhId, myhToSchool(edu, [...mapping.ids]));
            added++;
          }
        }

        console.log(`${educations.length} träffar → ${added} nya, ${merged} sammanslagna`);
      } catch (e) {
        console.log(`⚠ ${e.message}`);
      }

      await new Promise(r => setTimeout(r, 200)); // paus mellan anrop
    }
  }

  const schools = Array.from(allSchools.values());
  console.log(`\n✅ Totalt ${schools.length} unika YH-utbildningar att importera`);

  if (schools.length === 0) {
    console.log('\n⚠ Inga utbildningar hittades.');
    console.log('  Testa manuellt:');
    console.log('  curl -H "User-Agent: Mozilla/5.0" -H "Referer: https://www.myh.se/" \\');
    console.log('    "https://api.myh.se/Education/V1/GetEducations?Text=systemutvecklare&PageSize=5"');
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
  console.log(`   Totalt importerade: ${schools.length} utbildningar`);

  // Statistik per kategori
  console.log('\n📊 Fördelning per utbildningskategori:');
  for (const mapping of EDU_MAP) {
    const count = schools.filter(s => s.education_ids.some(id => mapping.ids.includes(id))).length;
    if (count > 0) console.log(`   ${mapping.label}: ${count}`);
  }
}

main().catch(e => {
  console.error('❌ Oväntat fel:', e.message);
  process.exit(1);
});
