const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrPath = Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta]) => [attr,meta.slug]));
const modeLabels = {overall:'総合', normal:'通常', zombie:'ゾンビ', bossRally:'ボスラリー', dojo:'道場', beginner:'初心者'};
const tierScore = {SSS:0, SS:1, S:2, A:3, '－':9};
const priorityScore = {'最優先候補':0, '優先候補':1, '用途次第':2, '評価保留':3};
let state = {families:[], skills:{}, ratings:{}, evolution:{}, content:{}, aliases:[], transitions:[]};
let flowState = {};
let flowHistory = [];

const menuConfig = {
  root: [
    ['content', 'コンテンツを攻略したい'],
    ['training', 'タタを育成したい'],
    ['evolution', '進化するか決めたい'],
    ['build', '編成・役割を考えたい'],
    ['compare', '2体を比較したい'],
    ['detail', 'タタの性能を調べたい']
  ],
  contents: [
    ['normal', '通常ステージ'],
    ['zombie', 'ゾンビラッシュ'],
    ['bossRally', 'ボスラリー'],
    ['dojo', 'バッジ道場']
  ],
  zombieTopics: [
    ['recommend', 'おすすめタタ'],
    ['training', '育成優先度'],
    ['role', '必要な役割から探す'],
    ['evolution', 'T3/T4進化'],
    ['highwave', '高Wave攻略を見る'],
    ['page', 'ゾンビラッシュ攻略ページを見る']
  ],
  training: [
    ['beginner', '初心者・序盤'],
    ['overall', '総合的に強いタタ'],
    ['zombie', 'ゾンビラッシュ'],
    ['dojo', '道場'],
    ['normal', '通常攻略'],
    ['attribute', '属性から選ぶ']
  ],
  roles: [
    ['火力', '火力'],
    ['回復', '回復'],
    ['前衛', '前衛・タンク'],
    ['CC', '妨害・CC'],
    ['バフ', 'バフ'],
    ['デバフ', 'デバフ'],
    ['ノックバック', 'ノックバック']
  ],
  modes: [
    ['overall', '総合'],
    ['normal', '通常'],
    ['zombie', 'ゾンビラッシュ'],
    ['dojo', '道場'],
    ['beginner', '初心者']
  ],
  evolutionPurposes: [
    ['overall', '総合的に強くしたい'],
    ['normal', '通常攻略'],
    ['zombie', 'ゾンビラッシュ'],
    ['dojo', 'バッジ道場'],
    ['beginner', '初心者・序盤'],
    ['overall', 'とにかく次進化の変化を知りたい']
  ],
  attrs: [['草','草'], ['水','水'], ['火','火'], ['雷','雷'], ['岩','岩']]
};

const contentTopics = {
  normal: [
    ['timeOut', '時間切れ'],
    ['wipe', '全滅する'],
    ['bosses', 'ボス'],
    ['recommend', 'おすすめタタ'],
    ['page', '通常攻略ページを見る']
  ],
  bossRally: [
    ['bosses', 'ボス別攻略'],
    ['recommend', 'おすすめタタ'],
    ['level99', 'Lv99を目指したい'],
    ['damage', '最大ダメージを伸ばしたい'],
    ['mechanics', 'ボスラリーの仕組み'],
    ['page', 'ボスラリー攻略ページを見る']
  ],
  dojo: [
    ['recommend', 'おすすめタタ'],
    ['attribute', '属性別'],
    ['position', '配置'],
    ['front', '前衛が落ちる'],
    ['damage', '火力不足'],
    ['cc', 'CCが欲しい'],
    ['heal', '回復が欲しい'],
    ['page', '道場攻略ページを見る']
  ]
};

async function boot(){
  const [tatari, skills, ratings, evolution, content] = await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tata-skills.json'),
    fetchJson('/data/tier-ratings.json'),
    fetchJson('/data/evolution-priority.json'),
    fetchJson('/data/content-guides.json')
  ]);
  state = {
    families: tatari.families || [],
    skills: skills.byFamily || {},
    ratings,
    evolution,
    content,
    aliases: [],
    transitions: []
  };
  state.aliases = buildAliases();
  state.transitions = buildTransitions();
  renderSuggestions();
  bindUi();
  const params = new URLSearchParams(location.search);
  const query = params.get('q');
  if(query) {
    addAssistant('今日は何について知りたい？');
    renderRootMenu(false);
    runQuestion(query);
  } else if(params.get('flow') === 'content') {
    openContentDeepLink(params);
  } else if(params.get('flow') === 'evolution' || params.get('flow') === 'detail') {
    openFamilyDeepLink(params);
  } else {
    renderRootMenu(false);
  }
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
  $('#chatLog').addEventListener('click', handleGuideClick);
  $('#chatLog').addEventListener('input', handleGuideInput);
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
    case 'contentGuide': return answerContentQuestion(q);
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

function handleGuideClick(event){
  const button = event.target.closest('[data-action]');
  if(!button) return;
  const action = button.dataset.action;
  const value = button.dataset.value;
  if(action === 'back') return goBack();
  if(action === 'root') return renderRootMenu();
  if(action === 'rootSelect') {
    if(value === 'content') return showContentMenu();
    if(value === 'training') return showTrainingMenu();
    if(value === 'evolution') return startEvolutionFlow();
    if(value === 'build') return showBuildModeMenu();
    if(value === 'compare') return startCompareFlow();
    if(value === 'detail') return startDetailFlow();
  }
  if(action === 'content') return showContentMenu();
  if(action === 'contentSelect') return handleContent(value);
  if(action === 'contentTopic') return handleContentTopic(value);
  if(action === 'bossSelect') return handleBossSelect(value);
  if(action === 'bossAction') return handleBossAction(value);
  if(action === 'dojoAttr') return handleDojoAttribute(value);
  if(action === 'ownedFilter') return showOwnedPicker();
  if(action === 'ownedToggle') return toggleOwned(value, button);
  if(action === 'applyOwned') return applyOwnedFilter();
  if(action === 'ownedReset') return resetOwnedFamilies();
  if(action === 'zombieTopic') return handleZombieTopic(value);
  if(action === 'training') return showTrainingMenu();
  if(action === 'trainingSelect') return handleTraining(value);
  if(action === 'attrSelect') return handleAttributeSelect(value);
  if(action === 'evolution') return startEvolutionFlow();
  if(action === 'selectFamily') return handleFamilySelect(value);
  if(action === 'selectStage') return handleStageSelect(Number(value));
  if(action === 'selectPurpose') return handleEvolutionPurpose(value);
  if(action === 'build') return showBuildModeMenu();
  if(action === 'buildMode') return showRoleMenu('build', {mode:value});
  if(action === 'roleSelect') return handleRoleSelect(value);
  if(action === 'compare') return startCompareFlow();
  if(action === 'compareFamily') return handleCompareFamily(value);
  if(action === 'compareMode') return handleCompareMode(value);
  if(action === 'detail') return startDetailFlow();
  if(action === 'detailFamily') return handleDetailFamily(value);
  if(action === 'detailView') return handleDetailView(value);
  if(action === 'unknownStart') {
    if(value === 'training') return showTrainingMenu();
    if(value === 'evolution') return startEvolutionFlow();
    if(value === 'content') return showContentMenu();
    if(value === 'compare') return startCompareFlow();
  }
}

