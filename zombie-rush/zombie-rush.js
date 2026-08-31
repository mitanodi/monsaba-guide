const attrIcon=Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta])=>[attr,meta.icon]));
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {getFamilyDisplayName,getFamilyDisplayLabel}=MONSABA_FAMILY;
let tierGroups=[];
let comments={};
let adoption={};
let annotations={};
let imageByFamily=new Map();

const movementMeta={
  '大幅上昇':{symbol:'⬆',className:'is-strong-up'},
  '上昇':{symbol:'↑',className:'is-up'},
  '維持':{symbol:'→',className:'is-same'},
  '下降':{symbol:'↓',className:'is-down'},
  '大幅下降':{symbol:'⬇',className:'is-strong-down'},
  '実質下降':{symbol:'↓',className:'is-down'}
};

async function bootZombieRush(){
  const [data,ratings,prediction,season,imageData]=await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tier-ratings.json'),
    fetchJson('/data/zombie-rush/seasons/season-1-prediction.json'),
    fetchJson('/data/zombie-rush/seasons/season-1.json'),
    fetchJson('/data/tata-images.json')
  ]);
  imageByFamily=new Map((imageData.families||[]).map(item=>[item.familyId,item]));
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
  const unrated=families.filter(f=>!ranked.has(f.id)).sort((a,b)=>getFamilyDisplayName(a).localeCompare(getFamilyDisplayName(b),'ja'));
  $('#unratedList').innerHTML=unrated.map(f=>`<a href="/tata/${encodeURIComponent(f.id)}/">${esc(getFamilyDisplayLabel(f))}</a>`).join('');
  renderPrediction(prediction,season,byId);
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
  const image=imageByFamily.get(f.id)?.stage1;
  const chain=f.evolutions.map(e=>esc(e.name)).join(' → ');
  return `<a class="tier-card" href="/tata/${encodeURIComponent(f.id)}/">
    <div class="tier-image"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first.name)}"></div>
    <div class="tier-body">
      <div class="tier-meta"><span class="tier-badge">${esc(rank)}</span><span>${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span></div>
      <h4>${esc(getFamilyDisplayLabel(f))}</h4>
      ${annotations[f.id]?`<p class="tier-annotation">${esc(annotations[f.id])}</p>`:''}
      ${adoption[f.id]?`<p class="adoption-rate">1000キル以上編成 採用率 ${esc(adoption[f.id])}</p>`:''}
      <p class="tier-chain">${chain}</p>
      ${comments[f.id]?`<p class="tier-comment">${esc(comments[f.id])}</p>`:''}
    </div>
  </a>`;
}

function renderPrediction(prediction,season,byId){
  const predictions=new Map((prediction.predictions||[]).map(item=>[item.familyId,item]));
  const officialByFamily=new Map((season.tataSkillBalance||[]).map(item=>[item.familyId,item]));
  renderSeasonActualTier(prediction,byId);
  renderPredictionAccuracy(prediction);
  $('#predictionTierRoot').innerHTML=(prediction.tiers||[]).map(group=>renderPredictionTier(group,predictions,officialByFamily,byId)).join('');
  $('#predictionRiseRoot').innerHTML=renderRanking(prediction.rankings?.rising||[],predictions,byId);
  $('#predictionFallRoot').innerHTML=renderRanking(prediction.rankings?.falling||[],predictions,byId);
  $('#predictionAdoptionRoot').innerHTML=(prediction.adoptionPredictions||[]).map(item=>renderAdoption(item,byId)).join('');
  $('#predictionChipRoot').innerHTML=renderChipEnvironment(prediction.chipEnvironment||{},season.chipBalance||[]);
  $('#predictionHoldRoot').innerHTML=(prediction.holds||[]).map(item=>renderHold(item,byId)).join('');
}

function renderSeasonActualTier(prediction,byId){
  const root=$('#seasonActualRoot');
  if(!root) return;
  const judged=(prediction.predictions||[]).filter(item=>item.actualTier);
  if(!judged.length){
    root.innerHTML=`<div class="empty">現在は判定済み0 / ${(prediction.predictions||[]).length}系統です。難易度・編成・キル数を含む複数の実戦記録を確認中です。</div>`;
    return;
  }
  root.innerHTML=(prediction.comparisonConfig?.tierOrder||['SSS','SS','S','A']).map(rank=>{
    const ids=judged.filter(item=>item.actualTier===rank).map(item=>item.familyId);
    return ids.length?renderTier({rank,label:'Season 1実戦評価',ids},byId):'';
  }).join('');
}

