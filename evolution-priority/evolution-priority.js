const attrIcon=Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta])=>[attr,meta.icon]));
const modeLabels={overall:'総合',normal:'通常',zombie:'ゾンビ',dojo:'道場',beginner:'初心者'};
const priorityOrder={'最優先候補':0,'優先候補':1,'用途次第':2,'評価保留':3};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;
let state={families:[],skills:{},ratings:{},priority:{},transitions:[]};

async function boot(){
  const [tatari,skills,ratings,priority]=await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tata-skills.json'),
    fetchJson('/data/tier-ratings.json'),
    fetchJson('/data/evolution-priority.json')
  ]);
  state={families:tatari.families||[],skills:skills.byFamily||{},ratings,priority,transitions:[]};
  state.transitions=buildTransitions();
  renderRoadmap();
  renderDiagnosisControls();
  renderImpact();
  renderAuraSummary();
  renderLongTerm();
  bindFilters();
  renderTransitionList();
}

async function fetchJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function buildTransitions(){
  return state.families.flatMap(f=>{
    const sf=state.skills[f.id];
    if(!sf) return [];
    return sf.stages.slice(0,-1).map(stage=>{
      const next=sf.stages.find(s=>s.stage===stage.stage+1);
      const key=`${f.id}:${stage.stage}-${next.stage}`;
      const delta=diffStages(stage,next);
      const meta=transitionMeta(f,stage,next,delta);
      return {key,family:f,from:stage,to:next,delta,...meta};
    });
  });
}

function transitionMeta(f,from,to,delta){
  const key=`${f.id}:${from.stage}-${to.stage}`;
  const explicit=state.priority.transitionOverrides?.[key];
  const impact=state.priority.highImpactTransitions?.find(x=>x.familyId===f.id&&x.fromStage===from.stage&&x.toStage===to.stage);
  let priority=explicit?.priority||impact?.priority||'評価保留';
  let reason=explicit?.reason||impact?.reason||'現在の公開情報では進化優先度を付ける根拠が不足しています。スキル差分と手持ち編成を見て判断してください。';
  const first=state.priority.t3Roadmap?.firstPriority?.find(x=>x.familyId===f.id);
  const second=state.priority.t3Roadmap?.secondPriority?.find(x=>x.familyId===f.id);
  if(from.stage===2&&to.stage===3&&first){priority=first.priority; reason=first.reason;}
  if(from.stage===2&&to.stage===3&&second){priority=second.priority; reason=second.reason;}
  const requiredStars=from.stage===2&&to.stage===3?(first?.requiredStars||second?.requiredStars||state.priority.t3Roadmap?.defaultRequiredStars||18):null;
  return {priority,reason,requiredStars,headline:impact?.headline||deltaHeadline(delta)};
}

function diffStages(from,to){
  const prev=new Map((from.values||[]).map(v=>[v.label,v.value]));
  const next=new Map((to.values||[]).map(v=>[v.label,v.value]));
  const added=[], changed=[], missing=[];
  for(const [label,value] of next) {
    if(!prev.has(label)) added.push({label,value});
    else if(prev.get(label)!==value) changed.push({label,from:prev.get(label),to:value});
  }
  for(const [label,value] of prev) if(!next.has(label)) missing.push({label,value});
  return {
    skillNameChanged:from.skillName!==to.skillName,
    descriptionChanged:from.description!==to.description,
    added,
    changed,
    missing
  };
}

function deltaHeadline(delta){
  if(delta.added.length) return `${delta.added[0].label}が追加`;
  if(delta.changed.length) return `${delta.changed[0].label}が変化`;
  if(delta.skillNameChanged) return 'スキル名が変化';
  return '記載上の数値差分は少なめ';
}

function renderRoadmap(){
  const groups=[
    ['SSS：最優先',state.priority.t3Roadmap.firstPriority,'通常18星組より大幅に少ない星数で第3進化を狙えるため、序盤の戦力強化効率が高い。'],
    ['SS：次に狙いたい',state.priority.t3Roadmap.secondPriority,'6星組の次に低コスト。主力編成や不足している役割に合わせて育成候補にする。']
  ];
  $('#t3Roadmap').innerHTML=groups.map(([title,items,lead])=>`<article class="priority-tata-card roadmap-card"><h3>${esc(title)}</h3><p>${esc(lead)}</p>${items.map(item=>roadmapItem(item)).join('')}</article>`).join('');
}

