import fs from 'node:fs';
import path from 'node:path';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';
import { renderGa4Tag } from './update-ga4-tag.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const tatari = read('tatari.json');
const chips = read('zombie-rush/chips.json');
const trials = read('evolution-trials.json');
const events = read('events.json');
const assetVersion = read('asset-build.json').version;
const familyCount = tatari.families.length;
const formCount = tatari.families.flatMap((family) => family.evolutions).length;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const write = (route, html) => {
  const directory = path.join(root, route.slice(1));
  const withIcons = html.replace('<link rel="icon" href="/favicon.ico" sizes="any">', '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  const withAnalytics = withIcons.includes('data-monsaba-ga4="loader"') ? withIcons : withIcons.replace('</head>', `${renderGa4Tag()}</head>`);
  const withGrowth = withAnalytics.replace('</body>', '<script src="/growth.js" defer></script></body>');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), withGrowth);
};

function shell({ route, title, description, body, type = 'CollectionPage', image = '/assets/heroes/top-main.webp' }) {
  const label = title.split('｜')[0];
  const crumbs = [{ label: 'トップ', href: '/' }, { label }];
  const graph = [{ '@type': type, '@id': absoluteUrl(route), url: absoluteUrl(route), name: title, description, dateModified: '2026-08-30', inLanguage: 'ja' }, breadcrumbSchema(crumbs)];
  const alternates = [['ja', route], ['en', `/en${route}`], ['zh-Hans', `/zh-cn${route}`], ['x-default', route]].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(href)}" data-i18n-alternate>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({ title, description, route, image, type: type === 'Article' ? 'article' : 'website' })}${alternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/aug30-update.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body data-locale="ja" data-page-type="mega-update"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero"><div class="wrap">${renderBreadcrumb(crumbs)}<div class="family-page-head"><div><span class="visible-kicker">v0.46.1・2026年8月30日確認</span><h1>${esc(label)}</h1><p>${esc(description)}</p></div></div></div></section>${body}<section class="wrap source-note page-freshness"><strong>情報の状態</strong><p><span class="trust-label is-verified">ゲーム内確認</span> <span class="trust-label is-external">外部確認</span> <span class="trust-label is-pending">確認待ち</span></p><p>当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：2026年8月30日</p><a href="/about-data/">データ方針を見る</a></section></main>${renderFooter(`${familyCount}系統 / ${formCount}体`)}<script src="/family-display.js"></script><script src="/site.js"></script></body></html>`;
}

write('/zombie-rush/chips/', shell({
  route: '/zombie-rush/chips/', title: 'Zombie Rush チップ図鑑｜49種の効果・検索・フィルタ',
  description: 'Zombie Rushのチップ49種をゲーム内画面から確認。名称、Rank、効果、数値を検索し、攻撃・防御・回復・配置・ランダム・レベル操作で絞り込めます。',
  image: '/assets/chips/sugar-iii.webp',
  body: `<section class="wrap static-section"><div class="summary-box"><strong>ゲーム内確認済み：${chips.count}種</strong><p>通常スキルとは別のZombie Rush専用データです。おすすめTierは実戦根拠が不足するため作成していません。</p></div><div data-chip-browser><div class="data-browser-controls"><label>名称・効果を検索<input type="search" data-chip-search data-filter-type="search" placeholder="例：水、回復、スロット"></label><label>Rank<select data-chip-rarity data-filter-type="rarity"><option value="">すべて</option><option>III</option><option>II</option><option>I</option></select></label><label>効果分類<select data-chip-tag data-filter-type="category"><option value="">すべて</option><option value="attack">攻撃</option><option value="defense">防御</option><option value="heal">回復</option><option value="cc">CC</option><option value="placement">配置</option><option value="random">ランダム</option><option value="level">レベル操作</option><option value="drawback">デメリット</option><option value="special">特殊効果</option></select></label></div><p class="result-count" data-chip-count aria-live="polite">${chips.count}件</p><div class="chip-grid" data-chip-results><p>データを読み込んでいます。</p></div></div><h2 class="page-h2">出典</h2><ul class="source-list"><li>ゲーム内チップ一覧：写真.pdf p.40〜42</li><li>個別効果ポップアップ：写真.pdf p.43〜91</li></ul><p class="evidence-image-note">アイコンはユーザー提供ゲーム内資料の匿名部分だけを切り出しています。プレイヤー名・UID・戦績は含みません。</p><nav class="attribute-guide-nav"><a href="/zombie-rush/">Zombie Rush攻略</a><a href="/updates/2026-08-30/">今回の更新内容</a></nav></section><script src="/zombie-rush/chips/chips.js" defer></script>`
}));

write('/evolution/trials/', shell({
  route: '/evolution/trials/', title: `モンサバ 進化試練DB｜全${familyCount}系統のT2・T3・T4条件`,
  description: `モンサバ全${familyCount}系統の進化試練を検索。T2・T3・T4の星数、餌付け、共有進行、指定素材を外部確認情報として整理し、不自然な数値は確認待ちで表示します。`,
  body: `<section class="wrap static-section"><div class="alert-box"><strong>進化条件は外部確認情報です</strong><p>今回のゲーム内PDFにある「進化まであと星」は個人進行の残数なので使用していません。国内攻略情報で照合した条件を掲載し、曖昧な表記や不自然な数値は確認待ちにしています。</p></div><div data-trial-browser><div class="data-browser-controls"><label>系統・進化名・条件を検索<input type="search" data-trial-search data-filter-type="search" placeholder="例：パクマ、ボスラリー、36星"></label><label>属性<select data-trial-attribute data-filter-type="attribute"><option value="">すべて</option><option>草</option><option>水</option><option>火</option><option>雷</option><option>岩</option></select></label><label>確認状態<select data-trial-status data-filter-type="status"><option value="">すべて</option><option value="externally_confirmed">外部確認</option><option value="pending">確認待ち</option></select></label></div><p class="result-count" data-trial-count aria-live="polite">${familyCount}系統</p><div class="trial-grid" data-trial-results><p>データを読み込んでいます。</p></div></div><h2 class="page-h2">出典</h2><p><a href="https://monster-survival.games-wiki.com/evolution-list" target="_blank" rel="noopener noreferrer">国内攻略Wiki 進化条件一覧</a>（2026年8月28日更新を2026年8月30日に照合）。本文・画像・表は転載せず、条件データを当サイトのfamily IDへ対応付けています。</p><nav class="attribute-guide-nav"><a href="/evolution/">進化攻略ハブ</a><a href="/evolution-priority/">進化優先度</a></nav></section><script src="/evolution/trials/trials.js" defer></script>`
}));

const eventDetails = {
  'running-party': ['4人協力の現行仕様', '4人でスノーボードの移動距離を共有します。個人の距離がチーム進行へ加算され、倍率を活用して目標距離を伸ばします。', '現行報酬の数量はゲーム内再確認待ちです。'],
  'running-star': ['1人用ランニング', '協力版とは分けて扱う1人用イベントです。走行距離を伸ばして進行します。', '現行報酬と倍率の詳細は確認待ちです。'],
  'island-treasure': ['4人で領地を進める', '領地から時間ごとにポイントを得ます。ドリンクで疲労を管理し、4人の進行を合わせるイベントです。', '現行報酬の数量は確認待ちです。'],
  'magic-farm': ['8月26日リメイク後', '現在は作物の総重量を競います。肥料で最大5倍の会心が発生し、招待したタタのボーナスがあります。旧来の収穫・餌やり中心の説明は旧仕様です。', '作物ごとの重量と現行報酬は確認待ちです。'],
  'fishing-tournament': ['海域・コイン・QTE', '対象海域で釣りを行い、金・銀コインとQTEを使って進行します。', '現行の魚一覧と報酬は確認待ちです。'],
  'treasure-hunt': ['4本の鍵と盤面拡張', '同じメンバーを再利用でき、盤面を開くたびにコストが5ずつ増えます。爆弾の扱いを含めて開ける順を考えます。', '独自ソルバーで候補手順を比較できます。'],
  'zombie-siege': ['一時閉鎖中', '現在利用できないため、過去の遊び方は旧仕様としてのみ残します。', '再開後の仕様は公式告知とゲーム内画面で再確認します。'],
  'surprise-roulette': ['公式告知確認', '8月26日の公式更新で段階追加と手動レベルアップが案内されました。', '各段階の詳細数値はゲーム内確認待ちです。']
};
for (const event of events.events) {
  if (event.id === 'treasure-hunt' || event.id === 'summer-party') continue;
  const [heading, current, pending] = eventDetails[event.id];
  const legacy = event.id === 'zombie-siege';
  write(`/events/${event.id}/`, shell({
    route: `/events/${event.id}/`, title: `${event.name} 攻略｜モンサバ イベント`, description: event.summary,
    type: 'Article',
    body: `<article class="wrap static-section"><div class="trust-label-row"><span class="trust-label ${legacy ? 'is-pending' : 'is-external'}">${legacy ? '旧仕様' : '外部確認'}</span></div><h2 class="page-h2">${esc(heading)}</h2><div class="event-status-grid"><article><h3>${legacy ? '旧仕様' : '現在確認できる仕様'}</h3><p>${esc(current)}</p></article><article><h3>確認待ち</h3><p>${esc(pending)}</p></article></div>${event.id === 'treasure-hunt' ? '<p><a class="button" href="/events/treasure-hunt/solver/">オタカラ探しソルバーを開く</a></p>' : ''}<h2 class="page-h2">情報源</h2><p><a href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">国内攻略情報</a>を2026年8月30日に照合し、当サイトで独自に整理しました。公式確認済みとは表示していません。</p><nav class="attribute-guide-nav"><a href="/events/">イベント攻略へ戻る</a><a href="/updates/2026-08-30/">大型更新を見る</a></nav></article>`
  }));
}

