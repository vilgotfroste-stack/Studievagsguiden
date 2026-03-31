// ══════════════════════════════════════════════════════
// UTBILDNINGAR — Delad JS
// Hanterar lista-vy, yrkes-vy och stad-vy
// ══════════════════════════════════════════════════════

// EDUCATION DATA
const E=[
{id:1,  slug:'systemutvecklare',        t:'Systemutvecklare',           y:3, s0:35000,s1:52500,dem:4,ai:15,stress:2,future:4,tc:8000,flex:5,people:2,practical:3,sig:'flex',  req:['Matte 2','Engelska 6'],                              rp:['Naturvetenskap','Teknik'],          pp:['Samhäll','Ekonomi']},
{id:2,  slug:'dataanalytiker',           t:'Dataanalytiker',             y:3, s0:33000,s1:54700,dem:4,ai:12,stress:2,future:5,tc:8000,flex:4,people:2,practical:2,sig:'stress',req:['Matte 3c','Engelska 6'],                              rp:['Naturvetenskap','Teknik','Ekonomi'],pp:['Samhäll']},
{id:3,  slug:'it-sakerhetsspecialist',   t:'IT-säkerhetsspecialist',     y:3, s0:33000,s1:55000,dem:5,ai:5, stress:3,future:5,tc:8000,flex:4,people:2,practical:2,sig:'dem',   req:['Matte 2'],                                           rp:['Naturvetenskap','Teknik'],          pp:['Samhäll','Ekonomi']},
{id:9,  slug:'redovisningsekonom',       t:'Redovisningsekonom',         y:2, s0:30000,s1:42300,dem:3,ai:35,stress:2,future:2,tc:8000,flex:3,people:2,practical:2,sig:'stress',req:['Grundläggande behörighet'],                           rp:['Ekonomi'],                          pp:['Samhäll']},
{id:10, slug:'controller',               t:'Controller',                 y:3, s0:33000,s1:53100,dem:3,ai:28,stress:3,future:3,tc:9000,flex:3,people:3,practical:2,sig:'flex',  req:['Matte 3c'],                                          rp:['Ekonomi','Naturvetenskap'],         pp:['Samhäll']},
{id:11, slug:'digital-marknadsforre',    t:'Digital marknadsförare',     y:2, s0:30000,s1:50800,dem:3,ai:30,stress:3,future:3,tc:8000,flex:4,people:3,practical:3,sig:'fast',  req:['Grundläggande behörighet'],                           rp:['Ekonomi','Samhäll'],                pp:[]},
{id:12, slug:'hr-specialist',            t:'HR-specialist',              y:2, s0:30000,s1:47300,dem:3,ai:20,stress:3,future:3,tc:8000,flex:3,people:5,practical:3,sig:'flex',  req:['Grundläggande behörighet'],                           rp:['Samhäll','Ekonomi'],                pp:[]},
{id:14, slug:'sjukskoterska',            t:'Sjuksköterska',              y:3, s0:32000,s1:42000,dem:5,ai:8, stress:4,future:5,tc:8000,flex:2,people:5,practical:4,sig:'dem',   req:['Matte 2','Naturkunskap 2','Samhällskunskap 1b'],     rp:['Naturvetenskap'],                   pp:['Samhäll']},
{id:16, slug:'arbetsterapeut',           t:'Arbetsterapeut',             y:3, s0:29000,s1:38500,dem:4,ai:5, stress:3,future:4,tc:8000,flex:3,people:5,practical:4,sig:'dem',   req:['Matte 2','Samhällskunskap 1b'],                      rp:['Naturvetenskap','Samhäll'],         pp:[]},
{id:17, slug:'biomedicinsk-analytiker',  t:'Biomedicinsk analytiker',    y:3, s0:30000,s1:42900,dem:4,ai:12,stress:2,future:4,tc:8000,flex:2,people:2,practical:4,sig:'stress',req:['Matte 2','Kemi 1','Biologi 1'],                       rp:['Naturvetenskap'],                   pp:[]},
{id:18, slug:'tandhygienist',            t:'Tandhygienist',              y:2, s0:30000,s1:40200,dem:4,ai:8, stress:2,future:4,tc:8000,flex:3,people:4,practical:5,sig:'fast',  req:['Naturkunskap 2'],                                    rp:['Naturvetenskap'],                   pp:['Samhäll']},
{id:20, slug:'grundskollarare',          t:'Grundskollärare',            y:4, s0:29000,s1:40800,dem:4,ai:10,stress:4,future:4,tc:9000,flex:2,people:5,practical:4,sig:'dem',   req:['Se lärosätets krav'],                                rp:['Alla program'],                     pp:[]},
{id:21, slug:'gymnasielarare',           t:'Gymnasielärare',             y:5, s0:31000,s1:42600,dem:4,ai:10,stress:3,future:4,tc:9000,flex:2,people:5,practical:3,sig:'dem',   req:['Se lärosätets krav'],                                rp:['Alla program'],                     pp:[]},
{id:22, slug:'studie-yrkesvagledare',    t:'Studie- och yrkesvägledare', y:3, s0:29000,s1:36200,dem:3,ai:15,stress:2,future:3,tc:9000,flex:3,people:5,practical:3,sig:'stress',req:['Samhällskunskap 1b'],                                rp:['Samhäll'],                          pp:['Ekonomi']},
{id:23, slug:'fastighetsforvaltare',     t:'Fastighetsförvaltare',       y:2, s0:34000,s1:43200,dem:3,ai:15,stress:2,future:3,tc:8000,flex:3,people:3,practical:3,sig:'stress',req:['Grundläggande behörighet'],                           rp:['Ekonomi','Teknik'],                 pp:['Samhäll']},
{id:24, slug:'byggingenjor',             t:'Byggingenjör',               y:3, s0:34000,s1:48000,dem:4,ai:15,stress:3,future:4,tc:8000,flex:2,people:3,practical:4,sig:'dem',   req:['Matte 3c','Fysik 2'],                                rp:['Naturvetenskap','Teknik'],          pp:[]}
];

