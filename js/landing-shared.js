/* Studievägsguiden — Delad JS för landningssidor */
/* Version 1.0 — Extraherad 2026-03-20 */

// ══════════════════════════════════════════════════════════════════
// DATA — E-array (29 utbildningar), SALD (SCB-lönedata)
// ══════════════════════════════════════════════════════════════════

const E=[
// ── IT & Teknik ──
{id:1,t:'Systemutvecklare',y:3,s0:35000,s1:52500,dem:4,ai:15,stress:2,future:4,tc:8000,req:['Matte 2','Engelska 6'],rp:['Naturvetenskap','Teknik'],pp:['Samhäll','Ekonomi'],sc:{st:'Utvecklare på företag',ho:'Konsult / byter bolag',sp:'Arkitekt / specialist',le:'Tech lead / CTO'}},
{id:2,t:'Dataanalytiker',y:3,s0:33000,s1:54700,dem:4,ai:12,stress:2,future:5,tc:8000,req:['Matte 3c','Engelska 6'],rp:['Naturvetenskap','Teknik','Ekonomi'],pp:['Samhäll'],sc:{st:'Dataanalytiker junior',ho:'Senior analytiker / konsult',sp:'Data scientist / BI-specialist',le:'Analytics manager'}},
{id:3,t:'IT-säkerhetsspecialist',y:3,s0:33000,s1:55000,dem:5,ai:5,stress:3,future:5,tc:8000,req:['Matte 2'],rp:['Naturvetenskap','Teknik'],pp:['Samhäll','Ekonomi'],sc:{st:'Säkerhetsanalytiker',ho:'Konsult / byter organisation',sp:'Cybersecurity specialist',le:'CISO / säkerhetschef'}},
// ── Ekonomi & Business ──
{id:9,t:'Redovisningsekonom',y:2,s0:30000,s1:42300,dem:4,ai:20,stress:2,future:3,tc:8000,req:['Matte 2','Engelska 6'],rp:['Ekonomi','Samhäll'],pp:['Naturvetenskap','Teknik'],sc:{st:'Redovisningsekonom',ho:'Konsult / byter byrå',sp:'Auktoriserad revisor',le:'Ekonomichef'}},
{id:10,t:'Controller',y:3,s0:33000,s1:53100,dem:4,ai:20,stress:3,future:3,tc:9000,req:['Matte 3c','Engelska 6'],rp:['Ekonomi','Naturvetenskap','Teknik'],pp:['Samhäll'],sc:{st:'Junior controller',ho:'Byter bransch / konsult',sp:'Senior controller',le:'CFO / ekonomichef'}},
{id:11,t:'Digital marknadsförare',y:2,s0:30000,s1:50800,dem:3,ai:18,stress:3,future:3,tc:8000,req:['Grundläggande behörighet'],rp:['Ekonomi','Samhäll','Estet'],pp:['Naturvetenskap','Teknik'],sc:{st:'Digital marknadsförare',ho:'Konsult / byrå',sp:'Specialist SEO/SEM/social',le:'Marknadschef'}},
{id:12,t:'HR-specialist',y:3,s0:30000,s1:47300,dem:3,ai:12,stress:3,future:3,tc:9000,req:['Samhällskunskap 1b','Matte 2'],rp:['Samhäll','Ekonomi'],pp:['Naturvetenskap','Teknik'],sc:{st:'HR-koordinator',ho:'Byter organisation',sp:'HR Business Partner',le:'HR-chef'}},
// ── Vård & Hälsa ──
{id:14,t:'Sjuksköterska',y:3,s0:32000,s1:42000,dem:5,ai:5,stress:4,future:5,tc:11000,req:['Naturkunskap 2','Matte 2','Samhällskunskap 1b'],rp:['Naturvetenskap','Teknik'],pp:['Samhäll','Ekonomi'],sc:{st:'Leg. sjuksköterska',ho:'Byter specialitet / region',sp:'Specialistsjuksköterska',le:'Vårdenhetschef'}},
{id:15,t:'Fysioterapeut',y:3,s0:30000,s1:39100,dem:4,ai:5,stress:3,future:4,tc:10000,req:['Naturkunskap 2','Matte 2','Samhällskunskap 1b'],rp:['Naturvetenskap','Vård'],pp:['Teknik','Ekonomi'],sc:{st:'Legitimerad fysioterapeut',ho:'Byter vårdgivare / privat',sp:'Specialist / idrottsfysio',le:'Verksamhetschef'}},
{id:16,t:'Arbetsterapeut',y:3,s0:29000,s1:38500,dem:4,ai:5,stress:3,future:4,tc:10000,req:['Naturkunskap 2','Matte 2','Samhällskunskap 1b'],rp:['Naturvetenskap','Vård'],pp:['Teknik','Ekonomi'],sc:{st:'Leg. arbetsterapeut',ho:'Byter region / verksamhet',sp:'Specialist / konsult',le:'Verksamhetschef'}},
{id:17,t:'Biomedicinsk analytiker',y:3,s0:30000,s1:42900,dem:4,ai:8,stress:2,future:4,tc:10000,req:['Naturkunskap 2','Matte 2','Kemi 1'],rp:['Naturvetenskap','Teknik'],pp:['Samhäll','Ekonomi'],sc:{st:'Biomedicinsk analytiker',ho:'Byter laboratorium / region',sp:'Cytodiagnostiker / specialist',le:'Laboratoriekemist / chef'}},
{id:18,t:'Tandhygienist',y:3,s0:30000,s1:40200,dem:4,ai:5,stress:3,future:4,tc:10000,req:['Naturkunskap 2','Matte 2','Samhällskunskap 1b'],rp:['Naturvetenskap','Vård'],pp:['Teknik','Ekonomi'],sc:{st:'Leg. tandhygienist',ho:'Byter klinik / region',sp:'Specialist / konsult',le:'Klinikchet / eget företag'}},
// ── Samhälle & Människor ──
{id:20,t:'Grundskollärare',y:3.5,s0:29000,s1:40800,dem:5,ai:5,stress:4,future:4,tc:10000,req:['Matte 2','Engelska 6','Svenska 3'],rp:['Samhäll','Naturvetenskap','Ekonomi','Teknik'],pp:['Estet','Vård'],sc:{st:'Klassrumslärare',ho:'Byter skola / kommun',sp:'Förstelärare',le:'Rektor / skolledare'}},
{id:21,t:'Gymnasielärare',y:4.5,s0:31000,s1:42600,dem:4,ai:5,stress:3,future:4,tc:10000,req:['Engelska 6','Svenska 3'],rp:['Samhäll','Naturvetenskap','Ekonomi','Teknik'],pp:['Estet','Vård'],sc:{st:'Ämneslärare',ho:'Byter skola / ämne',sp:'Förstelärare',le:'Rektor / skolledare'}},
{id:22,t:'Studie- och yrkesvägledare',y:3,s0:29000,s1:36200,dem:4,ai:5,stress:2,future:4,tc:9000,req:['Samhällskunskap 1b'],rp:['Samhäll'],pp:['Naturvetenskap','Teknik'],sc:{st:'Studie- och yrkesvägledare',ho:'Byter skola / sektor',sp:'Senior vägledare / specialist',le:'Verksamhetschef'}},
// ── Tekniska / Praktiska ──
{id:24,t:'Byggingenjör',y:3,s0:34000,s1:48000,dem:4,ai:8,stress:3,future:4,tc:9000,req:['Matte 3c','Fysik 2','Kemi 1'],rp:['Naturvetenskap','Teknik'],pp:['Samhäll'],sc:{st:'Byggingenjör',ho:'Konsult / byter projekt',sp:'Projektingenjör / specialist',le:'Projektchef / platschef'}},
{id:25,t:'Fastighetsförvaltare',y:3,s0:34000,s1:43200,dem:4,ai:8,stress:2,future:4,tc:9000,req:['Matte 2'],rp:['Ekonomi','Teknik','Samhäll'],pp:['Naturvetenskap'],sc:{st:'Fastighetsförvaltare',ho:'Byter bolag / region',sp:'Teknisk förvaltare / specialist',le:'Förvaltningschef / fastighetschef'}}
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
  15:{p25:33000,med:39000,p75:47000},
  16:{p25:35000,med:38500,p75:42200},
  17:{p25:39700,med:42900,p75:47600},
  18:{p25:36000,med:40200,p75:44900},
  20:{p25:36500,med:40800,p75:44600},
  21:{p25:39600,med:42600,p75:46000},
  22:{p25:31000,med:36200,p75:40100},
  24:{p25:42500,med:48000,p75:56100},
  25:{p25:34500,med:43200,p75:55600}
};