write('/updates/2026-08-30/', shell({
  route: '/updates/2026-08-30/', title: '2026年8月30日 大型更新｜パクマ・新T4・チップ・イベント・進化試練',
  description: 'ゲーム内v0.46.1資料を根拠にパクマ系、ロードパス、ナムアミダイジャ、Zombie Rushチップ49種を追加。イベント・進化試練・Tier差分も監査しました。', type: 'Article',
  body: `<article class="wrap static-section"><h2 class="page-h2">追加・更新した内容</h2><ul class="check-list"><li>新タタ「パクマ → クマッシュ → マリンベア → ブリズリー」と通常スキル・T4オーラ</li><li>スケダコ系T4「ロードパス」とボウズヘビ系T4「ナムアミダイジャ」</li><li>ゲーム内確認済みZombie Rushチップ49種の検索・フィルタDB</li><li>全${familyCount}系統の進化試練検索（外部確認と確認待ちを分離）</li><li>9つのイベント攻略と現行・旧仕様・確認待ちの分離</li><li>国内外Tier差分監査。根拠不足のため既存Tierは据え置き、パクマ系は保留</li></ul><h2 class="page-h2">データ集計</h2><p><strong>${familyCount}系統・${formCount}体・${formCount}スキル段階</strong>。比較、マイモンサバ、編成メーカーは共通DBを読むため、新family IDを壊さずそのまま利用できます。</p><h2 class="page-h2">情報源の区別</h2><p>ゲーム内PDFを一次証拠、公式更新履歴を一次情報、国内外攻略サイトを二次情報として扱いました。個人戦績・ランキングページは公開に使っていません。</p><nav class="attribute-guide-nav"><a href="/tata/pakuma/">パクマ系</a><a href="/zombie-rush/chips/">チップ図鑑</a><a href="/evolution/trials/">進化試練DB</a><a href="/events/">イベント攻略</a></nav></article>`
}));