function roadmapItem(item){
  const f=family(item.familyId);
  const sf=state.skills[item.familyId];
  const t3=sf?.stages.find(s=>s.stage===3);
  const first=sf?.stages[0];
  const note=item.familyId==='gantoru'?`<small>初期：${esc(first?.tataName||'コロカメ')}</small>`:'';
  return `<a class="mini-family-row" href="/tata/${esc(item.familyId)}/"><img src="${esc(thumb(f.evolutions[0]?.image))}" alt="${esc(first?.tataName||f.familyName)}"><span><b>${esc(f.familyName)}系</b>${note}<em>T3：${esc(t3?.tataName)} / ${item.requiredStars}星</em></span></a>`;
}

function renderDiagnosisControls(){
  $('#familySelect').innerHTML=state.families.map(f=>`<option value="${esc(f.id)}">${esc(f.familyName)}系（${f.evolutions.map(e=>e.name).join(' / ')}）</option>`).join('');
  $('#familySelect').value='purabi';
  updateStageOptions();
  $('#stageSelect').value='2';
  ['familySelect','stageSelect','modeSelect'].forEach(id=>$('#'+id).addEventListener('change',()=>{if(id==='familySelect') updateStageOptions(); renderDiagnosis();}));
  renderDiagnosis();
}

function updateStageOptions(){
  const id=$('#familySelect').value;
  const stages=(state.skills[id]?.stages||[]).filter(s=>state.skills[id].stages.some(n=>n.stage===s.stage+1));
  $('#stageSelect').innerHTML=stages.map(s=>`<option value="${s.stage}">第${s.stage}進化：${esc(s.tataName)}</option>`).join('');
}

function renderDiagnosis(){
  const id=$('#familySelect').value;
  const fromStage=Number($('#stageSelect').value);
  const mode=$('#modeSelect').value;
  const tx=state.transitions.find(t=>t.family.id===id&&t.from.stage===fromStage);
  if(!tx){$('#diagnosisResult').innerHTML='<p>次の進化がありません。</p>'; return;}
  const modeTier=modeTierFor(id,mode);
  const zombieAura=mode==='zombie'&&tx.from.stage===3&&tx.to.stage===4?`<div class="notice-line">ゾンビラッシュではT4オーラ無効：${esc(state.priority.modeNotes.zombieRush.message)}</div>`:'';
  $('#diagnosisResult').innerHTML=`<div class="diagnosis-main">
    <div><small>現在</small><b>${esc(tx.from.tataName)}</b><span>${esc(tx.from.skillName)}</span></div>
    <div class="arrow-down">→</div>
    <div><small>次</small><b>${esc(tx.to.tataName)}</b><span>${esc(tx.to.skillName)}</span></div>
  </div>
  <div class="tier-inline">${badge('進化判断',tx.priority)}${badge('総合',state.ratings.overall?.byFamily?.[id]?.tier)}${modeTier?badge(modeLabels[mode],modeTier):''}</div>
  ${deltaHtml(tx.delta)}
  ${zombieAura}
  <p class="diagnosis-reason"><b>理由：</b>${esc(tx.reason)}</p>`;
}

function renderImpact(){
  $('#impactGrid').innerHTML=state.priority.highImpactTransitions.map(item=>{
    const tx=state.transitions.find(t=>t.family.id===item.familyId&&t.from.stage===item.fromStage&&t.to.stage===item.toStage);
    return tx?transitionCard(tx,true):'';
  }).join('');
}

function renderAuraSummary(){
  const auraMap={火:'オーラ・炎：仲間の攻撃力増加',雷:'オーラ・雷：仲間の攻撃速度増加',草:'オーラ・草：仲間のHP増加',水:'オーラ・水：仲間を継続回復',岩:'オーラ・岩：仲間の被ダメージ減少'};
  $('#auraSummary').innerHTML=Object.entries(auraMap).map(([attr,text])=>{
    const sample=state.transitions.find(t=>t.family.attribute===attr&&t.from.stage===3&&t.to.stage===4&&t.delta.added.some(v=>v.label.includes('オーラ')));
    const vals=sample?sample.delta.added.filter(v=>v.label.includes('オーラ')).map(v=>`${v.label} ${v.value}`).join(' / '):'';
    return `<li>${esc(text)}${vals?`<br><small>例：${esc(vals)}</small>`:''}</li>`;
  }).join('');
}

function renderLongTerm(){
  $('#longTermGrid').innerHTML=state.priority.longTermRecommended.map(item=>{
    const f=family(item.familyId);
    const first=state.skills[item.familyId]?.stages[0];
    return `<article class="priority-tata-card"><div class="priority-tata-head"><h3>${esc(f.familyName)}系</h3><div>${badge('総合',state.ratings.overall?.byFamily?.[f.id]?.tier)}</div></div><p class="tier-chain">${chain(f)}</p><p>${esc(item.reason)}</p><a class="detail-link" href="/tata/${esc(f.id)}/">詳しく見る</a>${first?.tataName!==f.familyName?`<p class="tier-chain">初期：${esc(first?.tataName)}</p>`:''}</article>`;
  }).join('');
}