// Pros/Cons per utbildning
const PN={
  1:{pro:['35 000 kr ingångslön med snabb stegring till 52 500+','Remote-arbete standard — de flesta tjänster tillåter hemifrån','Konsultuppdrag kan ge 50–80% högre timpris än fast anställning','Kort utbildning (3 år) relativt lönenivån'],con:['15% AI-automatiseringsrisk — rutinkodning ersätts redan','Kräver ständig vidareutbildning vid teknikskiften','Internationell konkurrens pressar löner i vissa segment','Konsultmarknaden svänger kraftigt med konjunkturen']},
  14:{pro:['Nästan 100% anställningsbarhet — akut brist i hela landet','OB-tillägg för kvällar, nätter och helger höjer faktisk lön','Möjlighet att specialisera sig (IVA, ambulans, barnmorska) med lönepåslag','Offentlig anställning med kollektivavtal, tjänstepension och full semester'],con:['Schemaarbete med nätter, helger och röda dagar','Jour och beredskap kan krävas beroende på avdelning','Hög personalomsättning inom vissa specialiteter','Lönetak — begränsad löneutveckling utan chefsroll eller vidareutbildning']},
  20:{pro:['13 veckors sammanhängande ledighet (lov) utöver semester','Jobb i alla kommuner — ingen geografisk begränsning','Lönetillägg som förstelärare (+5 000 kr/mån)','Statliga studielånsavskrivningar för lärare i bristämnen'],con:['Hög administrativ börda — dokumentation, åtgärdsprogram, omdömen','Stor lärarbrist leder till högre arbetsbelastning per lärare','Lönetak runt 41 000 kr utan skolledarroll','Begränsad karriärstege — förstelärare eller rektor är i princip enda stegen']},
  21:{pro:['13 veckors sammanhängande ledighet (lov) utöver semester','Jobb i alla kommuner — ingen geografisk begränsning','Lönetillägg som förstelärare (+5 000 kr/mån)','Statliga studielånsavskrivningar för lärare i bristämnen'],con:['Hög administrativ börda — dokumentation, åtgärdsprogram, omdömen','Stor lärarbrist leder till högre arbetsbelastning per lärare','Lönetak runt 43 000 kr utan skolledarroll','Begränsad karriärstege — förstelärare eller rektor är i princip enda stegen']}
};

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════

