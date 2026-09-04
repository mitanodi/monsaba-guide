import fs from 'node:fs';
import path from 'node:path';
import { ATTRIBUTE_META } from './site-config.mjs';
import '../family-display.js';

const { getFamilyDisplayName, getFamilyDisplayLabel } = globalThis.MONSABA_FAMILY;

const root = path.resolve(import.meta.dirname, '..');
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function withFileRetry(operation) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try { return operation(); }
    catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}
const readFile = (file, encoding) => withFileRetry(() => fs.readFileSync(file, encoding));
const writeFile = (file, value) => withFileRetry(() => fs.writeFileSync(file, value));
const readJson = (file) => JSON.parse(readFile(path.join(root, file), 'utf8'));
const tatari = readJson('data/tatari.json');
const skills = readJson('data/tata-skills.json');
const ratings = readJson('data/tier-ratings.json');
const priority = readJson('data/evolution-priority.json');
const tataImages = readJson('data/tata-images.json');
const families = tatari.families || [];
const formCount = families.flatMap((family) => family.evolutions || []).length;
const familyById = new Map(families.map((family) => [family.id, family]));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const originalName = (family, tag = 'small') => `<${tag} class="localized-original-name" translate="no"><span data-name-locale="en">Japanese: ${esc(getFamilyDisplayName(family, 'ja'))}</span><span data-name-locale="zh-CN">日文名：${esc(getFamilyDisplayName(family, 'ja'))}</span></${tag}>`;
const imageByFamily = new Map(tataImages.families.map((family) => [family.familyId, family]));
const stage1Image = (family) => imageByFamily.get(family.id)?.stage1;
const icon = (attribute) => ATTRIBUTE_META[attribute]?.icon || '';

function replaceMarker(file, name, html) {
  const absolute = path.join(root, file);
  const source = readFile(absolute, 'utf8');
  const pattern = new RegExp(`(<!-- STATIC:${name}:START -->)[\\s\\S]*?(<!-- STATIC:${name}:END -->)`);
  if (!pattern.test(source)) throw new Error(`${file}: ${name} markerがありません`);
  writeFile(absolute, source.replace(pattern, `$1${html}$2`));
}

function topCard(family) {
  const first = family.evolutions[0];
  const image = stage1Image(family);
  const assessment = ratings.overall?.byFamily?.[family.id];
  return `<article class="card catalog-card" tabindex="0" role="button" data-family="${esc(family.id)}" data-attribute="${esc(family.attribute)}" data-tier="${esc(assessment?.tier || 'hold')}" aria-label="${esc(getFamilyDisplayLabel(family))}を比較表示"><a class="card-image" href="/tata/${encodeURIComponent(family.id)}/"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first.name)}"></a><div class="card-body"><div class="card-top"><span class="attribute">${icon(family.attribute)} ${esc(family.attribute)}属性</span><span class="tier-badge rank-${esc((assessment?.tier || 'hold').toLowerCase())}">${esc(assessment?.tier || '保留')}</span></div><h3><a href="/tata/${encodeURIComponent(family.id)}/">${esc(getFamilyDisplayLabel(family))}</a></h3>${originalName(family)}<div class="card-bottom"><span class="source-state">${family.evolutions.length}段階</span><a class="detail-link" href="/tata/${encodeURIComponent(family.id)}/" aria-label="${esc(getFamilyDisplayLabel(family))}の個別ページを見る">詳細</a></div></div></article>`;
}