function renderPredictionAccuracy(prediction){
  const stats=calculatePredictionAccuracy(prediction);
  $('#predictionExactRate').textContent=formatPredictionRate(stats.exactRate);
  $('#predictionWithinOneRate').textContent=formatPredictionRate(stats.withinOneRate);
  $('#predictionJudged').textContent=`${stats.judged} / ${stats.total}`;
  $('#predictionAccuracyStatus').textContent=stats.status;
  $('#predictionAccuracyNote').textContent=stats.judged===0
    ?'0%は全予測が外れたという意味ではありません。Season 1公開後の十分な実戦データがまだ揃っていないため、判定を保留しています。'
    :`未判定の${stats.total-stats.judged}系統は分母に含めず、判定済み${stats.judged}系統をもとに自動計算しています。`;
}

function calculatePredictionAccuracy(prediction){
  const tierOrder=prediction.comparisonConfig?.tierOrder||['SSS','SS','S','A'];
  const items=(prediction.predictions||[]).map(item=>({
    result:resolvePredictionResult(item,tierOrder),
    movementResult:resolveMovementResult(item,tierOrder)
  }));
  const judgedItems=items.filter(item=>item.result!=='pending');
  const exact=judgedItems.filter(item=>item.result==='exact').length;
  const withinOne=judgedItems.filter(item=>item.result==='exact'||item.result==='off_by_one').length;
  const movementJudged=items.filter(item=>item.movementResult!=='pending');
  return {
    total:items.length,
    judged:judgedItems.length,
    exact,
    offByOne:judgedItems.filter(item=>item.result==='off_by_one').length,
    miss:judgedItems.filter(item=>item.result==='miss').length,
    exactRate:judgedItems.length?exact/judgedItems.length*100:0,
    withinOneRate:judgedItems.length?withinOne/judgedItems.length*100:0,
    movementJudged:movementJudged.length,
    movementExact:movementJudged.filter(item=>item.movementResult==='exact').length,
    status:judgedItems.length===0?'答え合わせ前':judgedItems.length===items.length?'答え合わせ完了':'答え合わせ中'
  };
}

function resolvePredictionResult(item,tierOrder){
  if(!item.actualTier) return 'pending';
  const predictedIndex=tierOrder.indexOf(item.predictedTier);
  const actualIndex=tierOrder.indexOf(item.actualTier);
  if(predictedIndex<0||actualIndex<0) return ['exact','off_by_one','miss'].includes(item.result)?item.result:'pending';
  const difference=Math.abs(predictedIndex-actualIndex);
  return difference===0?'exact':difference===1?'off_by_one':'miss';
}

function resolveMovementResult(item,tierOrder){
  if(!item.actualTier) return 'pending';
  const predictedDirection=predictionMovementDirection(item.movement);
  const actualDirection=item.comparison?.actualMovement||tierMovementDirection(item.baselineTier,item.actualTier,tierOrder);
  if(!predictedDirection||!actualDirection) return item.comparison?.movementResult||'pending';
  return predictedDirection===actualDirection?'exact':'miss';
}

function predictionMovementDirection(movement){
  if(['大幅上昇','上昇'].includes(movement)) return 'up';
  if(movement==='維持') return 'same';
  if(['下降','大幅下降','実質下降'].includes(movement)) return 'down';
  return null;
}

function tierMovementDirection(baselineTier,actualTier,tierOrder){
  const normalizedBaseline=baselineTier==='A相当'?'A':baselineTier;
  const baselineIndex=tierOrder.indexOf(normalizedBaseline);
  const actualIndex=tierOrder.indexOf(actualTier);
  if(baselineIndex<0||actualIndex<0) return null;
  return actualIndex<baselineIndex?'up':actualIndex>baselineIndex?'down':'same';
}

function formatPredictionRate(value){
  return `${Number.isInteger(value)?value:value.toFixed(1)}%`;
}

function renderPredictionTier(group,predictions,officialByFamily,byId){
  const cards=(group.ids||[]).map(id=>{
    const family=byId.get(id);
    const prediction=predictions.get(id);
    const official=officialByFamily.get(id);
    return family&&prediction&&official
      ?renderPredictionCard(family,prediction,official)
      :`<div class="empty">予測データを確認できません: ${esc(id)}</div>`;
  }).join('');
  return `<section class="prediction-tier-section rank-${group.rank.toLowerCase()}">
    <div class="prediction-tier-head">
      <span class="prediction-tier-rank">${esc(group.rank)}</span>
      <div><span class="prediction-inline-label">AI予測</span><h3>${esc(group.label)}</h3></div>
    </div>
    <div class="prediction-cards">${cards}</div>
  </section>`;
}

