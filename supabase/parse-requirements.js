/**
 * parse-requirements.js
 * ======================
 * Läser yh_schools-rader med requirements != null och parsar texten
 * med regex till strukturerad JSON som sparas i requirements_parsed.
 *
 * Hanterar både gammalt YH-format ("Kurser: • Engelska 6: 100p")
 * och SUSA navet-format ("Grundläggande behörighet samt Matematik 3b, Engelska 6").
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

const GYMNASIUM_PROGRAMS = [
  'Teknikprogrammet', 'Naturvetenskapsprogrammet', 'Ekonomiprogrammet',
  'Samhällsvetenskapsprogrammet', 'Estetiska programmet', 'Humanistiska programmet',
  'El- och energiprogrammet', 'Bygg- och anläggningsprogrammet', 'VVS- och fastighetsprogrammet',
  'Industritekniska programmet', 'Fordons- och transportprogrammet', 'Restaurang- och livsmedelsprogrammet',
  'Hantverksprogrammet', 'Barn- och fritidsprogrammet', 'Vård- och omsorgsprogrammet',
  'Handels- och administrationsprogrammet', 'Naturbruksprogrammet', 'Hotell- och turismprogrammet',
];

// Kända kurser med deras nivåer, ordnade från mest specifikt (3c) till minst (3)
// så att rätt nivå plockas upp vid matchning.
const KNOWN_COURSES = [
  { name: 'Matematik',              levels: ['5','4','3c','3b','3','2c','2b','2a','2','1c','1b','1a','1','D','C','B','A'] },
  { name: 'Engelska',               levels: ['7','6','5','B','A'] },
  { name: 'Svenska som andraspråk', levels: ['3','2','1'] },
  { name: 'Svenska',                levels: ['3','2','1','B','A'] },
  { name: 'Fysik',                  levels: ['2','1c','1b','1a2','1a1','1','B','A'] },
  { name: 'Kemi',                   levels: ['2','1','B','A'] },
  { name: 'Biologi',                levels: ['2','1','B','A'] },
  { name: 'Samhällskunskap',        levels: ['2','1b','1a2','1a1','1','A'] },
  { name: 'Naturkunskap',           levels: ['2','1b','1a2','1a1','1'] },
  { name: 'Historia',               levels: ['2','1b','1a2','1a1','1'] },
  { name: 'Geografi',               levels: ['1'] },
  { name: 'Teknik',                 levels: ['2','1'] },
  { name: 'Psykologi',              levels: ['1'] },
  { name: 'Religionskunskap',       levels: ['2','1'] },
];

// Bygg regex-lista en gång
const COURSE_REGEXES = [];
for (const c of KNOWN_COURSES) {
  for (const lvl of c.levels) {
    // Matcha kursnamn + nivå (t.ex. "Matematik 3b" eller "Matematik3b")
    const escapedName = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLvl  = lvl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Nivå måste sluta med ordgräns (inte följas av annan bokstav/siffra)
    const re = new RegExp(escapedName + '\\s*' + escapedLvl + '(?![a-zA-Z0-9])', 'i');
    COURSE_REGEXES.push({ name: c.name, level: lvl, re });
  }
}

// ---------------------------------------------------------------
// Regex-parser — hanterar SUSA- och gammalt YH-format
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

  // ── Gymnasieexamen / grundläggande behörighet ──
  if (
    /gymnasieexamen/i.test(text) ||
    /grundl[äa]ggande\s+beh[öo]righet/i.test(text) ||
    /gymnasieutbildning/i.test(text)
  ) {
    result.has_gymnasieexamen_requirement = true;
  }

  // ── Reell kompetens ──
  if (/reell\s+kompetens|f[öo]ruts[äa]ttningar att tillgodogöra/i.test(text)) {
    result.reell_kompetens_accepted = true;
  }

  // ── Rekommenderade gymnasieprogram (gammalt format) ──
  for (const prog of GYMNASIUM_PROGRAMS) {
    if (text.includes(prog)) result.recommended_programs.push(prog);
  }

  // ── Kursextraktion ──
  // Håll koll på vilka kursnamn som redan matchats för att undvika dubbletter.
  // Vid "eller"-alternativ: ta med båda (frontend visar "eller").
  const matchedNames = new Set();

  // Format 1 (gammalt): "• Engelska 6: 100 poäng" / "Engelska 6, 100p"
  const kursSection = text.match(
    /(?:f[öo]rkunskapskurser:|kurser:|f[öo]rutom detta st[äa]lls f[öo]ljande krav:?)([\s\S]*)/i
  )?.[1] || '';

  if (kursSection) {
    const oldPattern = /[•\-]?\s*([A-ZÅÄÖ][a-zåäö]+(?:\s+[a-zåäö]+)*)\s+(\d+[a-zA-Z]?)[\s:,]+(\d+)\s*(?:poäng|p\b)(?:\s+alt\s+([A-ZÅÄÖ][^,\n•]+?)[\s:,]+\d+\s*(?:poäng|p\b))?/g;
    let m;
    while ((m = oldPattern.exec(kursSection)) !== null) {
      const name = m[1].trim();
      const level = m[2].trim();
      if (GYMNASIUM_PROGRAMS.some(p => p.startsWith(name))) continue;
      const points = parseInt(m[3]);
      if (points <= 0) continue;
      const course = { name, level, points };
      if (m[4]) course.alternative = m[4].trim();
      result.required_courses.push(course);
      matchedNames.add(name);
    }
  }

  // Format 2 (SUSA): fritext med kurser listade direkt
  // Körs alltid — hittar kurser som gammalt format missade.
  for (const { name, level, re } of COURSE_REGEXES) {
    if (!re.test(text)) continue;
    if (matchedNames.has(name)) continue; // redan hittat denna kurs
    matchedNames.add(name);

    // Kolla om det finns ett "eller"-alternativ (t.ex. "3b eller 3c")
    const orRe = new RegExp(
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '\\s*' + level.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '\\s+(?:eller|alt\\.?|or)\\s+(?:' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*)?([\\w]+)',
      'i'
    );
    const orMatch = text.match(orRe);
    const course = { name, level };
    if (orMatch) course.alternative = name + ' ' + orMatch[1];
    result.required_courses.push(course);
  }

  // ── Övriga krav ──
  const otherPatterns = [
    /k[öo]rkort[^.\n]*/i,
    /arbetslivserfarenhet[^.\n]*/i,
    /erfarenhet av[^.\n]*/i,
    /h[äa]lsokontroll[^.\n]*/i,
    /svenska\s+som\s+modersmål[^.\n]*/i,
  ];
  const otherMatches = otherPatterns.map(p => text.match(p)?.[0]).filter(Boolean);
  if (otherMatches.length > 0) result.other_requirements = otherMatches.join(' · ').trim();

  return result;
}

// ---------------------------------------------------------------
// Hämta rader från Supabase (hanterar paginering)
// ---------------------------------------------------------------
async function fetchRows() {
  if (LIMIT) {
    let url = `${SUPABASE_URL}/rest/v1/yh_schools?requirements=not.is.null&select=id,program_name,requirements&order=id&limit=${LIMIT}`;
    if (!FORCE) url += '&requirements_parsed=is.null';
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${await res.text()}`);
    return res.json();
  }

  const PAGE = 1000;
  let all = [], offset = 0;
  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/yh_schools?requirements=not.is.null&select=id,program_name,requirements&order=id&limit=${PAGE}&offset=${offset}`;
    if (!FORCE) url += '&requirements_parsed=is.null';
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${await res.text()}`);
    const page = await res.json();
    all = all.concat(page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
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
  }

  console.log(`\n🎉 Klar!`);
  console.log(`   Parsade:  ${ok}`);
  console.log(`   Tomma:    ${nulled}`);
  console.log(`   Fel:      ${failed}`);
  if (DRY_RUN) console.log('\n   (dry-run — inget sparades, kör utan --dry-run för att spara)');
}

main().catch(e => { console.error('❌ Oväntat fel:', e.message); process.exit(1); });