function handleGuideInput(event){
  const input = event.target.closest('[data-family-filter]');
  if(!input) return;
  const box = input.closest('.family-picker');
  const q = normalize(input.value);
  box.querySelectorAll('[data-family-id]').forEach(button => {
    const hay = button.dataset.search || '';
    button.hidden = q && !hay.includes(q);
  });
}

function renderRootMenu(push = true){
  if(push) pushHistory();
  flowState = {};
  setGuide(`<h2>今日は何について知りたい？</h2><p>目的を選ぶと、必要な条件だけ追加で選んで攻略データから回答します。</p>${buttonGrid(menuConfig.root, 'rootSelect')}`, false);
}

function buttonGrid(items, group){
  return `<div class="guide-button-grid">${items.map(([value,label]) => `<button type="button" data-action="${actionForGroup(group)}" data-value="${esc(value)}">${esc(label)}</button>`).join('')}</div>`;
}

function actionForGroup(group){
  return {
    rootSelect:'rootSelect',
    content:'contentSelect',
    contentTopic:'contentTopic',
    bossAction:'bossAction',
    dojoAttr:'dojoAttr',
    zombieTopic:'zombieTopic',
    training:'trainingSelect',
    attr:'attrSelect',
    mode:'compareMode'
  }[group] || group;
}

function setGuide(html, withBack = true){
  const actions = withBack ? `<div class="guide-actions"><button type="button" data-action="back">← 戻る</button><button type="button" data-action="root">最初のメニューに戻る</button></div>` : '';
  $('#chatLog').innerHTML = `<article class="chat-message assistant"><div class="chat-speaker">攻略相談所</div><div class="chat-bubble guide-bubble">${breadcrumbHtml()}${html}${actions}</div></article>`;
}

function showResult(html, crumbs = []){
  flowState.crumbs = crumbs.length ? crumbs : flowState.crumbs;
  setGuide(`${html}<div class="guide-button-grid followup-grid">
    <button type="button" data-action="evolution">別のタタを進化相談</button>
    <button type="button" data-action="compare">別のタタと比較</button>
    <button type="button" data-action="training">同じ目的で候補を見る</button>
    <button type="button" data-action="root">別の相談をする</button>
  </div>`);
  saveHistory((flowState.crumbs || []).join(' ＞ ') || '選択式相談');
}

function breadcrumbHtml(){
  return flowState.crumbs?.length ? `<div class="guide-breadcrumb">相談内容：${flowState.crumbs.map(esc).join(' ＞ ')}</div>` : '';
}

function pushHistory(){
  flowHistory.push(JSON.parse(JSON.stringify(flowState)));
}

function goBack(){
  const prev = flowHistory.pop();
  if(!prev) return renderRootMenu(false);
  flowState = prev;
  routeFromState(false);
}

function routeFromState(){
  const route = flowState.route;
  if(route === 'content') return showContentMenu(false);
  if(route === 'contentTopics') return showContentTopicMenu(false);
  if(route === 'bossSelect') return showBossSelectMenu(false);
  if(route === 'bossActions') return showBossActionMenu(false);
  if(route === 'dojoAttr') return showDojoAttributeMenu(false);
  if(route === 'zombie') return showZombieMenu(false);
  if(route === 'training') return showTrainingMenu(false);
  if(route === 'evolutionFamily') return renderFamilyPicker('selectFamily', 'どのタタを進化させたい？', false);
  if(route === 'evolutionStage') return showStageMenu(false);
  if(route === 'evolutionPurpose') return showEvolutionPurposeMenu(false);
  if(route === 'buildMode') return showBuildModeMenu(false);
  if(route === 'buildRole') return showRoleMenu('build', {mode:flowState.mode}, false);
  if(route === 'zombieRole') return showRoleMenu('zombie', {mode:flowState.mode}, false);
  if(route === 'compareA') return renderFamilyPicker('compareFamily', '1体目を選択', false);
  if(route === 'compareB') return renderFamilyPicker('compareFamily', '2体目を選択', false);
  if(route === 'compareMode') return showCompareModeMenu(false);
  if(route === 'detailFamily') return renderFamilyPicker('detailFamily', '性能を調べたいタタを選択', false);
  if(route === 'detailView') return showDetailViewMenu(false);
  renderRootMenu(false);
}

function showContentMenu(push = true){
  if(push) pushHistory();
  flowState = {route:'content', category:'content', crumbs:['コンテンツ攻略']};
  setGuide(`<h2>どのコンテンツを攻略したい？</h2>${buttonGrid(menuConfig.contents, 'content')}`);
}

function handleContent(content){
  pushHistory();
  if(content === 'zombie'){
    flowState = {route:'zombie', category:'content', content:'zombie', crumbs:['コンテンツ攻略','ゾンビラッシュ']};
    return showZombieMenu(false);
  }
  const mode = state.content.modes?.[content];
  if(!mode || mode.status !== 'ready') return showPreparedContent(mode?.label || 'このコンテンツ');
  flowState = {route:'contentTopics', category:'content', content, crumbs:['コンテンツ攻略', mode.label]};
  showContentTopicMenu(false);
}

function showContentTopicMenu(withBack = true){
  const content = flowState.content;
  const mode = state.content.modes?.[content];
  const topics = contentTopics[content] || [];
  setGuide(`<h2>${esc(mode?.label || 'コンテンツ')}で何を知りたい？</h2>${buttonGrid(topics, 'contentTopic')}`, withBack);
}

function handleContentTopic(topic){
  pushHistory();
  const content = flowState.content;
  if(content === 'normal') return handleNormalTopic(topic);
  if(content === 'bossRally') return handleBossRallyTopic(topic);
  if(content === 'dojo') return handleDojoTopic(topic);
}

function handleNormalTopic(topic){
  if(topic === 'page') return showResult(`<h2>通常ステージ攻略</h2><p>時間切れ、全滅、配置の見直しは専用ページでも確認できます。</p>${relatedLinks([{label:'通常攻略ページ', href:'/normal-guide/'}])}`, [...flowState.crumbs, '攻略ページ']);
  if(topic === 'recommend') return showResult(answerModeCandidates('normal').html, [...flowState.crumbs, 'おすすめタタ']);
  if(topic === 'bosses') {
    flowState.route = 'bossSelect';
    flowState.bossContext = 'normal';
    return showBossSelectMenu(false);
  }
  const html = answerNormalTrouble(topic).html;
  showResult(html, [...flowState.crumbs, topic === 'timeOut' ? '時間切れ' : '全滅']);
}