let edu=null, sal=0;

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

const fmt=n=>n.toLocaleString('sv-SE');

function resetPage(){
  const salEl=document.getElementById('inSal');
  const eduEl=document.getElementById('inEdu');
  if(salEl) salEl.value='';
  if(eduEl) eduEl.value='';
  document.getElementById('secR').classList.remove('v');
  document.querySelectorAll('.sec-body.open').forEach(b=>{if(b.id!=='body1')b.classList.remove('open')});
  document.querySelectorAll('.sec-toggle.open').forEach(b=>b.classList.remove('open'));
  const bar=document.getElementById('stickyBar');
  if(bar) bar.style.display='none';
  const cta=document.getElementById('ctaPlan');
  if(cta) cta.style.opacity='0';
  try{localStorage.removeItem('svg_sal');localStorage.removeItem('svg_edu');}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});
}

function toggleSec(n){
  const body=document.getElementById('body'+n);
  const btn=document.getElementById('toggle'+n);
  if(!body||!btn) return;
  const opening=!body.classList.contains('open');
  body.classList.toggle('open');
  btn.classList.toggle('open');
  const labels={1:'Visa översikt',2:'Visa lönespridning',3:'Visa karriärscenarier',4:'Visa livstidsanalys'};
  const labelsClose={1:'Dölj översikt',2:'Dölj lönespridning',3:'Dölj karriärscenarier',4:'Dölj livstidsanalys'};
  btn.childNodes[0].textContent=(opening?labelsClose:labels)[n]+' ';
}

function toggleGC(el){
  const isOpen=el.classList.contains('open');
  document.querySelectorAll('.gcx.open').forEach(c=>c.classList.remove('open'));
  if(!isOpen) el.classList.add('open');
}

function initScrollReveal(){
  const style=document.createElement('style');
  style.textContent=`.reveal{opacity:0;transform:translateY(22px);transition:opacity .55s ease, transform .55s ease}.reveal.visible{opacity:1;transform:none}`;
  document.head.appendChild(style);
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  },{threshold:0.08});
  window._revealObs = obs;
  function observeAll(){
    document.querySelectorAll('.sh, .sec-toggle, .verd, #ctaPlan, #scrollTeaser').forEach(el=>{
      if(!el.classList.contains('reveal')){
        if(el.id==='ctaPlan') return;
        el.classList.add('reveal');
        obs.observe(el);
      }
    });
  }
  observeAll();
  window._revealObserveAll = observeAll;
}

