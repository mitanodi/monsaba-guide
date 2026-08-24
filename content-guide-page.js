const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrIcon = Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta]) => [attr,meta.icon]));
const tierScore = {SSS:0, SS:1, S:2, A:3, '－':9};
const roleWords = {
  火力:['火力','ダメージ','燃焼','連撃','貫通'],
  範囲攻撃:['範囲','広範囲','複数','全体'],
  複数レーン:['範囲','広範囲','貫通','連鎖'],
  単体高火力:['近距離火力','単体','連撃','攻撃回数','燃焼','ダメージ倍率'],
  回復:['回復','継続回復','高速回復'],
  前衛:['前衛','タンク','シールド','耐久','生存'],
  CC:['CC','妨害','麻痺','睡眠','減速','スタン','束縛'],
  バフ:['バフ','攻撃力増加','攻撃速度','攻防','強化'],
  デバフ:['デバフ','被ダメ','被ダメージ増加'],
  召喚処理:['範囲','広範囲','複数','貫通','連鎖'],
  速攻:['火力','ダメージ','連撃','燃焼','貫通'],
  耐久寄り:['前衛','タンク','シールド','回復','被ダメージ軽減']
};
const attrPath = Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta]) => [attr,meta.slug]));
let state = {};

async function bootContentGuide(){
  const page = document.body.dataset.contentGuide;
  const [tatari, skills, ratings, guides] = await Promise.all([
    fetchJson('/data/tatari.json'),
    fetchJson('/data/tata-skills.json'),
    fetchJson('/data/tier-ratings.json'),
    fetchJson('/data/content-guides.json')
  ]);
  state = {families:tatari.families || [], skills:skills.byFamily || {}, ratings, guides};
  renderSharedLinks();
  if(page === 'bossRally') renderBossRally();
  if(page === 'badgeDojo') renderDojo();
  if(page === 'normal') renderNormal();
  renderReferences(guides[page === 'badgeDojo' ? 'dojo' : page]);
}