function inject(file, key, html) {
  const target = path.join(root, file);
  let source = fs.readFileSync(target, 'utf8');
  const start = `<!-- AUG30:${key}:START -->`, end = `<!-- AUG30:${key}:END -->`;
  const block = `${start}${html}${end}`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  source = pattern.test(source) ? source.replace(pattern, block) : source.replace('</main>', `${block}</main>`);
  fs.writeFileSync(target, `${source.trimEnd()}\n`);
}

inject('zombie-rush/index.html', 'CHIPS', `<section class="wrap static-section"><h2 class="page-h2">Zombie Rushチップ</h2><p>ゲーム内で確認した49種を、Rank・効果分類・名称で検索できます。通常スキルとは別データです。</p><a class="button" href="/zombie-rush/chips/">チップ図鑑を開く</a></section>`);
inject('evolution/index.html', 'TRIALS', `<section class="wrap static-section"><h2 class="page-h2">全${familyCount}系統の進化試練</h2><p>外部確認と確認待ちを分け、系統・属性・条件から検索できます。</p><a class="button" href="/evolution/trials/">進化試練DBを開く</a></section>`);
inject('index.html', 'LATEST', `<section class="wrap static-section"><h2 class="page-h2">2026年8月30日の大型更新</h2><div class="guide-hub-grid"><article class="guide-hub-card"><h3>パクマ系・新T4</h3><p>新規6形態を追加し、${familyCount}系統・${formCount}体へ更新しました。</p><a href="/updates/2026-08-30/">更新内容を見る</a></article><article class="guide-hub-card"><h3>Zombie Rushチップ</h3><p>ゲーム内確認済み49種を検索できます。</p><a href="/zombie-rush/chips/">チップ図鑑を見る</a></article><article class="guide-hub-card"><h3>進化試練・イベント</h3><p>全系統の試練検索と9イベントを更新しました。</p><a href="/evolution/trials/">進化試練を見る</a></article></div></section>`);
inject('updates/index.html', 'AUG30', `<section class="update-card"><time datetime="2026-08-30">2026年8月30日</time><h2>パクマ・新T4・チップ・イベント・進化試練の大型更新</h2><p>v0.46.1ゲーム内資料と公式・国内外情報を統合しました。</p><a href="/updates/2026-08-30/">詳しく見る</a></section>`);