function initStickyBar(){
  const bar = document.getElementById('stickyBar');
  const trigger = document.getElementById('sh2');
  if(!bar||!trigger) return;
  function onScroll(){
    const triggerTop = trigger.getBoundingClientRect().top;
    bar.style.transform = triggerTop <= 80 ? 'translateY(0)' : 'translateY(100%)';
  }
  bar.style.transition = 'transform .3s ease';
  bar.style.transform = 'translateY(100%)';
  window.removeEventListener('scroll', window._stickyScroll||null);
  window._stickyScroll = onScroll;
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

// ══════════════════════════════════════════════════════════════════
// CALCULATION — calcG()
// ══════════════════════════════════════════════════════════════════

function calcG(){
  sal=parseInt(document.getElementById('inSal').value)||0;
  const eid=parseInt(document.getElementById('inEdu').value);
  if(!sal||!eid){alert('Fyll i din lön och välj utbildning.');return}
  edu=E.find(e=>e.id===eid);
  try{ localStorage.setItem('svg_edu', eid); localStorage.setItem('svg_sal', sal); }catch(e){}
  
  const e=edu,bo=e.s0-sal,mo=Math.round(e.y*10),de=e.tc*mo,op=sal*12*e.y,yg=bo*12,be=yg>0?Math.ceil((op+de)/yg):0;
  document.getElementById('gvB').textContent=(bo>=0?'+':'')+fmt(bo)+' kr/mån';
  document.getElementById('gvD').textContent=Math.round(de/1000)+' tkr';
  document.getElementById('gvBE').textContent=be>0&&be<50?'~'+be+' år':'—';
  document.getElementById('secR').classList.add('v');
  
  setTimeout(()=>{
    const target = document.getElementById('secR');
    const targetY = target.getBoundingClientRect().top + window.pageYOffset - 70;
    const startY = window.pageYOffset;
    const dist = targetY - startY;
    const duration = 700;
    let start = null;
    function easeInOut(t){ return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
    function step(ts){
      if(!start) start=ts;
      const elapsed = ts-start;
      const progress = Math.min(elapsed/duration, 1);
      window.scrollTo(0, startY + dist * easeInOut(progress));
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, 80);
  
  document.querySelectorAll('.gc').forEach((c,i)=>setTimeout(()=>c.classList.add('sh2'),200+i*150));
  buildInfoCards(e);
  buildProsAndCons(e);
  buildSalaryInfo(e);
  buildLifetimeAnalysis(e);
  
  // Fade in CTA
  const ctaEl=document.getElementById('ctaPlan');
  const ctaObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        ctaEl.style.opacity='1';
        ctaObs.disconnect();
      }
    });
  },{threshold:0.15});
  ctaObs.observe(ctaEl);
  
  setTimeout(()=>{ if(window._revealObserveAll) window._revealObserveAll(); },100);
  document.getElementById('stickyBar').style.display='block';
  initStickyBar();
}

// ══════════════════════════════════════════════════════════════════
// BUILD FUNCTIONS
// ══════════════════════════════════════════════════════════════════

function buildInfoCards(e){
  const demL=['','Mycket låg','Låg','Medel','Hög','Mycket hög'];
  const futL=['','Mycket svag','Svag','Stabil','God','Mycket god'];
  const demC=['','#B04830','#9A6A00','#5A8FB5','#5BA882','#5BA882'];
  const strC=['','#5BA882','#5BA882','#9A6A00','#B04830','#B04830'];
  const futC=['','#B04830','#9A6A00','#5A8FB5','#5BA882','#5BA882'];
  const demDesc={1:'Få lediga tjänster och hög konkurrens.',2:'Begränsat antal tjänster. Kan ta tid.',3:'Balanserad arbetsmarknad.',4:'Arbetsgivare söker aktivt. Goda chanser.',5:'Akut brist. Nästan garanterat jobb direkt.'};
  const strDesc={1:'Lugn miljö med god balans.',2:'Hanterbar belastning, stressigt ibland.',3:'Omväxlande tempo, generellt balanserat.',4:'Hög belastning och tidpress regelbundet.',5:'Konstant högt tryck. Hög personalomsättning.'};
  const futDesc={1:'Branschen krymper. Jobben minskar.',2:'Osäker framtid, risk för omställning.',3:'Stabil bransch utan stora förändringar.',4:'Växande bransch med ökande behov.',5:'Mycket stark tillväxt. AI-risk: '+e.ai+'%.'};
  const gvDem=document.getElementById('gvDem');
  const gvStr=document.getElementById('gvStr');
  const gvFut=document.getElementById('gvFut');
  gvDem.textContent=demL[e.dem];gvDem.style.color=demC[e.dem];
  gvStr.textContent=e.ai+'%';gvStr.style.color='#5BA882';
  gvFut.textContent=futL[e.future];gvFut.style.color=futC[e.future];
  document.getElementById('gc4').querySelector('.gl').style.color=demC[e.dem];
  document.getElementById('gc5').querySelector('.gl').style.color='#5BA882';
  document.getElementById('gc6').querySelector('.gl').style.color=futC[e.future];
  document.getElementById('gceDem').innerHTML=`<div class="gcexp-inner"><p>${demDesc[e.dem]}</p><div class="gcbar"><div class="gcfill" style="width:${e.dem*20}%;background:${demC[e.dem]}"></div></div><div class="gcmeta"><span>Låg</span><span>Mycket hög</span></div></div>`;
  document.getElementById('gceStr').innerHTML=`<div class="gcexp-inner"><p>${strDesc[e.stress]}</p><div class="gcbar"><div class="gcfill" style="width:${e.stress*20}%;background:${strC[e.stress]}"></div></div><div class="gcmeta"><span>Lugnt</span><span>Mycket hög</span></div></div>`;
  document.getElementById('gceFut').innerHTML=`<div class="gcexp-inner"><p>${futDesc[e.future]}</p><div class="gcbar"><div class="gcfill" style="width:${e.future*20}%;background:${futC[e.future]}"></div></div><div class="gcmeta"><span>Svag</span><span>Mycket god</span></div></div>`;
}

