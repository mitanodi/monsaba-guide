const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const normalize = (value) => {
  let text = String(value ?? '').toLowerCase().normalize('NFKC').replaceAll('土属性', '岩属性').trim();
  if (text === '土') text = '岩';
  return text.replace(/[\s　・ーｰ]/g, '');
};
const pages = [
  { title:'モンサバ初心者攻略', href:'/beginner-guide/', description:'最初にやること・おすすめタタ・育成順', keywords:'初心者 序盤 最初 はじめ 初めて t3 育成順' },
  { title:'タタ図鑑', href:'/#tatari', description:'63系統の進化・スキル一覧', keywords:'タタ 図鑑 一覧 進化 スキル' },
  { title:'総合タタTier', href:'/tata-tier/', description:'総合・通常・ゾンビ・道場・初心者評価', keywords:'tier 最強 育成 おすすめ' },
  { title:'進化優先度', href:'/evolution-priority/', description:'第3進化・T4・進化差分', keywords:'進化 優先度 星 t3 t4' },
  { title:'攻略相談所', href:'/consult/', description:'育成・進化・攻略を選択式で相談', keywords:'相談 育成 比較' },
  { title:'ゾンビラッシュ攻略', href:'/zombie-rush/', description:'高Wave・おすすめTier・注意ゾンビ', keywords:'ゾンビラッシュ wave' },
  { title:'8/26アップデート予定', href:'/updates/2026-08-26/', description:'パクマ・ゾンビラッシュSeason 1・新T4・バランス調整', keywords:'アップデート アプデ 8月26日 パクマ season1 シーズン1 ロードパス ナムアミダイジャ' },
  { title:'ボスラリー攻略', href:'/boss-rally/', description:'ボス別の特徴と対策', keywords:'ボスラリー ボス' },
  { title:'バッジ道場攻略', href:'/badge-dojo/', description:'属性別・配置・役割', keywords:'バッジ 道場 dojo' },
  { title:'通常ステージ攻略', href:'/normal-guide/', description:'時間切れ・全滅・配置・通常ボス', keywords:'通常 ステージ マップ' },
  ...Object.entries(ATTRIBUTE_META).map(([attribute, meta]) => ({ title:`${attribute}属性攻略`, href:`/attribute/${meta.slug}/`, description:`${attribute}属性のタタと育成候補`, keywords:`${attribute}属性 属性` }))
];

let families = [];
let skills = {};

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function boot() {
  const [tatari, skillData] = await Promise.all([fetchJson('/data/tatari.json'), fetchJson('/data/tata-skills.json')]);
  families = tatari.families || [];
  skills = skillData.byFamily || {};
  $('#siteSearchForm').addEventListener('submit', (event) => { event.preventDefault(); runSearch($('#siteSearchInput').value); });
  $('#siteSearchInput').addEventListener('input', (event) => runSearch(event.target.value));
  const initial = new URLSearchParams(location.search).get('q') || '';
  $('#siteSearchInput').value = initial;
  runSearch(initial, false);
}

function contains(query, ...values) {
  return values.flat(Infinity).some((value) => normalize(value).includes(query));
}

function runSearch(rawQuery, updateUrl = true) {
  const raw = String(rawQuery ?? '').trim();
  const query = normalize(raw);
  if (updateUrl) {
    const url = new URL(location.href);
    if (raw) url.searchParams.set('q', raw); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  if (!query) {
    $('#searchStatus').textContent = '検索語を入力してください。';
    $('#searchResults').innerHTML = `<nav class="attribute-guide-nav" aria-label="主要ページ">${pages.slice(0, 9).map((page) => `<a href="${page.href}">${esc(page.title)}</a>`).join('')}</nav>`;
    return;
  }
  const familyResults = families.filter((family) => contains(query, family.familyName, `${family.attribute}属性`, family.id));
  const evolutionResults = [];
  const skillResults = [];
  for (const family of families) {
    const matchedEvolution = (family.evolutions || []).filter((item) => contains(query, item.name));
    if (matchedEvolution.length) evolutionResults.push({ family, matches: matchedEvolution.map((item) => `T${item.stage} ${item.name}`) });
    const matchedSkills = (skills[family.id]?.stages || []).filter((stage) => contains(query, stage.skillName, stage.description, (stage.values || []).map((value) => `${value.label} ${value.value}`)));
    if (matchedSkills.length) skillResults.push({ family, matches: matchedSkills.map((stage) => `T${stage.stage} ${stage.skillName}`) });
  }
  const pageResults = pages.filter((page) => contains(query, page.title, page.description, page.keywords));
  const total = familyResults.length + evolutionResults.length + skillResults.length + pageResults.length;
  $('#searchStatus').textContent = `「${raw}」の検索結果：${total}件`;
  const sections = [
    section('タタ', familyResults, (family) => resultLink(`/tata/${encodeURIComponent(family.id)}/`, `${family.familyName}系`, `${family.attribute}属性 / ${family.evolutions.map((item) => item.name).join(' → ')}`)),
    section('進化名', evolutionResults, (item) => resultLink(`/tata/${encodeURIComponent(item.family.id)}/`, `${item.family.familyName}系`, item.matches.join(' / '))),
    section('スキル', skillResults, (item) => resultLink(`/tata/${encodeURIComponent(item.family.id)}/`, `${item.family.familyName}系`, item.matches.join(' / '))),
    section('攻略ページ', pageResults, (page) => resultLink(page.href, page.title, page.description))
  ].join('');
  $('#searchResults').innerHTML = total ? sections : '<p class="empty">一致する情報がありません。別の名称や正式な属性名で検索してください。</p>';
}

function section(title, items, render) {
  if (!items.length) return '';
  return `<section class="search-result-section"><h2>${esc(title)} <small>${items.length}件</small></h2><div class="search-result-list">${items.map(render).join('')}</div></section>`;
}

function resultLink(href, title, detail) {
  return `<a class="search-result" href="${href}"><b>${esc(title)}</b><span>${esc(detail)}</span></a>`;
}

boot().catch((error) => {
  console.error(error);
  $('#searchStatus').textContent = 'データの読み込みに失敗しました。';
  $('#searchResults').innerHTML = '<p class="error-message">データの読み込みに失敗しました。ページを再読み込みしてください。</p>';
});
