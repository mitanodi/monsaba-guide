const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrPath = {草:'grass', 水:'water', 火:'fire', 雷:'thunder', 土:'earth'};
const modeLabels = {overall:'総合', normal:'通常', zombie:'ゾンビ', dojo:'道場', beginner:'初心者'};
const tierScore = {SSS:0, SS:1, S:2, A:3, '－':9};
const priorityScore = {'最優先候補':0, '優先候補':1, '用途次第':2, '評価保留':3};
let state = {families:[], skills:{}, ratings:{}, evolution:{}, aliases:[], transitions:[]};

async function boot(){
  const [tatari, skills, ratings, evolution] = await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tata-skills.json'),
    fetchJson('/data/tier-ratings.json'),
    fetchJson('/data/evolution-priority.json')
  ]);
  state = {
    families: tatari.families || [],
    skills: skills.byFamily || {},
    ratings,
    evolution,
    aliases: [],
    transitions: []
  };
  state.aliases = buildAliases();
  state.transitions = buildTransitions();
  renderSuggestions();
  bindUi();
  addAssistant('何について知りたい？');
  const query = new URLSearchParams(location.search).get('q');
  if(query) runQuestion(query);
}

async function fetchJson(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function buildAliases(){
  const aliases = [];
  for(const family of state.families){
    const names = new Set([family.id, family.familyName, `${family.familyName}系`]);
    for(const evo of family.evolutions || []) names.add(evo.name);
    for(const stage of state.skills[family.id]?.stages || []) {
      names.add(stage.tataName);
      names.add(stage.skillName);
    }
    for(const name of names){
      const normalized = normalize(name);
      if(normalized.length >= 2 || normalized === family.id) aliases.push({name, normalized, familyId: family.id, length: normalized.length});
    }
  }
  return aliases.sort((a,b) => b.length - a.length || a.name.localeCompare(b.name, 'ja'));
}

function renderSuggestions(){
  const options = [];
  for(const a of state.aliases){
    if(/^[a-z0-9-]+$/.test(a.name)) continue;
    if(options.includes(a.name)) continue;
    options.push(a.name);
    if(options.length >= 160) break;
  }
  $('#nameSuggestions').innerHTML = options.map(name => `<option value="${esc(name)}"></option>`).join('');
}

function buildTransitions(){
  return state.families.flatMap(family => {
    const stages = state.skills[family.id]?.stages || [];
    return stages.slice(0, -1).map(from => {
      const to = stages.find(s => s.stage === from.stage + 1);
      return {
        family,
        from,
        to,
        key: `${family.id}:${from.stage}-${to.stage}`,
        delta: diffStages(from, to),
        meta: transitionMeta(family.id, from.stage, to.stage)
      };
    });
  });
}

function transitionMeta(familyId, fromStage, toStage){
  const key = `${familyId}:${fromStage}-${toStage}`;
  const override = state.evolution.transitionOverrides?.[key];
  const impact = state.evolution.highImpactTransitions?.find(x => x.familyId === familyId && x.fromStage === fromStage && x.toStage === toStage);
  let priority = override?.priority || impact?.priority || '評価保留';
  let reason = override?.reason || impact?.reason || '現在の攻略評価データでは、次進化の優先度を断定する根拠が不足しています。';
  const first = state.evolution.t3Roadmap?.firstPriority?.find(x => x.familyId === familyId);
  const second = state.evolution.t3Roadmap?.secondPriority?.find(x => x.familyId === familyId);
  if(fromStage === 2 && toStage === 3 && first){ priority = first.priority; reason = first.reason; }
  if(fromStage === 2 && toStage === 3 && second){ priority = second.priority; reason = second.reason; }
  return {priority, reason, headline: impact?.headline};
}

function diffStages(from, to){
  const prev = new Map((from.values || []).map(v => [v.label, v.value]));
  const next = new Map((to.values || []).map(v => [v.label, v.value]));
  const added = [], changed = [], missing = [];
  for(const [label, value] of next){
    if(!prev.has(label)) added.push({label, value});
    else if(prev.get(label) !== value) changed.push({label, from: prev.get(label), to: value});
  }
  for(const [label, value] of prev) if(!next.has(label)) missing.push({label, value});
  return {skillNameChanged: from.skillName !== to.skillName, descriptionChanged: from.description !== to.description, added, changed, missing};
}

function bindUi(){
  $('#consultForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const q = $('#questionInput').value.trim();
    if(q) runQuestion(q);
  });
  document.querySelectorAll('.example-questions button').forEach(button => {
    button.addEventListener('click', () => runQuestion(button.textContent.trim()));
  });
}