function bindFilters(){
  ['searchInput','stageFilter','attributeFilter','listModeFilter','priorityFilter'].forEach(id=>$('#'+id).addEventListener('input',renderTransitionList));
}

function renderTransitionList(){
  const q=$('#searchInput').value.trim().toLowerCase();
  const stage=$('#stageFilter').value;
  const attr=$('#attributeFilter').value;
  const priority=$('#priorityFilter').value;
  let list=state.transitions.filter(t=>{
    if(stage!=='all'&&`${t.from.stage}-${t.to.stage}`!==stage) return false;
    if(attr!=='all'&&t.family.attribute!==attr) return false;
    if(priority==='top'&&t.priority!=='最優先候補') return false;
    if(priority==='priority'&&!['最優先候補','優先候補'].includes(t.priority)) return false;
    if(q){
      const hay=[t.family.id,t.family.familyName,...t.family.evolutions.map(e=>e.name),...state.skills[t.family.id].stages.map(s=>s.skillName)].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort((a,b)=>(priorityOrder[a.priority]-priorityOrder[b.priority])||a.family.familyName.localeCompare(b.family.familyName,'ja'));
  $('#transitionGrid').innerHTML=list.length?list.map(t=>transitionCard(t,false)).join(''):'<div class="empty">条件に合う進化差分がありません。</div>';
}

function transitionCard(tx,compact){
  const mode=$('#listModeFilter')?.value||'overall';
  const z=state.ratings.zombieRush?.byFamily?.[tx.family.id]?.tier;
  const zombieAura=mode==='zombie'&&tx.from.stage===3&&tx.to.stage===4?`<div class="notice-line">ゾンビラッシュではT4オーラ無効</div>`:'';
  return `<article class="evolution-card" data-family-id="${esc(tx.family.id)}">
    <div class="evolution-card-head"><img src="${esc(thumb(tx.family.evolutions[0]?.image))}" alt="${esc(tx.family.familyName)}"><div><span class="attribute">${attrIcon[tx.family.attribute]||''} ${esc(tx.family.attribute)}属性</span><h3>${esc(tx.family.familyName)}系</h3><p>${esc(tx.from.tataName)} → ${esc(tx.to.tataName)}</p></div></div>
    <div class="tier-inline">${badge('進化',tx.priority)}${badge('総合',state.ratings.overall?.byFamily?.[tx.family.id]?.tier)}${z?badge('ゾンビ',z):''}${modeTierFor(tx.family.id,mode)?badge(modeLabels[mode],modeTierFor(tx.family.id,mode)):''}</div>
    <p class="evolution-headline">${esc(tx.headline)}</p>
    ${deltaHtml(tx.delta)}
    ${zombieAura}
    ${compact?`<p>${esc(tx.reason)}</p>`:''}
    <a class="detail-link" href="/tata/${esc(tx.family.id)}/">詳しく見る</a>
  </article>`;
}

function deltaHtml(delta){
  const rows=[];
  if(delta.skillNameChanged) rows.push('<li>スキル名が変化</li>');
  rows.push(...delta.added.map(v=>`<li>追加：${esc(v.label)} ${esc(v.value)}</li>`));
  rows.push(...delta.changed.map(v=>`<li>${esc(v.label)}：${esc(v.from)} → ${esc(v.to)}</li>`));
  rows.push(...delta.missing.map(v=>`<li>次進化データでは項目記載なし：${esc(v.label)} ${esc(v.value)}</li>`));
  if(!rows.length&&delta.descriptionChanged) rows.push('<li>説明文が変化</li>');
  return `<ul class="delta-list">${rows.join('')||'<li>記載上の数値差分は少なめ</li>'}</ul>`;
}

function badge(label,value){
  return `<span class="tier-badge">${esc(label)} ${esc(value||'評価保留')}</span>`;
}

function family(id){return state.families.find(f=>f.id===id);}
function chain(f){return f.evolutions.map(e=>e.name).join(' → ');}
function modeTierFor(id,mode){
  const o=state.ratings.overall?.byFamily?.[id];
  if(mode==='overall') return null;
  if(mode==='zombie') return state.ratings.zombieRush?.byFamily?.[id]?.tier||o?.zombie;
  return o?.[mode];
}

boot().catch(err=>{
  console.error(err);
  const root=$('#transitionGrid');
  if(root) root.innerHTML='<div class="empty">データの読み込みに失敗しました。ページを再読み込みしてください。</div>';
});