const overallGroups = ratings.overall?.groups || [];
const overallByFamily = ratings.overall?.byFamily || {};
const rankedIds = new Set(overallGroups.flatMap((group) => group.ids));
const modeRank = (label, rank) => `<span><b>${label}</b><em class="rank-chip rank-${esc(String(rank || '－').toLowerCase())}">${esc(rank || '－')}</em></span>`;
function tierCard(id, rank) {
  const family = familyById.get(id);
  const assessment = overallByFamily[id];
  if (!family || !assessment) return '';
  const first = family.evolutions[0];
  const image = stage1Image(family);
  return `<article class="overall-card" data-id="${esc(id)}" data-attribute="${esc(family.attribute)}" data-overall="${esc(rank)}"><a class="overall-image" href="/tata/${encodeURIComponent(id)}/"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first.name)}"></a><div class="overall-body"><div class="overall-top"><span class="tier-badge rank-${rank.toLowerCase()}">${rank}</span><span class="attribute">${icon(family.attribute)} ${esc(family.attribute)}属性</span></div><h3><a href="/tata/${encodeURIComponent(id)}/">${esc(getFamilyDisplayLabel(family))}</a></h3>${originalName(family)}<p class="tier-chain">${family.evolutions.map((item) => esc(item.name)).join(' → ')}</p><div class="mode-ranks" aria-label="モード別評価">${modeRank('通常', assessment.normal)}${modeRank('ゾンビ', assessment.zombie)}${modeRank('道場', assessment.dojo)}${modeRank('初心者', assessment.beginner)}</div><div class="role-tags">${(assessment.roles || []).map((role) => `<span>${esc(role)}</span>`).join('')}</div><p class="overall-comment">${esc(assessment.comment)}</p><a class="detail-link" href="/tata/${encodeURIComponent(id)}/">詳しく見る</a></div></article>`;
}
const tierRoot = overallGroups.map((group) => `<section class="tier-section rank-${group.rank.toLowerCase()} overall-section" data-tier="${group.rank}"><div class="tier-head"><span>${group.rank}</span><h3>${esc(group.label)}</h3></div><div class="overall-cards">${group.ids.map((id) => tierCard(id, group.rank)).join('')}</div></section>`).join('');
const hold = families.filter((family) => !rankedIds.has(family.id)).sort((a, b) => getFamilyDisplayName(a).localeCompare(getFamilyDisplayName(b), 'ja')).map((family) => `<a href="/tata/${encodeURIComponent(family.id)}/">${esc(getFamilyDisplayLabel(family))}</a>`).join('');
const holdFamilies = families.filter((family) => !rankedIds.has(family.id)).sort((a, b) => getFamilyDisplayName(a).localeCompare(getFamilyDisplayName(b), 'ja'));
const tierChartCard = (family) => {
  const first = family?.evolutions?.[0];
  if (!family || !first) return '';
  const image = stage1Image(family);
  return `<a class="tier-chart-tata" href="/tata/${encodeURIComponent(family.id)}/"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first.name)}"><span>${esc(first.name)}系</span></a>`;
};
const tierChartRows = [
  ...overallGroups.map((group) => ({ rank: group.rank, label: group.rank, families: group.ids.map((id) => familyById.get(id)).filter(Boolean) })),
  { rank: 'hold', label: '保留', families: holdFamilies }
];
const tierChart = tierChartRows.map((row) => `<div class="tier-chart-row rank-${row.rank.toLowerCase()}"><div class="tier-chart-label"><strong>${esc(row.label)}</strong><span>${row.families.length}系統</span></div><div class="tier-chart-members">${row.families.map(tierChartCard).join('')}</div></div>`).join('');