// SCB 2024 lönepercentiler per utbildning (kr/mån) — källa: SCB via Supabase
const SALD={
  1:{p25:45200,med:52500,p75:62000},
  2:{p25:45600,med:54700,p75:64700},
  3:{p25:44400,med:55000,p75:62000},
  9:{p25:33900,med:42300,p75:51800},
  10:{p25:45300,med:53100,p75:63400},
  11:{p25:41800,med:50800,p75:63600},
  12:{p25:41000,med:47300,p75:55000},
  14:{p25:37400,med:42000,p75:47600},
  16:{p25:35000,med:38500,p75:42200},
  17:{p25:39700,med:42900,p75:47600},
  18:{p25:36000,med:40200,p75:44900},
  20:{p25:36500,med:40800,p75:44600},
  21:{p25:39600,med:42600,p75:46000},
  22:{p25:31000,med:36200,p75:40100},
  23:{p25:34500,med:43200,p75:55600},
  24:{p25:42500,med:48000,p75:56100}
};

// SCB 2024 månadslön per åldersgrupp (kr/mån) — källa: SCB LonYrkeAlder4AN via Supabase
// Fylls i efter att fetch-age-salary.js körts. Format: {a1824, a2534, a3544, a4554, a5564}
// null = SCB saknar data för den åldersgruppen
const SALA={
  1: {a1824:37000,a2534:48300,a3544:56700,a4554:60300,a5564:60400},
  // Övriga fylls i efter fetch — lägg till här efter att du kört fetch-age-salary.js
};

const PN={
  1:{pro:['Remote-arbete standard — de flesta tjänster tillåter hemifrån','35 000 kr ingångslön med snabb stegring till 52 500+','Konsultuppdrag kan ge 50–80% högre timpris','Kort utbildning (3 år) relativt lönenivån'],con:['15% AI-automatiseringsrisk — rutinkodning ersätts redan','Kräver ständig vidareutbildning vid teknikskiften','Konsultmarknaden svänger kraftigt med konjunkturen','Stressigt vid projektdeadlines i agila team']},
  14:{pro:['Nästan 100% anställningsbarhet — akut brist i hela landet','OB-tillägg för kvällar, nätter och helger höjer faktisk lön','Möjlighet att specialisera sig med lönepåslag','Offentlig anställning med tjänstepension och kollektivavtal'],con:['Schemaarbete med nätter, helger och röda dagar','Jour och beredskap kan krävas beroende på avdelning','Hög personalomsättning inom vissa specialiteter','Begränsad löneutveckling utan chefsroll eller specialisering']}
};

