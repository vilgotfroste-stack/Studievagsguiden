/**
 * fetch-yh-requirements.js
 * =========================
 * Hämtar requirements-fältet för varje YH-utbildning via Skolverkets
 * detalj-endpoint och uppdaterar yh_schools i Supabase.
 *
 * Bakgrund: listendpointen returnerar inte requirements — måste hämtas
 * individuellt via /v4/adult-education-events/{myh_id}
 *
 * Kör lokalt (Node 18+):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="din_nyckel"; node supabase/fetch-yh-requirements.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=din_nyckel node supabase/fetch-yh-requirements.js
 *
 * Flaggor:
 *   --dry-run   Hämtar men sparar inte till Supabase
 *   --limit 10  Kör bara på 10 rader (för testning)
 *   --force     Hämtar även rader som redan har requirements
 */

const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const SKOLVERKET_DETAIL = 'https://api.skolverket.se/planned-educations/v4/adult-education-events';
const SKOLVERKET_HEADERS = {
  'Accept':     'application/vnd.skolverket.plannededucations.api.v4.hal+json',
  'User-Agent': 'Mozilla/5.0',
};

const DRY_RUN  = process.argv.includes('--dry-run');
const FORCE    = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : null;

// Fördröjning mellan anrop för att undvika rate limiting
const DELAY_MS = 150;

// ---------------------------------------------------------------
// Hämta alla myh_ids från Supabase
// ---------------------------------------------------------------
async function fetchIds() {
  let url = `${SUPABASE_URL}/rest/v1/yh_schools?select=id,myh_id,program_name&order=myh_id`;
  if (!FORCE) url += '&requirements=is.null&myh_id=not.is.null';
  if (LIMIT)  url += `&limit=${LIMIT}`;

  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch misslyckades: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------
// Hämta detaljer för en utbildning från Skolverket
// ---------------------------------------------------------------
async function fetchDetail(myhId) {
  const res = await fetch(`${SKOLVERKET_DETAIL}/${myhId}`, {
    headers: SKOLVERKET_HEADERS,
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} för ${myhId}`);

  const data = await res.json();
  // API svarar med { status, message, body: { ... } }
  return data.body || data;
}

// ---------------------------------------------------------------
// Uppdatera requirements i Supabase
// ---------------------------------------------------------------
async function saveRequirements(id, detail) {
  const payload = {
    requirements:          detail.requirements          || null,
    education_description: detail.educationEventDescription || null,
    website_url:           detail.contactInfo?.web      || null,
    contact_email:         detail.contactInfo?.email    || null,
    contact_phone:         detail.contactInfo?.telephone || null,
    eligible_for_student_aid: detail.eligibleForStudentAid ?? null,
    organizer_name:        detail.organizerName         || null,
    areas_of_interest:     detail.areasOfInterest       || null,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Supabase PATCH fel: ${(await res.text()).slice(0, 150)}`);
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('📡 Startar hämtning av requirements från Skolverket...\n');

  if (!SUPABASE_SERVICE_KEY) { console.error('❌ Sätt SUPABASE_SERVICE_KEY'); process.exit(1); }
  if (DRY_RUN) console.log('🧪 DRY-RUN — sparar inte till Supabase\n');

  const rows = await fetchIds();
  console.log(`📋 Hittade ${rows.length} utbildningar att berika\n`);

  if (rows.length === 0) {
    console.log('✅ Alla utbildningar har redan requirements. Kör med --force för att köra om.');
    return;
  }

  let ok = 0, notFound = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.program_name?.slice(0, 40).padEnd(40)} `);

    try {
      const detail = await fetchDetail(row.myh_id);

      if (!detail) {
        console.log('⚠ 404');
        notFound++;
      } else {
        if (DRY_RUN && i < 3) {
          console.log('\n   requirements:', detail.requirements?.slice(0, 120) || 'null');
        }
        if (!DRY_RUN) await saveRequirements(row.id, detail);
        console.log(detail.requirements ? '✅' : '⚠ tom');
        ok++;
      }
    } catch (e) {
      console.log('❌', e.message.slice(0, 60));
      failed++;
    }

    if (i < rows.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n🎉 Klar!`);
  console.log(`   Uppdaterade: ${ok}`);
  console.log(`   Ej hittade:  ${notFound}`);
  console.log(`   Fel:         ${failed}`);
  if (DRY_RUN) console.log('\n   Kör utan --dry-run för att spara till Supabase.');
  else console.log('\n   Kör nu: node supabase/parse-requirements.js');
}

main().catch(e => { console.error('❌ Oväntat fel:', e.message); process.exit(1); });
