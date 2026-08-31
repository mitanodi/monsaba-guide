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
const DEFAULT_CONTENT_DATE = '2026-08-30';
const EVENT_RESEARCH_DATE = '2026-08-31';
const ZOMBIE_SIEGE_UPDATE_DATE = '2026-09-01';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateParts = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};
const japaneseDate = (value) => {
  const { year, month, day } = dateParts(value);
  return `${year}年${month}月${day}日`;
};
const englishDate = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const write = (route, html) => {
  const directory = path.join(root, route.slice(1));
  const withIcons = html.replace('<link rel="icon" href="/favicon.ico" sizes="any">', '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  const withAnalytics = withIcons.includes('data-monsaba-ga4="loader"') ? withIcons : withIcons.replace('</head>', `${renderGa4Tag()}</head>`);
  const withGrowth = withAnalytics.replace('</body>', '<script src="/growth.js" defer></script></body>');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), withGrowth);
};

function shell({ route, title, description, body, type = 'CollectionPage', image = '/assets/heroes/top-main.webp', updated = DEFAULT_CONTENT_DATE }) {
  const label = title.split('｜')[0];
  const crumbs = [{ label: 'トップ', href: '/' }, { label }];
  const graph = [{ '@type': type, '@id': absoluteUrl(route), url: absoluteUrl(route), name: title, description, dateModified: updated, inLanguage: 'ja' }, breadcrumbSchema(crumbs)];
  const alternates = [['ja', route], ['en', `/en${route}`], ['zh-Hans', `/zh-cn${route}`], ['x-default', route]].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(href)}" data-i18n-alternate>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({ title, description, route, image, type: type === 'Article' ? 'article' : 'website' })}${alternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/aug30-update.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body data-locale="ja" data-page-type="mega-update"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero"><div class="wrap">${renderBreadcrumb(crumbs)}<div class="family-page-head"><div><span class="visible-kicker">v0.46.1・${japaneseDate(updated)}確認</span><h1>${esc(label)}</h1><p>${esc(description)}</p></div></div></div></section>${body}<section class="wrap source-note page-freshness"><strong>情報の状態</strong><p><span class="trust-label is-verified">ゲーム内確認</span> <span class="trust-label is-external">外部確認</span> <span class="trust-label is-pending">確認待ち</span></p><p>当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：${japaneseDate(updated)}</p><a href="/about-data/">データ方針を見る</a></section></main>${renderFooter(`${familyCount}系統 / ${formCount}体`)}<script src="/family-display.js"></script><script src="/site.js"></script></body></html>`;
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

const zombieSiegeEvent = events.events.find((event) => event.id === 'zombie-siege');
const zombieSiegeSourceLinks = {
  domestic: zombieSiegeEvent.sourceUrl,
  overseasWiki: 'https://clashofcritters.wiki.gg/wiki/Zobo_Shooter',
  overseasStrategy: 'https://clashcritters.com/guides/zobo-shaman-room-farming-trick/'
};

const zombieSiegePages = {
  ja: {
    title: 'モンサバ ゾンビ包囲戦攻略｜高得点のコツ・倍率・シャーマン狙い',
    description: 'モンサバのゾンビ包囲戦で高得点を狙うコツを実戦ベースで解説。低倍率でレイジ・ロックオンを準備し、×200のシャーマンを狙う立ち回りや、混雑時の電撃ゾンビへの切り替えを紹介。',
    body: `<article class="wrap static-section zombie-siege-guide"><div class="summary-box zombie-siege-current"><strong>日本版で現行プレイ可能</strong><p><span class="trust-label is-verified">ゲーム内実戦確認</span> ユーザー本人が2026年8月31日に日本版でプレイして確認しました。古い「一時閉鎖」情報は現行状態として扱いません。</p></div><section><h2 class="page-h2">高得点狙いの基本手順</h2><ol class="zombie-siege-steps"><li><span>STEP 1</span><strong>×1でレイジを確保</strong><p>低コストのエリアで準備を始めます。</p></li><li><span>STEP 2</span><strong>小型ゾンビを狙う</strong><p>レイジを使いながらロックオンを回収します。</p></li><li><span>STEP 3</span><strong>部屋の混雑を確認</strong><p>×200周辺と高得点ボスへの集中を見ます。</p></li><li><span>STEP 4</span><strong>×200へ移動</strong><p>必要なバフとコインを整えてから移動します。</p></li><li><span>STEP 5</span><strong>シャーマンを最優先</strong><p>空いていればロックオンして高得点を狙います。</p></li><li><span>STEP 6</span><strong>混雑時は電撃へ切り替え</strong><p>競合による撃破取り逃しを避けます。</p></li></ol></section><section><h2 class="page-h2">高倍率と低倍率、どっちがいい？</h2><div class="event-status-grid"><article><h3>低倍率は準備用</h3><ul class="check-list"><li>×1でレイジを確保</li><li>小型ゾンビを狙ってロックオンを回収</li><li>バフを整えながらコイン消費を抑える</li></ul></article><article><h3>高倍率は得点用</h3><ul class="check-list"><li>×200のシャーマンを第一候補にする</li><li>混雑時は電撃ゾンビへ切り替える</li><li>高得点ボスへコインを集中する</li></ul></article></div><p class="conclusion-line">基本は「低倍率で準備 → 高倍率で稼ぐ」。最初から最後まで高倍率で撃ち続ける進め方ではありません。</p></section><section><div class="trust-label-row"><span class="trust-label is-verified">ゲーム内実戦確認</span><span class="trust-label is-external">コミュニティ攻略と照合</span></div><h2 class="page-h2">まずロックオンを取る</h2><p>ユーザー実戦では、×1でレイジを確保し、レイジを利用しながら小型ゾンビを狙ってロックオンを回収する流れが使いやすい結果でした。高倍率へ移る前に、狙いたいボスを選べる状態を作ります。</p><div class="notice-box"><h3>ドロップ確定とは断定しません</h3><p>今回の確認だけでは「特定の小型ゾンビを倒せば必ずロックオンが出る」とまでは確認できません。正確なドロップ条件は確認待ちです。</p></div></section><section><h2 class="page-h2">基本は×200のシャーマン狙い</h2><div class="event-status-grid"><article><h3>第一候補：シャーマンゾンビ</h3><p>高得点狙いでは×200のシャーマンを優先します。ただしキル率、バフ、部屋人数、他プレイヤーとの競合によって実戦効率は変わります。</p></article><article><h3>第二候補：電撃ゾンビ</h3><p>シャーマンへ攻撃が集中しているなら、無理に競争せず電撃へ切り替えます。コインを投入した途中で他人に撃破されるロスを抑える判断です。</p></article></div><p class="conclusion-line">実効期待値 ＝ 理論上の得点効率 × 自分が撃破を取れる可能性</p><p>シャーマンの理論値が高くても、多人数で競合すれば実効効率は下がります。無競合の電撃ゾンビが、混雑したシャーマンより良い場合があります。</p></section><section><h2 class="page-h2">人が少ない部屋を探す</h2><p>入室直後に、×200周辺の人数、シャーマンを攻撃している人数、電撃周辺、ボスの減り方を確認します。大量にコインを投入してからではなく、混雑を感じた早い段階で部屋変更を判断します。</p><ol class="zombie-siege-decision"><li><strong>シャーマンが空いている</strong><span>シャーマンを狙う</span></li><li><strong>シャーマンに人が集中</strong><span>電撃へ切り替える</span></li><li><strong>電撃も混雑</strong><span>部屋変更を検討</span></li><li><strong>高倍率全体が混雑</strong><span>別部屋へ移動</span></li></ol><p class="small-note">完全無人になるまで探し続ける必要はありません。シャーマンを自分主体で狙える程度に空いていれば十分です。</p></section><section><h2 class="page-h2">実戦効率はpt / coinで確認</h2><div class="zombie-siege-benchmark"><div><span>使用ハントコイン</span><strong>約500,000</strong></div><div><span>獲得スコア</span><strong>約10,000,000pt</strong></div><div><span>実戦効率</span><strong>約20pt / coin</strong></div></div><p><span class="trust-label is-verified">ユーザー実戦目安</span> 50万コインで1,000万pt前後を狙えた今回の1例です。保証値ではなく、バフ、ボス抽選、部屋人数、撃破競合などで大きく変動します。</p><p class="conclusion-line">現在スコア ÷ 使用ハントコイン ＝ pt / coin</p><p>例：500万pt ÷ 30万coin ＝ 約16.7pt/coin。今回の約20pt/coinより低めですが、データは1例のため「良い・普通・悪い」の固定評価は行いません。</p></section><section><h2 class="page-h2">確認状態と旧仕様</h2><div class="event-status-grid"><article><h3>ゲーム内実戦確認</h3><p>日本版がプレイ可能であること、×1準備、レイジ、ロックオン、×200、シャーマン優先、混雑時の電撃切り替え、約20pt/coinの実戦例。</p></article><article><h3>コミュニティ攻略との照合</h3><p>高倍率エリア、シャーマン・電撃の優先順、静かな部屋の選択、進化段階によるキル率補正の考え方。</p></article></div><details class="zombie-siege-legacy"><summary>旧仕様：宝箱ドロップ方式</summary><p>2026年7月15日以前の、撃破時に宝箱がドロップする方式は旧仕様です。現行の高得点ルートとは混ぜず、過去情報としてのみ扱います。</p></details><div class="summary-box"><strong>Human Verification</strong><p>現行ヘルプ全文、レイジ・ロックオンの正確なドロップ条件、ボス別の現行キル率・得点値は追加確認待ちです。</p></div></section><section><h2 class="page-h2">情報源</h2><ul class="source-list"><li>最優先：ユーザー本人による2026年8月31日の日本版ゲーム内実戦</li><li><a href="${zombieSiegeSourceLinks.domestic}" target="_blank" rel="noopener noreferrer">国内攻略情報</a>（旧閉鎖情報・旧数値の確認）</li><li><a href="${zombieSiegeSourceLinks.overseasWiki}" target="_blank" rel="noopener noreferrer">海外コミュニティwiki</a>（現行ルールと倍率の照合）</li><li><a href="${zombieSiegeSourceLinks.overseasStrategy}" target="_blank" rel="noopener noreferrer">海外実戦情報</a>（シャーマン優先・混雑回避の照合）</li></ul><p class="evidence-image-note">外部サイトの画像・表・文章・HTML・CSSは転載せず、事実関係だけを当サイト独自の文章と構成で整理しています。</p><nav class="attribute-guide-nav"><a href="/events/">イベント攻略へ戻る</a><a href="/evolution/trials/">関連する進化試練を見る</a></nav></section></article>`
  },
  en: {
    title: 'Zombie Siege Guide｜High-Score Route, 200x Shaman and Lock-On',
    description: 'A practical Zombie Siege guide based on a Japanese-version playtest: prepare Rage and Lock-On at 1x, target Shaman at 200x, switch to Shocker when crowded, and track points per coin.',
    body: `<article class="wrap static-section zombie-siege-guide"><div class="summary-box zombie-siege-current"><strong>Currently playable in the Japanese version</strong><p><span class="trust-label is-verified">Japanese in-game playtest</span> The user personally played the event on Aug 31, 2026. The previous “temporarily closed” notice is no longer treated as current.</p></div><section><h2 class="page-h2">Basic high-score route</h2><ol class="zombie-siege-steps"><li><span>STEP 1</span><strong>Collect Rage at 1x</strong><p>Prepare in the low-cost arena.</p></li><li><span>STEP 2</span><strong>Target small Zobos</strong><p>Use Rage while collecting Lock-On.</p></li><li><span>STEP 3</span><strong>Check room traffic</strong><p>Inspect the 200x arena and boss competition.</p></li><li><span>STEP 4</span><strong>Move to 200x</strong><p>Enter after preparing buffs and coins.</p></li><li><span>STEP 5</span><strong>Prioritize Shaman</strong><p>Use Lock-On when the target is not crowded.</p></li><li><span>STEP 6</span><strong>Switch to Shocker if crowded</strong><p>Avoid losing the finish after spending coins.</p></li></ol></section><section><h2 class="page-h2">Low multiplier or high multiplier?</h2><div class="event-status-grid"><article><h3>Low multiplier: preparation</h3><ul class="check-list"><li>Collect Rage at 1x</li><li>Farm Lock-On from small targets</li><li>Limit coin use while preparing buffs</li></ul></article><article><h3>High multiplier: scoring</h3><ul class="check-list"><li>Prioritize Shaman at 200x</li><li>Switch to Shocker when contested</li><li>Concentrate coins on high-score targets</li></ul></article></div><p class="conclusion-line">The core route is “prepare low, score high,” rather than staying at the highest multiplier from the beginning.</p></section><section><div class="trust-label-row"><span class="trust-label is-verified">Japanese playtest</span><span class="trust-label is-external">Community cross-check</span></div><h2 class="page-h2">Get Lock-On before moving up</h2><p>In the user’s Japanese-version run, collecting Rage at 1x and then attacking small Zobos while Rage was active was a practical way to build a Lock-On stock. Prepare target selection before entering a high-multiplier arena.</p><div class="notice-box"><h3>No guaranteed drop claim</h3><p>This evidence does not prove that a specific small Zobo always drops Lock-On. Exact drop conditions remain pending.</p></div></section><section><h2 class="page-h2">Default target: Shaman at 200x</h2><div class="event-status-grid"><article><h3>First choice: Shaman</h3><p>Prioritize Shaman for a high-score run, while accounting for kill-rate variance, active buffs, room population and competition.</p></article><article><h3>Second choice: Shocker</h3><p>When several players are contesting Shaman, switch to Shocker instead of paying into a target another player may finish.</p></article></div><p class="conclusion-line">Effective value = theoretical points efficiency × chance that you secure the defeat</p><p>An uncontested Shocker can outperform a heavily contested Shaman in actual points per coin.</p></section><section><h2 class="page-h2">Look for a quieter room</h2><p>Immediately check the number of players around 200x, who is attacking Shaman, the Shocker area and how quickly boss targets disappear. Change rooms before committing a large coin stack.</p><ol class="zombie-siege-decision"><li><strong>Shaman is open</strong><span>Target Shaman</span></li><li><strong>Shaman is crowded</strong><span>Switch to Shocker</span></li><li><strong>Shocker is crowded too</strong><span>Consider another room</span></li><li><strong>The whole high-multiplier area is crowded</strong><span>Move rooms</span></li></ol><p class="small-note">Do not cycle forever for a completely empty room. A room is good enough when you can lead the Shaman attempt.</p></section><section><h2 class="page-h2">Measure efficiency with points per coin</h2><div class="zombie-siege-benchmark"><div><span>Hunt Coins used</span><strong>about 500,000</strong></div><div><span>Score earned</span><strong>about 10,000,000</strong></div><div><span>Observed efficiency</span><strong>about 20 points / coin</strong></div></div><p><span class="trust-label is-verified">Japanese user benchmark</span> This is one observed run, not a guaranteed return. Buffs, boss selection, room traffic and competing finishes can change it substantially.</p><p class="conclusion-line">Current score ÷ Hunt Coins used = points per coin</p><p>Example: 5,000,000 points ÷ 300,000 coins = about 16.7 points per coin. It is below this run’s 20-point reference, but one data point is not enough for fixed good/average/bad tiers.</p></section><section><h2 class="page-h2">Evidence and legacy separation</h2><div class="event-status-grid"><article><h3>Japanese in-game playtest</h3><p>Current availability, 1x preparation, Rage, Lock-On, 200x, Shaman priority, Shocker fallback and the 20-points-per-coin example.</p></article><article><h3>Community cross-check</h3><p>Multiplier arenas, boss priority, quiet-room selection and the evolution-based kill-chance concept.</p></article></div><details class="zombie-siege-legacy"><summary>Legacy: chest-drop version</summary><p>The pre-July 15, 2026 chest-drop format is kept only as historical information and is not mixed into the current scoring route.</p></details><div class="summary-box"><strong>Human Verification</strong><p>The full current Japanese help, exact Rage/Lock-On drop rules, and current per-boss defeat rates and point values remain pending.</p></div></section><section><h2 class="page-h2">Sources</h2><ul class="source-list"><li>Highest priority: the user’s Japanese-version playtest on Aug 31, 2026</li><li><a href="${zombieSiegeSourceLinks.domestic}" target="_blank" rel="noopener noreferrer">Japanese community guide</a> for legacy status and old values</li><li><a href="${zombieSiegeSourceLinks.overseasWiki}" target="_blank" rel="noopener noreferrer">Community wiki</a> for current rules and arena multipliers</li><li><a href="${zombieSiegeSourceLinks.overseasStrategy}" target="_blank" rel="noopener noreferrer">Community field report</a> for boss and room-selection cross-checks</li></ul><p class="evidence-image-note">No external images, tables, article copy, HTML or CSS are reused. Facts are rewritten in this site’s own structure and wording.</p><nav class="attribute-guide-nav"><a href="/en/events/">Back to events</a><a href="/en/evolution/trials/">Related evolution trials</a></nav></section></article>`
  },
  'zh-CN': {
    title: '僵尸围城攻略｜高分路线、200倍萨满与锁定',
    description: '依据日本版实战整理僵尸围城高分路线：先在1倍区准备Rage与Lock-On，再到200倍区优先攻击Shaman；拥挤时切换Shocker，并用每枚金币积分判断效率。',
    body: `<article class="wrap static-section zombie-siege-guide"><div class="summary-box zombie-siege-current"><strong>日本版目前可以游玩</strong><p><span class="trust-label is-verified">日本版游戏内实战确认</span> 用户于2026年8月31日亲自游玩确认。旧有“暂时关闭”信息不再作为当前状态。</p></div><section><h2 class="page-h2">高分基本路线</h2><ol class="zombie-siege-steps"><li><span>STEP 1</span><strong>在1倍区取得Rage</strong><p>先在低消耗区域完成准备。</p></li><li><span>STEP 2</span><strong>攻击小型僵尸</strong><p>使用Rage并收集Lock-On。</p></li><li><span>STEP 3</span><strong>确认房间拥挤程度</strong><p>观察200倍区与高分首领的竞争。</p></li><li><span>STEP 4</span><strong>移动到200倍区</strong><p>准备好增益与金币后再进入。</p></li><li><span>STEP 5</span><strong>优先Shaman</strong><p>目标不拥挤时使用Lock-On。</p></li><li><span>STEP 6</span><strong>拥挤时改打Shocker</strong><p>避免投入金币后被其他玩家抢走击败。</p></li></ol></section><section><h2 class="page-h2">低倍率还是高倍率？</h2><div class="event-status-grid"><article><h3>低倍率：准备</h3><ul class="check-list"><li>在1倍区取得Rage</li><li>攻击小型僵尸收集Lock-On</li><li>控制消耗并准备增益</li></ul></article><article><h3>高倍率：得分</h3><ul class="check-list"><li>优先200倍区的Shaman</li><li>竞争激烈时切换Shocker</li><li>把金币集中用于高分目标</li></ul></article></div><p class="conclusion-line">基本思路是“低倍率准备 → 高倍率得分”，而不是从开始到结束一直停留在最高倍率。</p></section><section><div class="trust-label-row"><span class="trust-label is-verified">日本版实战</span><span class="trust-label is-external">社区信息交叉核对</span></div><h2 class="page-h2">提高倍率前先取得Lock-On</h2><p>在本次日本版实战中，先在1倍区取得Rage，再一边使用Rage一边攻击小型僵尸，是较容易累积Lock-On的路线。进入高倍率区前先准备好选择目标的条件。</p><div class="notice-box"><h3>不宣称必定掉落</h3><p>现有证据不足以证明某种小型僵尸必定掉落Lock-On，准确掉落条件仍待确认。</p></div></section><section><h2 class="page-h2">基本目标是200倍区的Shaman</h2><div class="event-status-grid"><article><h3>第一选择：Shaman</h3><p>高分路线优先Shaman，但实际效率还会受到击败概率、增益、房间人数与其他玩家竞争影响。</p></article><article><h3>第二选择：Shocker</h3><p>多人集中攻击Shaman时，可切换到Shocker，减少投入金币后被其他玩家抢走击败的损失。</p></article></div><p class="conclusion-line">实际期望值 ＝ 理论积分效率 × 自己取得击败的可能性</p><p>无人竞争的Shocker，实际每枚金币效率可能高于多人争抢的Shaman。</p></section><section><h2 class="page-h2">寻找人数较少的房间</h2><p>进入后立即观察200倍区人数、攻击Shaman的人数、Shocker周围以及首领消失的速度。应在投入大量金币前决定是否换房。</p><ol class="zombie-siege-decision"><li><strong>Shaman无人竞争</strong><span>攻击Shaman</span></li><li><strong>多人集中Shaman</strong><span>切换到Shocker</span></li><li><strong>Shocker也很拥挤</strong><span>考虑换房</span></li><li><strong>整个高倍率区都拥挤</strong><span>前往其他房间</span></li></ol><p class="small-note">无需一直寻找完全无人的房间。只要能够由自己主导攻击Shaman即可。</p></section><section><h2 class="page-h2">用每枚金币积分观察效率</h2><div class="zombie-siege-benchmark"><div><span>使用Hunt Coin</span><strong>约500,000</strong></div><div><span>获得积分</span><strong>约10,000,000pt</strong></div><div><span>实战效率</span><strong>约20pt / coin</strong></div></div><p><span class="trust-label is-verified">日本版用户实战参考</span> 这是一次实战记录，不是保证值。增益、首领抽选、房间人数与击败竞争都会造成较大变化。</p><p class="conclusion-line">当前积分 ÷ 已使用Hunt Coin ＝ pt / coin</p><p>例：500万pt ÷ 30万coin ＝ 约16.7pt/coin。低于本次约20pt/coin的参考值，但单一案例不足以建立“好／普通／差”的固定等级。</p></section><section><h2 class="page-h2">证据状态与旧机制分离</h2><div class="event-status-grid"><article><h3>日本版游戏内实战</h3><p>当前可游玩、1倍区准备、Rage、Lock-On、200倍区、Shaman优先、Shocker备用与约20pt/coin实例。</p></article><article><h3>社区信息交叉核对</h3><p>倍率区域、首领优先级、安静房间选择与进化阶段影响击败概率的思路。</p></article></div><details class="zombie-siege-legacy"><summary>旧机制：宝箱掉落版本</summary><p>2026年7月15日以前的击败后掉落宝箱机制仅作为历史资料保留，不与当前高分路线混用。</p></details><div class="summary-box"><strong>Human Verification</strong><p>当前日文帮助全文、Rage与Lock-On准确掉落规则、各首领当前击败概率与积分仍待确认。</p></div></section><section><h2 class="page-h2">信息来源</h2><ul class="source-list"><li>最高优先级：用户于2026年8月31日进行的日本版游戏内实战</li><li><a href="${zombieSiegeSourceLinks.domestic}" target="_blank" rel="noopener noreferrer">日本社区攻略</a>：用于核对旧状态与旧数值</li><li><a href="${zombieSiegeSourceLinks.overseasWiki}" target="_blank" rel="noopener noreferrer">海外社区wiki</a>：用于核对当前规则与倍率区域</li><li><a href="${zombieSiegeSourceLinks.overseasStrategy}" target="_blank" rel="noopener noreferrer">海外实战信息</a>：用于核对首领与房间选择</li></ul><p class="evidence-image-note">未转载外部站点的图片、表格、文章原文、HTML或CSS，仅以本站独立结构和文字整理事实。</p><nav class="attribute-guide-nav"><a href="/zh-cn/events/">返回活动攻略</a><a href="/zh-cn/evolution/trials/">相关进化试炼</a></nav></section></article>`
  }
};

const zombieSiegeCopyReplacements = {
  ja: [
    ['ゲーム内実戦確認', '実戦確認'],
    ['ユーザー本人が2026年8月31日に日本版でプレイして確認しました。', '日本版で2回実戦し、現行プレイ可能であることを確認しました。'],
    ['ユーザー実戦では、', '実戦確認では、'],
    ['<strong>約500,000</strong>', '<strong>約500,000 / 回</strong>'],
    ['<strong>約10,000,000pt</strong>', '<strong>1,000万pt超 / 回</strong>'],
    ['<strong>約20pt / coin</strong>', '<strong>約20pt / coin以上</strong>'],
    ['<span class="trust-label is-verified">ユーザー実戦目安</span> 50万コインで1,000万pt前後を狙えた今回の1例です。保証値ではなく、バフ、ボス抽選、部屋人数、撃破競合などで大きく変動します。', '<span class="trust-label is-verified">実戦確認</span> この立ち回りで2回実戦し、どちらも約50万コイン使用で1,000万ptを突破。1回は1,100万pt超を確認しました。保証値ではなく、バフ、部屋の混雑、ボス抽選、撃破競合によって変動します。'],
    ['今回の約20pt/coinより低めですが、データは1例のため', '実戦確認の約20pt/coin以上より低めですが、確認データは2回分のため'],
    ['日本版がプレイ可能であること、×1準備、レイジ、ロックオン、×200、シャーマン優先、混雑時の電撃切り替え、約20pt/coinの実戦例。', '日本版がプレイ可能であること、攻略ルート、2回とも約50万コインで1,000万pt超、うち1回は1,100万pt超、約20pt/coin以上を確認。'],
    ['最優先：ユーザー本人による2026年8月31日の日本版ゲーム内実戦', '最優先：日本版ゲーム内での2回の実戦確認']
  ],
  en: [
    ['Japanese in-game playtest', 'Field verification'],
    ['Japanese playtest', 'Field verification'],
    ['The user personally played the event on Aug 31, 2026.', 'Two Japanese-version runs confirmed that the event is currently playable.'],
    ['In the user’s Japanese-version run,', 'Across the verified Japanese-version runs,'],
    ['<strong>about 500,000</strong>', '<strong>about 500,000 / run</strong>'],
    ['<strong>about 10,000,000</strong>', '<strong>over 10,000,000 / run</strong>'],
    ['<strong>about 20 points / coin</strong>', '<strong>about 20+ points / coin</strong>'],
    ['<span class="trust-label is-verified">Japanese user benchmark</span> This is one observed run, not a guaranteed return. Buffs, boss selection, room traffic and competing finishes can change it substantially.', '<span class="trust-label is-verified">Field verification</span> This route was tested twice. Both runs used about 500,000 Hunt Coins and exceeded 10,000,000 points; one exceeded 11,000,000 points. These are observed results, not guaranteed returns. Buffs, room traffic, boss selection and competing finishes can change them substantially.'],
    ['It is below this run’s 20-point reference, but one data point is not enough', 'It is below the verified 20+ points-per-coin result, but two runs are not enough'],
    ['Current availability, 1x preparation, Rage, Lock-On, 200x, Shaman priority, Shocker fallback and the 20-points-per-coin example.', 'Current availability, the full route, two runs above 10,000,000 points on about 500,000 coins each, one run above 11,000,000 points, and about 20+ points per coin.'],
    ['Highest priority: the user’s Japanese-version playtest on Aug 31, 2026', 'Highest priority: two Japanese-version field verification runs']
  ],
  'zh-CN': [
    ['日本版游戏内实战确认', '实战确认'],
    ['日本版实战', '实战确认'],
    ['用户于2026年8月31日亲自游玩确认。', '已在日本版进行2次实战，并确认当前可以游玩。'],
    ['在本次实战确认中，', '在两次实战确认中，'],
    ['<strong>约500,000</strong>', '<strong>约500,000 / 次</strong>'],
    ['<strong>约10,000,000pt</strong>', '<strong>每次超过1,000万pt</strong>'],
    ['<strong>约20pt / coin</strong>', '<strong>约20pt / coin以上</strong>'],
    ['<span class="trust-label is-verified">日本版用户实战参考</span> 这是一次实战记录，不是保证值。增益、首领抽选、房间人数与击败竞争都会造成较大变化。', '<span class="trust-label is-verified">实战确认</span> 这一路线已实战2次，两次均使用约50万Hunt Coin并突破1,000万pt，其中1次超过1,100万pt。这是实战结果，不是保证值；增益、房间拥挤程度、首领抽选与击败竞争都会造成变化。'],
    ['低于本次约20pt/coin的参考值，但单一案例不足以', '低于实战确认的约20pt/coin以上，但2次确认数据仍不足以'],
    ['当前可游玩、1倍区准备、Rage、Lock-On、200倍区、Shaman优先、Shocker备用与约20pt/coin实例。', '当前可游玩、完整路线、2次均以约50万Hunt Coin突破1,000万pt、其中1次超过1,100万pt，以及约20pt/coin以上。'],
    ['最高优先级：用户于2026年8月31日进行的日本版游戏内实战', '最高优先级：日本版游戏内2次实战确认']
  ]
};

zombieSiegePages.en.description = zombieSiegePages.en.description.replace('based on a Japanese-version playtest', 'based on Japanese-version field verification');
zombieSiegePages['zh-CN'].description = zombieSiegePages['zh-CN'].description.replace('依据日本版实战整理', '依据日本版实战确认整理');
for (const [locale, replacements] of Object.entries(zombieSiegeCopyReplacements)) {
  zombieSiegePages[locale].body = replacements.reduce((body, [from, to]) => body.replaceAll(from, to), zombieSiegePages[locale].body);
}

const eventDetails = {
  'running-party': ['4人協力の現行仕様', 'ピンボールでスノーボードを集め、ルーレットで進んだ各自の距離を4人の合計へ加算します。チームメイトの距離報酬に含まれるイベントアイテムも共有されます。', '安定重視なら5倍・10倍が扱いやすく、高倍率ほど1回の振れ幅が大きくなります。最初に距離報酬と残り時間を見て倍率を決めます。', 'ヘルプ全文、全倍率、現行の距離・ランキング報酬は日本語ゲーム画面で再確認待ちです。'],
  'running-star': ['1人用ランニング', '協力版とは分けて扱う1人用イベントです。走行距離を伸ばして進行します。', 'チーム共有のないソロ版として、手持ちアイテムと残り報酬ラインを基準に進めます。', '現行報酬と倍率の詳細は確認待ちです。'],
  'island-treasure': ['4人で領地を進める', '4人チームがユニオンへ入り、エナジードリンクで領地を攻撃します。占領地から時間ポイントを得るため、疲労・濃縮ドリンク・総攻撃をチームで管理します。', '近い低HP領地から接続を作り、時間ポイントと消費ドリンクの釣り合いを見ます。深海の秘宝・貝殻・3ラウンド制の詳細は日本版確認前なので断定しません。', '領地値と攻略目安は外部確認です。現行報酬、疲労、濃縮ドリンク、深海の秘宝は日本語ゲーム画面で再確認待ちです。'],
  'magic-farm': ['8月26日リメイク後', '現在は肥料で作物の総重量を伸ばすイベントです。最大5倍の肥料クリティカルがあり、自分またはフレンドのタタの星・進化・餌付け・ピカピカが重量ボーナスに反映されます。', '先に表示中の招待タタボーナスと次の重量マイルストーンを確認し、肥料は到達ライン単位で使います。', '収穫・作物餌付け中心の旧方式はlegacyです。現行UI、重量ボーナス、マイルストーン報酬は日本語画面で再確認待ちです。'],
  'fishing-tournament': ['海域・コイン・QTE', '4人チームで、ピンボールから釣り竿を集めて海域で釣ります。ゴールドサカナコインはランキング、シルバーサカナコインは累計報酬と上位釣り竿解放に使い、大型魚ではQTEが発生します。', '個人報酬・竿解放は高倍率、ランキングの試行回数確保は1倍中心というコミュニティ攻略です。まき餌はチームが同時に釣れる時間へ合わせます。', '現行海域魚一覧、ランキング報酬、釣り竿解放値は日本語ゲーム画面で再確認待ちです。'],
  'treasure-hunt': ['4本の鍵と盤面拡張', '開始後に4人を選び、1人の盤面でオタカラを3回見つけると鍵を1個獲得します。鍵4個で中央宝箱を開き、同じメンバーから複数の鍵も取得できます。', '鍵ごとに必要アイテム数が5増え、盤面は最大3回拡張します。1〜3マスを追加で掘る爆弾を考慮し、独自ソルバーで候補手順を比較します。', '日本版のチーム選択・鍵・盤面拡張・爆弾画面はユーザー提供スクリーンショットで再確認待ちです。'],
  'surprise-roulette': ['公式告知確認', '8月26日の公式更新で段階追加と手動レベルアップが案内されました。', 'ゲーム内の段階と報酬を見て、必要分だけ進める設計です。', '現行ヘルプ、各段階の詳細数値と報酬はゲーム内確認待ちです。']
};
for (const event of events.events) {
  if (event.id === 'treasure-hunt' || event.id === 'summer-party') continue;
  if (event.id === 'zombie-siege') {
    const page = zombieSiegePages.ja;
    write('/events/zombie-siege/', shell({ route: '/events/zombie-siege/', title: page.title, description: page.description, type: 'Article', updated: ZOMBIE_SIEGE_UPDATE_DATE, body: page.body }));
    continue;
  }
  const [heading, current, strategy, pending] = eventDetails[event.id];
  write(`/events/${event.id}/`, shell({
    route: `/events/${event.id}/`, title: `${event.name} 攻略｜モンサバ イベント`, description: event.summary,
    type: 'Article', updated: EVENT_RESEARCH_DATE,
    body: `<article class="wrap static-section"><div class="trust-label-row"><span class="trust-label is-external">コミュニティ確認</span></div><h2 class="page-h2">${esc(heading)}</h2><div class="event-status-grid"><article><h3>何をするイベントか</h3><p>${esc(current)}</p></article><article><h3>何を優先するか</h3><p>${esc(strategy)}</p></article></div><div class="summary-box"><strong>Human Verification</strong><p>${esc(pending)}</p></div><h2 class="page-h2">情報源</h2><p><a href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">国内攻略情報</a>を2026年8月31日に照合し、当サイトで独自に要約しました。画像・表・記事本文は転載せず、公式確認済みとは表示していません。</p><nav class="attribute-guide-nav"><a href="/events/">イベント攻略へ戻る</a><a href="/evolution/trials/">関連する進化試練を見る</a></nav></article>`
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