function buildProsAndCons(e){
  const fallback={
    pro:[
      e.dem>=4?'Hög efterfrågan på arbetsmarknaden':'God anställningsbarhet efter examen',
      `Ingångslön ${fmt(e.s0)} kr med potential upp till ${fmt(e.s1)} kr`,
      e.ai<=10?'Låg risk för AI-automatisering':'Yrket kräver mänsklig kompetens och omdöme',
      e.future>=4?'God framtidsprognos enligt Arbetsförmedlingen':'Stabil bransch med kontinuerliga behov'
    ],
    con:[
      e.stress>=4?'Stressigt yrke med hög arbetsbelastning':'Kräver kontinuerlig kompetensutveckling',
      `${e.y} års studietid med CSN-skuld på ca ${fmt(e.tc*Math.round(e.y*10))} kr`,
      e.ai>=20?`${e.ai}% risk för AI-automatisering inom 10 år`:'Kräver anpassning till teknisk utveckling',
      'Ingångslön lägre än erfaren lön — tar tid att nå lönetoppen'
    ]
  };
  const d=PN[e.id]||fallback;
  const chk='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const cross='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  let h=`<div class="pnbox pnpro"><div class="pnhead"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Fördelar</div><div class="pnlist">`;
  d.pro.forEach(p=>{h+=`<div class="pnitem">${chk}<span>${p}</span></div>`});
  h+=`</div></div><div class="pnbox pncon"><div class="pnhead"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Nackdelar</div><div class="pnlist">`;
  d.con.forEach(c=>{h+=`<div class="pnitem">${cross}<span>${c}</span></div>`});
  h+=`</div></div>`;
  document.getElementById('pnCont').innerHTML=h;
  document.querySelectorAll('.pnbox').forEach((b,i)=>setTimeout(()=>b.classList.add('sh2'),900+i*150));
}