function runQuestion(question){
  $('#questionInput').value = question;
  addUser(question);
  const answer = answerQuestion(question);
  addAssistant(answer.html, true);
  updateUrl(question);
  saveHistory(question);
}

function answerQuestion(question){
  const q = normalize(question);
  const families = resolveFamilies(q);
  const mode = detectMode(q);
  const attr = detectAttribute(question);
  let intent = detectIntent(q, families, attr);

  if(intent === 'unknown' && families.length === 1) intent = 'detail';
  if(intent === 'unknown' && families.length >= 2) intent = 'compare';

  switch(intent){
    case 't4': return answerT4(families[0], mode);
    case 'compare': return answerCompare(families.slice(0, 2), mode);
    case 'evolutionDiff': return answerEvolution(families[0], q, mode, true);
    case 'evolution': return answerEvolution(families[0], q, mode, false);
    case 'attribute': return answerAttribute(attr, mode);
    case 'zombie': return answerZombie();
    case 'beginner': return answerBeginner();
    case 'tier': return answerOverallTier();
    case 'detail': return answerDetail(families[0], mode);
    default: return answerUnknown(families.length ? null : question);
  }
}

function detectIntent(q, families, attr){
  if(hasAny(q, ['t4','4進化','第4進化','四進化','オーラ'])) return 't4';
  if(families.length >= 2 && hasAny(q, ['どっち','どちら','比較','vs','と'])) return 'compare';
  if(hasAny(q, ['何が変わる','なにがかわる','変化','差分','から']) && families.length) return 'evolutionDiff';
  if(hasAny(q, ['進化','育てる価値','した方がいい','するべき','すべき']) && families.length) return 'evolution';
  if(attr) return 'attribute';
  if(hasAny(q, ['ゾンビラッシュ','ゾンビ','高wave'])) return 'zombie';
  if(hasAny(q, ['初心者','序盤','最初','はじめ','初め','3進化誰'])) return 'beginner';
  if(hasAny(q, ['最強','tier','sss','ランキング','おすすめ'])) return 'tier';
  if(families.length) return 'detail';
  return 'unknown';
}

function detectMode(q){
  if(hasAny(q, ['ゾンビラッシュ','ゾンビ','高wave'])) return 'zombie';
  if(hasAny(q, ['道場','バッジ'])) return 'dojo';
  if(hasAny(q, ['初心者','序盤','最初','はじめ','初め'])) return 'beginner';
  if(hasAny(q, ['通常','ステージ'])) return 'normal';
  return 'overall';
}

function detectAttribute(question){
  for(const attr of ['草','水','火','雷','土']){
    if(question.includes(`${attr}属性`) || question.includes(`${attr}で`) || question.includes(`${attr}の`)) return attr;
  }
  return null;
}

function resolveFamilies(q){
  const hits = [];
  const occupied = [];
  for(const alias of state.aliases){
    const index = q.indexOf(alias.normalized);
    if(index === -1) continue;
    const end = index + alias.normalized.length;
    if(occupied.some(([s,e]) => index < e && end > s)) continue;
    occupied.push([index, end]);
    if(!hits.some(h => h.familyId === alias.familyId)) hits.push(alias);
  }
  return hits.map(h => h.familyId);
}

function currentStageFromQuestion(familyId, q){
  const stages = state.skills[familyId]?.stages || [];
  const aliases = [];
  for(const stage of stages){
    aliases.push({stage: stage.stage, name: stage.tataName});
    aliases.push({stage: stage.stage, name: stage.skillName});
  }
  aliases.sort((a,b) => normalize(b.name).length - normalize(a.name).length);
  const hit = aliases.find(a => q.includes(normalize(a.name)));
  if(hit && stages.some(s => s.stage === hit.stage + 1)) return hit.stage;
  if(hasAny(q, ['3進化','第3進化','t3']) && stages.some(s => s.stage === 2)) return 2;
  if(hasAny(q, ['4進化','第4進化','t4']) && stages.some(s => s.stage === 3)) return 3;
  return stages.some(s => s.stage === 2) ? 2 : stages[0]?.stage;
}