function handleBossRallyTopic(topic){
  if(topic === 'page') return showResult(`<h2>ボスラリー攻略</h2><p>5ボスの特徴と条件一致候補は専用ページで確認できます。</p>${relatedLinks([{label:'ボスラリー攻略ページ', href:'/boss-rally/'}])}`, [...flowState.crumbs, '攻略ページ']);
  if(topic === 'mechanics' || topic === 'level99' || topic === 'damage') return showResult(answerBossRallyOverview(topic).html, [...flowState.crumbs, '仕組み']);
  if(topic === 'recommend' || topic === 'bosses'){
    flowState.route = 'bossSelect';
    flowState.bossContext = 'bossRally';
    return showBossSelectMenu(false);
  }
}

function handleDojoTopic(topic){
  if(topic === 'page') return showResult(`<h2>バッジ道場攻略</h2><p>属性別おすすめと当サイト道場評価は専用ページで確認できます。</p>${relatedLinks([{label:'バッジ道場攻略ページ', href:'/badge-dojo/'}])}`, [...flowState.crumbs, '攻略ページ']);
  if(topic === 'attribute'){
    flowState.route = 'dojoAttr';
    return showDojoAttributeMenu(false);
  }
  if(topic === 'position') return showResult(answerDojoPosition().html, [...flowState.crumbs, '配置']);
  const roleMap = {front:'前衛', damage:'火力', cc:'CC', heal:'回復', recommend:'火力'};
  showResult(answerContentRoleCandidates('dojo', roleMap[topic] || '火力').html, [...flowState.crumbs, roleMap[topic] || 'おすすめ']);
}

function showBossSelectMenu(withBack = true){
  const bosses = state.content.bossRally?.bosses || [];
  setGuide(`<h2>どのボスを確認する？</h2><div class="guide-button-grid">${bosses.map(boss => `<button type="button" data-action="bossSelect" data-value="${esc(boss.id)}">${esc(boss.name)}</button>`).join('')}</div>`, withBack);
}

function handleBossSelect(bossId){
  pushHistory();
  const boss = (state.content.bossRally?.bosses || []).find(item => item.id === bossId);
  if(!boss) return showContentTopicMenu(false);
  flowState.bossId = bossId;
  flowState.route = 'bossActions';
  flowState.crumbs = ['コンテンツ攻略', 'ボスラリー', boss.name];
  if(flowState.role) return showResult(answerBossCandidates(boss).html, [...flowState.crumbs, flowState.role]);
  showBossActionMenu(false);
}

function showBossActionMenu(withBack = true){
  const boss = getBoss(flowState.bossId);
  setGuide(`<h2>${esc(boss?.name || 'ボス')}について何を知りたい？</h2>${buttonGrid([['mechanics','能力を見る'], ['strategy','対策を見る'], ['condition','おすすめ条件'], ['candidates','条件に合うタタ'], ['owned','手持ちから絞る'], ['page','ボスラリー攻略ページ']], 'bossAction')}`, withBack);
}

function handleBossAction(action){
  pushHistory();
  const boss = getBoss(flowState.bossId);
  if(!boss) return showBossSelectMenu(false);
  if(action === 'page') return showResult(`<h2>${esc(boss.name)}</h2><p>専用ページで特徴と候補を確認できます。</p>${relatedLinks([{label:'ボスラリー攻略ページ', href:'/boss-rally/'}, {label:'このボスの相談URL', href:`/consult/?flow=content&mode=bossRally&boss=${boss.id}`}])}`, flowState.crumbs);
  if(action === 'owned') return showOwnedPicker();
  if(action === 'candidates') return showResult(answerBossCandidates(boss).html, [...flowState.crumbs, '条件に合うタタ']);
  if(action === 'condition') return showResult(answerBossConditions(boss).html, [...flowState.crumbs, 'おすすめ条件']);
  showResult(answerBossFacts(boss).html, [...flowState.crumbs, action === 'mechanics' ? '能力' : '対策']);
}

function showOwnedPicker(){
  const selected = new Set(readOwnedFamilies());
  const buttons = state.families.map(f => `<button type="button" data-action="ownedToggle" data-value="${esc(f.id)}" class="${selected.has(f.id) ? 'is-selected' : ''}"><b>${esc(f.familyName)}系</b><small>${esc(f.evolutions.map(e => e.name).join(' / '))}</small></button>`).join('');
  setGuide(`<h2>手持ちだけに絞る</h2><p>持っている系統を選んでください。この端末のブラウザ内だけに保存し、サーバーには送信しません。</p><div class="guide-button-grid family-grid owned-grid">${buttons}</div><div class="guide-actions"><button type="button" data-action="applyOwned">選択した手持ちで候補を見る</button><button type="button" data-action="ownedReset">手持ちをリセット</button><button type="button" data-action="back">← 戻る</button></div>`, false);
}

function toggleOwned(id, button){
  if(!getFamily(id)) return;
  const selected = new Set(readOwnedFamilies());
  if(selected.has(id)) selected.delete(id);
  else selected.add(id);
  writeOwnedFamilies([...selected]);
  button.classList.toggle('is-selected', selected.has(id));
}

function applyOwnedFilter(){
  const owned = readOwnedFamilies();
  const boss = getBoss(flowState.bossId);
  if(!boss) return showContentTopicMenu(false);
  showResult(answerBossCandidates(boss, owned).html, [...flowState.crumbs, '手持ち候補']);
}

function readOwnedFamilies(){
  try{
    const parsed = JSON.parse(localStorage.getItem('monsabaOwnedFamilies') || '[]');
    const ids = Array.isArray(parsed) ? parsed : parsed?.version === 1 && Array.isArray(parsed.familyIds) ? parsed.familyIds : [];
    const valid = new Set(state.families.map(family => family.id));
    return [...new Set(ids.filter(id => typeof id === 'string' && valid.has(id)))];
  }catch(_){
    return [];
  }
}

function writeOwnedFamilies(ids){
  try{
    localStorage.setItem('monsabaOwnedFamilies', JSON.stringify({version:1, familyIds:ids}));
  }catch(_){}
}

function resetOwnedFamilies(){
  try{ localStorage.removeItem('monsabaOwnedFamilies'); }catch(_){}
  showOwnedPicker();
}

function showDojoAttributeMenu(withBack = true){
  setGuide(`<h2>どの属性を見る？</h2>${buttonGrid(menuConfig.attrs, 'dojoAttr')}`, withBack);
}

function handleDojoAttribute(attr){
  pushHistory();
  showResult(answerDojoAttribute(attr).html, [...flowState.crumbs, attr]);
}

function openContentDeepLink(params){
  const mode = params.get('mode');
  const mapped = mode === 'boss' ? 'bossRally' : mode;
  if(!state.content.modes?.[mapped]) return renderRootMenu(false);
  flowState = {route:'contentTopics', category:'content', content:mapped, crumbs:['コンテンツ攻略', state.content.modes[mapped].label]};
  if(mapped === 'bossRally' && params.get('boss')){
    const boss = getBoss(params.get('boss'));
    if(boss){
      flowState.route = 'bossActions';
      flowState.bossId = boss.id;
      flowState.crumbs = ['コンテンツ攻略', 'ボスラリー', boss.name];
      return showBossActionMenu(false);
    }
  }
  showContentTopicMenu(false);
}

