/**
 * fetch-myh-schools.js
 * =====================
 * Hämtar YH-utbildningar från MYH:s öppna API och importerar till Supabase.
 *
 * Kör lokalt:
 *   node fetch-myh-schools.js
 *
 * Kräver: node-fetch (npm install node-fetch)
 * Sätt miljövariabler eller ändra konstanterna nedan.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';
// OBS: Använd service_role-nyckeln (inte anon), den finns i Supabase > Settings > API

const MYH_BASE = 'https://api.myh.se/YHUtbildningar/v1';

// ---------------------------------------------------------------
// Mappning: våra interna education_ids → MYH-söktermer
// ---------------------------------------------------------------
const EDU_MAP = [
  { ids: [1],      keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'webbutvecklare'] },
  { ids: [2],      keywords: ['dataanalytiker', 'data analytics', 'BI-analytiker'] },
  { ids: [3],      keywords: ['IT-säkerhet', 'cybersecurity', 'informationssäkerhet'] },
  { ids: [4],      keywords: ['UX', 'UX/UI', 'gränssnitt', 'interaktionsdesign'] },
  { ids: [7],      keywords: ['DevOps', 'cloud', 'molntjänster', 'driftekniker'] },
  { ids: [9],      keywords: ['redovisningsekonom', 'redovisning', 'bokföring'] },
  { ids: [10],     keywords: ['controller', 'ekonomicontroller'] },
  { ids: [11],     keywords: ['digital marknadsföring', 'marknadsförare', 'e-handel'] },
  { ids: [12],     keywords: ['HR', 'personalarbete', 'human resources'] },
  { ids: [13],     keywords: ['projektledare', 'projektledning'] },
  { ids: [25],     keywords: ['fastighetsförvaltare', 'fastighet'] },
  { ids: [26],     keywords: ['VVS', 'VVS-ingenjör', 'rörläggare'] },
  { ids: [27],     keywords: ['automation', 'automationsingenjör', 'PLC'] },
];

// Studieform-mappning MYH → vår format
function mapStudyMode(myh) {
  if (!myh) return 'campus';
  const s = myh.toLowerCase();
  if (s.includes('distans')) return 'distance';
  if (s.includes('hybrid') || s.includes('blandad')) return 'hybrid';
  return 'campus';
}

// Studietakt-mappning
function mapStudyPace(myh) {
  if (!myh) return 'fulltime';
  const s = myh.toLowerCase();
  if (s.includes('deltid') || s.includes('50%') || s.includes('75%')) return 'parttime';
  return 'fulltime';
}

// Normalisera stad
function normalizeCity(ort) {
  if (!ort) return null;
  const o = ort.trim().toLowerCase();
  if (o.includes('stockholm')) return 'stockholm';
  if (o.includes('göteborg') || o.includes('goteborg')) return 'goteborg';
  if (o.includes('malmö') || o.includes('malmo')) return 'malmo';
  if (o.includes('linköping') || o.includes('linkoping')) return 'linkoping';
  if (o.includes('örebro') || o.includes('orebro')) return 'orebro';
  if (o.includes('umeå') || o.includes('umea')) return 'umea';
  if (o.includes('distans')) return 'distans';
  return ort.trim();
}

// Hämta utbildningar för ett sökord
async function fetchByKeyword(keyword) {
  const url = `${MYH_BASE}/Utbildningar?q=${encodeURIComponent(keyword)}&pageSize=50`;
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Studievagsguiden/1.0',
      }
    });
    if (!res.ok) {
      console.warn(`  ⚠ ${keyword}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    // MYH API returnerar antingen ett array eller { value: [...] }
    if (Array.isArray(data)) return data;
    if (data.value && Array.isArray(data.value)) return data.value;
    if (data.utbildningar && Array.isArray(data.utbildningar)) return data.utbildningar;
    return [];
  } catch (e) {
    console.warn(`  ⚠ ${keyword}: ${e.message}`);
    return [];
  }
}

// Konvertera MYH-objekt till vår yh_schools-struktur
function myhToSchool(item, eduIds) {
  // MYH-fälten kan variera — prova vanliga namn
  const programName = item.utbildningsnamn || item.namn || item.name || 'Okänt program';
  const schoolName  = item.anordnarnamn || item.anordnare?.namn || item.utbildningsanordnare || 'Okänd skola';
  const city        = normalizeCity(item.ort || item.stad || item.kommun);
  const studyMode   = mapStudyMode(item.studieform || item.undervisningsform);
  const studyPace   = mapStudyPace(item.studietakt || item.omfattning);
  const fee         = parseInt(item.avgift || item.studieavgift || 0) || 0;
  const websiteUrl  = item.webbplats || item.url || item.lankUrl || null;
  const myhId       = String(item.id || item.utbildningId || item.guid || '');
  const myhArea     = item.utbildningsomrade || item.omrade || null;
  const duration    = item.utbildningslangd || item.langd || null;

  // Startdatum: samla ihop
  let startDates = [];
  if (item.startdatum) startDates.push(item.startdatum);
  if (item.startdatumHt) startDates.push('HT' + new Date(item.startdatumHt).getFullYear());
  if (item.startdatumVt) startDates.push('VT' + new Date(item.startdatumVt).getFullYear());
  if (item.tillfallen && Array.isArray(item.tillfallen)) {
    item.tillfallen.forEach(t => {
      if (t.startdatum) {
        const d = new Date(t.startdatum);
        const term = d.getMonth() < 6 ? 'VT' : 'HT';
        startDates.push(term + d.getFullYear());
      }
    });
  }
  startDates = [...new Set(startDates)].filter(Boolean);

  return {
    school_name:    schoolName,
    program_name:   programName,
    website_url:    websiteUrl,
    city:           city,
    study_mode:     studyMode,
    study_pace:     studyPace,
    fee:            fee,
    start_dates:    startDates,
    duration_text:  duration,
    education_ids:  eduIds,
    myh_id:         myhId,
    myh_area:       myhArea,
    active:         true,
  };
}

// Upsert till Supabase (via REST API, ingen npm-dependency på supabase-js)
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
    console.error('Supabase insert error:', err);
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('🚀 Startar MYH-import...\n');

  // Behövs node-fetch i Node < 18
  let fetchFn;
  try {
    fetchFn = fetch; // Node 18+ har inbyggd fetch
  } catch {
    fetchFn = (await import('node-fetch')).default;
  }
  global.fetch = fetchFn;

  const allSchools = new Map(); // myh_id → school object (avduplicera)

  for (const mapping of EDU_MAP) {
    for (const keyword of mapping.keywords) {
      console.log(`🔍 Söker: "${keyword}"...`);
      const results = await fetchByKeyword(keyword);
      console.log(`   → ${results.length} träffar`);

      for (const item of results) {
        const myhId = String(item.id || item.utbildningId || item.guid || Math.random());
        if (allSchools.has(myhId)) {
          // Redan inlagd — lägg bara till education_ids
          const existing = allSchools.get(myhId);
          const newIds = [...new Set([...existing.education_ids, ...mapping.ids])];
          existing.education_ids = newIds;
        } else {
          allSchools.set(myhId, myhToSchool(item, mapping.ids));
        }
      }

      // Liten paus för att inte hammra API:t
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const schools = Array.from(allSchools.values());
  console.log(`\n✅ Totalt ${schools.length} unika YH-utbildningar hittade`);

  // Dela upp i batchar om 100
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

main().catch(console.error);