function answerDetail(familyId, mode){
  if(!familyId) return answerUnknown();
  const family = getFamily(familyId);
  const overall = state.ratings.overall?.byFamily?.[familyId];
  const zombie = state.ratings.zombieRush?.byFamily?.[familyId];
  const skillFamily = state.skills[familyId];
  const latest = skillFamily?.stages?.[skillFamily.stages.length - 1];
  const roles = overall?.roles || [];
  const features = detailFeatures(overall, latest).slice(0, 5);
  return {
    html: `<h2>${esc(family.familyName)}系</h2>
      ${chainHtml(family)}
      <div class="consult-badges">${badge('総合Tier', overall?.tier || '評価保留')}${badge('ゾンビラッシュ', zombie?.tier || overall?.zombie || '－')}${mode !== 'overall' ? badge(modeLabels[mode], modeTier(familyId, mode) || '－') : ''}</div>
      ${roles.length ? `<h3>主な役割</h3>${tagList(roles)}` : ''}
      <h3>特徴</h3>
      ${features.length ? list(features) : '<p>このタタの特徴は、現在の共通データだけでは十分に整理できていません。</p>'}
      ${overall?.comment ? `<p class="consult-note">${esc(overall.comment)}</p>` : ''}
      ${relatedLinks([{label:`${family.familyName}系詳細`, href:`/tata/${familyId}/`}, {label:'総合タタTier', href:'/tata-tier/'}, {label:'進化優先度', href:'/evolution-priority/'}])}`
  };
}

function detailFeatures(overall, latest){
  const features = [];
  for(const role of overall?.roles || []) features.push(role);
  if(latest?.description) features.push(latest.description);
  for(const value of latest?.values || []){
    if(features.length >= 5) break;
    features.push(`${value.label} ${value.value}`);
  }
  return [...new Set(features)];
}

function answerEvolution(familyId, q, mode, diffOnly){
  if(!familyId) return answerUnknown();
  const stage = currentStageFromQuestion(familyId, q);
  const tx = state.transitions.find(t => t.family.id === familyId && t.from.stage === stage);
  if(!tx) return {html:`<h2>${esc(getFamily(familyId).familyName)}系</h2><p>この段階から先の進化データは見つかりませんでした。</p>${relatedLinks([{label:'進化優先度', href:'/evolution-priority/'}])}`};
  const overall = state.ratings.overall?.byFamily?.[familyId];
  const zombie = state.ratings.zombieRush?.byFamily?.[familyId];
  const zombieAura = mode === 'zombie' && tx.from.stage === 3 && tx.to.stage === 4 ? `<p class="consult-warning">${esc(state.evolution.modeNotes?.zombieRush?.message || 'ゾンビラッシュでは第4進化のオーラは無効です。')}</p>` : '';
  const conclusion = diffOnly ? '' : `<h3>結論</h3><p>${evolutionConclusion(tx, familyId, mode)}</p>`;
  return {
    html: `<h2>${esc(tx.from.tataName)} → ${esc(tx.to.tataName)}</h2>
      <div class="consult-compare-grid compact">
        <div><small>現在</small><b>${esc(tx.from.tataName)}</b><span>${esc(tx.from.skillName)}</span></div>
        <div><small>次</small><b>${esc(tx.to.tataName)}</b><span>${esc(tx.to.skillName)}</span></div>
      </div>
      <div class="consult-badges">${badge('進化優先度', tx.meta.priority)}${badge('総合Tier', overall?.tier || '評価保留')}${badge('ゾンビ', zombie?.tier || overall?.zombie || '－')}</div>
      <h3>次進化で変わること</h3>
      ${deltaHtml(tx.delta)}
      ${zombieAura}
      ${conclusion}
      <p class="consult-note">${esc(tx.meta.reason)}</p>
      ${relatedLinks([{label:`${tx.family.familyName}系詳細`, href:`/tata/${familyId}/`}, {label:'進化優先度', href:'/evolution-priority/'}, {label:'進化差分一覧', href:'/evolution-priority/#transition-list'}])}`
  };
}