function openFamilyDeepLink(params){
  const familyId = params.get('family');
  const family = getFamily(familyId);
  if(!family){
    history.replaceState(null, '', '/consult/');
    return renderRootMenu(false);
  }
  const flow = params.get('flow');
  if(flow === 'detail'){
    flowState = {route:'detailView', category:'detail', familyId, detailStage:null, crumbs:['性能確認', `${family.familyName}系`]};
    return showDetailViewMenu(false);
  }
  const stages = state.skills[familyId]?.stages || [];
  const requestedStage = Number(params.get('stage'));
  flowState = {route:'evolutionStage', category:'evolution', familyId, crumbs:['進化相談', `${family.familyName}系`]};
  if(Number.isInteger(requestedStage) && stages.some(stage => stage.stage === requestedStage)){
    const stageData = stages.find(stage => stage.stage === requestedStage);
    flowState.currentStage = requestedStage;
    flowState.route = 'evolutionPurpose';
    flowState.crumbs.push(`T${requestedStage} ${stageData.tataName}`);
    return showEvolutionPurposeMenu(false);
  }
  return showStageMenu(false);
}

function showZombieMenu(push = true){
  if(push) pushHistory();
  flowState.route = 'zombie';
  setGuide(`<h2>ゾンビラッシュで何を知りたい？</h2>${buttonGrid(menuConfig.zombieTopics, 'zombieTopic')}`);
}

function handleZombieTopic(topic){
  pushHistory();
  flowState.crumbs = ['コンテンツ攻略','ゾンビラッシュ'];
  if(topic === 'recommend') return showResult(answerZombie().html, [...flowState.crumbs, 'おすすめタタ']);
  if(topic === 'training') return showResult(answerModeCandidates('zombie', true).html, [...flowState.crumbs, '育成優先度']);
  if(topic === 'role') return showRoleMenu('zombie', {mode:'zombie'});
  if(topic === 'evolution') return startEvolutionFlow();
  if(topic === 'highwave' || topic === 'page') return showResult(`<h2>ゾンビラッシュ攻略</h2><p>高Wave攻略、育成順、注意ゾンビは専用ページで確認できます。</p>${relatedLinks([{label:'ゾンビラッシュ攻略ページを見る', href:'/zombie-rush/'}])}`, [...flowState.crumbs, '攻略ページ']);
}

function showTrainingMenu(push = true){
  if(push) pushHistory();
  flowState = {route:'training', category:'training', crumbs:['育成相談']};
  setGuide(`<h2>何を基準に育てたい？</h2>${buttonGrid(menuConfig.training, 'training')}`);
}

function handleTraining(value){
  pushHistory();
  if(value === 'beginner') return showResult(answerBeginner().html, ['育成相談','初心者・序盤']);
  if(value === 'overall') return showResult(answerOverallTier().html, ['育成相談','総合']);
  if(value === 'attribute') {
    flowState = {route:'training', category:'training', sub:'attribute', crumbs:['育成相談','属性から選ぶ']};
    return setGuide(`<h2>どの属性から選ぶ？</h2>${buttonGrid(menuConfig.attrs, 'attr')}`);
  }
  return showResult(answerModeCandidates(value).html, ['育成相談', modeLabels[value]]);
}

function handleAttributeSelect(attr){
  pushHistory();
  showResult(answerAttribute(attr, flowState.mode || 'overall').html, [...(flowState.crumbs || ['属性']), attr]);
}

function startEvolutionFlow(){
  pushHistory();
  flowState = {route:'evolutionFamily', category:'evolution', crumbs:['進化相談']};
  renderFamilyPicker('selectFamily', 'どのタタを進化させたい？', false);
}

function renderFamilyPicker(action, title, withBack = true){
  const buttons = state.families.map(f => {
    const names = [f.id, f.familyName, ...f.evolutions.map(e => e.name), ...(state.skills[f.id]?.stages || []).map(s => s.tataName)].join(' ');
    return `<button type="button" data-action="${esc(action)}" data-value="${esc(f.id)}" data-family-id="${esc(f.id)}" data-search="${esc(normalize(names))}"><b>${esc(f.familyName)}系</b><small>${esc(f.evolutions.map(e => e.name).join(' / '))}</small></button>`;
  }).join('');
  setGuide(`<h2>${esc(title)}</h2><div class="family-picker"><input type="search" data-family-filter placeholder="タタ名で検索（例：スタピョン、ガルルデン）" aria-label="タタ名で検索" /><div class="guide-button-grid family-grid">${buttons}</div></div>`, withBack);
}

function handleFamilySelect(familyId){
  pushHistory();
  flowState.familyId = familyId;
  flowState.route = 'evolutionStage';
  flowState.crumbs = ['進化相談', `${getFamily(familyId).familyName}系`];
  showStageMenu(false);
}

function showStageMenu(withBack = true){
  const family = getFamily(flowState.familyId);
  const stages = state.skills[flowState.familyId]?.stages || [];
  const buttons = stages.map(s => `<button type="button" data-action="selectStage" data-value="${s.stage}">T${s.stage} ${esc(s.tataName)}</button>`).join('');
  setGuide(`<h2>現在どこまで進化していますか？</h2><p>${esc(family.familyName)}系</p><div class="guide-button-grid">${buttons}</div>`, withBack);
}

function handleStageSelect(stage){
  pushHistory();
  const stageData = state.skills[flowState.familyId]?.stages.find(s => s.stage === stage);
  flowState.currentStage = stage;
  flowState.route = 'evolutionPurpose';
  flowState.crumbs = ['進化相談', `${getFamily(flowState.familyId).familyName}系`, `T${stage} ${stageData?.tataName || ''}`];
  showEvolutionPurposeMenu(false);
}

function showEvolutionPurposeMenu(withBack = true){
  setGuide(`<h2>何を目的に進化させますか？</h2>${buttonGrid(menuConfig.evolutionPurposes, 'selectPurpose')}`, withBack);
}

function handleEvolutionPurpose(mode){
  pushHistory();
  flowState.mode = mode;
  const answer = answerEvolutionDirect(flowState.familyId, flowState.currentStage, mode);
  showResult(answer.html, [...flowState.crumbs, modeLabels[mode]]);
}

function showBuildModeMenu(push = true){
  if(push) pushHistory();
  flowState = {route:'buildMode', category:'build', crumbs:['編成・役割']};
  setGuide(`<h2>どのコンテンツ用？</h2>${buttonGrid([['normal','通常攻略'], ['zombie','ゾンビラッシュ'], ['bossRally','ボスラリー'], ['dojo','バッジ道場'], ['overall','総合']], 'buildMode')}`);
}