const localeConfig = {
  en: { prefix: '/en', lang: 'en', locale: 'en_US', siteName: 'Clash of Critters Guide DB', top: 'Home', verified: 'Verified in game', external: 'Externally confirmed', pending: 'Pending', state: 'Information status', policy: 'Data policy', checked: 'Last checked: Aug 30, 2026', footer: `${familyCount} families / ${formCount} Tatari` },
  'zh-CN': { prefix: '/zh-cn', lang: 'zh-CN', locale: 'zh_CN', siteName: 'Clash of Critters 攻略DB', top: '首页', verified: '游戏内确认', external: '外部确认', pending: '待确认', state: '信息状态', policy: '数据方针', checked: '最后确认：2026年8月30日', footer: `${familyCount} 个系列 / ${formCount} 个 Tatari` }
};
const layout = (locale, tag) => {
  const sample = fs.readFileSync(path.join(root, localeConfig[locale].prefix.slice(1), 'search', 'index.html'), 'utf8');
  return sample.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`))?.[0] || '';
};
function localizedShell(locale, { route, title, description, body, type = 'CollectionPage', image = '/assets/heroes/top-main.webp' }) {
  const config = localeConfig[locale];
  const localRoute = `${config.prefix}${route}`;
  const alternates = [['ja', route], ['en', `/en${route}`], ['zh-Hans', `/zh-cn${route}`], ['x-default', route]].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(href)}" data-i18n-alternate>`).join('');
  const ogAlternates = Object.values({ ja: 'ja_JP', en: 'en_US', 'zh-CN': 'zh_CN' }).filter((value) => value !== config.locale).map((value) => `<meta property="og:locale:alternate" content="${value}" data-i18n-alternate>`).join('');
  const graph = [{ '@type': type, '@id': absoluteUrl(localRoute), url: absoluteUrl(localRoute), name: title, description, dateModified: '2026-08-30', inLanguage: config.lang }, breadcrumbSchema([{ label: config.top, href: config.prefix + '/' }, { label: title.split('｜')[0] }])];
  const head = renderSeoHead({ title, description, route: localRoute, image, type: type === 'Article' ? 'article' : 'website' }).replace('ja_JP', config.locale).replaceAll('content="モンサバ攻略DB"', `content="${config.siteName}"`).replace(/(<link rel="canonical"[^>]*?)\s*\/>/, '$1>');
  const runtime = `<script src="/i18n/${config.prefix.slice(1)}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script>`;
  return `<!doctype html><html lang="${config.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${alternates}${ogAlternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/aug30-update.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body data-locale="${locale}" data-page-type="mega-update"><a class="skip-link" href="#main-content">Skip to content</a>${layout(locale, 'header')}<main id="main-content"><section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${config.prefix}/">${config.top}</a><span aria-hidden="true">›</span><span>${esc(title.split('｜')[0])}</span></nav><div class="family-page-head"><div><span class="visible-kicker">v0.46.1 · Aug 30, 2026</span><h1>${esc(title.split('｜')[0])}</h1><p>${esc(description)}</p></div></div></div></section>${body}<section class="wrap source-note page-freshness"><strong>${config.state}</strong><p><span class="trust-label is-verified">${config.verified}</span> <span class="trust-label is-external">${config.external}</span> <span class="trust-label is-pending">${config.pending}</span></p><p>${config.checked}</p><a href="${config.prefix}/about-data/">${config.policy}</a></section></main>${layout(locale, 'footer')}${runtime}<script src="/family-display.js"></script><script src="/site.js"></script></body></html>`;
}
const localizedChip = {
  en: { title: 'Zombie Rush Chip Database | 49 effects and filters', description: 'Search all 49 chips verified from in-game screens by name, rank, attack, defense, healing, placement, randomness and level effects.', summary: '49 chips verified in game', note: 'This database is separate from normal Tatari skills. We are not publishing a chip tier list without sufficient battle evidence.', search: 'Search names and effects', placeholder: 'Water, healing, slot…', rank: 'Rank', category: 'Effect type', all: 'All', load: 'Loading data…', source: 'Sources', sourceText: 'In-game chip index: PDF pp.40–42. Individual effect popups: PDF pp.43–91.', back: 'Zombie Rush guide' },
  'zh-CN': { title: 'Zombie Rush 芯片图鉴｜49种效果与筛选', description: '依据游戏内画面整理49种芯片，可按名称、Rank、攻击、防御、治疗、位置、随机与等级效果搜索。', summary: '游戏内确认：49种', note: '本数据库与塔塔普通技能分开保存。实战证据不足，因此不制作芯片Tier。', search: '搜索名称与效果', placeholder: '水、治疗、插槽……', rank: 'Rank', category: '效果分类', all: '全部', load: '正在加载数据……', source: '信息来源', sourceText: '游戏内芯片一览：PDF第40–42页；各芯片效果：PDF第43–91页。', back: 'Zombie Rush 攻略' }
};
for (const locale of Object.keys(localeConfig)) {
  const t = localizedChip[locale];
  write(`${localeConfig[locale].prefix}/zombie-rush/chips/`, localizedShell(locale, { route: '/zombie-rush/chips/', title: t.title, description: t.description, image: '/assets/chips/sugar-iii.webp', body: `<section class="wrap static-section"><div class="summary-box"><strong>${t.summary}</strong><p>${t.note}</p></div><div data-chip-browser><div class="data-browser-controls"><label>${t.search}<input type="search" data-chip-search data-filter-type="search" placeholder="${t.placeholder}"></label><label>${t.rank}<select data-chip-rarity data-filter-type="rarity"><option value="">${t.all}</option><option>III</option><option>II</option><option>I</option></select></label><label>${t.category}<select data-chip-tag data-filter-type="category"><option value="">${t.all}</option><option value="attack">Attack</option><option value="defense">Defense</option><option value="heal">Healing</option><option value="cc">CC</option><option value="placement">Placement</option><option value="random">Random</option><option value="level">Level</option><option value="drawback">Drawback</option><option value="special">Special</option></select></label></div><p class="result-count" data-chip-count aria-live="polite">49</p><div class="chip-grid" data-chip-results><p>${t.load}</p></div></div><h2 class="page-h2">${t.source}</h2><p>${t.sourceText}</p><nav class="attribute-guide-nav"><a href="${localeConfig[locale].prefix}/zombie-rush/">${t.back}</a></nav></section><script src="/zombie-rush/chips/chips.js" defer></script>` }));
}
const localizedTrial = {
  en: { title: `Evolution Trial Database | All ${familyCount} families`, description: `Search T2, T3 and T4 trial conditions for all ${familyCount} families. Community-confirmed conditions and suspicious values are clearly separated.`, warning: 'These are externally confirmed conditions', note: 'The stars remaining on the supplied in-game screens are account-specific and were not treated as total requirements. Ambiguous wording and unusual values remain pending.', search: 'Search families, forms and conditions', placeholder: 'Pakuma, Boss Rally, 36 stars…', attribute: 'Attribute', status: 'Status', all: 'All', external: 'Externally confirmed', pending: 'Pending', load: 'Loading data…', source: 'Source', sourceText: 'Domestic strategy wiki evolution list, checked Aug 30, 2026. Conditions were mapped to this site’s stable family IDs; the source table and images were not copied.' },
  'zh-CN': { title: `进化试炼数据库｜全部${familyCount}个系列`, description: `可搜索全部${familyCount}个系列的T2、T3与T4试炼条件，并区分外部确认与可疑数值。`, warning: '进化条件属于外部确认信息', note: '资料画面中的“距离进化还差多少星”属于账号当前进度，没有作为总条件使用。含糊表述与异常数值保留为待确认。', search: '搜索系列、进化名与条件', placeholder: 'パクマ、首领集结、36星……', attribute: '属性', status: '确认状态', all: '全部', external: '外部确认', pending: '待确认', load: '正在加载数据……', source: '信息来源', sourceText: '国内攻略Wiki进化条件一览（2026年8月30日核对）。本站仅将条件对应到稳定的family ID，未复制原表与图片。' }
};
for (const locale of Object.keys(localeConfig)) {
  const t = localizedTrial[locale];
  write(`${localeConfig[locale].prefix}/evolution/trials/`, localizedShell(locale, { route: '/evolution/trials/', title: t.title, description: t.description, body: `<section class="wrap static-section"><div class="alert-box"><strong>${t.warning}</strong><p>${t.note}</p></div><div data-trial-browser><div class="data-browser-controls"><label>${t.search}<input type="search" data-trial-search data-filter-type="search" placeholder="${t.placeholder}"></label><label>${t.attribute}<select data-trial-attribute data-filter-type="attribute"><option value="">${t.all}</option><option value="草">Grass</option><option value="水">Water</option><option value="火">Fire</option><option value="雷">Lightning</option><option value="岩">Rock</option></select></label><label>${t.status}<select data-trial-status data-filter-type="status"><option value="">${t.all}</option><option value="externally_confirmed">${t.external}</option><option value="pending">${t.pending}</option></select></label></div><p class="result-count" data-trial-count aria-live="polite">${familyCount}</p><div class="trial-grid" data-trial-results><p>${t.load}</p></div></div><h2 class="page-h2">${t.source}</h2><p>${t.sourceText}</p></section><script src="/evolution/trials/trials.js" defer></script>` }));
}

