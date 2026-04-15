/**
 * parse-requirements.js
 * ======================
 * Läser yh_schools-rader med requirements != null, skickar texten till
 * Claude API och sparar strukturerad JSON i requirements_parsed.
 *
 * Kör lokalt (Node 18+):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="..."; $env:ANTHROPIC_API_KEY="..."; node supabase/parse-requirements.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=... ANTHROPIC_API_KEY=... node supabase/parse-requirements.js
 *
 * Flaggor:
 *   --dry-run   Parsar men sparar inte till Supabase
 *   --limit 10  Kör bara på 10 rader (för testning)
 *   --force     Kör även rader som redan har requirements_parsed
 */

const SUPABASE_URL        = process.env.SUPABASE_URL        || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY   || '';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const LIMIT   = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : null;

// Pausa mellan Claude-anrop för att undvika rate limiting
const DELAY_MS = 300;

// ---------------------------------------------------------------
// Prompt till Claude
// ---------------------------------------------------------------
const SYSTEM_PROMPT = `Du är en expert på svenska YH-utbildningars behörighetskrav.
Du får en "requirements"-text från Skolverkets API och ska returnera ett JSON-objekt.
Returnera ENDAST valid JSON, inga förklaringar, ingen markdown.

JSON-strukturen:
{
  "has_gymnasieexamen_requirement": true,
  "recommended_programs": ["Teknikprogrammet"],
  "required_courses": [
    { "name": "Engelska", "level": "6", "points": 100 },
    { "name": "Svenska", "level": "2", "points": 100, "alternative": "Svenska som andraspråk 2" },
    { "name": "Matematik", "level": "2", "points": 100 }
  ],
  "other_requirements": "Eventuella övriga krav i fritext, t.ex. körkort eller arbetslivserfarenhet",
  "reell_kompetens_accepted": true
}

Regler:
- has_gymnasieexamen_requirement: true om texten kräver gymnasieexamen (punkt 1 i standardtexten)
- reell_kompetens_accepted: true om punkt 4 finns (reell kompetens / förutsättningar)
- recommended_programs: tom array om inget specifikt program nämns
- required_courses: extrahera kursnamn, nivå (siffran) och poäng
- other_requirements: null om inga övriga krav finns
- Om requirements-texten är null eller tom, returnera null`;

// ---------------------------------------------------------------
// Hämta rader från Supabase
// ---------------------------------------------------------------
async function fetchRows() {
  let url = `${SUPABASE_URL}/rest/v1/yh_schools?requirements=not.is.null&select=id,myh_id,program_name,requirements`;
  if (!FORCE) url += '&requirements_parsed=is.null';
  if (LIMIT)  url += `&limit=${LIMIT}`;

  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------
// Parsa en requirements-text med Claude
// ---------------------------------------------------------------
async function parseWithClaude(requirementsText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system:     SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: requirementsText },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text || text === 'null') return null;

  try {
    return JSON.parse(text);
  } catch {
    console.error('  ⚠ JSON parse misslyckades:', text.slice(0, 100));
    return null;
  }
}

// ---------------------------------------------------------------
// Spara parsed result till Supabase
// ---------------------------------------------------------------
async function saveResult(id, parsed) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/yh_schools?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({ requirements_parsed: parsed }),
  });
  if (!res.ok) {
    console.error(`  ❌ Supabase PATCH fel för ${id}:`, (await res.text()).slice(0, 200));
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log('🔍 Startar requirements-parsing...\n');

  if (!SUPABASE_SERVICE_KEY) { console.error('❌ Sätt SUPABASE_SERVICE_KEY'); process.exit(1); }
  if (!ANTHROPIC_API_KEY)    { console.error('❌ Sätt ANTHROPIC_API_KEY (hämtas på console.anthropic.com)'); process.exit(1); }
  if (DRY_RUN) console.log('🧪 DRY-RUN — sparar inte till Supabase\n');

  const rows = await fetchRows();
  console.log(`📋 Hittade ${rows.length} rader att parsa\n`);

  let ok = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.program_name?.slice(0, 50)}... `);

    try {
      const parsed = await parseWithClaude(row.requirements);
      if (!DRY_RUN) await saveResult(row.id, parsed);
      console.log(parsed ? '✅' : '⚠ null');
      ok++;
    } catch (e) {
      console.log('❌', e.message.slice(0, 80));
      failed++;
    }

    if (i < rows.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n🎉 Klar! OK: ${ok} | Fel: ${failed}`);
  if (DRY_RUN) console.log('   (dry-run — inget sparades)');
}

main().catch(e => { console.error('❌ Oväntat fel:', e.message); process.exit(1); });