function showRoleMenu(context, extra = {}, push = true){
  if(push) pushHistory();
  flowState = {...flowState, ...extra, route: context === 'build' ? 'buildRole' : 'zombieRole', crumbs: context === 'build' ? ['編成・役割', modeLabels[extra.mode || flowState.mode]] : ['コンテンツ攻略','ゾンビラッシュ','必要な役割']};
  setGuide(`<h2>どの役割が足りない？</h2>${buttonGrid(menuConfig.roles, 'roleSelect')}`);
}

function handleRoleSelect(role){
  pushHistory();
  const mode = flowState.mode || 'zombie';
  if(mode === 'bossRally'){
    flowState.role = role;
    flowState.route = 'bossSelect';
    flowState.bossContext = 'bossRally';
    flowState.crumbs = ['編成・役割', 'ボスラリー', role];
    return showBossSelectMenu(false);
  }
  showResult(answerRoleCandidates(mode, role).html, [...(flowState.crumbs || []), role]);
}

function startCompareFlow(){
  pushHistory();
  flowState = {route:'compareA', category:'compare', compareIds:[], crumbs:['タタ比較']};
  renderFamilyPicker('compareFamily', '1体目を選択', false);
}

function handleCompareFamily(familyId){
  pushHistory();
  flowState.compareIds = [...(flowState.compareIds || []), familyId];
  if(flowState.compareIds.length === 1){
    flowState.route = 'compareB';
    flowState.crumbs = ['タタ比較', `${getFamily(familyId).familyName}系`];
    return renderFamilyPicker('compareFamily', '2体目を選択', false);
  }
  flowState.route = 'compareMode';
  flowState.crumbs = ['タタ比較', ...flowState.compareIds.map(id => `${getFamily(id).familyName}系`)];
  showCompareModeMenu(false);
}

function showCompareModeMenu(withBack = true){
  setGuide(`<h2>何を基準に比較する？</h2>${buttonGrid(menuConfig.modes, 'mode')}`);
}

function handleCompareMode(mode){
  pushHistory();
  showResult(answerCompare(flowState.compareIds, mode).html, [...flowState.crumbs, modeLabels[mode]]);
}

function startDetailFlow(){
  pushHistory();
  flowState = {route:'detailFamily', category:'detail', crumbs:['性能確認']};
  renderFamilyPicker('detailFamily', '性能を調べたいタタを選択', false);
}

function handleDetailFamily(familyId){
  pushHistory();
  const selectedStage = stageFromName(familyId, document.querySelector('[data-family-filter]')?.value);
  flowState.detailStage = selectedStage;
  flowState.familyId = familyId;
  flowState.route = 'detailView';
  flowState.crumbs = ['性能確認', `${getFamily(familyId).familyName}系`];
  showDetailViewMenu(false);
}

function showDetailViewMenu(withBack = true){
  setGuide(`<h2>何を見たい？</h2>${buttonGrid([['basic','基本性能'], ['skill','スキル'], ['route','進化ルート'], ['tier','Tier評価'], ['diff','次進化で何が変わる？'], ['page','個別攻略ページを見る']], 'detailView')}`, withBack);
}

function handleDetailView(view){
  pushHistory();
  if(view === 'page') location.href = `/tata/${flowState.familyId}/`;
  if(view === 'diff') return showResult(answerEvolutionDirect(flowState.familyId, flowState.detailStage || 1, 'overall').html, [...flowState.crumbs, '次進化差分']);
  showResult(answerDetailView(flowState.familyId, view).html, [...flowState.crumbs, view]);
}

function detectIntent(q, families, attr){
  if(hasAny(q, ['ボスラリー','怪魚','ロックスター','走り屋','酔っ払い','社長ゾンビ','時間切れ','全滅','勝てない','道場','バッジ'])) return 'contentGuide';
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
  const normalizedQuestion = question.replaceAll('土属性', '岩属性').replaceAll('土で', '岩で').replaceAll('土の', '岩の');
  for(const attr of Object.keys(ATTRIBUTE_META)){
    if(normalizedQuestion.includes(`${attr}属性`) || normalizedQuestion.includes(`${attr}で`) || normalizedQuestion.includes(`${attr}の`)) return attr;
  }
  return null;
}

function answerContentQuestion(q){
  const boss = (state.content.bossRally?.bosses || []).find(item => q.includes(normalize(item.name.replace('ゾンビ',''))) || q.includes(normalize(item.name)));
  if(boss) {
    if(hasAny(q, ['条件','おすすめ','候補','強い','タタ'])) return answerBossCandidates(boss);
    return answerBossFacts(boss);
  }
  if(hasAny(q, ['ボスラリー'])) return answerBossRallyOverview('mechanics');
  if(hasAny(q, ['時間切れ'])) return answerNormalTrouble('timeOut');
  if(hasAny(q, ['全滅','勝てない'])) return answerNormalTrouble('wipe');
  if(hasAny(q, ['道場','バッジ'])){
    const attr = Object.keys(ATTRIBUTE_META).find(a => q.includes(normalize(a)) || (a === '岩' && q.includes(normalize('土'))));
    if(attr) return answerDojoAttribute(attr);
    if(hasAny(q, ['cc','妨害'])) return answerContentRoleCandidates('dojo', 'CC');
    if(hasAny(q, ['回復'])) return answerContentRoleCandidates('dojo', '回復');
    if(hasAny(q, ['前衛','タンク'])) return answerContentRoleCandidates('dojo', '前衛');
    return answerContentRoleCandidates('dojo', '火力');
  }
  return answerUnknown();
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
  const ta = tierForCompare(a, mode);
  const tb = tierForCompare(b, mode);
  const rolesA = (state.ratings.overall?.byFamily?.[a]?.roles || []).join(' / ') || '役割データなし';
  const rolesB = (state.ratings.overall?.byFamily?.[b]?.roles || []).join(' / ') || '役割データなし';
  const scoreA = safeTierScore(ta);
  const scoreB = safeTierScore(tb);
  if(scoreA == null && scoreB == null) return `両方とも現在このモードの評価が保留のため、Tierだけでは直接比較できません。${fa.familyName}系は${rolesA}、${fb.familyName}系は${rolesB}という役割差を確認してください。`;
  if(scoreA != null && scoreB == null) return `${fa.familyName}系は現在${ta}評価。${fb.familyName}系はこのモードの評価が保留のため、Tierだけでは直接比較できません。評価保留は弱いという意味ではありません。`;
  if(scoreA == null && scoreB != null) return `${fb.familyName}系は現在${tb}評価。${fa.familyName}系はこのモードの評価が保留のため、Tierだけでは直接比較できません。評価保留は弱いという意味ではありません。`;
  if(scoreA < scoreB) return `${modeLabels[mode]}を重視するなら${fa.familyName}系が優先候補です。ただし、${fb.familyName}系は${rolesB}が欲しい時に候補になります。`;
  if(scoreB < scoreA) return `${modeLabels[mode]}を重視するなら${fb.familyName}系が優先候補です。ただし、${fa.familyName}系は${rolesA}が欲しい時に候補になります。`;
  return `評価は近いため、${fa.familyName}系は${rolesA}、${fb.familyName}系は${rolesB}という役割差で選びます。`;
}

