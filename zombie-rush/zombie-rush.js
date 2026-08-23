const attrIcon={草:'🌿',水:'💧',火:'🔥',雷:'⚡',土:'🪨'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;
let tierGroups=[];
let comments={};
let adoption={};
let annotations={};

async function bootZombieRush(){
  const [data,ratings]=await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tier-ratings.json')
  ]);
  const zombie=ratings.zombieRush||{};
  tierGroups=zombie.groups||[];
  const byFamily=zombie.byFamily||{};
  comments=Object.fromEntries(Object.entries(byFamily).filter(([,v])=>v.comment).map(([id,v])=>[id,v.comment]));
  adoption=Object.fromEntries(Object.entries(byFamily).filter(([,v])=>v.adoptionRate).map(([id,v])=>[id,v.adoptionRate]));
  annotations=Object.fromEntries(Object.entries(byFamily).filter(([,v])=>v.annotation).map(([id,v])=>[id,v.annotation]));
  const families=data.families||[];
  const byId=new Map(families.map(f=>[f.id,f]));
  const ranked=new Set(tierGroups.flatMap(g=>g.ids));
  $('#tierRoot').innerHTML=tierGroups.map(group=>renderTier(group,byId)).join('');
  const unrated=families.filter(f=>!ranked.has(f.id)).sort((a,b)=>a.familyName.localeCompare(b.familyName,'ja'));
  $('#unratedList').innerHTML=unrated.map(f=>`<a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a>`).join('');
}

async function fetchJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function renderTier(group,byId){
  const cards=group.ids.map(id=>{
    const f=byId.get(id);
    return f?renderCard(f,group.rank):`<div class="empty">未登録: ${esc(id)}</div>`;
  }).join('');
  return `<section class="tier-section rank-${group.rank.toLowerCase()}">
    <div class="tier-head"><span>${esc(group.rank)}</span><h3>${esc(group.label)}</h3></div>
    <div class="tier-cards">${cards}</div>
  </section>`;
}

function renderCard(f,rank){
  const first=f.evolutions[0];
  const chain=f.evolutions.map(e=>esc(e.name)).join(' → ');
  return `<a class="tier-card" href="/tata/${encodeURIComponent(f.id)}/">
    <div class="tier-image"><img loading="lazy" src="${esc(thumb(first.image))}" alt="${esc(first.name)}"></div>
    <div class="tier-body">
      <div class="tier-meta"><span class="tier-badge">${esc(rank)}</span><span>${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span></div>
      <h4>${esc(f.familyName)}系</h4>
      ${annotations[f.id]?`<p class="tier-annotation">${esc(annotations[f.id])}</p>`:''}
      ${adoption[f.id]?`<p class="adoption-rate">1000キル以上編成 採用率 ${esc(adoption[f.id])}</p>`:''}
      <p class="tier-chain">${chain}</p>
      ${comments[f.id]?`<p class="tier-comment">${esc(comments[f.id])}</p>`:''}
    </div>
  </a>`;
}

bootZombieRush().catch(err=>{
  console.error(err);
  $('#tierRoot').innerHTML='<div class="empty">data/tatari.json の読み込みに失敗しました。</div>';
});
