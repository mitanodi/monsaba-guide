const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const { getFamilyDisplayLabel, getFamilySearchAliases, getTataDisplayName, getEvolutionChain, getJapaneseSecondaryLabel } = MONSABA_FAMILY;
const normalize = (value) => {
  let text = String(value ?? '').toLowerCase().normalize('NFKC').replaceAll('土属性', '岩属性').trim();
  if (text === '土') text = '岩';
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60)).replace(/[\s　・ーｰ]/g, '');
};
const distance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)); diagonal = old;
    }
  }
  return row[b.length];
};
const fuzzyMatch = (query, value) => {
  const candidate = normalize(value);
  if (!candidate) return false;
  if (candidate.includes(query) || query.includes(candidate)) return true;
  if (query.length < 3) return false;
  return distance(query, candidate.slice(0, Math.max(query.length, candidate.length))) <= Math.max(1, Math.floor(query.length / 6));
};
const pages = [
  { title:'サマーパーティ攻略', href:'/events/summer-party/', description:'15セット・135カード枠、パック確率、交換、スター、カードコレクション', keywords:'サマーパーティ カードアルバム アルバム カードコレクション カードローダー 思い出ギャラリー カード交換 カードパック カード 確率 summer party Summer Bash album card collection card loader memory gallery 夏日派对 卡册 卡包 卡片交换' },
  { title:'モンサバ 最新ギフトコード一覧', href:'/gift-codes/', description:'2026年8月30日時点のギフトコード8種と入力方法', keywords:'ギフトコード gift code 兑换码 openfestc26 openfestb26 openfesta26 welcome2026 GoonBug HelloTatari WeeklyGift WelcomeGift' },
  { title:'モンサバ初心者攻略', href:'/beginner-guide/', description:'最初にやること・おすすめタタ・育成順', keywords:'初心者 序盤 最初 はじめ 初めて t3 育成順' },
  { title:'タタ図鑑', href:'/#tatari', description:'64系統の進化・スキル一覧', keywords:'タタ 図鑑 一覧 進化 スキル' },
  { title:'コンテンツ攻略ハブ', href:'/guides/', description:'通常・ゾンビラッシュ・ボスラリー・バッジ道場を目的から探す', keywords:'攻略 ハブ コンテンツ 適性 編成' },
  { title:'総合タタTier', href:'/tata-tier/', description:'総合・通常・ゾンビ・道場・初心者評価', keywords:'tier 最強 育成 おすすめ' },
  { title:'進化優先度', href:'/evolution-priority/', description:'第3進化・T4・進化差分', keywords:'進化 優先度 星 t3 t4' },
  { title:'属性別タタ一覧', href:'/attribute/', description:'草・水・火・雷・岩の5属性から探す', keywords:'属性 一覧 草 水 火 雷 岩' },
  { title:'攻略相談所', href:'/consult/', description:'育成・進化・攻略を選択式で相談', keywords:'相談 育成 比較' },
  { title:'タタ2体比較', href:'/compare/', description:'属性・Tier・役割・スキル・進化を横並び比較', keywords:'比較 どっち vs 適性' },
  { title:'モンサバ攻略FAQ', href:'/faq/', description:'進化・属性・Tier・比較の短い回答', keywords:'faq よくある質問 次に進化 どの属性' },
  { title:'ゾンビラッシュ攻略', href:'/zombie-rush/', description:'高Wave・おすすめTier・注意ゾンビ', keywords:'ゾンビラッシュ wave' },
  { title:'ゾンビラッシュ チップ図鑑', href:'/zombie-rush/chips/', description:'ゲーム内確認済み49種の効果・Rank・フィルタ', keywords:'チップ chip 攻撃 防御 回復 配置 ランダム レベル' },
  { title:'全64系統の進化試練DB', href:'/evolution/trials/', description:'T2・T3・T4条件を検索', keywords:'進化試練 条件 餌付け 共有進行 素材' },
  { title:'8/30大型更新', href:'/updates/2026-08-30/', description:'パクマ・新T4・チップ・イベント・進化試練', keywords:'パクマ クマッシュ マリンベア ブリズリー ロードパス ナムアミダイジャ' },
  { title:'8/26アップデート実装内容', href:'/updates/2026-08-26/', description:'パクマ・ゾンビラッシュSeason 1・新T4・バランス調整', keywords:'アップデート アプデ 8月26日 パクマ season1 シーズン1 ロードパス ナムアミダイジャ' },
  { title:'ボスラリー攻略', href:'/boss-rally/', description:'ボス別の特徴と対策', keywords:'ボスラリー ボス' },
  { title:'バッジ道場攻略', href:'/badge-dojo/', description:'属性別・配置・役割', keywords:'バッジ 道場 dojo' },
  { title:'通常ステージ攻略', href:'/normal-guide/', description:'時間切れ・全滅・配置・通常ボス', keywords:'通常 ステージ マップ' },
  { title:'ステージ別攻略', href:'/stages/', description:'Chapter・Stage番号から探す', keywords:'chapter stage 2-50 4-70 5-30 7-70' },
  { title:'進化条件・進化試練DB', href:'/evolution/', description:'T1からT4の進化差分と条件', keywords:'進化条件 進化試練 必要星数 t1 t2 t3 t4' },
  { title:'状態異常・役割別タタ', href:'/roles/', description:'麻痺・スタン・回復・タンクなどから探す', keywords:'麻痺 スタン 束縛 睡眠 減速 貫通 回復 タンク シールド バフ デバフ 範囲火力' },
  { title:'イベント攻略', href:'/events/', description:'オタカラ探し・魔法の農場・ルーレット', keywords:'イベント オタカラ 宝 魔法 農場 ルーレット' },
  { title:'ランニングパーティ攻略', href:'/events/running-party/', description:'4人の距離共有・スノーボード・倍率', keywords:'ランニングパーティ Marathon Party スノーボード ルーレット 距離 倍率' },
  { title:'ランニングスター攻略', href:'/events/running-star/', description:'1人用ランニングイベント', keywords:'ランニングスター Marathon Star ソロ 距離' },
  { title:'アイランドトレジャー攻略', href:'/events/island-treasure/', description:'領地・エナジードリンク・時間ポイント', keywords:'アイランドトレジャー Island Goldrush Deepsea Dive 深海の秘宝 領地 貝殻 疲労 濃縮ドリンク' },
  { title:'魔法の農場攻略', href:'/events/magic-farm/', description:'総重量・肥料・招待タタ', keywords:'魔法の農場 Cozy Farm 総重量 肥料 クリティカル 重量ボーナス' },
  { title:'釣り大会攻略', href:'/events/fishing-tournament/', description:'海域・釣り竿・金銀コイン・倍率', keywords:'釣り大会 Fishing Contest 釣り竿 ゴールドサカナコイン シルバーサカナコイン まき餌 QTE' },
  { title:'オタカラ探し攻略・確率ソルバー', href:'/events/treasure-hunt/', description:'鍵・爆弾・盤面拡張を考慮した探索', keywords:'オタカラ探し Treasure Hunt 鍵 爆弾 盤面 拡張 つるはし' },
  { title:'ゾンビ包囲戦の現在状態', href:'/events/zombie-siege/', description:'日本版閉鎖・旧仕様・海外改修を分離', keywords:'ゾンビ包囲戦 Zobo Shooter Bullet Coin 一時閉鎖 legacy' },
  ...Object.entries(ATTRIBUTE_META).map(([attribute, meta]) => ({ title:`${attribute}属性攻略`, href:`/attribute/${meta.slug}/`, description:`${attribute}属性のタタと育成候補`, keywords:`${attribute}属性 属性` }))
];