function tierForCompare(id, mode){
  const overall = state.ratings.overall?.byFamily?.[id];
  if(mode === 'zombie') return state.ratings.zombieRush?.byFamily?.[id]?.tier || overall?.zombie;
  if(mode === 'overall') return overall?.tier;
  return overall?.[mode];
}

function safeTierScore(tier){
  return Object.prototype.hasOwnProperty.call(tierScore, tier) ? tierScore[tier] : null;
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
    if(tx) return answerEvolution(familyId, normalize(tx.from.tataName), mode, false);
  }
  const message = state.evolution.modeNotes?.zombieRush?.message || 'ゾンビラッシュでは第4進化の属性オーラは無効です。';
  return {
    html: `<h2>T4は進化するべき？</h2>
      <p class="consult-warning">${esc(message)}</p>
      <p>ただし、オーラ以外のスキル変化や他コンテンツでの利用価値はあるため、T4自体が無意味という扱いではありません。</p>
      ${relatedLinks([{label:'T4進化差分', href:'/evolution-priority/#transition-list'}, {label:'進化優先度', href:'/evolution-priority/'}, {label:'ゾンビラッシュ攻略', href:'/zombie-rush/'}])}`
  };
}

function answerEvolutionDirect(familyId, currentStage, mode){
  if(!familyId) return answerUnknown();
  const family = getFamily(familyId);
  const tx = state.transitions.find(t => t.family.id === familyId && t.from.stage === currentStage);
  if(!tx) {
    return {
      html: `<h2>${esc(family.familyName)}系</h2><p>現在のサイトDBでは、この段階から先の進化データは収録されていません。</p>${relatedLinks([{label:`${family.familyName}系詳細`, href:`/tata/${familyId}/`}, {label:'進化優先度', href:'/evolution-priority/'}])}`
    };
  }
  const overall = state.ratings.overall?.byFamily?.[familyId];
  const zombie = state.ratings.zombieRush?.byFamily?.[familyId];
  const zombieAura = mode === 'zombie' && tx.from.stage === 3 && tx.to.stage === 4 ? `<p class="consult-warning">${esc(state.evolution.modeNotes?.zombieRush?.message || 'ゾンビラッシュでは第4進化のオーラは無効です。')}</p>` : '';
  return {
    html: `<h2>T${tx.from.stage} ${esc(tx.from.tataName)} → T${tx.to.stage} ${esc(tx.to.tataName)}</h2>
      <div class="consult-compare-grid compact">
        <div><small>現在</small><b>T${tx.from.stage} ${esc(tx.from.tataName)}</b><span>${esc(tx.from.skillName)}</span></div>
        <div><small>次</small><b>T${tx.to.stage} ${esc(tx.to.tataName)}</b><span>${esc(tx.to.skillName)}</span></div>
      </div>
      <div class="consult-badges">${badge('進化優先度', tx.meta.priority)}${badge('総合Tier', overall?.tier || '評価保留')}${badge('ゾンビラッシュ', zombie?.tier || overall?.zombie || '－')}${mode !== 'overall' ? badge(modeLabels[mode], modeTier(familyId, mode) || '－') : ''}</div>
      <h3>次進化で大きく変わる点</h3>
      ${tx.meta.headline ? `<p>${esc(tx.meta.headline)}</p>` : ''}
      <h3>スキル差分</h3>
      ${deltaHtml(tx.delta)}
      ${zombieAura}
      <h3>短い結論</h3>
      <p>${esc(tx.meta.reason)}</p>
      ${relatedLinks([{label:`${family.familyName}系を詳しく見る`, href:`/tata/${familyId}/`}, {label:'もう1体と比較する', href:'#'}, {label:'ゾンビラッシュ攻略を見る', href:'/zombie-rush/'}])}`
  };
}

function answerModeCandidates(mode, includeEvolution = false){
  const list = state.families.map(f => ({family:f, overall:state.ratings.overall?.byFamily?.[f.id], zombie:state.ratings.zombieRush?.byFamily?.[f.id]}))
    .filter(item => item.overall || item.zombie)
    .map(item => ({...item, tier: mode === 'zombie' ? (item.zombie?.tier || item.overall?.zombie) : mode === 'overall' ? item.overall?.tier : item.overall?.[mode]}))
    .filter(item => item.tier)
    .sort((a,b) => (tierScore[a.tier || '－'] - tierScore[b.tier || '－']) || (tierScore[a.overall?.tier || '－'] - tierScore[b.overall?.tier || '－']) || a.family.familyName.localeCompare(b.family.familyName, 'ja'))
    .slice(0, 8);
  const evo = includeEvolution ? `<h3>進化面の目安</h3><p>ゾンビラッシュ目的でも、進化優先度はT3ロードマップや次進化の差分を合わせて判断します。</p>` : '';
  return {
    html: `<h2>${esc(modeLabels[mode] || '総合')}の育成候補</h2><p>現在のTierデータで評価がある候補を上位から表示します。評価保留のタタを弱いとは扱いません。</p>${evo}<div class="consult-pick-list">${list.map(item => pickRow(item.family.id, item.tier, item.overall?.roles, item.zombie?.adoptionRate)).join('')}</div>${relatedLinks([{label:'総合タタTier', href:'/tata-tier/'}, {label:'進化優先度', href:'/evolution-priority/'}])}`
  };
}

function answerRoleCandidates(mode, role, attr = null){
  const candidates = getCandidates({mode, roles:[role], attribute:attr, requireTier:true, limit:8});
  const body = candidates.length ? `<div class="consult-pick-list">${candidates.map(item => pickCandidateRow(item)).join('')}</div>` : '<p>条件に合う評価済み候補は見つかりませんでした。条件を広げて確認してください。</p>';
  return {
    html: `<h2>${esc(modeLabels[mode] || '総合')}向け：${esc(role)}候補</h2><p>Tier評価と役割データに基づく候補です。完全な編成テンプレは生成しません。</p>${body}${relatedLinks([{label:'総合タタTier', href:'/tata-tier/'}, {label:'ゾンビラッシュ攻略', href:'/zombie-rush/'}])}`
  };
}

function answerContentRoleCandidates(mode, role){
  const candidates = getCandidates({mode, roles:[role], requireTier:false, limit:8});
  return {
    html: `<h2>${esc(modeLabels[mode] || mode)}向け：${esc(role)}候補</h2>
      <p>この一覧は編成テンプレではなく、当サイトDBの役割・スキル・Tierが条件に合う候補です。評価保留は弱いという意味ではありません。</p>
      ${candidates.length ? `<div class="consult-pick-list">${candidates.map(item => pickCandidateRow(item)).join('')}</div>` : '<p>条件に合う候補は見つかりませんでした。</p>'}
      ${relatedLinks([{label:'バッジ道場攻略ページ', href:'/badge-dojo/'}, {label:'総合タタTier', href:'/tata-tier/'}])}`
  };
}

