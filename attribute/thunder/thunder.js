const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadGroups(path,constantName){
  const text=await fetch(path,{cache:'no-store'}).then(res=>{
    if(!res.ok) throw new Error(`${path} ${res.status}`);
    return res.text();
  });
  const re=new RegExp(`const ${constantName}=([\\s\\S]*?);`);
  const match=text.match(re);
  if(!match) throw new Error(`${constantName} not found`);
  return Function(`return ${match[1]}`)();
}

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
  const [overallGroups,zombieGroups]=await Promise.all([
    loadGroups('/tata-tier/tata-tier.js','overallTierGroups'),
    loadGroups('/zombie-rush/zombie-rush.js','tierGroups')
  ]);
  const overall=buildRankMap(overallGroups);
  const zombie=buildRankMap(zombieGroups);
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

bootThunderBadges().catch(err=>{
  console.error(err);
  document.querySelectorAll('[data-tier-slot]').forEach(slot=>{
    slot.innerHTML='<span class="tier-badge">評価確認中</span>';
  });
});