function renderPredictionCard(family,prediction,official){
  const first=family.evolutions[0];
  const image=imageByFamily.get(family.id)?.stage1;
  const movement=movementMeta[prediction.movement]||{symbol:'→',className:'is-same'};
  const flags=(prediction.flags||[]).map(flag=>`<span>${esc(flag)}</span>`).join('');
  return `<article class="prediction-card">
    <header class="prediction-card-head">
      <a class="prediction-card-image" href="/tata/${encodeURIComponent(family.id)}/" aria-label="${esc(getFamilyDisplayLabel(family))}の詳細">
        <img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first.name)}">
      </a>
      <div>
        <div class="prediction-card-labels"><span class="prediction-inline-label">AI予測</span><span class="tier-badge rank-${prediction.predictedTier.toLowerCase()}">${esc(prediction.predictedTier)}</span></div>
        <h4><a href="/tata/${encodeURIComponent(family.id)}/">${esc(getFamilyDisplayLabel(family))}</a></h4>
        <div class="prediction-shift" aria-label="現在${esc(prediction.baselineTier)}からAI予測${esc(prediction.predictedTier)}">
          <span>現在 <b>${esc(prediction.baselineTier)}</b></span><i aria-hidden="true">↓</i><span>AI予測 <b>${esc(prediction.predictedTier)}</b></span>
        </div>
        <p class="prediction-movement ${movement.className}">${movement.symbol} ${esc(prediction.movement)}</p>
      </div>
    </header>
    ${flags?`<div class="prediction-flags">${flags}</div>`:''}
    <div class="prediction-skill-block">
      <strong>8/26実装の主な変更</strong>
      <ul>${renderOfficialSkills(official.skills||[])}</ul>
    </div>
    <p class="prediction-evaluation"><strong>AI評価：</strong>${esc(prediction.evaluation)}</p>
  </article>`;
}

function renderOfficialSkills(skills){
  return skills.flatMap(skill=>(skill.changes||[]).map((change,index)=>`<li>
    <span>${index===0?`<b>${esc(skill.name)}</b> `:''}${esc(change.metric)}</span>
    <strong>${esc(change.before)} <i aria-hidden="true">→</i> ${esc(change.after)}</strong>
  </li>`)).join('');
}

function renderRanking(ids,predictions,byId){
  return `<ol class="prediction-ranking-list">${ids.map(id=>{
    const item=predictions.get(id);
    const family=byId.get(id);
    if(!item||!family) return '';
    return `<li><a href="/tata/${encodeURIComponent(id)}/">${esc(getFamilyDisplayLabel(family))}</a><span><b>${esc(item.baselineTier)}</b><i aria-hidden="true">→</i><strong>${esc(item.predictedTier)}</strong></span></li>`;
  }).join('')}</ol>`;
}

function renderAdoption(item,byId){
  const family=byId.get(item.familyId);
  if(!family) return '';
  return `<article class="prediction-adoption-card">
    <h4><a href="/tata/${encodeURIComponent(family.id)}/">${esc(getFamilyDisplayLabel(family))}</a></h4>
    <div><span>旧環境</span><b>${esc(item.baselineAdoption)}</b></div>
    <i aria-hidden="true">↓</i>
    <div class="is-forecast"><span>AI予測採用率</span><strong>${esc(item.predictedRange)}</strong></div>
  </article>`;
}

function renderChipEnvironment(environment,chipBalance){
  const officialByName=new Map(chipBalance.map(item=>[item.name,item]));
  const changes=(environment.selectedChipNames||[]).map(name=>{
    const chip=officialByName.get(name);
    if(!chip) return '';
    return `<li><b>${esc(chip.name)}</b><span>${esc(chip.metric)}</span><strong>${esc(chip.before)} <i aria-hidden="true">→</i> ${esc(chip.after)}</strong></li>`;
  }).join('');
  const comments=(environment.commentary||[]).map(comment=>`<li>${esc(comment)}</li>`).join('');
  return `<div class="prediction-chip-layout"><ul class="prediction-chip-changes">${changes}</ul><div class="prediction-chip-comment"><strong>AIの環境読み</strong><ul>${comments}</ul></div></div>`;
}

function renderHold(item,byId){
  const family=item.familyId?byId.get(item.familyId):null;
  const label=family?getFamilyDisplayLabel(family):item.displayLabel;
  const href=family?`<a href="/tata/${encodeURIComponent(family.id)}/">${esc(label)}</a>`:`<span>${esc(label)}</span>`;
  return `<article class="prediction-hold-card">
    <span class="prediction-hold-label">${esc(item.status)}</span>
    <h4>${href}</h4>
    <p>${esc(item.reason)}</p>
    <strong>${esc(item.nextAction)}</strong>
  </article>`;
}

bootZombieRush().catch(err=>{
  console.error(err);
  $('#tierRoot').innerHTML='<div class="empty">データの読み込みに失敗しました。ページを再読み込みしてください。</div>';
  const predictionRoot=$('#predictionTierRoot');
  if(predictionRoot) predictionRoot.innerHTML='<div class="empty">AI予測Tierの読み込みに失敗しました。ページを再読み込みしてください。</div>';
});
