/**
 * parse-requirements.js
 * ======================
 * Läser yh_schools-rader med requirements != null och parsar texten
 * med regex till strukturerad JSON som sparas i requirements_parsed.
 *
 * Kör lokalt (Node 18+):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_KEY="din_nyckel"; node supabase/parse-requirements.js
 *
 *   Mac/Linux:
 *     SUPABASE_SERVICE_KEY=din_nyckel node supabase/parse-requirements.js
 *
 * Flaggor:
 *   --dry-run   Parsar men sparar inte till Supabase
 *   --limit 10  Kör bara på 10 rader (för testning)
 *   --force     Kör även rader som redan har requirements_parsed
 */

const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://qofvdpvxrvvjalgdiflg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const DRY_RUN  = process.argv.includes('--dry-run');
const FORCE    = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : null;

// Kända gymnasieprogram att matcha mot
const GYMNASIUM_PROGRAMS = [
  'Teknikprogrammet', 'Naturvetenskapsprogrammet', 'Ekonomiprogrammet',
  'Samhällsvetenskapsprogrammet', 'Estetiska programmet', 'Humanistiska programmet',
  'El- och energiprogrammet', 'Bygg- och anläggningsprogrammet', 'VVS- och fastighetsprogrammet',
  'Industritekniska programmet', 'Fordons- och transportprogrammet', 'Restaurang- och livsmedelsprogrammet',
  'Hantverksprogrammet', 'Barn- och fritidsprogrammet', 'Vård- och omsorgsprogrammet',
  'Handels- och administrationsprogrammet', 'Naturbruksprogrammet', 'Hotell- och turismprogrammet',
];

// ---------------------------------------------------------------
// Regex-parser — ingen extern API krävs
// ---------------------------------------------------------------
function parseRequirements(text) {
  if (!text || text.trim().length === 0) return null;

  const result = {
    has_gymnasieexamen_requirement: false,
    reell_kompetens_accepted:       false,
    recommended_programs:           [],
    required_courses:               [],
    other_requirements:             null,
  };

  // 1. Gymnasieexamen (punkt 1 i standardtexten)
  if (/gymnasieexamen/i.test(text)) {
    result.has_gymnasieexamen_requirement = true;
  }

  // 2. Reell kompetens (punkt 4 i standardtexten)
  if (/reell\s+kompetens|förutsättningar att tillgodogöra/i.test(text)) {
    result.reell_kompetens_accepted = true;
  }

  // 3. Rekommenderade gymnasieprogram
  for (const prog of GYMNASIUM_PROGRAMS) {
    if (text.includes(prog)) {
      result.recommended_programs.push(prog);
    }
  }

  // 4. Kurskrav — extrahera allt efter "Kurser:" eller "Förutom detta ställs"
  // Format: "Engelska 6, 100p" eller "Svenska 2 alt Svenska som andraspråk 2, 100p"
  const kursSection = text.match(/(?:kurser:|förutom detta ställs följande krav:?)([\s\S]*)/i)?.[1] || '';

  if (kursSection) {
    // Matcha mönster: "Kursnamn nivå, 100p" med optional "alt Alternativkurs nivå"
    const coursePattern = /([A-ZÅÄÖ][a-zåäö]+(?:\s+[a-zåäö]+)*)\s+(\d+[a-z]?),?\s*(\d+)\s*p(?:\s+alt\s+([A-ZÅÄÖ][^,\n]+?),?\s*\d+\s*p)?/g;
    let match;
    while ((match = coursePattern.exec(kursSection)) !== null) {
      const course = {
        name:   match[1].trim(),
        level:  match[2].trim(),
        points: parseInt(match[3]),
      };
      if (match[4]) course.alternative = match[4].trim();

      // Filtrera bort gymnasieprogram som råkar matcha
      const isProgram = GYMNASIUM_PROGRAMS.some(p => p.startsWith(course.name));
      if (!isProgram) result.required_courses.push(course);
    }
  }

  // 5. Övriga krav (körkort, arbetslivserfarenhet, etc.)
  const otherPatterns = [
    /körkort[^.]*\./i,
    /arbetslivserfarenhet[^.]*\./i,
    /erfarenhet av[^.]*\./i,
    /betyg[^.]*(?:lägst|minst)[^.]*\./i,
  ];
  const otherMatches = otherPatterns
    .map(p => text.match(p)?.[0])
    .filter(Boolean);
  if (otherMatches.length > 0) {
    result.other_requirements = otherMatches.join(' ').trim();
  }

  return result;
}

// ---------------------------------------------------------------
// Hämta rader från Supabase
// ---------------------------------------------------------------
async function fetchRows() {
  let url = `${SUPABASE_URL}/rest/v1/yh_schools?requirements=not.is.null&select=id,program_name,requirements&order=id`;
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
  console.log('🔍 Startar requirements-parsing (regex)...\n');

  if (!SUPABASE_SERVICE_KEY) { console.error('❌ Sätt SUPABASE_SERVICE_KEY'); process.exit(1); }
  if (DRY_RUN) console.log('🧪 DRY-RUN — sparar inte till Supabase\n');

  const rows = await fetchRows();
  console.log(`📋 Hittade ${rows.length} rader att parsa\n`);

  let ok = 0, nulled = 0, failed = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.program_name?.slice(0, 45).padEnd(45)}... `);

    try {
      const parsed = parseRequirements(row.requirements);

      if (DRY_RUN && i < 3) {
        console.log('\n   ' + JSON.stringify(parsed, null, 2).split('\n').join('\n   '));
      }

      if (!DRY_RUN) await saveResult(row.id, parsed);
      console.log(parsed ? `✅ (${parsed.required_courses.length} kurser)` : '⚠ null');
      parsed ? ok++ : nulled++;
    } catch (e) {
      console.log('❌', e.message.slice(0, 80));
      failed++;
    }

    // Liten paus var 50:e rad för att inte hammra Supabase
    if (!DRY_RUN && (i + 1) % BATCH_SIZE === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n🎉 Klar!`);
  console.log(`   Parsade:  ${ok}`);
  console.log(`   Tomma:    ${nulled}`);
  console.log(`   Fel:      ${failed}`);
  if (DRY_RUN) console.log('\n   (dry-run — inget sparades, kör utan --dry-run för att spara)');
}

main().catch(e => { console.error('❌ Oväntat fel:', e.message); process.exit(1); });