const localizedEvents = {
  en: {
    'running-party':['Running Party Guide','A four-player snowboarding event where the team shares distance progress.','Current rules','Four players combine their snowboarding distance. Individual distance contributes to team progress, and multipliers help extend the total.','Pending','Current reward quantities need an in-game recheck.'],
    'running-star':['Running Star Guide','A solo running event tracked separately from the co-op version.','Current rules','Increase your running distance in the solo version.','Pending','Current rewards and multiplier details need confirmation.'],
    'island-treasure':['Island Treasure Guide','A four-player event built around territory progress, hourly points, drinks and fatigue.','Current rules','Territories generate points over time. Coordinate four players and use drinks to manage fatigue.','Pending','Current reward quantities need confirmation.'],
    'magic-farm':['Magic Farm Guide','The post-August 26 version scores total crop weight, with fertilizer criticals and invited Tatari bonuses.','Current rules','Compete by total crop weight. Fertilizer can produce critical results up to 5×, and invited Tatari provide bonuses. Older harvest-and-feed descriptions are legacy rules.','Pending','Per-crop weights and current rewards need confirmation.'],
    'fishing-tournament':['Fishing Tournament Guide','A periodic event using fishing areas, gold and silver coins, and QTEs.','Current rules','Fish in the designated area and progress through coin use and QTEs.','Pending','The current fish list and rewards need confirmation.'],
    'treasure-hunt':['Treasure Hunt Guide','Use four keys, expanding boards, increasing costs and bombs to plan the opening order.','Current rules','The same member can be reused. Each board opening raises the cost by 5, and bombs affect the route.','Tool','Use the independent solver to compare candidate routes.'],
    'zombie-siege':['Zombie Siege Guide','This event is temporarily closed, so older mechanics are kept only as legacy information.','Legacy rules','The mode is currently unavailable. Previous mechanics are not presented as current rules.','Pending','Recheck official notices and in-game screens after it returns.'],
    'surprise-roulette':['Surprise Roulette Guide','The August 26 official update announced added stages and manual level-up.','Official notice','The official update announced additional stages and manual level-up.','Pending','Detailed values for each stage need an in-game check.']
  },
  'zh-CN': {
    'running-party':['跑步派对攻略','4人共享滑雪距离与团队进度的周期活动。','当前规则','4人的滑雪距离会合并到团队进度，可利用倍率提高总距离。','待确认','当前奖励数量仍需在游戏内复核。'],
    'running-star':['跑步之星攻略','与协作版分开处理的单人跑步活动。','当前规则','在单人模式中提升跑步距离。','待确认','当前奖励与倍率细节仍待确认。'],
    'island-treasure':['岛屿宝藏攻略','围绕领地推进、每小时积分、饮料与疲劳管理的4人活动。','当前规则','领地会随时间产生积分，4名玩家需要协调进度并用饮料管理疲劳。','待确认','当前奖励数量仍待确认。'],
    'magic-farm':['魔法农场攻略','8月26日改版后以作物总重量计分，并含肥料暴击与邀请塔塔加成。','当前规则','按作物总重量竞争。肥料最多可触发5倍暴击，邀请塔塔会提供加成；旧的收获与喂食说明属于旧规则。','待确认','各作物重量与当前奖励仍待确认。'],
    'fishing-tournament':['钓鱼大赛攻略','使用海域、金币、银币与QTE推进的周期活动。','当前规则','在指定海域钓鱼，并通过硬币与QTE推进。','待确认','当前鱼类一览与奖励仍待确认。'],
    'treasure-hunt':['寻宝攻略','结合4把钥匙、盘面扩张、费用递增与炸弹规划开启顺序。','当前规则','可重复使用同一成员；每次开启盘面费用增加5，炸弹会影响路线。','工具','可使用本站独立求解器比较候选路线。'],
    'zombie-siege':['僵尸围城攻略','活动暂时关闭，因此旧玩法只作为历史信息保留。','旧规则','该模式当前不可用，过去玩法不会作为当前规则展示。','待确认','重新开放后需核对官方公告与游戏内画面。'],
    'surprise-roulette':['惊喜轮盘攻略','8月26日官方更新已公告新增阶段与手动升级。','官方公告','官方更新已公告新增阶段与手动升级。','待确认','各阶段详细数值仍需游戏内确认。']
  }
};
for (const locale of Object.keys(localeConfig)) for (const event of events.events) {
  if (event.id === 'treasure-hunt' || event.id === 'summer-party') continue;
  const [title, description, currentLabel, current, pendingLabel, pending] = localizedEvents[locale][event.id];
  write(`${localeConfig[locale].prefix}/events/${event.id}/`, localizedShell(locale, { route: `/events/${event.id}/`, title, description, type: 'Article', body: `<article class="wrap static-section"><div class="event-status-grid"><article><h2>${currentLabel}</h2><p>${current}</p></article><article><h2>${pendingLabel}</h2><p>${pending}</p></article></div><h2 class="page-h2">Source</h2><p><a href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Community strategy source</a>, checked Aug 30, 2026. This page is independently written and does not label community information as official.</p><a href="${localeConfig[locale].prefix}/events/">${locale === 'en' ? 'Back to events' : '返回活动攻略'}</a></article>` }));
}

