const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const CATS=['Open','Women','Groms'];
let selected='Open';

function hasTime(r){
  return window.BracketProjection?.riderHasTime
    ? BracketProjection.riderHasTime(r)
    : Boolean(r && ((r.timeSec!=null && Number.isFinite(Number(r.timeSec))) || String(r.time||'').trim()));
}

function render(){
  const catalog=BracketProjection.getSeedCatalog()?.categories||{};
  document.querySelector('#seeding-cats').innerHTML=CATS.map(cat=>{
    const n=(catalog[cat]||[]).length;
    return `<button type="button" class="tab seeding-cat ${cat===selected?'active':''}" data-cat="${esc(cat)}">${esc(cat)} <small>${n}</small></button>`;
  }).join('');
  document.querySelectorAll('#seeding-cats .tab').forEach(b=>b.onclick=()=>{selected=b.dataset.cat;render()});

  document.querySelector('#seeding-title').textContent=`${selected} seeding`;

  const raw=catalog[selected]||[];
  const locked=raw.some(hasTime);
  const rows=locked
    ? [...raw].sort((a,b)=>(a.seed||999)-(b.seed||999))
    : [...raw].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));

  const seedHead=document.querySelector('#seed-list-note');
  if(seedHead){
    seedHead.textContent=locked
      ? 'From qualifying TT ranks (category-local). Better seed = lower number.'
      : 'Nobody has a TT time yet — riders listed A–Z. Heat slots stay as Seed N until times lock seeds.';
  }

  document.querySelector('#seed-table tbody').innerHTML=rows.map(r=>`<tr>
    <td class="seed">${locked?(r.seed??'—'):'—'}</td>
    <td class="time">${esc(locked?(r.time||''):'')}</td>
    <td class="rider">${esc(r.name)}</td>
  </tr>`).join('')||`<tr><td colspan="3">No riders for ${esc(selected)}</td></tr>`;

  const board=BracketProjection.buildCategoryHeatGrids(selected);
  document.querySelector('#heats-title').textContent=board.roundLabel;
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