// CITIES DATA
const CITIES = [
  {slug:'stockholm', name:'Stockholm', intro:'Stockholm är landets största arbetsmarknad för {yrke} med flest arbetsgivare och generellt de högsta lönerna.'},
  {slug:'goteborg', name:'Göteborg', intro:'Göteborg har en stark arbetsmarknad för {yrke}, särskilt inom industri och tech med Volvo, SKF och en växande startup-scen.'},
  {slug:'malmo', name:'Malmö', intro:'Malmö erbjuder en dynamisk arbetsmarknad för {yrke} med närhet till Köpenhamn och en växande tech- och mediabranche.'},
  {slug:'uppsala', name:'Uppsala', intro:'Uppsala kombinerar universitetsstad med stark arbetsmarknad för {yrke}, särskilt inom life science och forskning.'},
  {slug:'linkoping', name:'Linköping', intro:'Linköping är ett nav för {yrke} inom tech och försvar med Saab, universitetet och en stark ingenjörstradition.'},
  {slug:'umea', name:'Umeå', intro:'Umeå erbjuder goda möjligheter för {yrke} med universitetet, regionsjukhuset och en växande tech-scen i norra Sverige.'},
  {slug:'orebro', name:'Örebro', intro:'Örebro har en stabil arbetsmarknad för {yrke} med bra pendlingsavstånd till både Stockholm och Göteborg.'}
];

const STUDENTUM_CODES = {
  stockholm: 'd82783', goteborg: 'd82793', malmo: 'd82779',
  uppsala: 'd87335', linkoping: 'd82802', umea: 'd82786', orebro: 'd82780'
};

// HELPERS
const fmt = n => Math.round(n).toLocaleString('sv-SE');
const SIG = {
  dem:   { cls:'badge-dem',    cardCls:'sv-dem',    label:'Hög efterfrågan' },
  stress:{ cls:'badge-stress', cardCls:'sv-stress', label:'Låg stress' },
  flex:  { cls:'badge-flex',   cardCls:'sv-flex',   label:'Flexibelt' },
  fast:  { cls:'badge-fast',   cardCls:'sv-fast',   label:'Snabbt få jobb' }
};

// ══════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ══════════════════════════════════════════════════════

/**
 * Renderar löneutveckling per åldersgrupp (SCB 2024).
 * Returnerar tom sträng om SALA saknar data för detta yrke.
 */