let families = [];
let skills = {};
let ratings = {};
let chips = [];
let trials = [];
let imageByFamily = new Map();

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function boot() {
  const [tatari, skillData, ratingData, chipData, trialData, imageData] = await Promise.all([fetchJson('/data/tatari.json'), fetchJson('/data/tata-skills.json'), fetchJson('/data/tier-ratings.json'), fetchJson('/data/zombie-rush/chips.json'), fetchJson('/data/evolution-trials.json'), fetchJson('/data/tata-images.json')]);
  families = tatari.families || [];
  skills = skillData.byFamily || {};
  ratings = ratingData.overall?.byFamily || {};
  chips = chipData.chips || [];
  trials = trialData.families || [];
  imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item]));
  const suggestions = new Set(pages.map((page) => page.title));
  for (const family of families) {
    getFamilySearchAliases(family).forEach((name) => suggestions.add(name)); suggestions.add(`${family.attribute}属性`);
    family.evolutions.forEach((item) => suggestions.add(item.name));
    (skills[family.id]?.stages || []).forEach((stage) => suggestions.add(stage.skillName));
    (ratings[family.id]?.roles || []).forEach((role) => suggestions.add(role));
  }
  chips.forEach((chip) => suggestions.add(chip.name.ja));
  $('#siteSearchSuggestions').innerHTML = [...suggestions].slice(0, 500).map((value) => `<option value="${esc(value)}"></option>`).join('');
  $('#siteSearchForm').addEventListener('submit', (event) => { event.preventDefault(); const total = runSearch($('#siteSearchInput').value); window.MONSABA_TRACK?.event('site_search', { query_length: [...$('#siteSearchInput').value.trim()].length, result_count: total }); });
  $('#siteSearchInput').addEventListener('input', (event) => runSearch(event.target.value));
  const initial = window.__MONSABA_PRIVATE_SEARCH__?.q || '';
  $('#siteSearchInput').value = initial;
  runSearch(initial, false);
}