function evolutionConclusion(tx, familyId, mode){
  if(tx.meta.priority === '最優先候補') return '第3進化コスパの根拠があるため、序盤の育成候補として優先度は高めです。';
  if(tx.meta.priority === '優先候補') return '役割が合うなら進化候補です。手持ちの不足役割と目的モードを見て判断します。';
  const tier = modeTier(familyId, mode);
  if(['SSS','SS'].includes(tier)) return `${modeLabels[mode] || '指定モード'}での評価は高めです。ただし、この進化段階自体の優先度はスキル差分も見て判断します。`;
  return '現在の共通データだけでは進化優先度を断定できません。追加される効果と手持ち編成で判断してください。';
}

function answerCompare(ids, mode){
  if(ids.length < 2) return answerUnknown();
  const [a, b] = ids;
  const rows = [a, b].map(id => {
    const f = getFamily(id);
    const overall = state.ratings.overall?.byFamily?.[id];
    const zombie = state.ratings.zombieRush?.byFamily?.[id];
    return `<article>
      <h3>${esc(f.familyName)}系</h3>
      <div class="consult-badges">${badge('総合', overall?.tier || '評価保留')}${badge('ゾンビ', zombie?.tier || overall?.zombie || '－')}${mode !== 'overall' && mode !== 'zombie' ? badge(modeLabels[mode], modeTier(id, mode) || '－') : ''}</div>
      ${overall?.roles?.length ? tagList(overall.roles) : '<p>役割データは評価保留です。</p>'}
      <a href="/tata/${esc(id)}/">詳しく見る</a>
    </article>`;
  }).join('');
  return {
    html: `<h2>${esc(getFamily(a).familyName)}系と${esc(getFamily(b).familyName)}系の比較</h2>
      <div class="consult-compare-grid">${rows}</div>
      <h3>見方</h3>
      <p>${compareConclusion(a, b, mode)}</p>
      ${relatedLinks([{label:`${getFamily(a).familyName}系詳細`, href:`/tata/${a}/`}, {label:`${getFamily(b).familyName}系詳細`, href:`/tata/${b}/`}, {label:'総合タタTier', href:'/tata-tier/'}])}`
  };
}

function compareConclusion(a, b, mode){
  const fa = getFamily(a), fb = getFamily(b);
  const ta = mode === 'zombie' ? (state.ratings.zombieRush?.byFamily?.[a]?.tier || state.ratings.overall?.byFamily?.[a]?.zombie) : modeTier(a, mode) || state.ratings.overall?.byFamily?.[a]?.tier;
  const tb = mode === 'zombie' ? (state.ratings.zombieRush?.byFamily?.[b]?.tier || state.ratings.overall?.byFamily?.[b]?.zombie) : modeTier(b, mode) || state.ratings.overall?.byFamily?.[b]?.tier;
  const rolesA = (state.ratings.overall?.byFamily?.[a]?.roles || []).join(' / ') || '役割データなし';
  const rolesB = (state.ratings.overall?.byFamily?.[b]?.roles || []).join(' / ') || '役割データなし';
  if(tierScore[ta] < tierScore[tb]) return `${modeLabels[mode]}を重視するなら${fa.familyName}系が優先候補です。ただし、${fb.familyName}系は${rolesB}が欲しい時に候補になります。`;
  if(tierScore[tb] < tierScore[ta]) return `${modeLabels[mode]}を重視するなら${fb.familyName}系が優先候補です。ただし、${fa.familyName}系は${rolesA}が欲しい時に候補になります。`;
  return `評価は近いため、${fa.familyName}系は${rolesA}、${fb.familyName}系は${rolesB}という役割差で選びます。`;
}

function answerAttribute(attr, mode){
  if(!attr) return answerUnknown();
  const families = state.families.filter(f => f.attribute === attr);
  const scored = families.map(f => ({family:f, tier: mode === 'overall' ? state.ratings.overall?.byFamily?.[f.id]?.tier : modeTier(f.id, mode), overall: state.ratings.overall?.byFamily?.[f.id]}))
    .sort((a,b) => (tierScore[a.tier || '－'] - tierScore[b.tier || '－']) || (tierScore[a.overall?.tier || '－'] - tierScore[b.overall?.tier || '－']) || a.family.familyName.localeCompare(b.family.familyName, 'ja'));
  const picks = scored.slice(0, 5);
  return {
    html: `<h2>${esc(attr)}属性おすすめ</h2>
      <p>現在の当サイト評価に基づく候補です。${mode !== 'overall' ? `${modeLabels[mode]}評価を優先して並べています。` : '総合Tierを中心に並べています。'}</p>
      <div class="consult-pick-list">${picks.map(item => pickRow(item.family.id, item.tier || '評価保留', item.overall?.roles)).join('')}</div>
      ${relatedLinks([{label:`${attr}属性攻略`, href:`/attribute/${attrPath[attr]}/`}, {label:'総合タタTier', href:'/tata-tier/'}, {label:'ゾンビラッシュ攻略', href:'/zombie-rush/'}])}`
  };
}