for (const locale of Object.keys(localeConfig)) {
  const en = locale === 'en';
  const title = en ? 'August 30, 2026 Major Database Update' : '2026年8月30日大型数据库更新';
  const description = en ? 'Added the Pakuma family, Roadpass, Namuamidaija, 49 Zombie Rush chips, event guides and evolution trials from v0.46.1 evidence.' : '依据v0.46.1游戏内资料，新增パクマ系列、ロードパス、ナムアミダイジャ、49种Zombie Rush芯片、活动攻略与进化试炼。';
  const bullets = en ? ['Pakuma → Kumash → Marine Bear → Blizzly, with verified skills and the T4 aura.','Roadpass and Namuamidaija added to their existing stable family IDs.','A searchable database of 49 chips verified from in-game screens.','Evolution trials for all 64 families, separating external confirmation from pending values.','Nine event guides with current, legacy and pending information separated.','No existing tier changes; Pakuma remains pending battle evidence.'] : ['新增パクマ → クマッシュ → マリンベア → ブリズリー，并录入已确认技能与T4光环。','在既有稳定family ID下新增ロードパス与ナムアミダイジャ。','新增游戏内确认的49种芯片搜索数据库。','新增全部64个系列的进化试炼，并区分外部确认与待确认。','更新9个活动攻略，分离当前、旧规则与待确认内容。','现有Tier不变；パクマ系列等待实战证据。'];
  write(`${localeConfig[locale].prefix}/updates/2026-08-30/`, localizedShell(locale, { route: '/updates/2026-08-30/', title, description, type: 'Article', body: `<article class="wrap static-section"><h2>${en ? 'What changed' : '更新内容'}</h2><ul class="check-list">${bullets.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>${localeConfig[locale].footer}</strong></p><nav class="attribute-guide-nav"><a href="${localeConfig[locale].prefix}/zombie-rush/chips/">${en ? 'Chip database' : '芯片图鉴'}</a><a href="${localeConfig[locale].prefix}/evolution/trials/">${en ? 'Evolution trials' : '进化试炼'}</a><a href="${localeConfig[locale].prefix}/events/">${en ? 'Events' : '活动攻略'}</a></nav></article>` }));
}