function removeInjected(file, key) {
  const target = path.join(root, file);
  let source = fs.readFileSync(target, 'utf8');
  const start = `<!-- AUG30:${key}:START -->`;
  const end = `<!-- AUG30:${key}:END -->`;
  const pattern = new RegExp(`\\s*${start}[\\s\\S]*?${end}`, 'g');
  source = source.replace(pattern, '');
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
  const sample = fs.readFileSync(path.join(root, localeConfig[locale].prefix.slice(1), 'index.html'), 'utf8');
  return (sample.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`))?.[0] || '').replaceAll(' aria-current="page"', '');
};
function localizedShell(locale, { route, title, description, body, type = 'CollectionPage', image = '/assets/heroes/top-main.webp', updated = DEFAULT_CONTENT_DATE }) {
  const config = localeConfig[locale];
  const localRoute = `${config.prefix}${route}`;
  const alternates = [['ja', route], ['en', `/en${route}`], ['zh-Hans', `/zh-cn${route}`], ['x-default', route]].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(href)}" data-i18n-alternate>`).join('');
  const ogAlternates = Object.values({ ja: 'ja_JP', en: 'en_US', 'zh-CN': 'zh_CN' }).filter((value) => value !== config.locale).map((value) => `<meta property="og:locale:alternate" content="${value}" data-i18n-alternate>`).join('');
  const graph = [{ '@type': type, '@id': absoluteUrl(localRoute), url: absoluteUrl(localRoute), name: title, description, dateModified: updated, inLanguage: config.lang }, breadcrumbSchema([{ label: config.top, href: config.prefix + '/' }, { label: title.split('｜')[0] }])];
  const head = renderSeoHead({ title, description, route: localRoute, image, type: type === 'Article' ? 'article' : 'website' }).replace('ja_JP', config.locale).replaceAll('content="モンサバ攻略DB"', `content="${config.siteName}"`).replace(/(<link rel="canonical"[^>]*?)\s*\/>/, '$1>');
  const runtime = `<script src="/i18n/${config.prefix.slice(1)}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script>`;
  const skipLink = locale === 'zh-CN' ? '跳到正文' : 'Skip to content';
  const formattedDate = locale === 'en' ? englishDate(updated) : japaneseDate(updated);
  const kicker = updated === DEFAULT_CONTENT_DATE
    ? 'v0.46.1 · Aug 30, 2026'
    : locale === 'en' ? `v0.46.1 · ${formattedDate}` : `v0.46.1・${formattedDate}确认`;
  const checked = updated === DEFAULT_CONTENT_DATE
    ? config.checked
    : locale === 'en' ? `Last checked: ${formattedDate}` : `最后确认：${formattedDate}`;
  return `<!doctype html><html lang="${config.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${alternates}${ogAlternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/aug30-update.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body data-locale="${locale}" data-page-type="mega-update"><a class="skip-link" href="#main-content">${skipLink}</a>${layout(locale, 'header')}<main id="main-content"><section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${config.prefix}/">${config.top}</a><span aria-hidden="true">›</span><span>${esc(title.split('｜')[0])}</span></nav><div class="family-page-head"><div><span class="visible-kicker">${kicker}</span><h1>${esc(title.split('｜')[0])}</h1><p>${esc(description)}</p></div></div></div></section>${body}<section class="wrap source-note page-freshness"><strong>${config.state}</strong><p><span class="trust-label is-verified">${config.verified}</span> <span class="trust-label is-external">${config.external}</span> <span class="trust-label is-pending">${config.pending}</span></p><p>${checked}</p><a href="${config.prefix}/about-data/">${config.policy}</a></section></main>${layout(locale, 'footer')}${runtime}<script src="/family-display.js"></script><script src="/site.js"></script></body></html>`;
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
    'running-party':['Running Party Guide','A four-player snowboarding event where the team shares distance progress.','How it works','Collect snowboards from Pinball, spin for distance, and add each player’s distance to the four-player total. Event items from teammate distance rewards are shared.','Priority','Community guidance favors 5× or 10× for steadier progress; higher multipliers have wider single-spin variance.','Full help, multipliers and current rewards need Japanese in-game screenshots.'],
    'running-star':['Running Star Guide','A solo running event tracked separately from the co-op version.','How it works','Increase distance without four-player team sharing.','Priority','Compare remaining items, time and the next reward line before choosing a multiplier.','Current rewards and multiplier details need confirmation.'],
    'island-treasure':['Island Treasure Guide','A four-player event built around territory progress, hourly points, drinks and fatigue.','How it works','Join a union, spend Energy Drinks to attack territory, and earn points over time from occupied tiles. Fatigue, concentrated drinks and team attacks require coordination.','Priority','Build an efficient connected area before contesting expensive central objectives. Deepsea Dive details remain Japan implementation pending.','Current rewards, fatigue, concentrated drinks and three-round rules need Japanese in-game screenshots.'],
    'magic-farm':['Magic Farm Guide','The post-August 26 version scores total crop weight, with fertilizer criticals and invited Tatari bonuses.','How it works','Use fertilizer to raise total crop weight. Criticals can reach 5×, while an invited personal or friend Tatari adds a bonus based on Stars, evolution, feeding and shiny status.','Priority','Confirm the best displayed support bonus and next weight milestone before spending fertilizer. Harvest-and-feed instructions are legacy.','The current UI, weight bonuses and milestone rewards need Japanese in-game screenshots.'],
    'fishing-tournament':['Fishing Tournament Guide','A four-player sea event using rods, gold and silver fish coins, bait and large-fish QTEs.','How it works','Collect rods from Pinball. Gold Fish Coins are used for ranking; Silver Fish Coins advance personal rewards and unlock better rods.','Priority','Community guidance uses higher multipliers for Silver progress and rod unlocks, then 1× for more ranking attempts. Coordinate shared bait timing.','The current sea fish list, ranking rewards and rod unlock values need Japanese in-game screenshots.'],
    'treasure-hunt':['Treasure Hunt Guide','Use four keys, expanding boards, increasing costs and bombs to plan the opening order.','How it works','Choose four members after the event starts. Finding treasure three times on one member’s board awards a key; four keys open the central chest.','Priority','Each key raises the item cost by 5, boards expand up to three times, and bombs dig 1–3 extra cells. Use the independent solver without importing third-party logic.','Japanese team, key, expansion and bomb screens still need confirmation.'],
    'surprise-roulette':['Surprise Roulette Guide','The August 26 official update announced added stages and manual level-up.','Official notice','The official update announced additional stages and manual level-up.','Priority','Check the current stage and reward before spending event resources.','Current help, stage values and rewards need an in-game check.']
  },
  'zh-CN': {
    'running-party':['跑步派对攻略','4人共享滑雪距离与团队进度的周期活动。','活动玩法','从弹珠机获得滑雪板，通过转盘前进；每人的距离计入4人总距离，队友距离奖励中的活动道具也会共享。','优先建议','社区攻略建议以5倍、10倍稳定推进；更高倍率的单次波动更大。','完整帮助、全部倍率与当前奖励仍需日文游戏截图确认。'],
    'running-star':['跑步之星攻略','与协作版分开处理的单人跑步活动。','活动玩法','在没有4人共享的单人模式中提升距离。','优先建议','根据剩余道具、时间与下一个奖励档位选择倍率。','当前奖励与倍率细节仍待确认。'],
    'island-treasure':['岛屿宝藏攻略','围绕领地推进、每小时积分、饮料与疲劳管理的4人活动。','活动玩法','加入联盟，消耗能量饮料攻击领地，并从占领地持续获得积分；疲劳、浓缩饮料与总攻击需要团队协调。','优先建议','先建立消耗较低的连续领地，再判断是否争夺高成本中央目标。深海宝藏仍等待日本版确认。','当前奖励、疲劳、浓缩饮料与三回合规则仍需日文游戏截图。'],
    'magic-farm':['魔法农场攻略','8月26日改版后以作物总重量计分，并含肥料暴击与邀请Tatari加成。','活动玩法','使用肥料提高作物总重量，暴击最高5倍；自己或好友Tatari的星级、进化、喂食与闪亮状态会转化为重量加成。','优先建议','先确认画面上最高的支援加成与下一个重量里程碑，再使用肥料；旧收获与喂食流程属于旧规则。','当前界面、重量加成与里程碑奖励仍需日文游戏截图。'],
    'fishing-tournament':['钓鱼大赛攻略','使用海域、金银鱼币、鱼竿、鱼饵与大型鱼QTE推进的4人活动。','活动玩法','从弹珠机收集鱼竿；金鱼币用于排名，银鱼币用于个人累计奖励与解锁更高级鱼竿。','优先建议','社区攻略以高倍率推进银币与鱼竿解锁，再用1倍增加排名尝试次数；鱼饵应与队友同时钓鱼的时间协调。','当前海域鱼类、排名奖励与鱼竿解锁数值仍需日文游戏截图。'],
    'treasure-hunt':['寻宝攻略','结合4把钥匙、盘面扩张、费用递增与炸弹规划开启顺序。','活动玩法','活动开始后选择4名成员；在一名成员的盘面找到3次宝物可得1把钥匙，4把钥匙开启中央宝箱。','优先建议','每把钥匙使道具成本增加5，盘面最多扩张3次，炸弹额外挖掘1–3格；使用本站独立求解器，不导入第三方逻辑。','日本版队伍、钥匙、扩张与炸弹画面仍待确认。'],
    'surprise-roulette':['惊喜轮盘攻略','8月26日官方更新已公告新增阶段与手动升级。','官方公告','官方更新已公告新增阶段与手动升级。','优先建议','使用活动资源前先确认当前阶段与奖励。','当前帮助、阶段数值与奖励仍需游戏内确认。']
  }
};
for (const locale of Object.keys(localeConfig)) for (const event of events.events) {
  if (event.id === 'treasure-hunt' || event.id === 'summer-party') continue;
  if (event.id === 'zombie-siege') {
    const page = zombieSiegePages[locale];
    write(`${localeConfig[locale].prefix}/events/zombie-siege/`, localizedShell(locale, { route: '/events/zombie-siege/', title: page.title, description: page.description, type: 'Article', updated: ZOMBIE_SIEGE_UPDATE_DATE, body: page.body }));
    continue;
  }
  const [title, description, currentLabel, current, priorityLabel, priority, pending] = localizedEvents[locale][event.id];
  write(`${localeConfig[locale].prefix}/events/${event.id}/`, localizedShell(locale, { route: `/events/${event.id}/`, title, description, type: 'Article', updated: EVENT_RESEARCH_DATE, body: `<article class="wrap static-section"><div class="trust-label-row"><span class="trust-label is-external">${locale === 'en' ? 'Community-confirmed' : '社区信息确认'}</span></div><div class="event-status-grid"><article><h2>${currentLabel}</h2><p>${current}</p></article><article><h2>${priorityLabel}</h2><p>${priority}</p></article></div><div class="summary-box"><strong>Human Verification</strong><p>${pending}</p></div><h2 class="page-h2">${locale === 'en' ? 'Source' : '信息来源'}</h2><p><a href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">${locale === 'en' ? 'Community strategy source' : '社区攻略来源'}</a>, ${locale === 'en' ? 'checked Aug 31, 2026. Independently summarized; no source images, tables or article copy are reused.' : '于2026年8月31日核对。本站独立摘要，不转载来源图片、表格或文章内容。'}</p><nav class="attribute-guide-nav"><a href="${localeConfig[locale].prefix}/events/">${locale === 'en' ? 'Back to events' : '返回活动攻略'}</a><a href="${localeConfig[locale].prefix}/evolution/trials/">${locale === 'en' ? 'Related evolution trials' : '相关进化试炼'}</a></nav></article>` }));
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
inject('events/treasure-hunt/index.html', 'EVENT_GUIDE', '<section class="wrap static-section"><h2 class="page-h2">オタカラ探しの進め方</h2><div class="trust-label-row"><span class="trust-label is-external">コミュニティ確認</span></div><div class="event-status-grid"><article><h3>鍵と中央宝箱</h3><p>開始後に4人を選び、1人の盤面でオタカラを3回見つけると鍵を1個獲得します。鍵4個で中央宝箱を開き、同じメンバーから複数の鍵も取得できます。</p></article><article><h3>コスト・爆弾・盤面拡張</h3><p>鍵ごとに必要アイテム数が5増え、盤面は最大3回拡張します。爆弾は追加で1〜3マスを掘ります。上の独自ソルバーで候補を比較してください。</p></article></div><div class="summary-box"><strong>Human Verification</strong><p>日本版の4人選択、鍵、中央宝箱、盤面拡張、爆弾効果、終了日時の画面を確認待ちです。</p></div><a href="/evolution/trials/">関連する進化試練を見る</a></section>');
inject('events/treasure-hunt/index.html', 'EVENT_FRESHNESS', `<section class="wrap source-note page-freshness"><strong>情報の状態</strong><p><span class="trust-label is-external">外部確認</span> イベント解説を独自に整理しています。</p><p>最終確認日：${japaneseDate(EVENT_RESEARCH_DATE)}</p><a href="/about-data/">データ方針を見る</a></section>`);
// Localized pages already contain translated copies of the shared blocks. Remove
// legacy locale-specific blocks so each locale has exactly one guide and one
// freshness section, including when regenerating from an older checkout.
removeInjected('en/events/treasure-hunt/index.html', 'EVENT_GUIDE_EN');
removeInjected('zh-cn/events/treasure-hunt/index.html', 'EVENT_GUIDE_ZH');
removeInjected('en/events/treasure-hunt/index.html', 'EVENT_FRESHNESS_EN');
removeInjected('zh-cn/events/treasure-hunt/index.html', 'EVENT_FRESHNESS_ZH');

function synchronizeTreasurePage(file, locale) {
  const target = path.join(root, file);
  let source = fs.readFileSync(target, 'utf8');
  const kicker = locale === 'ja'
    ? `独自アルゴリズム・端末内保存・${japaneseDate(EVENT_RESEARCH_DATE)}更新`
    : locale === 'en'
      ? `Independent algorithm · Saved on this device · Updated ${englishDate(EVENT_RESEARCH_DATE)}`
      : `独立算法 · 数据保存在本设备 · ${japaneseDate(EVENT_RESEARCH_DATE)}更新`;
  const footer = locale === 'ja' ? renderFooter(`${familyCount}系統 / ${formCount}体`) : layout(locale, 'footer');
  source = source
    .replace(/"dateModified"\s*:\s*"[^"]+"/, `"dateModified": "${EVENT_RESEARCH_DATE}"`)
    .replace(/<span class="visible-kicker">[\s\S]*?<\/span>/, `<span class="visible-kicker">${kicker}</span>`)
    .replace(/<footer[\s\S]*?<\/footer>/, footer);
  fs.writeFileSync(target, `${source.trimEnd()}\n`);
}

synchronizeTreasurePage('events/treasure-hunt/index.html', 'ja');
synchronizeTreasurePage('en/events/treasure-hunt/index.html', 'en');
synchronizeTreasurePage('zh-cn/events/treasure-hunt/index.html', 'zh-CN');

inject('events/index.html', 'EVENT_ROTATION', '<section class="wrap static-section"><h2 class="page-h2">コミュニティ確認の基本ローテーション</h2><p><span class="trust-label is-external">外部確認</span> 釣り大会 → オタカラ探し → ランニングパーティ → ゾンビ包囲戦 → 魔法の農場の順で、合計3日ごとに進むというコミュニティ情報です。閉鎖・リメイク・日本版差があるため、確定スケジュールではありません。実際の日程はゲーム内表示を優先してください。</p></section>');
inject('en/events/index.html', 'EVENT_ROTATION_EN', '<section class="wrap static-section"><h2>Community-confirmed base rotation</h2><p><span class="trust-label is-external">Community information</span> Fishing Tournament → Treasure Hunt → Running Party → Zombie Siege → Magic Farm is reported as a three-day base rotation. Closures, remakes and regional differences mean this is not a guaranteed schedule; check the in-game calendar.</p></section>');
inject('zh-cn/events/index.html', 'EVENT_ROTATION_ZH', '<section class="wrap static-section"><h2>社区确认的基本轮换</h2><p><span class="trust-label is-external">社区信息</span> 钓鱼大赛 → 寻宝 → 跑步派对 → 僵尸围城 → 魔法农场被记录为每3天推进一次的基本轮换。关闭、改版与地区差异可能改变安排，因此不作为确定日程，请以游戏内日历为准。</p></section>');

console.log(`2026-08-30 pages generated: ${familyCount} families, ${chips.count} chips, ${trials.families.length} trials, ${events.events.length} events.`);
