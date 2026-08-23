const modeLabels={overall:'総合',beginner:'初心者',normal:'通常',zombie:'ゾンビラッシュ',dojo:'道場'};
const attrFilters=['すべて','草','水','火','雷','土'];
const attrIcon={草:'🌿',水:'💧',火:'🔥',雷:'⚡',土:'🪨'};
const rankOrder={SSS:0,SS:1,S:2,A:3,'－':4};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;

let allFamilies=[];
let rankedItems=[];
let holdFamilies=[];
let overallTierGroups=[];
let assessments={};
let activeMode='overall';
let activeAttr='すべて';

async function bootTataTier(){
  renderFilters();
  const [data,ratings]=await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tier-ratings.json')
  ]);
  overallTierGroups=ratings.overall.groups||[];
  assessments=ratings.overall.byFamily||{};
  allFamilies=data.families||[];
  const byId=new Map(allFamilies.map(f=>[f.id,f]));
  const seen=new Set();
  rankedItems=overallTierGroups.flatMap((group,groupIndex)=>
    group.ids.map((id,order)=>{
      const family=byId.get(id);
      if(!family) return {missing:true,id,group,groupIndex,order};
      if(seen.has(id)) return {duplicate:true,id,group,groupIndex,order,family};
      seen.add(id);
      return {id,family,group,groupIndex,order,assessment:assessments[id]};
    })
  );
  holdFamilies=allFamilies.filter(f=>!seen.has(f.id)).sort((a,b)=>a.familyName.localeCompare(b.familyName,'ja'));
  render();
  window.__tataTierState={families:allFamilies,rankedItems,holdFamilies,overallTierGroups,assessments};
}

async function fetchJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function renderFilters(){
  $('#modeFilters').innerHTML=Object.entries(modeLabels).map(([mode,label])=>buttonHtml('mode',mode,label,mode===activeMode)).join('');
  $('#attributeTierFilters').innerHTML=attrFilters.map(attr=>buttonHtml('attr',attr,`${attrIcon[attr]||''}${attr}`,attr===activeAttr)).join('');
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{activeMode=btn.dataset.mode;renderFilters();render();}));
  document.querySelectorAll('[data-attr]').forEach(btn=>btn.addEventListener('click',()=>{activeAttr=btn.dataset.attr;renderFilters();render();}));
}

function buttonHtml(type,value,label,active){
  return `<button class="filter ${active?'is-active':''}" type="button" data-${type}="${esc(value)}">${esc(label)}</button>`;
}

function render(){
  const attrMatches=item=>activeAttr==='すべて'||item.family?.attribute===activeAttr;
  const visibleRanked=rankedItems.filter(item=>!item.missing&&!item.duplicate&&attrMatches(item));
  const visibleHold=holdFamilies.filter(f=>activeAttr==='すべて'||f.attribute===activeAttr);
  $('#tierCount').textContent=`Tier ${visibleRanked.length}系統 / 評価保留 ${visibleHold.length}系統`;

  if(activeMode==='overall'){
    $('#overallTierRoot').innerHTML=overallTierGroups.map(group=>{
      const cards=visibleRanked.filter(item=>item.group.rank===group.rank).map(renderCard).join('');
      return `<section class="tier-section rank-${group.rank.toLowerCase()} overall-section" data-tier="${esc(group.rank)}">
        <div class="tier-head"><span>${esc(group.rank)}</span><h3>${esc(group.label)}</h3></div>
        <div class="overall-cards">${cards||'<div class="empty">該当するタタがありません。</div>'}</div>
      </section>`;
    }).join('');
  }else{
    const sorted=[...visibleRanked].sort((a,b)=>{
      const ra=rankOrder[a.assessment?.[activeMode]||'－']??9;
      const rb=rankOrder[b.assessment?.[activeMode]||'－']??9;
      return ra-rb||a.groupIndex-b.groupIndex||a.order-b.order;
    });
    $('#overallTierRoot').innerHTML=`<section class="tier-section overall-section">
      <div class="tier-head"><span>${esc(modeLabels[activeMode])}</span><h3>${esc(modeLabels[activeMode])} 評価順</h3></div>
      <div class="overall-cards">${sorted.map(renderCard).join('')||'<div class="empty">該当するタタがありません。</div>'}</div>
    </section>`;
  }
  $('#holdList').innerHTML=visibleHold.map(f=>`<a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a>`).join('')||'<span class="empty-inline">該当するタタがありません。</span>';
}

function renderCard(item){
  if(item.missing) return `<div class="empty">未登録: ${esc(item.id)}</div>`;
  const {family:f,group,assessment:a}=item;
  const first=f.evolutions[0]||{};
  const chain=f.evolutions.map(e=>esc(e.name)).join(' → ');
  return `<article class="overall-card" data-id="${esc(f.id)}" data-attribute="${esc(f.attribute)}" data-overall="${esc(group.rank)}">
    <a class="overall-image" href="/tata/${encodeURIComponent(f.id)}/"><img loading="lazy" src="${esc(thumb(first.image))}" alt="${esc(first.name||f.familyName)}"></a>
    <div class="overall-body">
      <div class="overall-top">
        <span class="tier-badge rank-${esc(group.rank.toLowerCase())}">${esc(group.rank)}</span>
        <span class="attribute">${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span>
      </div>
      <h3><a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a></h3>
      <p class="tier-chain">${chain}</p>
      <div class="mode-ranks" aria-label="モード別評価">
        ${modeRank('通常',a.normal)}${modeRank('ゾンビ',a.zombie)}${modeRank('道場',a.dojo)}${modeRank('初心者',a.beginner)}
      </div>
      <div class="role-tags">${a.roles.map(role=>`<span>${esc(role)}</span>`).join('')}</div>
      <p class="overall-comment">${esc(a.comment)}</p>
      <a class="detail-link" href="/tata/${encodeURIComponent(f.id)}/">詳しく見る</a>
    </div>
  </article>`;
}

function modeRank(label,rank){
  return `<span><b>${esc(label)}</b><em class="rank-chip rank-${esc(String(rank).toLowerCase())}">${esc(rank||'－')}</em></span>`;
}

bootTataTier().catch(err=>{
  console.error(err);
  $('#overallTierRoot').innerHTML='<div class="empty">data/tatari.json の読み込みに失敗しました。</div>';
});
