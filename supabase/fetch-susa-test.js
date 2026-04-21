/**
 * fetch-susa-test.js
 * ==================
 * Testar SUSA navet API — verifierar antal, fält och program-filter.
 * Inget sparas till Supabase.
 *
 * Kör:
 *   node supabase/fetch-susa-test.js
 */

const BASE = 'https://api.skolverket.se/susa-navet/emil3';
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  return res.json();
}

function sv(obj, arrayKey = 'strings') {
  const arr = obj?.[arrayKey] || obj?.strings || obj?.urls || [];
  return (arr.find(s => s.lang === 'swe') || arr[0])?.value || null;
}

function fixEncoding(str) {
  if (!str) return null;
  return str
    .replace(/Ã¶/g, 'ö').replace(/Ã¥/g, 'å').replace(/Ã¤/g, 'ä')
    .replace(/Ã–/g, 'Ö').replace(/Ã…/g, 'Å').replace(/Ã„/g, 'Ä')
    .replace(/Ã©/g, 'é').replace(/Ã¸/g, 'ø');
}

async function main() {
  console.log('🔍 SUSA navet — testköring\n');

  // ── 1. Totalt antal educationInfos per schoolType ──────────────────────────
  console.log('📊 Antal utbildningar (educationInfos):');
  for (const type of ['HS', 'YH']) {
    const d = await get(`/educationInfos?schoolType=${type}&page=0&size=1`);
    console.log(`   ${type}: ${d.page?.totalElements ?? '?'} totalt`);
  }

  // ── 2. Hämta sample educationInfo (HS) ────────────────────────────────────
  console.log('\n📋 Sample educationInfo (HS, page 500):');
  const infosPage = await get(`/educationInfos?schoolType=HS&page=500&size=5`);
  const infos = infosPage.educationInfos || [];

  const programs = infos.filter(i => i.content?.configuration?.code === 'program');
  const courses  = infos.filter(i => i.content?.configuration?.code !== 'program');
  console.log(`   Av 5 slumpade: ${programs.length} program, ${courses.length} kurser`);

  if (programs.length === 0) {
    console.log('   ⚠ Inga program på denna sida, provar page 0...');
    const p0 = await get(`/educationInfos?schoolType=HS&page=0&size=20`);
    programs.push(...(p0.educationInfos || []).filter(i => i.content?.configuration?.code === 'program'));
  }

  const sample = programs[0];
  if (!sample) { console.log('❌ Hittade inget program alls'); return; }

  const c = sample.content;
  console.log('\n── educationInfo (alla fält) ──');
  console.log({
    id:             sample.id,
    status:         sample.status,
    title_sv:       fixEncoding(sv(c.title)),
    title_en:       fixEncoding(c.title?.strings?.find(s => s.lang === 'eng')?.value),
    code:           c.code,
    school_type:    c.type?.code,
    configuration:  c.configuration?.code,
    education_level: c.educationLevels?.map(e => e.code).join(', '),
    credits:        c.credits?.credits,
    credits_system: c.credits?.system?.code,
    result_is_degree: c.resultIsDegree,
    subjects:       c.subjects?.map(s => s.code).join(', '),
    prior_knowledge: fixEncoding(sv(c.recommendedPriorKnowledge)),
    description:    fixEncoding(sv(c.description))?.slice(0, 200),
    expires:        c.expires,
    last_edited:    c.lastEdited,
  });

  // ── 3. Hämta motsvarande educationEvent ───────────────────────────────────
  console.log('\n── educationEvent för samma utbildning ──');
  const evPage = await get(`/educationEvents?schoolType=HS&page=0&size=100`);
  const events = evPage.educationEvents || [];
  const ev = events.find(e => e.content?.education === sample.id) || events[0];

  if (ev) {
    const ec = ev.content;
    const ext = ec.extensions?.find(e => e.type === 'UHEventExtension') || {};
    console.log({
      event_id:          ev.id,
      provider_id:       ec.providers?.[0],
      city:              fixEncoding(sv(ec.locations?.[0]?.studyLocation)),
      start:             ec.execution?.start,
      end:               ec.execution?.end,
      pace_pct:          ec.paceOfStudy?.percentage,
      time_of_study:     ec.timeOfStudy?.code,
      language:          ec.languageOfInstructions?.join(', '),
      is_distance:       !!ec.distance,
      is_cancelled:      ec.isCancelled,
      application_code:  ec.application?.code,
      application_last:  ec.application?.last,
      url_sv:            sv(ec.url, 'urls'),
      tuition_fee:       ext.tuitionFee?.total ?? (ext.tuitionFee?.value === false ? 0 : null),
      tuition_fee_first: ext.tuitionFee?.first,
      admission_round:   ext.admissionDetails?.admissionRoundId,
      eligibility_model: ext.admissionDetails?.eligibilityModelSB?.value,
      selection_model:   ext.admissionDetails?.selectionModel,
      only_part_of_prog: ext.applicationDetails?.onlyAsPartOfProgram,
      visible_swedish:   ext.applicationDetails?.visibleToSwedishApplicants,
      visible_intl:      ext.applicationDetails?.visibleToInternationalApplicants,
      close_date:        ext.applicationDetails?.closeDate,
      credits_dist:      ext.admissionDetails?.distributionOfCredits?.credits?.map(cr => `${cr.semester}${cr.year}:${cr.value}hp`).join(', '),
      start_semester:    ext.startPeriod?.period ? `${ext.startPeriod.period.semester}${ext.startPeriod.period.year}` : null,
      keywords:          ec.keywords?.flatMap(k => k.strings?.map(s => fixEncoding(s.value))).join(', '),
    });
  }

  // ── 4. Hämta provider (skolnamn) ──────────────────────────────────────────
  const providerId = ev?.content?.providers?.[0];
  if (providerId) {
    console.log('\n── educationProvider ──');
    const prov = await get(`/educationProviders/${providerId}`);
    const pc = prov.content;
    console.log({
      provider_id:    prov.id,
      name_sv:        fixEncoding(sv(pc.name)),
      name_en:        pc.name?.strings?.find(s => s.lang === 'eng')?.value,
      url:            sv(pc.url, 'urls'),
      email:          pc.emailAddresses?.[0],
      phone:          sv(pc.phones?.[0]?.number),
      city:           fixEncoding(pc.contactAddress?.town),
      postal_code:    pc.contactAddress?.postalCode,
      org_number:     pc.organisationNumber,
      responsible_body_type: pc.responsibleBody?.type?.code,
    });
  }

  // ── 5. Uppskattning program-andel ─────────────────────────────────────────
  console.log('\n📊 Uppskattning program vs kurs (HS, page 0, size=100):');
  const bigPage = await get(`/educationInfos?schoolType=HS&page=0&size=100`);
  const all = bigPage.educationInfos || [];
  const progCount   = all.filter(i => i.content?.configuration?.code === 'program').length;
  const kursCount   = all.filter(i => i.content?.configuration?.code !== 'program').length;
  const total       = bigPage.page?.totalElements || '?';
  const progShare   = (progCount / all.length * 100).toFixed(0);
  console.log(`   I sample: ${progCount} program, ${kursCount} kurser (${progShare}% program)`);
  console.log(`   Totalt HS: ${total} → uppskattade program: ~${Math.round(total * progCount / all.length)}`);

  console.log('\n✅ Test klar — ingen data sparad');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