function answerNormalTrouble(key){
  const item = state.content.normal?.troubleshooting?.[key];
  if(!item) return answerUnknown();
  const traits = item.candidateTraits || item.candidateRoles || [];
  const candidates = getCandidates({mode:'normal', roles:traits, requireTier:false, limit:6});
  return {
    html: `<h2>通常攻略：${esc(item.label)}</h2>
      <p><b>原因候補：</b>${esc((item.causes || []).join(' / '))}</p>
      <h3>明示された対策</h3>${list(item.actions || [])}
      ${traits.length ? `<h3>条件に合う当サイト候補</h3><p class="consult-note">通常攻略の専用Tierではなく、症状に合う役割・スキル条件で抽出しています。</p><div class="consult-pick-list">${candidates.map(item => pickCandidateRow(item)).join('') || '<p>条件一致候補はありません。</p>'}</div>` : ''}
      ${relatedLinks([{label:'通常攻略ページ', href:'/normal-guide/'}, {label:'育成相談', href:'/consult/?flow=training'}])}`
  };
}

function answerBossRallyOverview(topic){
  const facts = state.content.bossRally?.overviewFacts || [];
  const extra = topic === 'level99' ? 'Lv99は最大難易度です。Lv99到達や突破を保証する編成は、現在のDBだけでは断定しません。' : topic === 'damage' ? 'Lv99後は最大ダメージを伸ばす段階です。勝率やダメージ量は推測しません。' : 'ボスごとの特殊能力と属性相性が重要です。';
  return {html:`<h2>ボスラリーの仕組み</h2>${list(facts.map(f => f.text))}<p class="consult-note">${esc(extra)}</p>${relatedLinks([{label:'ボスラリー攻略ページ', href:'/boss-rally/'}])}`};
}

function answerBossFacts(boss){
  return {html:`<h2>${esc(boss.name)}</h2>
    <h3>能力</h3>${list((boss.mechanics || []).map(f => f.text))}
    <h3>ボスラリー専用挙動</h3><p>${esc(boss.rallyDifference || '明示情報なし')}</p>
    ${boss.strategyFacts?.length ? `<h3>攻略上の事実</h3>${list(boss.strategyFacts.map(f => f.text))}` : ''}
    ${relatedLinks([{label:'条件に合うタタを見る', href:'#'}, {label:'ボスラリー攻略ページ', href:'/boss-rally/'}])}`};
}

function answerBossConditions(boss){
  const labels = conditionLabels(boss.explicitRecommendation);
  return {html:`<h2>${esc(boss.name)}のおすすめ条件</h2>
    ${labels.length ? tagList(labels) : '<p>本文で明確に確認できる推奨条件は限定的です。画像編成からの推測は行いません。</p>'}
    <p class="consult-note">これはボス専用Tierではなく、公開攻略で明記された条件です。</p>
    ${relatedLinks([{label:'条件に合うタタ', href:'#'}, {label:'ボスラリー攻略ページ', href:'/boss-rally/'}])}`};
}

function answerBossCandidates(boss, ownedIds = null){
  const rec = boss.explicitRecommendation || {};
  const candidates = getCandidates({mode:'overall', attribute:rec.attribute, roles:rec.traits || [], ownedIds, requireTier:false, limit:8});
  return {html:`<h2>${esc(boss.name)}：条件に合うタタ</h2>
    <p>公開攻略で明記された条件：${esc(conditionLabels(rec).join(' / ') || '明示条件なし')}</p>
    <p class="consult-note">この一覧はボス専用Tierではありません。条件に一致する当サイトDB候補です。</p>
    ${candidates.length ? `<div class="consult-pick-list">${candidates.map(item => pickCandidateRow(item)).join('')}</div>` : '<p>現在の条件で一致する候補はありません。推測で候補は作りません。</p>'}
    ${relatedLinks([{label:'手持ちから絞る', href:'#'}, {label:'ボスラリー攻略ページ', href:'/boss-rally/'}])}`};
}

function answerDojoPosition(){
  const facts = state.content.dojo?.principles || [];
  return {html:`<h2>バッジ道場：配置</h2>
    ${list(facts.map(f => f.text))}
    <p class="consult-note">高階層では、前衛・回復・CC・攻撃範囲を見直し、直線配置や優先攻撃対象を調整します。</p>
    ${relatedLinks([{label:'バッジ道場攻略ページ', href:'/badge-dojo/'}])}`};
}

function answerDojoAttribute(attr){
  const data = state.content.dojo?.attributeRecommendations?.[attr];
  if(!data) return answerUnknown();
  const rows = [...(data.confirmed || []).map(item => dojoCandidateRow(item, '公開攻略の確定枠')), ...(data.candidates || []).map(item => dojoCandidateRow(item, '公開攻略の候補枠'))].join('');
  const rated = getCandidates({mode:'dojo', attribute:attr, requireTier:true, limit:6});
  return {html:`<h2>バッジ道場：${esc(attr)}属性</h2>
    <h3>公開攻略で挙げられている例</h3><div class="consult-pick-list">${rows}</div>
    <h3>当サイト道場評価</h3><p class="consult-note">公開攻略の例と当サイト評価は別枠です。</p>
    <div class="consult-pick-list">${rated.map(item => pickCandidateRow(item)).join('') || '<p>評価済み候補はありません。</p>'}</div>
    ${relatedLinks([{label:'バッジ道場攻略ページ', href:'/badge-dojo/'}, {label:`${attr}属性攻略`, href:`/attribute/${attrPath[attr]}/`}])}`};
}

function getCandidates({mode = 'overall', attribute = null, roles = [], ownedIds = null, excludeIds = [], requireTier = false, limit = 8} = {}){
  const roleList = roles.filter(Boolean);
  return state.families.map(f => {
    const overall = state.ratings.overall?.byFamily?.[f.id];
    const zombie = state.ratings.zombieRush?.byFamily?.[f.id];
    const skillText = (state.skills[f.id]?.stages || []).map(s => `${s.skillName} ${s.description} ${(s.values || []).map(v => `${v.label} ${v.value}`).join(' ')}`).join(' ');
    const reasons = [];
    if(attribute && f.attribute === attribute) reasons.push(`${attribute}属性`);
    for(const role of roleList) if(roleMatches(role, overall?.roles || [], skillText)) reasons.push(role);
    const needed = (attribute ? 1 : 0) + roleList.length;
    const tier = mode === 'zombie' ? (zombie?.tier || overall?.zombie) : mode === 'overall' ? overall?.tier : overall?.[mode];
    return {family:f, overall, zombie, tier, reasons, hit: needed === 0 ? !!tier : reasons.length >= needed};
  }).filter(item => item.hit && (!requireTier || item.tier) && (!ownedIds || ownedIds.includes(item.family.id)) && !excludeIds.includes(item.family.id))
    .sort((a,b) => (tierScore[a.tier || a.overall?.tier || '－'] - tierScore[b.tier || b.overall?.tier || '－']) || a.family.familyName.localeCompare(b.family.familyName, 'ja'))
    .slice(0, limit);
}

