const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const CATS=['Open','Women','Groms'];
let selected='Open';

function render(){
  const catalog=BracketProjection.getSeedCatalog()?.categories||{};
  document.querySelector('#seeding-cats').innerHTML=CATS.map(cat=>{
    const n=(catalog[cat]||[]).length;
    return `<button type="button" class="tab seeding-cat ${cat===selected?'active':''}" data-cat="${esc(cat)}">${esc(cat)} <small>${n}</small></button>`;
  }).join('');
  document.querySelectorAll('#seeding-cats .tab').forEach(b=>b.onclick=()=>{selected=b.dataset.cat;render()});

  document.querySelector('#seeding-title').textContent=`${selected} seeding`;

  const rows=catalog[selected]||[];
  document.querySelector('#seed-table tbody').innerHTML=rows.map(r=>`<tr>
    <td class="seed">${r.seed}</td>
    <td class="time">${esc(r.time||'')}</td>
    <td class="rider">${esc(r.name)}</td>
  </tr>`).join('')||`<tr><td colspan="3">No seeds for ${esc(selected)}</td></tr>`;

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
            <span class="who">${esc(s.name)}</span>
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