function buildSalaryInfo(e){
  const sd=SALD[e.id]||{p25:Math.round(e.s0*1.1),med:Math.round(e.s0+(e.s1-e.s0)*0.45),p75:Math.round(e.s0+(e.s1-e.s0)*0.8)};
  const gap=sd.med-e.s0;
  const growthPerYear=(e.s1-e.s0)/10;
  const yrsToMed=growthPerYear>0?Math.max(1,Math.round(gap/growthPerYear)):4;
  const yrsLabel=yrsToMed<=2?'1–2 år':yrsToMed<=4?'3–4 år':yrsToMed<=6?'4–6 år':'5–8 år';
  const scale=sd.p75-sd.p25;
  const barMedPct=Math.round((sd.med-sd.p25)/scale*100);
  const scenarios=[
    {label:'Stanna länge',desc:'10–15 år på samma arbetsplats',salary:Math.round(e.s0+(e.s1-e.s0)*0.5),color:'#6c757d'},
    {label:'Byta ofta',desc:'5–10 byten av arbetsgivare',salary:Math.round(e.s0+(e.s1-e.s0)*0.7),color:'#0dcaf0'},
    {label:'Specialist',desc:'Expertroll utan chefsansvar',salary:Math.round(e.s1*1.1),color:'#0d6efd'},
    {label:'Chef',desc:'Ledande position',salary:Math.round(e.s1*1.3),color:'#198754'}
  ];
  const maxSalary=Math.max(...scenarios.map(s=>s.salary));
  
  let h=`<div id="salaryInfoHead"></div><div style="max-width:720px;margin:0 auto">
  <div class="sh" id="sh2"><h2>2. Lön</h2></div>
  <button class="sec-toggle" id="toggle2" onclick="toggleSec(2)">Visa lönespridning <svg class="sec-toggle-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
  <div class="sec-body" id="body2">
  <div class="verd sh2" style="animation-delay:.7s;text-align:left;padding:28px 24px;margin-top:12px">
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px">
        <span style="font-family:'DM Serif Display',serif;font-size:2.6rem;line-height:1;color:var(--tx)">${fmt(sd.med)} kr</span>
        <span style="font-size:1rem;color:var(--mu);font-weight:500">/mån</span>
        <span style="font-size:.72rem;font-weight:700;background:var(--al);color:var(--ac);padding:3px 10px;border-radius:12px;letter-spacing:.3px">SCB 2024</span>
      </div>
      <div style="font-size:.88rem;color:var(--mu)">Hälften tjänar mer, hälften tjänar mindre som <strong>${e.t.toLowerCase()}</strong></div>
      <div style="margin-top:10px;height:1px;background:var(--bo)"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:22px">
      <div style="padding:14px 12px;background:var(--al);border-radius:10px;border:1.5px solid #A8D8BC">
        <div style="font-family:'DM Serif Display',serif;font-size:1.35rem;color:var(--ac);line-height:1.1;margin-bottom:5px">${fmt(sd.p75)} kr</div>
        <div style="font-size:.75rem;color:var(--mu);line-height:1.4">25% tjänar detta<br>eller mer</div>
      </div>
      <div style="padding:14px 12px;background:var(--rl);border-radius:10px;border:1.5px solid #DDA898">
        <div style="font-family:'DM Serif Display',serif;font-size:1.35rem;color:var(--re);line-height:1.1;margin-bottom:5px">${fmt(sd.p25)} kr</div>
        <div style="font-size:.75rem;color:var(--mu);line-height:1.4">25% tjänar detta<br>eller mindre</div>
      </div>
    </div>
    <div style="margin-bottom:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:.82rem;font-weight:600;color:var(--tx)">Lönespridning i yrket</span>
        <span style="font-size:.76rem;color:var(--mu)">${fmt(sd.p75-sd.p25)} kr skillnad P25→P75</span>
      </div>
      <div style="position:relative;height:10px;background:var(--bo);border-radius:5px;overflow:hidden">
        <div style="position:absolute;left:0;top:0;height:100%;width:100%;background:linear-gradient(90deg,var(--ac),var(--ah));border-radius:5px"></div>
        <div style="position:absolute;left:${barMedPct}%;top:-2px;width:3px;height:14px;background:var(--tx);border-radius:2px;transform:translateX(-1px)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:5px">
        <span style="font-size:.72rem;color:var(--mu)">${fmt(sd.p25)}</span>
        <span style="font-size:.72rem;font-weight:700;color:var(--tx)">${fmt(sd.med)} kr (median)</span>
        <span style="font-size:.72rem;color:var(--mu)">${fmt(sd.p75)}</span>
      </div>
    </div>
    <div style="padding:14px 16px;background:var(--al);border-radius:10px;border:1.5px solid var(--ac);display:flex;gap:12px;align-items:flex-start">
      <svg style="flex-shrink:0;margin-top:2px" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style="font-size:.86rem;color:var(--tx);line-height:1.6">Du börjar på <strong>${fmt(e.s0)} kr</strong> — ${fmt(gap)} kr under medianen. De flesta når medianen inom ${yrsLabel}. Förhandling och arbetsgivare avgör var du hamnar.</span>
    </div>
  </div>
  </div>`;
  
  h+=`<div class="sh" id="sh3"><h2>3. Karriär</h2></div>
  <button class="sec-toggle" id="toggle3" onclick="toggleSec(3)">Visa karriärscenarier <svg class="sec-toggle-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
  <div class="sec-body" id="body3">
  <div class="verd sh2" style="animation-delay:.8s;text-align:left;padding:24px 20px;margin-top:12px">
    <div style="display:grid;gap:12px">`;
  
  scenarios.forEach(sc=>{
    const widthPct=(sc.salary/maxSalary)*100;
    const diff=sc.salary-e.s0;
    const diffPct=Math.round((diff/e.s0)*100);
    h+=`<div style="padding:14px;background:#fff;border-radius:10px;border:1px solid var(--bo)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div><div style="font-weight:700;font-size:.9rem">${sc.label}</div><div style="font-size:.75rem;color:var(--mu)">${sc.desc}</div></div>
        <div style="text-align:right"><div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:${sc.color}">${fmt(sc.salary)} kr</div><div style="font-size:.7rem;color:var(--mu)">+${diffPct}%</div></div>
      </div>
      <div style="background:#e9ecef;height:28px;border-radius:6px;overflow:hidden;position:relative">
        <div style="background:${sc.color};height:100%;width:${widthPct}%;transition:width 1s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px">
          <span style="color:#fff;font-weight:600;font-size:.8rem">${Math.round(widthPct)}%</span>
        </div>
      </div>
    </div>`;
  });
  
  h+=`</div>
    <div style="margin-top:16px;padding:14px;background:#fff;border-radius:8px;font-size:.8rem;color:var(--mu);border-left:3px solid var(--ac)">
      <strong style="color:var(--ac)">Tips:</strong> Ingångslönen är bara starten — de flesta yrken har tydlig löneutveckling de första 5 åren.
    </div>
  </div>
  </div>
  <div class="sh" id="sh4"><h2>4. Livstidsanalys</h2></div>
  <button class="sec-toggle" id="toggle4" onclick="toggleSec(4)">Visa livstidsanalys <svg class="sec-toggle-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
  <div class="sec-body" id="body4">
  <div class="verd sh2" style="animation-delay:.9s;text-align:left;padding:24px 20px;margin-top:12px">
    <div id="lifetimeChart"></div>
    <div style="margin-top:14px;padding:12px;background:#fff;border-radius:8px;font-size:.75rem;color:var(--mu);border-left:3px solid var(--ac)">
      <strong style="color:var(--ac)">OBS:</strong> Förenklad kalkyl utan hänsyn till inflation, löneökningar eller skatter.
    </div>
  </div>
  </div>
  </div>`;
  
  document.getElementById('salaryInfo').innerHTML=h;
}

