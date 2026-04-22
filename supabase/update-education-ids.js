/**
 * update-education-ids.js
 * =======================
 * Går igenom alla rader i yh_schools och sätter education_ids baserat
 * på nyckelordsmatchning mot program_name.
 *
 * Kör:
 *   SUPABASE_SERVICE_KEY=xxx node supabase/update-education-ids.js
 *   SUPABASE_SERVICE_KEY=xxx node supabase/update-education-ids.js --dry-run
 */

const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DIN_SERVICE_ROLE_KEY_HÄR';
const PAGE_SIZE            = 1000;
const DRY_RUN              = process.argv.includes('--dry-run');

// ── EDU_MAP (samma som i fetch-myh-schools.js) ────────────────────────────────

const EDU_MAP = [
  // IT & Tech
  { ids: [1],  keywords: ['systemutvecklare', 'mjukvaruutvecklare', 'webbutvecklare', 'programmerare', 'fullstack', 'backend', 'frontend', 'applikationsutvecklare', '.net', 'java', 'python'] },
  { ids: [2],  keywords: ['dataanalytiker', 'dataanalys', 'data analytics', 'business intelligence', 'bi-utvecklare', 'dataingenjör', 'machine learning', 'ai-ingenjör', 'data science', 'datavetenskap', 'data och ai', 'ai och data', 'artificiell intelligens', 'business analytics', 'digital analytiker', 'bi-analytiker', 'data- och ai'] },
  { ids: [3],  keywords: ['it-säkerhet', 'cybersecurity', 'informationssäkerhet', 'säkerhetsanalytiker', 'nätverkssäkerhet', 'penetrationstest', 'cyber security'] },
  { ids: [4],  keywords: ['ux', 'ux-designer', 'ui-designer', 'användarupplevelse', 'interaktionsdesign', 'digital design', 'tjänstedesign', 'webdesign'] },
  { ids: [5],  keywords: ['spelutvecklare', 'game developer', 'speldesign', 'spelindustrin', 'game design'] },
  { ids: [7],  keywords: ['devops', 'cloud', 'molntjänster', 'driftekniker', 'infrastruktur', 'kubernetes', 'aws', 'azure', 'systemadministratör', 'nätverkstekniker'] },

  // Ekonomi & Juridik
  { ids: [9],  keywords: ['redovisningsekonom', 'redovisning', 'bokföring', 'löneadministratör', 'lönespecialist', 'ekonomiassistent', 'ekonomi'] },
  { ids: [10], keywords: ['controller', 'ekonomistyrning', 'business controller', 'finansanalytiker', 'financial controller'] },
  { ids: [8],  keywords: ['jurist', 'paralegal', 'rättsvetenskap', 'juridik'] },

  // Ledarskap & HR
  { ids: [11], keywords: ['kommunikatör', 'informatör', 'copywriter', 'innehållsstrateg', 'public relations'] },
  { ids: [12], keywords: ['hr-specialist', 'hr-ansvarig', 'personalarbete', 'human resources', 'personalvetare', 'personalutvecklare', 'personaladministratör', 'personalchef', 'personalspecialist', 'pa-konsult', 'löne- och personal', 'personal och lön', 'personal och organisation', 'personal och ledarskap', 'personalvetenskap', 'lön och personal'] },
  { ids: [13], keywords: ['projektledare', 'projektledning', 'agil', 'scrum', 'projektkoordinator', 'förändringsledning'] },

  // Digital marknadsföring
  { ids: [6],  keywords: ['digital marknadsföring', 'marknadsförare', 'content marketing', 'sociala medier', 'seo', 'e-handel', 'growth hacker'] },

  // Bygg & Fastighet
  { ids: [25], keywords: ['fastighetsförvaltare', 'fastighet', 'fastighetsteknik', 'fastighetsmäklare', 'fastighetsadministration'] },
  { ids: [26], keywords: ['vvs', 'ventilation', 'rörläggare', 'energiingenjör', 'vvs-tekniker', 'energispecialist', 'installationsteknik'] },

  // Industri & Teknik
  { ids: [27], keywords: ['automation', 'automationsingenjör', 'plc', 'robotik', 'automationstekniker', 'industriautomation', 'mekatronik'] },
  { ids: [28], keywords: ['elektriker', 'elkraft', 'elteknik', 'elinstallation', 'elmontör'] },
  { ids: [29], keywords: ['logistiker', 'logistik', 'supply chain', 'transportledning', 'inköpare', 'inköp och logistik'] },

  // Vård & Omsorg
  { ids: [14], keywords: ['sjuksköterska', 'undersköterska', 'vård och omsorg', 'sjukvård', 'hälso- och sjukvård', 'specialistsjuksköterska'] },
  { ids: [15], keywords: ['tandhygienist', 'dental', 'tandvård', 'tandsköterska'] },

  // Pedagogik & Samhälle
  { ids: [16], keywords: ['lärare', 'förskollärare', 'pedagog', 'utbildningsledare', 'fritidspedagog'] },
  { ids: [17], keywords: ['socionom', 'socialt arbete', 'socialsekreterare', 'behandlingspedagog', 'socialpedagog'] },

  // Kreativa yrken
  { ids: [18], keywords: ['grafisk design', 'grafisk designer', 'visuell kommunikation', 'art director'] },
  { ids: [19], keywords: ['fotograf', 'filmproduktion', 'rörlig bild', 'media och kommunikation', 'film och tv'] },

  // Besöksnäring
  { ids: [20], keywords: ['kock', 'restaurang', 'livsmedelsteknolog', 'konditor', 'gastronomi'] },
  { ids: [21], keywords: ['eventkoordinator', 'event', 'mötesbranschen', 'konferens', 'turism'] },

  // Miljö & Hållbarhet
  { ids: [22], keywords: ['miljösamordnare', 'hållbarhet', 'miljö', 'klimat', 'cirkulär ekonomi'] },

  // Handel
  { ids: [23], keywords: ['butikschef', 'detaljhandel', 'retail', 'handelsadministration'] },
  { ids: [24], keywords: ['inköpare', 'upphandlare', 'upphandling', 'kategorichef'] },
];