function diffStages(from, to) {
  const before = new Map((from.values || []).map((value) => [value.label, value.value]));
  const after = new Map((to.values || []).map((value) => [value.label, value.value]));
  const added = [], changed = [], missing = [];
  for (const [label, value] of after) {
    if (!before.has(label)) added.push({ label, value });
    else if (before.get(label) !== value) changed.push({ label, from: before.get(label), to: value });
  }
  for (const [label, value] of before) if (!after.has(label)) missing.push({ label, value });
  return { skillNameChanged: from.skillName !== to.skillName, descriptionChanged: from.description !== to.description, added, changed, missing };
}
function transitionMeta(family, from, to, delta) {
  const key = `${family.id}:${from.stage}-${to.stage}`;
  const explicit = priority.transitionOverrides?.[key];
  const impact = priority.highImpactTransitions?.find((item) => item.familyId === family.id && item.fromStage === from.stage && item.toStage === to.stage);
  const first = priority.t3Roadmap?.firstPriority?.find((item) => item.familyId === family.id);
  const second = priority.t3Roadmap?.secondPriority?.find((item) => item.familyId === family.id);
  let level = explicit?.priority || impact?.priority || '評価保留';
  let reason = explicit?.reason || impact?.reason || '現在の公開情報では進化優先度を付ける根拠が不足しています。スキル差分と手持ち編成を見て判断してください。';
  if (from.stage === 2 && to.stage === 3 && first) { level = first.priority; reason = first.reason; }
  if (from.stage === 2 && to.stage === 3 && second) { level = second.priority; reason = second.reason; }
  const headline = impact?.headline || (delta.added[0] ? `${delta.added[0].label}が追加` : delta.changed[0] ? `${delta.changed[0].label}が変化` : delta.skillNameChanged ? 'スキル名が変化' : '記載上の数値差分は少なめ');
  return { priority: level, reason, headline };
}
const transitions = families.flatMap((family) => {
  const stages = skills.byFamily?.[family.id]?.stages || [];
  return stages.slice(0, -1).map((from) => {
    const to = stages.find((item) => item.stage === from.stage + 1);
    const delta = diffStages(from, to);
    return { family, from, to, delta, ...transitionMeta(family, from, to, delta) };
  });
});
const badge = (label, value) => `<span class="tier-badge">${esc(label)} ${esc(value || '評価保留')}</span>`;
function deltaHtml(delta) {
  const rows = [];
  if (delta.skillNameChanged) rows.push('<li>スキル名が変化</li>');
  rows.push(...delta.added.map((value) => `<li>追加：${esc(value.label)} ${esc(value.value)}</li>`));
  rows.push(...delta.changed.map((value) => `<li>${esc(value.label)}：${esc(value.from)} → ${esc(value.to)}</li>`));
  rows.push(...delta.missing.map((value) => `<li>次進化データでは項目記載なし：${esc(value.label)} ${esc(value.value)}</li>`));
  if (!rows.length && delta.descriptionChanged) rows.push('<li>説明文が変化</li>');
  return `<ul class="delta-list">${rows.join('') || '<li>記載上の数値差分は少なめ</li>'}</ul>`;
}
function transitionCard(item, includeReason = false) {
  const overall = overallByFamily[item.family.id];
  const zombie = ratings.zombieRush?.byFamily?.[item.family.id]?.tier;
  const image = stage1Image(item.family);
  return `<article class="evolution-card" data-family-id="${esc(item.family.id)}"><div class="evolution-card-head"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(getFamilyDisplayName(item.family))}"><div><span class="attribute">${icon(item.family.attribute)} ${esc(item.family.attribute)}属性</span><h3>${esc(getFamilyDisplayLabel(item.family))}</h3>${originalName(item.family)}<p>${esc(item.from.tataName)} → ${esc(item.to.tataName)}</p></div></div><div class="tier-inline">${badge('進化', item.priority)}${badge('総合', overall?.tier)}${zombie ? badge('ゾンビ', zombie) : ''}</div><p class="evolution-headline">${esc(item.headline)}</p>${deltaHtml(item.delta)}${includeReason ? `<p>${esc(item.reason)}</p>` : ''}<a class="detail-link" href="/tata/${encodeURIComponent(item.family.id)}/">詳しく見る</a></article>`;
}
const roadmapGroups = [
  ['SSS：最優先', priority.t3Roadmap.firstPriority, '通常18星組より大幅に少ない星数で第3進化を狙えるため、序盤の戦力強化効率が高い。'],
  ['SS：次に狙いたい', priority.t3Roadmap.secondPriority, '6星組の次に低コスト。主力編成や不足している役割に合わせて育成候補にする。']
];
const roadmap = roadmapGroups.map(([title, items, lead]) => `<article class="priority-tata-card roadmap-card"><h3>${title}</h3><p>${lead}</p>${items.map((item) => { const family = familyById.get(item.familyId); const stageData = skills.byFamily[item.familyId]?.stages || []; const first = stageData[0]; const t3 = stageData.find((stage) => stage.stage === 3); const image = stage1Image(family); return `<a class="mini-family-row" href="/tata/${encodeURIComponent(item.familyId)}/"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(first?.tataName || getFamilyDisplayName(family))}"><span><b>${esc(getFamilyDisplayLabel(family))}</b><em>T3：${esc(t3?.tataName)} / ${item.requiredStars}星</em></span></a>`; }).join('')}</article>`).join('');
const impact = priority.highImpactTransitions.map((item) => transitionCard(transitions.find((transition) => transition.family.id === item.familyId && transition.from.stage === item.fromStage && transition.to.stage === item.toStage), true)).join('');
const auraLabels = { 火: 'オーラ・炎：仲間の攻撃力増加', 雷: 'オーラ・雷：仲間の攻撃速度増加', 草: 'オーラ・草：仲間のHP増加', 水: 'オーラ・水：仲間を継続回復', 岩: 'オーラ・岩：仲間の被ダメージ減少' };
const aura = Object.entries(auraLabels).map(([attribute, text]) => { const sample = transitions.find((item) => item.family.attribute === attribute && item.from.stage === 3 && item.to.stage === 4 && item.delta.added.some((value) => value.label.includes('オーラ'))); const values = sample?.delta.added.filter((value) => value.label.includes('オーラ')).map((value) => `${value.label} ${value.value}`).join(' / '); return `<li>${esc(text)}${values ? `<br><small>例：${esc(values)}</small>` : ''}</li>`; }).join('');
const transitionOrder = { '最優先候補': 0, '優先候補': 1, '用途次第': 2, '評価保留': 3 };
const transitionList = [...transitions].sort((a, b) => (transitionOrder[a.priority] - transitionOrder[b.priority]) || getFamilyDisplayName(a.family).localeCompare(getFamilyDisplayName(b.family), 'ja')).map((item) => transitionCard(item)).join('');
const longTerm = priority.longTermRecommended.map((item) => { const family = familyById.get(item.familyId); return `<article class="priority-tata-card"><div class="priority-tata-head"><h3>${esc(getFamilyDisplayLabel(family))}</h3><div>${badge('総合', overallByFamily[item.familyId]?.tier)}</div></div><p class="tier-chain">${family.evolutions.map((evolution) => esc(evolution.name)).join(' → ')}</p><p>${esc(item.reason)}</p><a class="detail-link" href="/tata/${encodeURIComponent(item.familyId)}/">詳しく見る</a></article>`; }).join('');