function pickCandidateRow(item){
  const reasons = item.reasons.length ? item.reasons : ['評価データあり'];
  return `<a class="consult-pick-row" href="/tata/${esc(item.family.id)}/"><span><b>${esc(item.family.familyName)}系</b><small>候補理由：${esc(reasons.join(' / '))}${item.overall?.roles?.length ? ` / ${esc(item.overall.roles.join(' / '))}` : ''}</small></span><em>${esc(item.tier || item.overall?.tier || '評価保留')}</em></a>`;
}

function dojoCandidateRow(item, label){
  if(!item.familyId) return `<div class="consult-pick-row"><span><b>${esc(item.sourceName)}</b><small>DB familyIdへ安全に紐付けできません</small></span><em>確認中</em></div>`;
  const family = getFamily(item.familyId);
  return `<a class="consult-pick-row" href="/tata/${esc(item.familyId)}/"><span><b>${esc(family?.familyName || item.sourceName)}系</b><small>${esc(label)} / 公開表記：${esc(item.sourceName)}</small></span><em>${esc(item.slot || '候補')}</em></a>`;
}

function conditionLabels(rec){
  if(!rec) return [];
  return [rec.attribute ? `${rec.attribute}属性` : null, ...(rec.traits || [])].filter(Boolean);
}

function getBoss(id){
  return (state.content.bossRally?.bosses || []).find(item => item.id === id);
}

function roleMatches(role, roles, skillText){
  const hay = normalize([...roles, skillText].join(' '));
  const map = {
    '火力':['火力','ダメージ','範囲','燃焼','貫通','連撃'],
    '範囲攻撃':['範囲','広範囲','複数','全体'],
    '複数レーン':['範囲','広範囲','貫通','連鎖'],
    '単体高火力':['近距離火力','単体','連撃','攻撃回数','燃焼','ダメージ倍率'],
    '召喚処理':['範囲','広範囲','複数','貫通','連鎖'],
    '速攻':['火力','ダメージ','連撃','燃焼','貫通'],
    '耐久寄り':['前衛','タンク','シールド','回復','被ダメージ軽減'],
    '回復':['回復','継続回復','高速回復'],
    '前衛':['前衛','タンク','シールド','耐久','hp','生存'],
    'CC':['cc','妨害','麻痺','睡眠','減速','スタン','束縛'],
    'バフ':['バフ','攻撃力増加','攻撃速度','攻防','強化'],
    'デバフ':['デバフ','被ダメ','被撃','被ダメ増加','防御'],
    'ノックバック':['ノックバック']
  };
  return (map[role] || [role]).some(word => hay.includes(normalize(word)));
}

function showPreparedContent(label){
  showResult(`<h2>${esc(label)}</h2><p>現在このコンテンツの専用攻略データは準備中です。専用Tierや編成は推測せず、総合評価・タタ性能から確認できます。</p><div class="guide-button-grid followup-grid"><button type="button" data-action="training">総合Tierから候補を見る</button><button type="button" data-action="compare">タタを比較する</button><button type="button" data-action="detail">タタ性能を調べる</button></div>`, flowState.crumbs);
}

function answerDetailView(familyId, view){
  const family = getFamily(familyId);
  const detailStage = flowState.detailStage;
  const stage = state.skills[familyId]?.stages.find(s => s.stage === detailStage) || state.skills[familyId]?.stages[0];
  const overall = state.ratings.overall?.byFamily?.[familyId];
  const zombie = state.ratings.zombieRush?.byFamily?.[familyId];
  if(view === 'basic' && detailStage) {
    return {html:`<h2>T${stage.stage} ${esc(stage.tataName)}の基本性能</h2>
      <div class="consult-badges">${badge('属性', family.attribute)}${badge('系統', `${family.familyName}系`)}${badge('総合Tier', `${overall?.tier || '評価保留'}（${family.familyName}系全体の評価）`)}${badge('ゾンビ', zombie?.tier || overall?.zombie || '－')}</div>
      <h3>スキル</h3><p><b>${esc(stage.skillName)}</b></p>
      <h3>説明</h3><p>${esc(stage.description)}</p>
      <h3>数値</h3>${deltaValueList(stage.values)}
      <h3>進化ルート</h3>${chainHtml(family)}
      ${relatedLinks([{label:`${family.familyName}系詳細`, href:`/tata/${familyId}/`}, {label:'総合タタTier', href:'/tata-tier/'}])}`};
  }
  if(view === 'skill') {
    return {html:`<h2>T${stage.stage} ${esc(stage.tataName)}のスキル</h2><h3>${esc(stage.skillName)}</h3><p>${esc(stage.description)}</p>${deltaValueList(stage.values)}${relatedLinks([{label:`${family.familyName}系詳細`, href:`/tata/${familyId}/`}])}`};
  }
  if(view === 'route') return {html:`<h2>${esc(family.familyName)}系の進化ルート</h2>${chainHtml(family)}${relatedLinks([{label:`${family.familyName}系詳細`, href:`/tata/${familyId}/`}])}`};
  if(view === 'tier') return answerDetail(familyId, 'overall');
  return answerDetail(familyId, 'overall');
}

function deltaValueList(values){
  return values?.length ? `<ul class="plain-list">${values.map(v => `<li>${esc(v.label)}：${esc(v.value)}</li>`).join('')}</ul>` : '<p>数値データは収録されていません。</p>';
}

function stageFromName(familyId, query){
  const q = normalize(query);
  if(!q) return null;
  return (state.skills[familyId]?.stages || []).find(s => q.includes(normalize(s.tataName)) || q.includes(normalize(s.skillName)))?.stage || null;
}

function answerUnknown(raw){
  const exists = raw ? resolveFamilies(normalize(raw)).length > 0 : true;
  return {
    html: `<h2>質問を判断できませんでした</h2>
      ${exists ? '' : '<p>入力された名前は、現在のタタDBでは確認できませんでした。存在しないタタ名は作らずに案内します。</p>'}
      <p>その質問は現在の自由質問では判断できません。下のメニューから条件を選ぶと、より正確に案内できます。</p>
      <p>今は以下について質問できます。</p>
      ${list(['タタの強さ','進化','育成優先度','タタ比較','属性おすすめ','ゾンビラッシュ','初心者育成'])}
      <div class="guide-button-grid followup-grid">
        <button type="button" data-action="unknownStart" data-value="training">育成相談を始める</button>
        <button type="button" data-action="unknownStart" data-value="evolution">進化相談を始める</button>
        <button type="button" data-action="unknownStart" data-value="content">コンテンツ攻略</button>
        <button type="button" data-action="unknownStart" data-value="compare">タタ比較</button>
      </div>
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
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    const current = (Array.isArray(parsed) ? parsed : []).filter(q => typeof q === 'string' && q !== question);
    current.unshift(question);
    localStorage.setItem(key, JSON.stringify(current.slice(0, 8)));
  }catch(_){}
}

boot().catch(error => {
  console.error(error);
  addAssistant('データの読み込みに失敗しました。ページを再読み込みしてください。');
});