function answerZombie(){
  const ids = state.ratings.zombieRush?.groups?.find(g => g.rank === 'SSS')?.ids || [];
  return {
    html: `<h2>ゾンビラッシュで強いタタ</h2>
      <p>当サイトのゾンビラッシュ評価では、公開高キル編成の採用データをもとにSSS候補を整理しています。</p>
      <div class="consult-pick-list">${ids.map(id => pickRow(id, state.ratings.zombieRush.byFamily[id]?.tier, state.ratings.overall?.byFamily?.[id]?.roles, state.ratings.zombieRush.byFamily[id]?.adoptionRate)).join('')}</div>
      ${relatedLinks([{label:'ゾンビラッシュ攻略', href:'/zombie-rush/'}, {label:'総合タタTier', href:'/tata-tier/'}, {label:'攻略相談所', href:'/consult/'}])}`
  };
}

function answerBeginner(){
  const first = state.evolution.t3Roadmap?.firstPriority || [];
  const second = state.evolution.t3Roadmap?.secondPriority || [];
  const long = state.evolution.longTermRecommended || [];
  return {
    html: `<h2>初心者の育成目安</h2>
      <h3>まず狙いやすいT3</h3>
      <p>必要星数：6星</p>
      <div class="consult-pick-list">${first.map(item => pickRow(item.familyId, '6星T3', state.ratings.overall?.byFamily?.[item.familyId]?.roles)).join('')}</div>
      <h3>次点</h3>
      <p>必要星数：12星</p>
      <div class="consult-pick-list">${second.map(item => pickRow(item.familyId, item.familyId === 'gantoru' ? '12星T3 / 初期：コロカメ' : '12星T3', state.ratings.overall?.byFamily?.[item.familyId]?.roles)).join('')}</div>
      <h3>長期育成候補</h3>
      <div class="consult-pick-list">${long.map(item => pickRow(item.familyId, state.ratings.overall?.byFamily?.[item.familyId]?.tier || '評価保留', state.ratings.overall?.byFamily?.[item.familyId]?.roles)).join('')}</div>
      ${relatedLinks([{label:'進化優先度ページ', href:'/evolution-priority/'}, {label:'総合タタTier', href:'/tata-tier/'}])}`
  };
}

function answerOverallTier(){
  const groups = state.ratings.overall?.groups || [];
  const sss = groups.find(g => g.rank === 'SSS')?.ids || [];
  return {
    html: `<h2>総合Tierの上位候補</h2>
      <p>通常、ゾンビラッシュ、道場、初心者評価、役割の希少性を合わせた当サイト独自の暫定評価です。</p>
      <h3>SSS</h3>
      <div class="consult-pick-list">${sss.map(id => pickRow(id, 'SSS', state.ratings.overall?.byFamily?.[id]?.roles)).join('')}</div>
      ${relatedLinks([{label:'総合タタTier', href:'/tata-tier/'}, {label:'進化優先度', href:'/evolution-priority/'}])}`
  };
}

function answerT4(familyId, mode){
  if(familyId){
    const tx = state.transitions.find(t => t.family.id === familyId && t.from.stage === 3 && t.to.stage === 4);
    if(tx) return answerEvolution(familyId, normalize(tx.from.tataName), mode === 'overall' ? 'zombie' : mode, false);
  }
  const message = state.evolution.modeNotes?.zombieRush?.message || 'ゾンビラッシュでは第4進化の属性オーラは無効です。';
  return {
    html: `<h2>T4は進化するべき？</h2>
      <p class="consult-warning">${esc(message)}</p>
      <p>ただし、オーラ以外のスキル変化や他コンテンツでの利用価値はあるため、T4自体が無意味という扱いではありません。</p>
      ${relatedLinks([{label:'T4進化差分', href:'/evolution-priority/#transition-list'}, {label:'進化優先度', href:'/evolution-priority/'}, {label:'ゾンビラッシュ攻略', href:'/zombie-rush/'}])}`
  };
}