inject('en/zombie-rush/index.html', 'CHIPS_EN', '<section class="wrap static-section"><h2>Zombie Rush chips</h2><p>Search all 49 chips verified from in-game screens.</p><a class="button" href="/en/zombie-rush/chips/">Open the chip database</a></section>');
inject('zh-cn/zombie-rush/index.html', 'CHIPS_ZH', '<section class="wrap static-section"><h2>Zombie Rush 芯片</h2><p>可搜索游戏内确认的49种芯片。</p><a class="button" href="/zh-cn/zombie-rush/chips/">打开芯片图鉴</a></section>');
inject('en/evolution/index.html', 'TRIALS_EN', `<section class="wrap static-section"><h2>Evolution trials for all ${familyCount} families</h2><a class="button" href="/en/evolution/trials/">Open the trial database</a></section>`);
inject('zh-cn/evolution/index.html', 'TRIALS_ZH', `<section class="wrap static-section"><h2>全部${familyCount}个系列的进化试炼</h2><a class="button" href="/zh-cn/evolution/trials/">打开试炼数据库</a></section>`);
inject('events/treasure-hunt/index.html', 'EVENT_GUIDE', '<section class="wrap static-section"><h2 class="page-h2">現在確認できるイベント仕様</h2><p><span class="trust-label is-external">外部確認</span> 同じメンバーを再利用でき、盤面を開くたびにコストが5ずつ増えます。4本の鍵と爆弾を考慮し、上の独自ソルバーで次の候補を比較できます。</p></section>');
inject('en/events/treasure-hunt/index.html', 'EVENT_GUIDE_EN', '<section class="wrap static-section"><h2>Current event rules</h2><p><span class="trust-label is-external">Externally confirmed</span> Members can be reused, and each board opening increases the cost by 5. Use the independent solver above to compare the next candidate while accounting for four keys and bombs.</p></section>');
inject('zh-cn/events/treasure-hunt/index.html', 'EVENT_GUIDE_ZH', '<section class="wrap static-section"><h2>当前活动规则</h2><p><span class="trust-label is-external">外部确认</span> 可重复使用同一成员，每次开启盘面费用增加5。结合4把钥匙与炸弹，使用上方独立求解器比较下一候选。</p></section>');

console.log(`2026-08-30 pages generated: ${familyCount} families, ${chips.count} chips, ${trials.families.length} trials, ${events.events.length} events.`);