function assignEducationIds(programName) {
  const t = (programName || '').toLowerCase();
  const matched = [];
  for (const mapping of EDU_MAP) {
    if (mapping.keywords.some(kw => t.includes(kw.toLowerCase()))) {
      matched.push(...mapping.ids);
    }
  }
  return [...new Set(matched)];
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function fetchPage(offset) {
  const url = `${SUPABASE_URL}/rest/v1/yh_schools?select=id,program_name&order=id&offset=${offset}&limit=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: { ...HEADERS, 'Range-Unit': 'items', 'Range': `${offset}-${offset + PAGE_SIZE - 1}` } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateRow(id, educationIds) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools?id=eq.${id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ education_ids: educationIds }),
  });
  if (!res.ok) {
    console.error(`  ⚠ PATCH id=${id} misslyckades: ${res.status}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 update-education-ids\n');

  if (SUPABASE_SERVICE_KEY === 'DIN_SERVICE_ROLE_KEY_HÄR' && !DRY_RUN) {
    console.error('❌ Sätt SUPABASE_SERVICE_KEY eller kör med --dry-run');
    process.exit(1);
  }

  if (DRY_RUN) console.log('ℹ️  DRY-RUN — inget sparas\n');

  let offset = 0;
  let totalFetched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const rows = await fetchPage(offset);
    if (!rows.length) break;

    totalFetched += rows.length;
    process.stdout.write(`Hämtat ${totalFetched} rader...`);

    for (const row of rows) {
      const ids = assignEducationIds(row.program_name);
      if (ids.length === 0) {
        totalSkipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] id=${row.id} "${row.program_name}" → [${ids.join(', ')}]`);
      } else {
        await updateRow(row.id, ids);
      }
      totalUpdated++;
    }

    process.stdout.write(`\r`);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`\n✅ Klar!`);
  console.log(`   Totalt hämtade : ${totalFetched}`);
  console.log(`   Uppdaterade    : ${totalUpdated}`);
  console.log(`   Ingen matchning: ${totalSkipped}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