function buildLifetimeAnalysis(e){
  const workYears=40;
  const studyYears=e.y;
  function accumulate(startSal, years, growthFn){
    let total=0, s=startSal;
    for(let yr=1;yr<=years;yr++){
      total+=s*12;
      s*=(1+growthFn(yr));
    }
    return {total, finalSal:Math.round(s)};
  }
  const cur=accumulate(sal, workYears, ()=>0.02);
  const lost=accumulate(sal, studyYears, ()=>0.02);
  const debt=e.tc*Math.round(studyYears*10);
  const studyCost=lost.total+debt;
  const newJobYears=workYears-studyYears;
  const newJob=accumulate(e.s0, newJobYears, yr=>yr<=5?0.05:yr<=15?0.03:0.02);
  const newTotal=(newJob.total-studyCost)/1000000;
  const currentTotal=cur.total/1000000;
  const cur10=accumulate(sal,10,()=>0.02).finalSal;
  const cur20=accumulate(sal,20,()=>0.02).finalSal;
  const new10yr=Math.max(0,10-studyYears);
  const new20yr=Math.max(0,20-studyYears);
  const newSal10=new10yr>0?accumulate(e.s0,new10yr,yr=>yr<=5?0.05:yr<=15?0.03:0.02).finalSal:null;
  const newSal20=new20yr>0?accumulate(e.s0,new20yr,yr=>yr<=5?0.05:yr<=15?0.03:0.02).finalSal:null;
  const diff=newTotal-currentTotal;
  const diffAbs=Math.abs(diff);
  const maxVal=Math.max(currentTotal,newTotal);
  const currentPct=(currentTotal/maxVal)*100;
  const newPct=(newTotal/maxVal)*100;
  const betterColor=diff>0?'var(--ac)':'var(--re)';
  const worseColor=diff>0?'var(--re)':'var(--ac)';
  const curSub=`${fmt(sal)} → ~${fmt(cur10)} (10 år) → ~${fmt(cur20)} kr/mån (20 år)`;
  const newSub=newSal20?`${fmt(e.s0)} → ~${fmt(newSal10)} (10 år fr. idag) → ~${fmt(newSal20)} kr/mån (20 år fr. idag)`:newSal10?`${fmt(e.s0)} → ~${fmt(newSal10)} kr/mån (10 år fr. idag) — studier klara år ${studyYears}`:`Studier klara år ${studyYears} — löneutveckling startar därefter`;
  
  let h=`<div style="margin-bottom:28px"><div style="display:grid;gap:20px">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:.82rem;font-weight:600;color:var(--mu)">Fortsätt med nuvarande jobb</div>
        <div style="font-size:1.1rem;font-weight:700;color:${diff<=0?betterColor:worseColor}">${currentTotal.toFixed(1)} M kr</div>
      </div>
      <div style="height:36px;background:var(--bo);border-radius:8px;overflow:hidden">
        <div style="height:100%;background:${diff<=0?betterColor:worseColor};width:${currentPct}%;transition:width 1s ease;border-radius:8px"></div>
      </div>
      <div style="font-size:.72rem;color:var(--li);margin-top:4px">${curSub}</div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:.82rem;font-weight:600;color:var(--mu)">Plugga till ${e.t.toLowerCase()}</div>
        <div style="font-size:1.1rem;font-weight:700;color:${diff>0?betterColor:worseColor}">${newTotal.toFixed(1)} M kr</div>
      </div>
      <div style="height:36px;background:var(--bo);border-radius:8px;overflow:hidden">
        <div style="height:100%;background:${diff>0?betterColor:worseColor};width:${newPct}%;transition:width 1s ease .3s;border-radius:8px"></div>
      </div>
      <div style="font-size:.72rem;color:var(--li);margin-top:4px">${newSub}</div>
    </div>
  </div></div>
  <div style="background:${diff>0?'var(--al)':'var(--rl)'};border:2px solid ${diff>0?'var(--ac)':'var(--re)'};border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
    <div style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${diff>0?'var(--ac)':'var(--re)'};margin-bottom:6px">${diff>0?'Livstidsvinst':'Livstidsförlust'}</div>
    <div style="font-family:'DM Serif Display',serif;font-size:2rem;color:${diff>0?'var(--ac)':'var(--re)'};margin-bottom:6px">${diff>0?'+':'−'}${diffAbs.toFixed(1)} M kr</div>
    <div style="font-size:.85rem;color:${diff>0?'var(--ac)':'var(--re)'};opacity:.85">${diff>0?'Att plugga ger dig totalt '+diffAbs.toFixed(1)+' miljoner mer över 40 år':'Med nuvarande lön tjänar du '+diffAbs.toFixed(1)+' miljoner mer över 40 år'}</div>
  </div>
  <div style="padding:12px 14px;background:var(--bg);border-radius:8px;font-size:.75rem;color:var(--li);line-height:1.7">
    <strong style="color:var(--mu)">Antaganden:</strong> Nuvarande lön växer med 2 %/år. Ny yrkeslön växer med 5 %/år de första 5 åren, 3 %/år år 6–15, därefter 2 %/år. Studiekostnad = förlorad lön under studietiden (med 2 %-tillväxt) + CSN-skuld (${fmt(debt)} kr). Kalkylen exkluderar skatter, pension, inflation och eventuell lön under studietiden.
  </div>`;
  document.getElementById('lifetimeChart').innerHTML=h;
}