function renderAgeSalary(id, name) {
  const sa = SALA[id];
  if (!sa) return '';

  const groups = [
    { label: '18–24 år', val: sa.a1824 },
    { label: '25–34 år', val: sa.a2534 },
    { label: '35–44 år', val: sa.a3544 },
    { label: '45–54 år', val: sa.a4554 },
    { label: '55–64 år', val: sa.a5564 },
  ].filter(g => g.val != null);

  if (groups.length === 0) return '';

  const max = Math.max(...groups.map(g => g.val));

  const bars = groups.map(g => {
    const pct = Math.round((g.val / max) * 100);
    return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:68px;font-size:.75rem;color:var(--mu);flex-shrink:0">${g.label}</div>
      <div style="flex:1;background:var(--bo);border-radius:4px;height:22px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:#5C7D8F;border-radius:4px;transition:width .4s"></div>
      </div>
      <div style="width:72px;text-align:right;font-size:.82rem;font-weight:700;color:var(--tx);flex-shrink:0">${fmt(g.val)} kr</div>
    </div>`;
  }).join('');

  return `
  <div class="block" style="margin-top:12px">
    <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--li);margin-bottom:12px">Löneutveckling per ålder · ${name} <span style="background:var(--al);color:var(--ac);font-size:.64rem;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px">SCB 2024</span></div>
    ${bars}
    <div style="font-size:.72rem;color:var(--mu);margin-top:8px">Genomsnittlig månadslön (före skatt) per åldersgrupp, samtliga sektorer.</div>
  </div>`;
}

function renderYrkePage(eduSlug) {
  const e = E.find(x => x.slug === eduSlug);
  if (!e) return '<p>Utbildning hittades inte.</p>';
  
  const sig = SIG[e.sig] || SIG.dem;
  const demL = ['','Mycket låg','Låg','Medel','Hög','Mycket hög'];
  const futL = ['','Mycket svag','Svag','Stabil','God','Mycket god'];
  const demC = ['','#B04830','#9A6A00','#5A8FB5','#5BA882','#5BA882'];
  const futC = ['','#B04830','#9A6A00','#5A8FB5','#5BA882','#5BA882'];
  const sd = SALD[e.id] || {p25:Math.round(e.s0*.9),med:Math.round(e.s0*1.1),p75:Math.round(e.s0*1.25)};
  const debt = e.tc * Math.round(e.y * 10);
  
  const pn = PN[e.id] || {
    pro:[
      e.dem>=4?'Hög efterfrågan på arbetsmarknaden':'God anställningsbarhet efter examen',
      `Ingångslön ${fmt(e.s0)} kr med potential upp till ${fmt(e.s1)} kr`,
      e.ai<=10?'Låg risk för AI-automatisering':'Yrket kräver mänsklig kompetens',
      e.future>=4?'God framtidsprognos enligt Arbetsförmedlingen':'Stabil bransch'
    ],
    con:[
      e.stress>=4?'Hög arbetsbelastning':'Kräver kontinuerlig kompetensutveckling',
      `${e.y} år studietid — CSN-skuld ca ${fmt(debt)} kr`,
      e.ai>=20?`${e.ai}% risk för AI-automatisering`:'Kräver anpassning till utveckling',
      'Ingångslönen lägre än erfaren lön'
    ]
  };
  const chk = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  const cross = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  
  let html = `
  <div class="dhero">
    <div class="dhero-name">${e.t}</div>
    <div class="dhero-tags">
      <span>${e.y} år</span>
      <span>${fmt(e.s0)} kr ingångslön</span>
      <span class="${sig.cls}" style="padding:4px 12px;border-radius:6px">${sig.label}</span>
    </div>
  </div>

  <div class="sec-h"><div class="sec-n">1</div>Översikt</div>
  <div class="ov-grid">
    <div class="ov-card">
      <div class="ov-label">Studietid</div>
      <div class="ov-val">${e.y} år</div>
      <div class="ov-sub">heltidsutbildning</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:#5BA882">Ingångslön</div>
      <div class="ov-val" style="color:#5BA882">${fmt(e.s0)} kr</div>
      <div class="ov-sub">direkt efter examen</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:${demC[e.dem]}">Efterfrågan</div>
      <div class="ov-val" style="color:${demC[e.dem]}">${demL[e.dem]}</div>
      <div class="ov-sub">Arbetsförmedlingen 2024</div>
    </div>
    <div class="ov-card">
      <div class="ov-label">Medianlön (SCB)</div>
      <div class="ov-val">${fmt(e.s1)} kr</div>
      <div class="ov-sub">hälften tjänar mer</div>
    </div>
    <div class="ov-card">
      <div class="ov-label">AI-risk</div>
      <div class="ov-val" style="color:${e.ai<=10?'#5BA882':e.ai<=20?'#9A6A00':'#B04830'}">${e.ai}%</div>
      <div class="ov-sub">automation inom 10 år</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:#B04830">CSN-skuld</div>
      <div class="ov-val" style="color:#B04830">~${fmt(debt)} kr</div>
      <div class="ov-sub">efter ${e.y} år studier</div>
    </div>
  </div>

  <div class="sec-h"><div class="sec-n">2</div>Behörighet</div>
  <div class="req-box">
    <div class="req-label">Du behöver dessa kurser</div>
    <div class="req-list">${e.req.map(r => `<span class="req-tag">${r}</span>`).join('')}</div>
    <div class="req-note">Saknar du någon kurs? Du kan komplettera gratis via Komvux. <a href="/skapa-min-plan">Vi kontrollerar din behörighet →</a></div>
  </div>

  <div class="pn-grid">
    <div class="pn-box pn-pro">
      <div class="pn-head">${chk} Fördelar</div>
      <div class="pn-list">${pn.pro.map(p=>`<div class="pn-item">${chk}<span>${p}</span></div>`).join('')}</div>
    </div>
    <div class="pn-box pn-con">
      <div class="pn-head">${cross} Nackdelar</div>
      <div class="pn-list">${pn.con.map(c=>`<div class="pn-item">${cross}<span>${c}</span></div>`).join('')}</div>
    </div>
  </div>

  <div class="sec-h"><div class="sec-n">3</div>Lön</div>
  <div class="block">
    <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--li);margin-bottom:4px">Medianlön · ${e.t}</div>
    <div class="sal-big">${fmt(sd.med)} kr</div>
    <div class="sal-sub">Hälften tjänar mer, hälften tjänar mindre <span style="background:var(--al);color:var(--ac);font-size:.64rem;font-weight:700;padding:2px 8px;border-radius:4px">SCB 2024</span></div>
    <div class="pct-grid">
      <div class="pct-c" style="background:#F0FDF4"><div class="pct-v" style="color:#14532D">${fmt(sd.p75)} kr</div><div class="pct-l" style="color:#166534">25% tjänar detta eller mer</div></div>
      <div class="pct-c" style="background:#FFF7ED"><div class="pct-v" style="color:#7C2D12">${fmt(sd.p25)} kr</div><div class="pct-l" style="color:#9A3412">25% tjänar detta eller mindre</div></div>
    </div>
  </div>
  ${renderAgeSalary(e.id, e.t)}

  <div class="sec-h"><div class="sec-n">4</div>Var vill du utbilda dig?</div>
  <div class="city-links">
    <h3>Välj stad för att se utbildningar och arbetsmarknad</h3>
    <div class="city-grid">
      ${CITIES.map(c => `<a href="/utbildningar/${e.slug}/${c.slug}" class="city-link">${c.name}</a>`).join('')}
    </div>
  </div>

  <div style="background:#5C7D8F;border-radius:16px;padding:26px 22px;text-align:center;margin-top:24px;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 1px,transparent 14px)"></div>
    <div style="position:relative">
      <h3 style="font-family:'DM Serif Display',serif;font-size:1.35rem;color:#fff;margin-bottom:8px;line-height:1.3">Skapa din personliga plan för ${e.t.toLowerCase()}</h3>
      <p style="color:rgba(255,255,255,.85);font-size:.86rem;margin-bottom:18px;max-width:440px;margin-left:auto;margin-right:auto">Vi kontrollerar din behörighet, räknar ut ekonomin och listar skolor — på 3 minuter.</p>
      <a href="/skapa-min-plan" style="background:#fff;color:#5C7D8F;font-size:.92rem;font-weight:700;padding:12px 30px;border-radius:8px;text-decoration:none;display:inline-block">Sätt igång →</a>
    </div>
  </div>`;
  
  return html;
}

function renderStadPage(eduSlug, citySlug) {
  const e = E.find(x => x.slug === eduSlug);
  const city = CITIES.find(c => c.slug === citySlug);
  if (!e || !city) return '<p>Sidan hittades inte.</p>';
  
  const sig = SIG[e.sig] || SIG.dem;
  const demL = ['','Mycket låg','Låg','Medel','Hög','Mycket hög'];
  const demC = ['','#B04830','#9A6A00','#5A8FB5','#5BA882','#5BA882'];
  const debt = e.tc * Math.round(e.y * 10);
  const cityIntro = city.intro.replace('{yrke}', e.t.toLowerCase());
  
  const studentumCode = STUDENTUM_CODES[citySlug] || '';
  const studentumUrl = `https://www.studentum.se/search/${e.slug}?${studentumCode ? `filters=${studentumCode}&` : ''}utm_source=studievagsguiden&utm_medium=utbildningar&utm_campaign=${e.slug}-${citySlug}`;
  
  let html = `
  <div class="dhero">
    <div class="dhero-name">Bli ${e.t} i ${city.name}</div>
    <div class="dhero-tags">
      <span>${e.y} år</span>
      <span>${fmt(e.s0)} kr ingångslön</span>
      <span>${city.name}</span>
    </div>
    <div class="city-info-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>${cityIntro}</p>
    </div>
  </div>

  <div class="sec-h"><div class="sec-n">1</div>Översikt</div>
  <div class="ov-grid">
    <div class="ov-card">
      <div class="ov-label">Studietid</div>
      <div class="ov-val">${e.y} år</div>
      <div class="ov-sub">heltidsutbildning</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:#5BA882">Ingångslön</div>
      <div class="ov-val" style="color:#5BA882">${fmt(e.s0)} kr</div>
      <div class="ov-sub">direkt efter examen</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:${demC[e.dem]}">Efterfrågan</div>
      <div class="ov-val" style="color:${demC[e.dem]}">${demL[e.dem]}</div>
      <div class="ov-sub">Arbetsförmedlingen 2024</div>
    </div>
    <div class="ov-card">
      <div class="ov-label">Medianlön (SCB)</div>
      <div class="ov-val">${fmt(e.s1)} kr</div>
      <div class="ov-sub">hälften tjänar mer</div>
    </div>
    <div class="ov-card">
      <div class="ov-label">AI-risk</div>
      <div class="ov-val" style="color:${e.ai<=10?'#5BA882':e.ai<=20?'#9A6A00':'#B04830'}">${e.ai}%</div>
      <div class="ov-sub">automation inom 10 år</div>
    </div>
    <div class="ov-card">
      <div class="ov-label" style="color:#B04830">CSN-skuld</div>
      <div class="ov-val" style="color:#B04830">~${fmt(debt)} kr</div>
      <div class="ov-sub">efter ${e.y} år studier</div>
    </div>
  </div>

  <div class="sec-h"><div class="sec-n">2</div>Behörighet</div>
  <div class="req-box">
    <div class="req-label">Du behöver dessa kurser</div>
    <div class="req-list">${e.req.map(r => `<span class="req-tag">${r}</span>`).join('')}</div>
    <div class="req-note">Saknar du någon kurs? Du kan komplettera gratis via Komvux i ${city.name}. <a href="/skapa-min-plan">Vi kontrollerar din behörighet →</a></div>
  </div>

  <div class="sec-h"><div class="sec-n">3</div>Utbildningar i ${city.name}</div>
  <div class="block">
    <p style="font-size:.9rem;color:var(--mu);line-height:1.7;margin-bottom:16px">Hitta utbildningar till ${e.t.toLowerCase()} i ${city.name}. Jämför högskolor, yrkeshögskolor och kurser.</p>
    <a href="${studentumUrl}" target="_blank" rel="noopener" style="display:inline-block;background:var(--ac);color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:.9rem">Se utbildningar i ${city.name} på Studentum →</a>
  </div>

  <div class="sec-h"><div class="sec-n">4</div>Andra städer</div>
  <div class="city-links">
    <div class="city-grid">
      ${CITIES.filter(c => c.slug !== citySlug).map(c => `<a href="/utbildningar/${e.slug}/${c.slug}" class="city-link">${c.name}</a>`).join('')}
    </div>
  </div>

  <div style="background:#5C7D8F;border-radius:16px;padding:26px 22px;text-align:center;margin-top:24px;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 1px,transparent 14px)"></div>
    <div style="position:relative">
      <h3 style="font-family:'DM Serif Display',serif;font-size:1.35rem;color:#fff;margin-bottom:8px;line-height:1.3">Skapa din personliga plan för ${e.t.toLowerCase()} i ${city.name}</h3>
      <p style="color:rgba(255,255,255,.85);font-size:.86rem;margin-bottom:18px;max-width:440px;margin-left:auto;margin-right:auto">Vi kontrollerar din behörighet, räknar ut ekonomin och listar skolor i ${city.name}.</p>
      <a href="/skapa-min-plan" style="background:#fff;color:#5C7D8F;font-size:.92rem;font-weight:700;padding:12px 30px;border-radius:8px;text-decoration:none;display:inline-block">Sätt igång →</a>
    </div>
  </div>`;
  
  return html;
}

// ══════════════════════════════════════════════════════
// INIT — Detect page type from PAGE object
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PAGE === 'undefined') return;
  
  const content = document.getElementById('pageContent');
  if (!content) return;
  
  if (PAGE.type === 'yrke') {
    content.innerHTML = renderYrkePage(PAGE.edu);
  } else if (PAGE.type === 'stad') {
    content.innerHTML = renderStadPage(PAGE.edu, PAGE.city);
  }
  
  // Show sticky bar
  const sticky = document.getElementById('stickyBar');
  if (sticky) {
    sticky.style.display = 'block';
    setTimeout(() => sticky.classList.add('show'), 500);
  }
});