async function fetchJson(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function renderSharedLinks(){
  const nav = $('#contentNav');
  if(nav) {
    nav.innerHTML = [
      ['/normal-guide/','通常ステージ'],
      ['/zombie-rush/','ゾンビラッシュ'],
      ['/boss-rally/','ボスラリー'],
      ['/badge-dojo/','バッジ道場'],
      ['/consult/','攻略相談所']
    ].map(([href,label]) => `<a href="${href}" class="${location.pathname === href ? 'is-active' : ''}">${label}</a>`).join('');
  }
}

function renderReferences(guide){
  const root = $('#referenceSources');
  if(!root || !guide) return;
  const urls = new Set();
  const collect = (value) => {
    if(typeof value === 'string' && /^https:\/\//.test(value)) urls.add(value);
    else if(Array.isArray(value)) value.forEach(collect);
    else if(value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(guide);
  const sourceLabels = {
    [state.guides.sources.bossRally]:'公開攻略Wiki：ボスラリー',
    [state.guides.sources.normalBosses]:'公開攻略Wiki：通常ボス',
    [state.guides.sources.faq]:'公開攻略Wiki：FAQ',
    [state.guides.sources.dojo]:'公開攻略Wiki：バッジ道場'
  };
  root.innerHTML = [...urls].map(url => `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(sourceLabels[url] || '公開攻略Wiki（外部サイト）')} <span aria-hidden="true">↗</span></a></li>`).join('');
}

function renderBossRally(){
  const guide = state.guides.bossRally;
  $('#overviewFacts').innerHTML = list(guide.overviewFacts.map(f => f.text));
  $('#bossTabs').innerHTML = guide.bosses.map((boss, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-boss="${esc(boss.id)}">${esc(boss.name)}</button>`).join('');
  $('#bossTabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-boss]');
    if(!button) return;
    $('#bossTabs').querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === button));
    renderBoss(button.dataset.boss);
  });
  renderBoss(guide.bosses[0].id);
}

function renderBoss(id){
  const boss = state.guides.bossRally.bosses.find(b => b.id === id);
  const conditions = conditionLabels(boss.explicitRecommendation);
  const candidates = matchCandidates({
    attribute: boss.explicitRecommendation.attribute,
    traits: boss.explicitRecommendation.traits,
    mode: 'overall',
    limit: 8
  });
  $('#bossDetail').innerHTML = `<article class="content-card">
    <h2>${esc(boss.name)}</h2>
    <div class="content-columns">
      <section><h3>特徴</h3>${factList(boss.mechanics)}</section>
      <section><h3>ボスラリー専用挙動</h3><p>${esc(boss.rallyDifference || '明示情報なし')}</p>${boss.strategyFacts?.length ? `<h3>攻略上の事実</h3>${factList(boss.strategyFacts)}` : ''}</section>
    </div>
    <h3>公開攻略で明記された推奨条件</h3>
    ${conditions.length ? tagList(conditions) : '<p>本文で明確に確認できる推奨条件は限定的です。画像編成からの推測は行いません。</p>'}
    <h3>条件に合う当サイト候補</h3>
    <p class="section-note">${esc(state.guides.bossRally.candidateNotice)}</p>
    ${candidateList(candidates)}
    <div class="consult-related"><b>関連相談</b><a href="/consult/?flow=content&mode=bossRally&boss=${esc(boss.id)}">このボスを攻略相談所で相談</a><a href="/tata-tier/">総合タタTier</a></div>
  </article>`;
}

function renderDojo(){
  const dojo = state.guides.dojo;
  $('#dojoPrinciples').innerHTML = factList(dojo.principles);
  $('#dojoRoles').innerHTML = tagList(dojo.desiredRoles);
  $('#dojoAttrs').innerHTML = Object.entries(dojo.attributeRecommendations).map(([attr, data]) => {
    const confirmed = data.confirmed.map(item => dojoRow(item, '公開攻略の確定枠'));
    const candidates = data.candidates.map(item => dojoRow(item, '公開攻略の候補枠'));
    const dojoRated = state.families
      .filter(f => f.attribute === attr)
      .map(f => ({family:f, tier: state.ratings.overall?.byFamily?.[f.id]?.dojo, overall: state.ratings.overall?.byFamily?.[f.id]}))
      .filter(x => x.tier)
      .sort((a,b) => (tierScore[a.tier] - tierScore[b.tier]) || a.family.familyName.localeCompare(b.family.familyName, 'ja'))
      .slice(0, 5)
      .map(x => pickRow(x.family.id, `道場${x.tier}`, [`当サイト道場評価`, ...(x.overall?.roles || [])]));
    return `<article class="content-card">
      <h3>${attrIcon[attr] || ''} ${esc(attr)}属性</h3>
      <h4>公開攻略で挙げられている例</h4>
      <div class="consult-pick-list">${[...confirmed, ...candidates].join('')}</div>
      <h4>当サイト道場評価</h4>
      <div class="consult-pick-list">${dojoRated.join('') || '<p>評価済み候補はありません。</p>'}</div>
    </article>`;
  }).join('');
}

function renderNormal(){
  const normal = state.guides.normal;
  $('#normalTroubles').innerHTML = Object.entries(normal.troubleshooting).map(([key, item]) => {
    const traits = item.candidateTraits || item.candidateRoles || [];
    const candidates = matchCandidates({traits, mode:'normal', limit:6});
    return `<article class="content-card" id="${esc(key)}">
      <h3>${esc(item.label)}</h3>
      <p><b>原因候補：</b>${esc(item.causes.join(' / '))}</p>
      <h4>明示された対策</h4>${list(item.actions)}
      ${traits.length ? `<h4>条件に合う当サイト候補</h4><p class="section-note">通常攻略の専用Tierではなく、症状に合う役割・スキル条件で抽出しています。</p>${candidateList(candidates)}` : ''}
    </article>`;
  }).join('');
  $('#normalBosses').innerHTML = (normal.bosses || []).map(boss => `<article class="content-card">
    <h3>${esc(boss.name)}</h3>
    <p>本文で確認できる条件：${conditionLabels(boss.explicitRecommendation).map(esc).join(' / ') || '明示条件なし'}</p>
    ${candidateList(matchCandidates({attribute:boss.explicitRecommendation.attribute, traits:boss.explicitRecommendation.traits, mode:'normal', limit:5}))}
  </article>`).join('');
}

function matchCandidates({attribute = null, traits = [], mode = 'overall', limit = 8, owned = null}){
  const normalizedTraits = traits.filter(Boolean);
  return state.families.map(family => {
    const overall = state.ratings.overall?.byFamily?.[family.id];
    const zombie = state.ratings.zombieRush?.byFamily?.[family.id];
    const skillText = (state.skills[family.id]?.stages || []).map(s => `${s.skillName} ${s.description} ${(s.values || []).map(v => `${v.label} ${v.value}`).join(' ')}`).join(' ');
    const reasons = [];
    if(attribute && family.attribute === attribute) reasons.push(`${attribute}属性`);
    for(const trait of normalizedTraits) if(matchesTrait(trait, overall?.roles || [], skillText)) reasons.push(trait);
    const required = (attribute ? 1 : 0) + normalizedTraits.length;
    const hit = required === 0 ? false : reasons.length >= required;
    const tier = mode === 'zombie' ? (zombie?.tier || overall?.zombie) : mode === 'overall' ? overall?.tier : overall?.[mode];
    return {family, tier, overallTier: overall?.tier, roles: overall?.roles || [], hit, reasons};
  }).filter(item => item.hit && (!owned || owned.includes(item.family.id)))
    .sort((a,b) => (tierScore[a.tier || a.overallTier || '－'] - tierScore[b.tier || b.overallTier || '－']) || a.family.familyName.localeCompare(b.family.familyName, 'ja'))
    .slice(0, limit);
}

function matchesTrait(trait, roles, skillText){
  const hay = normalize([...roles, skillText].join(' '));
  return (roleWords[trait] || [trait]).some(word => hay.includes(normalize(word)));
}

function conditionLabels(rec){
  if(!rec) return [];
  return [rec.attribute ? `${rec.attribute}属性` : null, ...(rec.traits || [])].filter(Boolean);
}

function candidateList(candidates){
  return candidates.length ? `<div class="consult-pick-list">${candidates.map(item => pickRow(item.family.id, item.tier || item.overallTier || '評価保留', item.reasons)).join('')}</div>` : '<p>現在のDB条件で一致する候補はありません。無理に候補は作りません。</p>';
}

function pickRow(id, tier, reasons = []){
  const family = state.families.find(f => f.id === id);
  if(!family) return '';
  return `<a class="consult-pick-row" href="/tata/${esc(id)}/"><span><b>${esc(family.familyName)}系</b><small>候補理由：${esc(reasons.join(' / ') || '評価データあり')}</small></span><em>${esc(tier || '評価保留')}</em></a>`;
}

function dojoRow(item, reason){
  if(!item.familyId) return `<div class="consult-pick-row"><span><b>${esc(item.sourceName)}</b><small>未解決：DB familyIdへ安全に紐付けできません</small></span><em>確認中</em></div>`;
  return pickRow(item.familyId, item.slot || reason, [reason, `公開表記：${item.sourceName}`]);
}

function factList(items){
  return list((items || []).map(item => item.text || item));
}

function tagList(items){
  return `<div class="role-tags">${items.map(item => `<span>${esc(item)}</span>`).join('')}</div>`;
}

function list(items){
  return `<ul class="plain-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function normalize(text){
  return String(text ?? '').toLowerCase().replace(/[ \t\r\n　・ーｰ]/g, '');
}

bootContentGuide().catch(error => {
  console.error(error);
  const root = $('#contentError');
  if(root) root.textContent = 'データの読み込みに失敗しました。ページを再読み込みしてください。';
});