function contains(query, ...values) {
  return values.flat(Infinity).some((value) => fuzzyMatch(query, value));
}

function runSearch(rawQuery, updateUrl = true) {
  const raw = String(rawQuery ?? '').trim();
  const query = normalize(raw);
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  if (!query) {
    $('#searchStatus').textContent = '検索語を入力してください。';
    $('#searchResults').innerHTML = `<nav class="attribute-guide-nav" aria-label="主要ページ">${pages.slice(0, 9).map((page) => `<a href="${page.href}">${esc(page.title)}</a>`).join('')}</nav>`;
    return 0;
  }
  const familyResults = families.filter((family) => contains(query, getFamilySearchAliases(family), `${family.attribute}属性`, ratings[family.id]?.tier, ratings[family.id]?.roles));
  const evolutionResults = [];
  const skillResults = [];
  for (const family of families) {
    const matchedEvolution = (family.evolutions || []).filter((item) => contains(query, item.name, item.nameEn, item.nameZhHans));
    if (matchedEvolution.length) evolutionResults.push({ family, matches: matchedEvolution.map((item) => `T${item.stage} ${getTataDisplayName(item)}`) });
    const matchedSkills = (skills[family.id]?.stages || []).filter((stage) => contains(query, stage.skillName, stage.description, (stage.values || []).map((value) => `${value.label} ${value.value}`)));
    if (matchedSkills.length) skillResults.push({ family, matches: matchedSkills.map((stage) => `T${stage.stage} ${stage.skillName}`) });
  }
  const pageResults = pages.filter((page) => contains(query, page.title, page.description, page.keywords));
  const chipResults = chips.filter((chip) => contains(query, chip.name.ja, chip.effect.ja, chip.tags));
  const trialResults = trials.filter((family) => contains(query, family.familyName, family.conditions.map((item) => [item.tataName, item.condition])));
  const total = familyResults.length + evolutionResults.length + skillResults.length + chipResults.length + trialResults.length + pageResults.length;
  $('#searchStatus').textContent = `「${raw}」の検索結果：${total}件`;
  const sections = [
    section('タタ', familyResults, (family) => resultLink(`/tata/${encodeURIComponent(family.id)}/`, getFamilyDisplayLabel(family), `${family.attribute}属性 / ${getEvolutionChain(family)}`, family)),
    section('進化名', evolutionResults, (item) => resultLink(`/tata/${encodeURIComponent(item.family.id)}/`, getFamilyDisplayLabel(item.family), item.matches.join(' / '), item.family)),
    section('スキル', skillResults, (item) => resultLink(`/tata/${encodeURIComponent(item.family.id)}/`, getFamilyDisplayLabel(item.family), item.matches.join(' / '), item.family)),
    section('ゾンビラッシュチップ', chipResults, (chip) => resultLink('/zombie-rush/chips/', chip.name.ja, `Rank ${chip.rarity} / ${chip.effect.ja}`)),
    section('進化試練', trialResults, (family) => resultLink(`/evolution/trials/`, `${family.familyName}系`, family.conditions.map((item) => `T${item.stage} ${item.tataName}`).join(' / '))),
    section('攻略ページ', pageResults, (page) => resultLink(page.href, page.title, page.description))
  ].join('');
  $('#searchResults').innerHTML = total ? sections : '<div class="empty"><p>一致する情報がありません。別の名称や正式な属性名で検索してください。</p><nav class="attribute-guide-nav" aria-label="代替の探し方"><a href="/consult/">条件から攻略相談</a><a href="/tata-tier/">Tierから探す</a><a href="/attribute/grass/">属性から探す</a><a href="/guides/">攻略目的から探す</a></nav></div>';
  return total;
}

function section(title, items, render) {
  if (!items.length) return '';
  return `<section class="search-result-section"><h2>${esc(title)} <small>${items.length}件</small></h2><div class="search-result-list">${items.map(render).join('')}</div></section>`;
}

function resultLink(href, title, detail, family = null) {
  const image = family ? imageByFamily.get(family.id)?.stage1 : null;
  const visual = image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(getTataDisplayName(family.evolutions[0]))}">` : '';
  const original = family ? getJapaneseSecondaryLabel(family.evolutions[0]) : '';
  return `<a class="search-result${image ? ' has-tata-image' : ''}" href="${href}">${visual}<span class="search-result-copy"><b>${esc(title)}</b>${original ? `<small class="dynamic-original-name">${esc(original)}</small>` : ''}<span>${esc(detail)}</span></span></a>`;
}

boot().catch((error) => {
  console.error(error);
  $('#searchStatus').textContent = 'データの読み込みに失敗しました。';
  $('#searchResults').innerHTML = '<p class="error-message">データの読み込みに失敗しました。ページを再読み込みしてください。</p>';
});