replaceMarker('index.html', 'TOP_CARDS', families.map(topCard).join(''));
replaceMarker('tata-tier/index.html', 'TIER_CHART', tierChart);
replaceMarker('tata-tier/index.html', 'TIER_ROOT', tierRoot);
replaceMarker('tata-tier/index.html', 'TIER_HOLD', hold);
replaceMarker('evolution-priority/index.html', 'EVOLUTION_ROADMAP', roadmap);
replaceMarker('evolution-priority/index.html', 'EVOLUTION_IMPACT', impact);
replaceMarker('evolution-priority/index.html', 'EVOLUTION_AURA', aura);
replaceMarker('evolution-priority/index.html', 'EVOLUTION_TRANSITIONS', transitionList);
replaceMarker('evolution-priority/index.html', 'EVOLUTION_LONG_TERM', longTerm);
const topFile = path.join(root, 'index.html');
const topSource = readFile(topFile, 'utf8');
const topWithCurrentCounts = topSource
  .replace(/タタ\d+系統・\d+体/g, `タタ${families.length}系統・${formCount}体`)
  .replace(/モンサバの\d+系統・\d+体/g, `モンサバの${families.length}系統・${formCount}体`)
  .replace(/<span><b>\d+<\/b>系統<\/span>/, `<span><b>${families.length}</b>系統</span>`)
  .replace(/<span><b>\d+<\/b>体<\/span>/, `<span><b>${formCount}</b>体</span>`)
  .replace(/\d+系統を一覧で見る/g, `${families.length}系統を一覧で見る`);
if (topWithCurrentCounts !== topSource) writeFile(topFile, topWithCurrentCounts);
console.log(`主要静的HTMLを生成しました: TOP ${families.length}系統 / Tier ${rankedIds.size}系統 / 進化差分 ${transitions.length}件`);