// ══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded',function(){
  // Populate education dropdown
  const s=document.getElementById('inEdu');
  if(!s){console.error('inEdu element not found');return}
  E.forEach(e=>{
    const o=document.createElement('option');
    o.value=e.id;
    o.textContent=e.t+' ('+e.y+' år)';
    s.appendChild(o);
  });
  
  // Save edu on change
  s.addEventListener('change',function(){
    const eid=parseInt(this.value)||0;
    try{ localStorage.setItem('svg_edu', eid); }catch(e){}
    edu=E.find(e=>e.id===eid)||null;
  });
  
  // Restore from localStorage if available
  try{
    const savedSal=localStorage.getItem('svg_sal');
    const savedEdu=localStorage.getItem('svg_edu');
    if(savedSal&&savedEdu&&parseInt(savedSal)>0&&parseInt(savedEdu)>0){
      const salEl=document.getElementById('inSal');
      const eduEl=document.getElementById('inEdu');
      if(salEl) salEl.value=savedSal;
      if(eduEl) eduEl.value=savedEdu;
      calcG();
    }
  }catch(e){}
  
  initScrollReveal();
  
  // Build FAQ from PAGE config
  if(window.PAGE && window.PAGE.faqs){
    const list=document.getElementById('faqList');
    if(list){
      window.PAGE.faqs.forEach((f,i)=>{
        const wrap=document.createElement('div');
        wrap.style.cssText='background:#fff;border:1.5px solid var(--bo);border-radius:12px;overflow:hidden;transition:border-color .2s';
        const btn=document.createElement('button');
        btn.style.cssText='width:100%;background:none;border:none;padding:18px 20px;font-family:inherit;font-size:.95rem;font-weight:600;color:var(--tx);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left';
        btn.innerHTML=`<span>${f.q}</span><svg style="flex-shrink:0;transition:transform .25s" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
        const body=document.createElement('div');
        body.style.cssText='max-height:0;overflow:hidden;transition:max-height .3s ease';
        const inner=document.createElement('div');
        inner.style.cssText='padding:0 20px 18px;font-size:.88rem;color:var(--mu);line-height:1.7';
        inner.textContent=f.a;
        body.appendChild(inner);
        wrap.appendChild(btn);
        wrap.appendChild(body);
        btn.addEventListener('click',()=>{
          const open=body.style.maxHeight!=='0px'&&body.style.maxHeight!=='';
          document.querySelectorAll('#faqList > div').forEach(w=>{
            w.style.borderColor='var(--bo)';
            w.querySelector('div').style.maxHeight='0px';
            w.querySelector('svg').style.transform='';
          });
          if(!open){
            body.style.maxHeight=body.scrollHeight+'px';
            wrap.style.borderColor='var(--ac)';
            btn.querySelector('svg').style.transform='rotate(180deg)';
          }
        });
        list.appendChild(wrap);
      });
    }
  }
});
