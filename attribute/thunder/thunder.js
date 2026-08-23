const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function buildRankMap(groups){
  const map=new Map();
  groups.forEach(group=>group.ids.forEach(id=>map.set(id,group.rank)));
  return map;
}

function badge(label,rank){
  const key=String(rank||'評価保留').toLowerCase();
  const cls=['sss','ss','s','a'].includes(key)?` rank-${key}`:'';
  return `<span class="tier-badge${cls}">${esc(label)} ${esc(rank||'評価保留')}</span>`;
}

async function bootThunderBadges(){
  const ratings=await fetchJson('/data/tier-ratings.json');
  const overall=buildRankMap(ratings.overall?.groups||[]);
  const zombie=buildRankMap(ratings.zombieRush?.groups||[]);
  document.querySelectorAll('[data-family-id]').forEach(card=>{
    const id=card.dataset.familyId;
    const slot=card.querySelector('[data-tier-slot]');
    if(!slot) return;
    slot.innerHTML=[
      badge('総合',overall.get(id)),
      zombie.has(id)?badge('ゾンビ',zombie.get(id)):''
    ].join('');
  });
}

async function fetchJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

bootThunderBadges().catch(err=>{
  console.error(err);
  document.querySelectorAll('[data-tier-slot]').forEach(slot=>{
    slot.innerHTML='<span class="tier-badge">評価確認中</span>';
  });
});
