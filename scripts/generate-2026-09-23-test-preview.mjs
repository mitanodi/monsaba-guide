import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';
import { renderHeader, renderFooter } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd } from './seo-helpers.mjs';
import { renderGa4Tag } from './update-ga4-tag.mjs';

const root = path.resolve(import.meta.dirname, '..');
const route = '/updates/2026-09-23-test-preview/';
const preview = JSON.parse(fs.readFileSync(path.join(root, 'data/zombie-rush/seasons/season-2-test-preview.json'), 'utf8'));
const liveChipByJapaneseName = new Map(JSON.parse(fs.readFileSync(path.join(root, 'data/zombie-rush/chips.json'), 'utf8')).chips.map((chip) => [chip.name.ja, chip]));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const assetVersion = JSON.parse(fs.readFileSync(path.join(root, 'data/asset-build.json'), 'utf8')).version;
const directions = { up: ['↑', '強化'], down: ['↓', '弱体化'] };
const write = (outputRoute, html) => {
  const directory = path.join(root, outputRoute.replace(/^\//, ''));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), `${html.trimEnd()}\n`);
};
const localizedLayout = (locale, tag) => {
  const directory = locale === 'en' ? 'en' : 'zh-cn';
  const source = fs.readFileSync(path.join(root, directory, 'index.html'), 'utf8');
  return (source.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`))?.[0] || '').replaceAll(' aria-current="page"', '');
};
const alternates = (sourceRoute) => [['ja', sourceRoute], ['en', `/en${sourceRoute}`], ['zh-Hans', `/zh-cn${sourceRoute}`], ['x-default', sourceRoute]]
  .map(([language, href]) => `<link rel="alternate" hreflang="${language}" href="${BASE_URL}${href}" data-i18n-alternate>`).join('')
  + '<meta property="og:locale:alternate" content="ja_JP" data-i18n-alternate><meta property="og:locale:alternate" content="zh_CN" data-i18n-alternate>';
const jsonLd = (localRoute, title, description, language) => safeJsonLd({
  '@context': 'https://schema.org',
  '@graph': [{ '@type': 'Article', '@id': `${BASE_URL}${localRoute}`, url: `${BASE_URL}${localRoute}`, headline: title, name: title, description, datePublished: '2026-09-21', dateModified: '2026-09-21', inLanguage: language }]
});
const rows = preview.chipBalancePreview.map((item) => {
  const [symbol, label] = directions[item.direction];
  const liveChip = liveChipByJapaneseName.get(item.name);
  if (!liveChip?.icon) throw new Error(`Current chip icon mapping missing: ${item.name}`);
  return `<tr><th><span class="preview-chip-name"><img src="${esc(liveChip.icon)}" width="56" height="56" alt="${esc(item.name)}の現行チップアイコン"><span>${esc(item.name)}</span></span></th><td>${esc(item.metric)}</td><td>${esc(item.before)}</td><td>${esc(item.after)}</td><td><span class="zr-direction is-${item.direction}">${symbol} ${label}</span></td></tr>`;
}).join('');
const previewImages = `<div class="preview-asset-grid" aria-label="公式提供のゾンビラッシュ素材"><figure><img src="/assets/official/zobos/shaman-zobo.png" width="3158" height="3481" alt="公式提供のゾンビ素材。名称対応は確認待ち。" loading="lazy"><figcaption>公式提供のゾンビラッシュ用素材</figcaption></figure><figure><img src="/assets/official/zobos/shocker-zobo.png" width="2651" height="2604" alt="公式提供のゾンビ素材。名称対応は確認待ち。" loading="lazy"><figcaption>公式提供のゾンビラッシュ用素材</figcaption></figure><figure><img src="/assets/official/zobos/roadhog-zobo.png" width="2379" height="2251" alt="公式提供のゾンビ素材。名称対応は確認待ち。" loading="lazy"><figcaption>公式提供のゾンビラッシュ用素材</figcaption></figure></div>`;

const previewImagesEn = previewImages
  .replaceAll('公式提供のゾンビラッシュ用素材', 'Official Zombie Rush Creator Asset')
  .replaceAll('公式提供のゾンビ素材。名称対応は確認待ち。', 'Official Zombie Rush asset. Specific enemy-name mapping is pending.')
  .replaceAll('公式提供のゾンビラッシュ素材', 'Official Zombie Rush asset');
const previewImagesZh = previewImages
  .replaceAll('公式提供のゾンビラッシュ用素材', '官方提供的 Zombie Rush 素材')
  .replaceAll('公式提供のゾンビ素材。名称対応は確認待ち。', '官方提供的 Zombie Rush 素材，具体敌人名称对应仍待确认。')
  .replaceAll('公式提供のゾンビラッシュ素材', '官方提供的 Zombie Rush 素材');

function japanesePage() {
  const title = 'モンサバ 9/23テストサーバー更新プレビュー｜ゾンビラッシュSeason 2・ルカロン・新T4';
  const description = '9/23予定の公式テストサーバー情報を整理。ゾンビラッシュSeason 2、ルカロン、新T4、チップ調整を本番実装前のプレビューとして掲載します。';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({ title, description, route, image: '/assets/official/zobos/shaman-zobo.png', type: 'article', robots: 'noindex,follow' })}${alternates(route)}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${jsonLd(route, title, description, 'ja')}</script>${renderGa4Tag()}</head><body data-locale="ja" data-page-type="update-preview"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero update-preview-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="パンくず"><a href="/">トップ</a><span>›</span><a href="/updates/">更新履歴</a><span>›</span><span>9/23テストサーバー</span></nav><div class="family-page-head"><div><span class="visible-kicker">テストサーバー情報・本番未確認</span><h1>9/23テストサーバー更新プレビュー</h1><p>ゾンビラッシュ Season 2・ルカロン・新T4・チップ調整</p></div></div></div></section><article class="wrap static-section update-article"><div class="alert-box"><strong>本番の現行仕様ではありません</strong><p>これはユーザー共有の公式テストサーバー情報を、9月23日予定の先行内容として整理したページです。本番ゲームへの反映、数値、名称、実装時期は確認待ちです。現行のチップDB・通常スキル・Tierには反映していません。</p></div><nav class="update-jump" aria-label="記事内メニュー"><a href="#season2">Season 2</a><a href="#new-tatari">新タタ・新T4</a><a href="#chips">チップ調整</a><a href="#other">その他の予定</a></nav><section id="season2"><h2 class="page-h2">ゾンビラッシュ Season 2</h2><div class="content-card-grid"><article class="content-card"><h3>シーズン移行</h3><ul class="plain-list">${preview.seasonChanges.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article><article class="content-card"><h3>難易度と戦闘</h3><ul class="plain-list">${preview.otherPreviewChanges.zombieRush.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article></div>${previewImages}<p class="section-note">上の画像は運営提供Creator Assetsのゾンビ素材です。今回の予告内容の実装画面ではないため、特定の敵名やチップ効果とは結び付けていません。</p></section><section id="new-tatari"><h2 class="page-h2">新タタ「ルカロン」と第4進化</h2><div class="content-card-grid"><article class="content-card"><h3>水属性・ルカロン</h3><p>${esc(preview.newTatari.knownInformation)}</p><p class="section-note">進化名、通常スキル、専用スキルの詳細・数値、画像は本番ゲーム内確認後に追加します。</p></article><article class="content-card"><h3>第4進化</h3><ul class="plain-list">${preview.newEvolutions.map((item) => `<li>${esc(item.attribute)}属性：${esc(item.from)} → <strong>${esc(item.to)}</strong></li>`).join('')}</ul><p class="section-note">既存family IDや現行の進化データは、本番確認前に変更しません。</p></article></div></section><section id="chips"><h2 class="page-h2">チップ調整予定</h2><p>下表はテストサーバー告知の変更前 → 変更後です。本番チップ図鑑の現行値ではありません。</p><div class="table-wrap"><table class="zombie-table update-balance-table"><thead><tr><th>チップ</th><th>項目</th><th>現行確認値</th><th>テストサーバー予定値</th><th>変化</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="ghost-button" href="/zombie-rush/chips/">現行チップ図鑑を見る</a></p></section><section id="other"><h2 class="page-h2">そのほかの更新予定</h2><div class="content-card-grid"><article class="content-card"><h3>タタ探知機</h3><p>お気に入りタタの研究、タタ探知カプセル、ラベル・装飾・スタンプ、資質上昇、タタ詳細画面の改修が予定されています。</p></article><article class="content-card"><h3>キャンプ場・カードアルバム・ショップ</h3><ul class="plain-list">${preview.otherPreviewChanges.otherSystems.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article><article class="content-card"><h3>スキルプレビュー・SE</h3><ul class="plain-list">${preview.otherPreviewChanges.skillPreviewAndSe.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article></div></section><section class="source-note"><strong>情報源と反映方針</strong><p>参照ページ：<a href="${esc(preview.meta.sourceUrl)}" target="_blank" rel="noopener noreferrer">モンスターサバイバル@wiki</a>（9/23更新表示、2026年9月21日参照）。内容はユーザーから「公式テストサーバー情報」として共有されたものです。wiki自体は非公式情報源として扱い、本番実装の独立した証拠にはしていません。</p><p>本番ゲーム内・公式告知で確認できた時点で、確認日・根拠を更新してから各DBへ適用します。</p></section></article></main>${renderFooter('9/23テストサーバー更新プレビュー')}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js"></script></body></html>`;
}

function localizedPage(locale) {
  const english = locale === 'en';
  const prefix = english ? '/en' : '/zh-cn';
  const localRoute = `${prefix}${route}`;
  const title = english ? 'Sep 23 Test Server Preview | Zombie Rush Season 2, Lucaron and New T4s' : '9月23日测试服务器预览｜Zombie Rush Season 2、Lucaron 与新T4';
  const description = english ? 'A clearly separated test-server preview for Zombie Rush Season 2, Lucaron, new T4 evolutions and chip balance changes. Live release is not yet confirmed.' : '整理9月23日测试服务器的先行信息：Zombie Rush Season 2、Lucaron、新T4与芯片调整。本服上线尚未确认。';
  const body = english
    ? `<article class="wrap static-section update-article"><div class="alert-box"><strong>This is not the live-game specification.</strong><p>This page records user-shared official test-server information as a Sep 23 preview. Live release, values, names and timing remain pending. The current chip database, normal skills and tiers have not been overwritten.</p></div><section><h2 class="page-h2">Zombie Rush Season 2</h2><div class="content-card-grid"><article class="content-card"><h3>Season transition</h3><ul class="plain-list"><li>Season rankings are planned to reset.</li><li>Zombie Rush-only skill stats are planned to become viewable.</li><li>The difficulty inherited is planned to be one level below the highest difficulty reached in Season 1.</li></ul></article><article class="content-card"><h3>Battle changes</h3><ul class="plain-list"><li>Some Energy Candies are planned to return when a Tatari is defeated.</li><li>Difficulty 1 is planned to become easier, while 3 and 4 become slightly harder.</li><li>A Shizukuji-family Zombie Rush skill damage issue is planned to be fixed.</li></ul></article></div>${previewImagesEn}<p class="section-note">These are official Creator Assets for Zombie Rush. They are illustrative assets only and are not claimed to be screenshots of the preview.</p></section><section><h2 class="page-h2">New Tatari and T4 evolutions</h2><div class="content-card-grid"><article class="content-card"><h3>Water Tatari: Lucaron</h3><p>Lucaron and its evolutions are planned to have Zombie Rush-only skills. Evolution names, skills, values and images remain pending live-game confirmation.</p></article><article class="content-card"><h3>New T4</h3><ul class="plain-list"><li>Thunder: Elekineko → Tokoyonyatto</li><li>Fire: Hinyao → Nekonomikoto</li></ul><p class="section-note">Existing stable IDs and live evolution records are not changed before live confirmation.</p></article></div></section><section><h2 class="page-h2">Planned chip changes</h2><p>The table on the Japanese page lists every numeric preview change. These are not live values in the chip database.</p><p><a class="ghost-button" href="/en/zombie-rush/chips/">View the live chip database</a></p></section><section class="source-note"><strong>Source and status</strong><p>Referenced page: <a href="${esc(preview.meta.sourceUrl)}" target="_blank" rel="noopener noreferrer">Monster Survival @wiki</a>, viewed Sep 21, 2026. The user identified the details as official test-server information. The wiki remains an external source and is not treated as independent proof of live implementation.</p></section></article>`
    : `<article class="wrap static-section update-article"><div class="alert-box"><strong>这不是正式服当前规格。</strong><p>本页将用户共享的官方测试服务器信息整理为9月23日预览。正式服上线、数值、名称与时间仍待确认；未覆盖现行芯片图鉴、普通技能或Tier。</p></div><section><h2 class="page-h2">Zombie Rush Season 2</h2><div class="content-card-grid"><article class="content-card"><h3>赛季转换</h3><ul class="plain-list"><li>计划重置赛季排名。</li><li>计划可以查看Zombie Rush专属技能的数值。</li><li>计划继承Season 1最高到达难度的前一档难度。</li></ul></article><article class="content-card"><h3>战斗调整</h3><ul class="plain-list"><li>塔塔被击败时计划返还部分能量糖果。</li><li>难度1计划降低，难度3与4计划略微提高。</li><li>计划修复露水虫系列Zombie Rush技能伤害偏低的问题。</li></ul></article></div>${previewImagesZh}<p class="section-note">以上为运営提供的Zombie Rush素材，仅作配图，不宣称为测试服实机画面。</p></section><section><h2 class="page-h2">新塔塔与T4进化</h2><div class="content-card-grid"><article class="content-card"><h3>水属性：Lucaron</h3><p>Lucaron及其进化形态计划拥有Zombie Rush专属技能。进化名、技能、数值与图片仍待正式服确认。</p></article><article class="content-card"><h3>新T4</h3><ul class="plain-list"><li>雷：Elekineko → Tokoyonyatto</li><li>火：Hinyao → Nekonomikoto</li></ul><p class="section-note">正式服确认前不改变既有稳定ID与进化记录。</p></article></div></section><section><h2 class="page-h2">芯片调整预告</h2><p>日文页面列出全部数值变更。它们不是现行芯片图鉴中的正式服数值。</p><p><a class="ghost-button" href="/zh-cn/zombie-rush/chips/">查看现行芯片图鉴</a></p></section><section class="source-note"><strong>信息来源与状态</strong><p>参照页面：<a href="${esc(preview.meta.sourceUrl)}" target="_blank" rel="noopener noreferrer">Monster Survival @wiki</a>，于2026年9月21日查看。用户说明这些内容来自官方测试服务器；wiki仍视为外部来源，不作为正式服已实装的独立证明。</p></section></article>`;
  const header = localizedLayout(locale, 'header');
  const footer = localizedLayout(locale, 'footer');
  const localeValue = english ? 'en_US' : 'zh_CN';
  const head = renderSeoHead({ title, description, route: localRoute, image: '/assets/official/zobos/shaman-zobo.png', type: 'article', robots: 'noindex,follow' }).replace('ja_JP', localeValue).replaceAll('content="モンサバ攻略DB"', `content="${english ? 'Clash of Critters Guide DB' : 'Clash of Critters 攻略DB'}"`).replace(/(<link rel="canonical"[^>]*?)\s*\/>/, '$1>');
  const skip = english ? 'Skip to content' : '跳到正文';
  const runtime = `<script src="/i18n/${english ? 'en' : 'zh-cn'}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script>`;
  return `<!doctype html><html lang="${english ? 'en' : 'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${alternates(route)}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${jsonLd(localRoute, title, description, english ? 'en' : 'zh-CN')}</script>${renderGa4Tag()}</head><body data-locale="${locale}" data-page-type="update-preview"><a class="skip-link" href="#main-content">${skip}</a>${header}<main id="main-content"><section class="page-hero update-preview-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${prefix}/">${english ? 'Home' : '首页'}</a><span>›</span><a href="${prefix}/updates/">${english ? 'Updates' : '更新记录'}</a><span>›</span><span>${english ? 'Test server preview' : '测试服务器预览'}</span></nav><div class="family-page-head"><div><span class="visible-kicker">${english ? 'Test-server information · live release pending' : '测试服务器信息 · 正式服待确认'}</span><h1>${english ? 'Sep 23 test server preview' : '9月23日测试服务器预览'}</h1><p>${english ? 'Zombie Rush Season 2 · Lucaron · new T4s · chip changes' : 'Zombie Rush Season 2 · Lucaron · 新T4 · 芯片调整'}</p></div></div></div></section>${body}</main>${footer}${runtime}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js"></script></body></html>`;
}

function inject(file, key, content) {
  const target = path.join(root, file);
  const start = `<!-- SEP23:${key}:START -->`;
  const end = `<!-- SEP23:${key}:END -->`;
  const source = fs.readFileSync(target, 'utf8');
  const block = `${start}${content}${end}`;
  const existing = new RegExp(`${start}[\\s\\S]*?${end}`);
  const next = existing.test(source) ? source.replace(existing, block) : source.replace('</main>', `${block}</main>`);
  fs.writeFileSync(target, next);
}

write(route, japanesePage());
write(`/en${route}`, localizedPage('en'));
write(`/zh-cn${route}`, localizedPage('zh-CN'));
inject('updates/index.html', 'UPDATE_CARD', '<section class="update-card"><time datetime="2026-09-23">2026年9月23日予定</time><h2>ゾンビラッシュ Season 2・ルカロン・新T4のテストサーバー情報</h2><p>本番未確認の先行内容として、チップ調整と追加要素を現行仕様から分離して掲載しました。</p><a href="/updates/2026-09-23-test-preview/">テストサーバー情報を見る</a></section>');
inject('en/updates/index.html', 'UPDATE_CARD', '<section class="update-card"><time datetime="2026-09-23">Planned Sep 23, 2026</time><h2>Test-server preview: Zombie Rush Season 2, Lucaron and new T4s</h2><p>Preview changes are separated from the live specification.</p><a href="/en/updates/2026-09-23-test-preview/">View the test-server preview</a></section>');
inject('zh-cn/updates/index.html', 'UPDATE_CARD', '<section class="update-card"><time datetime="2026-09-23">计划于2026年9月23日</time><h2>测试服务器预览：Zombie Rush Season 2、Lucaron 与新T4</h2><p>预告内容与正式服现行规格分开显示。</p><a href="/zh-cn/updates/2026-09-23-test-preview/">查看测试服务器预览</a></section>');
inject('zombie-rush/index.html', 'PREVIEW_NOTICE', '<section class="wrap static-section zr-season-preview"><div class="alert-box"><strong>Season 2のテストサーバー情報</strong><p>9/23予定の先行内容を確認しました。本番反映は未確認のため、現行攻略・チップDBとは分けて掲載しています。</p><a class="ghost-button" href="/updates/2026-09-23-test-preview/">テストサーバー情報を見る</a></div></section>');
inject('en/zombie-rush/index.html', 'PREVIEW_NOTICE', '<section class="wrap static-section zr-season-preview"><div class="alert-box"><strong>Season 2 test-server preview</strong><p>Preview information planned for Sep 23 is separated from the live guide and chip database until release is confirmed.</p><a class="ghost-button" href="/en/updates/2026-09-23-test-preview/">View the preview</a></div></section>');
inject('zh-cn/zombie-rush/index.html', 'PREVIEW_NOTICE', '<section class="wrap static-section zr-season-preview"><div class="alert-box"><strong>Season 2测试服务器预览</strong><p>计划于9月23日的先行内容与正式服攻略、芯片图鉴分开显示，等待上线确认。</p><a class="ghost-button" href="/zh-cn/updates/2026-09-23-test-preview/">查看预览</a></div></section>');
console.log(`9/23 test-server preview generated: ${preview.chipBalancePreview.length} chip changes, 3 locales.`);
