const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const CATS=['Open','Women','Groms'];
let selected='Open';

/** Official OWAR seeding-race format (2026). */
const FORMAT={
  Open:{
    lead:'Open uses F1-style qualifying: two timed sessions. Fastest single lap wins the seed — total laps do not matter.',
    sessions:[
      {label:'Q1',detail:'30 min · all riders · locks seeds 17–32 (slowest half)'},
      {label:'Break',detail:'30 min'},
      {label:'Q2',detail:'30 min · top 16 from Q1 only · locks seeds 1–16 · Q1 laps do not carry over'},
    ],
    noteLocked:'Seeds 17–32 from Q1; seeds 1–16 from Q2 best lap.',
    noteOpen:'Nobody has a seeding-race lap yet — riders A–Z. Heat slots stay Seed N until Q1/Q2 lock seeds.',
  },
  Women:{
    lead:'Women: one 20 min seeding race. Everyone on track together; fastest single lap = seed 1, and so on.',
    sessions:[{label:'Seeding',detail:'20 min · all riders · locks every seed'}],
    noteLocked:'Seeded by best lap in the single Women session.',
    noteOpen:'Nobody has a seeding-race lap yet — riders A–Z. Heat slots stay Seed N until the session locks seeds.',
  },
  Groms:{
    lead:'Groms: one 20 min seeding race. Everyone on track together; fastest single lap = seed 1, and so on.',
    sessions:[{label:'Seeding',detail:'20 min · all riders · locks every seed'}],
    noteLocked:'Seeded by best lap in the single Groms session.',
    noteOpen:'Nobody has a seeding-race lap yet — riders A–Z. Heat slots stay Seed N until the session locks seeds.',
  },
};

function hasTime(r){
  return window.BracketProjection?.riderHasTime
    ? BracketProjection.riderHasTime(r)
    : Boolean(r && ((r.timeSec!=null && Number.isFinite(Number(r.timeSec))) || String(r.time||'').trim()));
}

function sessionForSeed(cat, seed){
  if(cat!=='Open' || seed==null) return '';
  const n=Number(seed);
  if(n>=1 && n<=16) return 'Q2';
  if(n>=17) return 'Q1';
  return '';
}

function render(){
  const catalog=BracketProjection.getSeedCatalog()?.categories||{};
  const fmt=FORMAT[selected]||FORMAT.Open;

  document.querySelector('#seeding-cats').innerHTML=CATS.map(cat=>{
    const n=(catalog[cat]||[]).length;
    return `<button type="button" class="tab seeding-cat ${cat===selected?'active':''}" data-cat="${esc(cat)}">${esc(cat)} <small>${n}</small></button>`;
  }).join('');
  document.querySelectorAll('#seeding-cats .tab').forEach(b=>b.onclick=()=>{selected=b.dataset.cat;render()});

  document.querySelector('#seeding-title').textContent=`${selected} seeding`;
  document.querySelector('#seeding-lead').textContent=fmt.lead;
  document.querySelector('#seed-format').innerHTML=`<ol class="seed-format-steps">${fmt.sessions.map(s=>`
    <li><strong>${esc(s.label)}</strong><span>${esc(s.detail)}</span></li>
  `).join('')}</ol>`;

  const raw=catalog[selected]||[];
  const locked=raw.some(hasTime);
  const showSession=selected==='Open';
  const rows=locked
    ? [...raw].sort((a,b)=>(a.seed||999)-(b.seed||999))
    : [...raw].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));

  document.querySelector('#seed-list-note').textContent=locked?fmt.noteLocked:fmt.noteOpen;
  const sessionHead=document.querySelector('#seed-session-head');
  sessionHead.hidden=!showSession;
  const colSpan=showSession?4:3;

  document.querySelector('#seed-table tbody').innerHTML=rows.map(r=>{
    const session=locked?sessionForSeed(selected,r.seed):'';
    return `<tr>
      <td class="seed">${locked?(r.seed??'—'):'—'}</td>
      ${showSession?`<td class="session">${esc(session||'—')}</td>`:''}
      <td class="time">${esc(locked?(r.time||''):'')}</td>
      <td class="rider">${esc(r.name)}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="${colSpan}">No riders for ${esc(selected)}</td></tr>`;

  const board=BracketProjection.buildCategoryHeatGrids(selected);
  document.querySelector('#heats-title').textContent=board.roundLabel;
  document.querySelector('#heats-note').textContent=
    'Staggered gates 1–4. After the first knockout round: both race winners take starts 1–2 (better seed ahead), both 2nds take 3–4 (better seed ahead).';
  document.querySelector('#heat-grid').innerHTML=board.heats.map(h=>`
    <article class="heat-card">
      <header>
        <strong>${esc(h.title)}</strong>
        <span>seeds ${esc(h.subtitle)}</span>
      </header>
      <ol class="start-grid">
        ${h.slots.map(s=>`
          <li class="${s.known?'':'missing'}">
            <span class="gate">${s.startPos}</span>
            <span class="seed-pill">s${s.seed}</span>
            <span class="who">${esc(s.known?s.name:`Seed ${s.seed}`)}</span>
            <span class="tt">${esc(s.time)}</span>
          </li>
        `).join('')}
      </ol>
    </article>
  `).join('');
  document.querySelector('#heat-grid').classList.toggle('heat-grid--few', board.heats.length<=2);
}

async function main(){
  await BracketProjection.loadSeeds('/data/owa-2025-seeds.json');
  render();
}
main().catch(err=>{
  document.querySelector('#heat-grid').innerHTML=`<p class="note">Could not load seeds: ${esc(err.message)}</p>`;
});