function answerUnknown(raw){
  const exists = raw ? resolveFamilies(normalize(raw)).length > 0 : true;
  return {
    html: `<h2>質問を判断できませんでした</h2>
      ${exists ? '' : '<p>入力された名前は、現在のタタDBでは確認できませんでした。存在しないタタ名は作らずに案内します。</p>'}
      <p>今は以下について質問できます。</p>
      ${list(['タタの強さ','進化','育成優先度','タタ比較','属性おすすめ','ゾンビラッシュ','初心者育成'])}
      <p class="consult-note">例：「スタピョンは進化するべき？」「雷属性おすすめ」「ガルルデンとデンジカどっち？」</p>`
  };
}

function pickRow(id, tier, roles, rate){
  const family = getFamily(id);
  if(!family) return '';
  const first = state.skills[id]?.stages?.[0]?.tataName || family.familyName;
  return `<a class="consult-pick-row" href="/tata/${esc(id)}/"><span><b>${esc(family.familyName)}系</b><small>${esc(first)}${roles?.length ? ` / ${esc(roles.join(' / '))}` : ''}</small></span><em>${esc(tier || '評価保留')}${rate ? ` / 採用率 ${esc(rate)}` : ''}</em></a>`;
}

function deltaHtml(delta){
  const rows = [];
  if(delta.skillNameChanged) rows.push('スキル名が変化');
  rows.push(...delta.added.map(v => `追加：${v.label} ${v.value}`));
  rows.push(...delta.changed.map(v => `${v.label}：${v.from} → ${v.to}`));
  rows.push(...delta.missing.map(v => `次進化データでは項目記載なし：${v.label} ${v.value}`));
  if(!rows.length && delta.descriptionChanged) rows.push('説明文が変化');
  return list(rows.length ? rows : ['記載上の数値差分は少なめです。']);
}

function relatedLinks(links){
  return `<div class="consult-related"><b>関連攻略</b>${links.map(link => `<a href="${esc(link.href)}">${esc(link.label)}</a>`).join('')}</div>`;
}

function badge(label, value){ return `<span class="tier-badge">${esc(label)} ${esc(value || '－')}</span>`; }
function tagList(items){ return `<div class="role-tags">${items.map(item => `<span>${esc(item)}</span>`).join('')}</div>`; }
function list(items){ return `<ul class="plain-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`; }
function chainHtml(family){ return `<p class="tier-chain">${esc(family.evolutions.map(e => e.name).join(' → '))}</p>`; }
function getFamily(id){ return state.families.find(f => f.id === id); }
function modeTier(id, mode){
  const overall = state.ratings.overall?.byFamily?.[id];
  if(mode === 'overall') return overall?.tier;
  if(mode === 'zombie') return state.ratings.zombieRush?.byFamily?.[id]?.tier || overall?.zombie;
  return overall?.[mode];
}
function normalize(text){ return String(text ?? '').toLowerCase().replace(/[ \t\r\n　・ーｰ]/g, ''); }
function hasAny(text, words){ return words.some(word => text.includes(normalize(word))); }

function addUser(text){ addMessage('user', esc(text)); }
function addAssistant(content, html = false){ addMessage('assistant', html ? content : esc(content)); }
function addMessage(role, content){
  const log = $('#chatLog');
  const node = document.createElement('article');
  node.className = `chat-message ${role}`;
  node.innerHTML = `<div class="chat-speaker">${role === 'user' ? 'あなた' : '攻略相談所'}</div><div class="chat-bubble">${content}</div>`;
  log.appendChild(node);
  node.scrollIntoView({block:'end', behavior:'smooth'});
}
function updateUrl(question){
  const url = new URL(location.href);
  url.searchParams.set('q', question);
  history.replaceState(null, '', url);
}
function saveHistory(question){
  try{
    const key = 'monsabaConsultHistory';
    const current = JSON.parse(localStorage.getItem(key) || '[]').filter(q => q !== question);
    current.unshift(question);
    localStorage.setItem(key, JSON.stringify(current.slice(0, 8)));
  }catch(_){}
}

boot().catch(error => {
  console.error(error);
  addAssistant('データの読み込みに失敗しました。時間をおいて再読み込みしてください。');
});
