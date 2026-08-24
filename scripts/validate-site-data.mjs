import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, HERO_BY_ROUTE } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const errors = [];
const LEGACY_BASE_URL = 'https://monsaba-guide.vercel.app';
const expect = (condition, message) => { if (!condition) errors.push(message); };
const ignored = new Set(['.git', '.github', '.vercel', '.agents', 'node_modules', 'assets']);
const textExtensions = new Set(['.html', '.js', '.json', '.xml', '.txt', '.webmanifest']);
const textFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (textExtensions.has(path.extname(entry.name))) textFiles.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
}
walk(root);

const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const ratings = json('data/tier-ratings.json');
const monetization = json('data/monetization.json');
const seasonOne = json('data/zombie-rush/seasons/season-1.json');
for (const [label, values] of [
  ['tatari.json', (tatari.families || []).map((family) => family.attribute)],
  ['tata-skills.json', Object.values(skills.byFamily || {}).map((family) => family.attribute)]
]) {
  const invalid = [...new Set(values)].filter((attribute) => !['草', '水', '火', '雷', '岩'].includes(attribute));
  expect(invalid.length === 0, `${label}: 未許可の公開属性 ${invalid.join(', ')}`);
}
const counts = Object.fromEntries(['草', '水', '火', '雷', '岩'].map((attribute) => [attribute, 0]));
for (const family of tatari.families || []) counts[family.attribute] = (counts[family.attribute] || 0) + 1;
expect(JSON.stringify(counts) === JSON.stringify({草:13, 水:12, 火:13, 雷:13, 岩:12}), `属性系統数: ${JSON.stringify(counts)}`);
expect((tatari.families || []).length === 63, `総系統数: ${(tatari.families || []).length}`);

const overallGroups = ratings.overall?.groups || [];
const overallIds = overallGroups.flatMap((group) => group.ids || []);
expect(new Set(overallIds).size === overallIds.length, '総合Tierに重複familyIdがあります');
expect(overallIds.every((id) => tatari.families.some((family) => family.id === id)), '総合Tierに存在しないfamilyIdがあります');
expect(
  JSON.stringify(overallGroups.find((group) => group.rank === 'SSS')?.ids) === JSON.stringify(['yanzaru', 'denjika', 'shizukuchou', 'purabi', 'himawarin']),
  '総合SSSは再評価済み5系統と一致していません'
);

const publicFiles = textFiles.filter((file) => !file.startsWith('scripts/'));
for (const file of publicFiles) {
  const content = read(file);
  if (file !== 'vercel.json') expect(!content.includes('/attribute/earth/'), `${file}: 旧 earth URL`);
  expect(!content.includes('ヒヒドッグ'), `${file}: ヒヒドッグ`);
  expect(!content.includes('当サイトdojo評価'), `${file}: 当サイトdojo評価`);
  if (!['consult/consult.js', 'search/search.js'].includes(file)) expect(!content.includes('土属性'), `${file}: 土属性`);
  expect(!content.includes(LEGACY_BASE_URL), `${file}: 旧Production URLが混入`);
  expect(!/\beval\s*\(|new\s+Function\s*\(/.test(content), `${file}: eval / Function を使用`);
}
expect(publicFiles.map(read).join('\n').includes('ビビドッグ'), 'ビビドッグが公開データにありません');
expect(read('data/tatari.json').includes('モエミン'), 'モエミンが維持されていません');
expect(read('data/tatari.json').includes('クンブー'), 'クンブーが維持されていません');
expect(read('consult/consult.js').includes("replaceAll('土属性', '岩属性')"), '相談所の旧「土属性」入力aliasがありません');

const htmlFiles = textFiles.filter((file) => file.endsWith('.html'));
const canonicalOwners = new Map();
for (const file of htmlFiles) {
  const html = read(file);
  const canonicalMatches = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  const h1Count = (html.match(/<h1(?:\s[^>]*)?>/g) || []).length;
  expect(h1Count === 1, `${file}: H1 が ${h1Count} 件`);
  expect(html.includes('lang="ja"'), `${file}: lang=ja がありません`);
  expect(html.includes('id="main-content"'), `${file}: main-content がありません`);
  expect(html.includes('class="skip-link"'), `${file}: skip link がありません`);
  if (file === '404.html') {
    expect(/<meta name="robots" content="noindex,follow"/.test(html), '404.html: robots noindex,follow がありません');
    expect(canonicalMatches.length === 0, '404.html: canonical は削除してください');
  } else {
    expect(canonicalMatches.length === 1, `${file}: canonical が ${canonicalMatches.length} 件`);
    const canonical = canonicalMatches[0]?.[1];
    expect(canonical?.startsWith(`${BASE_URL}/`), `${file}: canonical base URL が不正`);
    if (canonical) {
      expect(!canonicalOwners.has(canonical), `${file}: canonical が ${canonicalOwners.get(canonical)} と重複`);
      canonicalOwners.set(canonical, file);
    }
  }
  if (html.includes('class="site-header"')) expect(html.includes('src="/site.js"'), `${file}: 共通サイトスクリプトがありません`);
  if (html.includes('<footer')) {
    expect(html.includes('href="/friends/"'), `${file}: footerにフレンド掲示板リンクがありません`);
    expect((html.match(/https:\/\/x\.com\/odi_monsaba/g) || []).length === 1, `${file}: X問い合わせリンクが1件ではありません`);
    expect(/href="https:\/\/x\.com\/odi_monsaba" target="_blank" rel="noopener noreferrer"/.test(html), `${file}: Xリンクの安全属性が不足`);
  }
  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    expect(/rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(match[0]), `${file}: target=_blank のrelが不足`);
  }
}

const majorRoutes = ['/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/tata-tier/', '/consult/', '/normal-guide/', '/evolution-priority/'];
for (const route of majorRoutes) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
  const html = read(file);
  const expectedImage = `${BASE_URL}${HERO_BY_ROUTE[route]}`;
  expect(html.includes(`<meta property="og:image" content="${expectedImage}"`), `${file}: og:image がHeroと不一致`);
  expect(html.includes(`<meta name="twitter:image" content="${expectedImage}"`), `${file}: twitter:image がHeroと不一致`);
  expect(/<meta property="og:image:alt" content="[^"]+"/.test(html), `${file}: og:image:alt がありません`);
  expect(html.includes(`"image":"${BASE_URL}/`), `${file}: JSON-LD image がありません`);
  expect(/"mainEntityOfPage":/.test(html) && /"dateModified":/.test(html), `${file}: JSON-LD主要項目が不足`);
}

for (const family of tatari.families || []) {
  const file = `tata/${family.id}/index.html`;
  expect(fs.existsSync(path.join(root, file)), `${file}: 個別ページがありません`);
  if (!fs.existsSync(path.join(root, file))) continue;
  const html = read(file);
  expect(html.includes(`${family.familyName}系`), `${file}: family名がありません`);
  expect(html.includes(`${BASE_URL}/tata/${family.id}/`), `${file}: 固有canonical/URLがありません`);
  expect(html.includes(`${family.familyName}は強い？`), `${file}: 強さのクイック回答がありません`);
  expect(html.includes(`${family.familyName}系のおすすめ用途`), `${file}: おすすめ用途がありません`);
  expect(html.includes(`${family.familyName}の進化先`), `${file}: 進化先がありません`);
  expect(html.includes(`${family.familyName}系のスキル一覧`), `${file}: スキル一覧がありません`);
  expect(html.includes('このページで扱う進化'), `${file}: 進化名称の静的索引がありません`);
  for (const evolution of family.evolutions) expect(html.includes(`T${evolution.stage}</b> ${evolution.name}`), `${file}: T${evolution.stage} ${evolution.name} が進化索引にありません`);
  expect(html.includes('data-monetization-slot="tata_mid" hidden'), `${file}: 非表示の将来広告枠がありません`);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  expect(Boolean(imageMatch), `${file}: og:image がありません`);
  if (imageMatch) {
    const localImage = imageMatch[1].replace(`${BASE_URL}/`, '');
    expect(fs.existsSync(path.join(root, localImage)), `${file}: og:image 実体がありません`);
  }
}

const sharedLayout = read('scripts/shared-layout.mjs');
for (const label of ['タタ図鑑', 'タタTier', '進化優先度', 'コンテンツ攻略', '攻略相談', '検索', '初心者ガイド', 'フレンド掲示板']) expect(sharedLayout.includes(label), `共通ヘッダーに ${label} がありません`);
const siteJs = read('site.js');
expect(sharedLayout.includes("href: '/friends/', label: 'フレンド掲示板'"), 'フレンド掲示板がPC常設ナビになっていません');
expect(sharedLayout.indexOf("href: '/#content-guides'") < sharedLayout.indexOf("href: '/friends/'") && sharedLayout.indexOf("href: '/friends/'") < sharedLayout.indexOf("href: '/consult/'"), '共通ナビのフレンド掲示板の並びが不正です');
expect(read('site.js').includes("aria-current', 'page'"), 'aria-current 共通処理がありません');
expect(read('site.js').includes('/_vercel/insights/script.js') && read('site.js').includes('/_vercel/speed-insights/script.js'), 'Vercel計測スクリプトが不足');
expect(siteJs.includes("hostname === 'monster-survival.com'") && siteJs.includes("hostname.endsWith('.vercel.app')") && !siteJs.includes("hostname === 'localhost'"), 'Vercel計測対象hostが不正です');

for (const file of htmlFiles) {
  const html = read(file);
  expect(html.includes('id="global-navigation"'), `${file}: 初期HTMLに共通navがありません`);
  expect(html.includes('フレンド掲示板'), `${file}: 初期HTMLの共通navが不完全です`);
}
const topHtml = read('index.html');
expect((topHtml.match(/data-family="/g) || []).length === 63, 'TOP図鑑の静的HTMLが63系統ではありません');
const tierHtml = read('tata-tier/index.html');
expect((tierHtml.match(/class="overall-card"/g) || []).length > 0, 'Tierの静的HTMLがありません');
expect((tierHtml.match(/class="tier-chart-tata"/g) || []).length === 63, 'Tierチャートは63系統ではありません');
expect((tierHtml.match(/class="tier-chart-row /g) || []).length === 4, 'Tierチャートは4区分ではありません');
expect(tierHtml.includes('ビリジカ系') && tierHtml.includes('シズクジ系'), 'Tierチャートの日本名表示が不正です');
expect((read('evolution-priority/index.html').match(/class="evolution-card"/g) || []).length > 0, '進化優先度の静的HTMLがありません');
const updatePreviewHtml = read('updates/2026-08-26/index.html');
expect(updatePreviewHtml.includes('2026年8月26日 実装予定'), '8/26アップデートページに予定表記がありません');
expect(updatePreviewHtml.includes('公式ゲーム内告知'), '8/26アップデートページに公式情報源の表示がありません');
expect(updatePreviewHtml.includes('ゾンビラッシュ専用スキル') && updatePreviewHtml.includes('通常スキルではありません'), '専用スキルと通常スキルの区別が不足しています');
expect((updatePreviewHtml.match(/class="zr-balance-card"/g) || []).length === 35, '専用スキル調整カードが35体ではありません');
expect(updatePreviewHtml.includes('160%') && updatePreviewHtml.includes('230%') && updatePreviewHtml.includes('火焔爆裂'), 'トラーニー火焔爆裂の公式値が不足しています');
expect(seasonOne.meta?.status === 'scheduled' && seasonOne.meta?.scope === 'zombie-rush-only', 'Season 1データの予定状態・範囲が不正です');
expect((seasonOne.tataSkillBalance || []).length === 35, 'Season 1専用スキル対象が35体ではありません');
expect(read('zombie-rush/index.html').includes('現在のTierと1000キル編成例は旧環境の評価です'), 'ゾンビラッシュに旧環境評価の注意がありません');
expect(read('tata-tier/index.html').includes('この予定変更だけを理由に総合Tier・通常・道場・ボスラリー評価は変更しません'), '総合Tierに専用調整の注意がありません');
expect(read('search/search.js').includes("href:'/updates/2026-08-26/'"), 'サイト内検索に8/26アップデート予定がありません');
expect(topHtml.includes('data-official-x') && topHtml.includes('https://x.com/monsaba_jp') && topHtml.includes('/official-x.js'), 'TOPの公式Xセクションが不足しています');
const xScript = read('official-x.js');
expect(xScript.includes('IntersectionObserver') && xScript.includes('https://platform.twitter.com/widgets.js'), '公式Xの遅延読込が不足しています');
expect((xScript.match(/platform\.twitter\.com\/widgets\.js/g) || []).length === 2, '公式X widgets.js参照の想定が変わっています');
expect(read('privacy/index.html').includes('Xの埋め込みコンテンツ') && read('privacy/index.html').includes('X側のCookie'), 'PrivacyのX埋め込み説明が不足しています');

for (const [file, hero] of Object.entries({
  'index.html': 'top-main.webp',
  'evolution-priority/index.html': 'evolution-main.webp',
  'zombie-rush/index.html': 'IMG_6941.webp',
  'boss-rally/index.html': 'IMG_6942.webp',
  'badge-dojo/index.html': 'IMG_6943.webp',
  'normal-guide/index.html': 'IMG_6945.webp'
})) {
  const html = read(file);
  expect(html.includes(`srcset="/assets/heroes/responsive/${hero.replace('.webp', '')}-480.webp`), `${file}: Hero srcsetがありません`);
  expect(html.includes('sizes="(max-width: 820px)'), `${file}: Hero sizesがありません`);
}

const vercel = json('vercel.json');
const redirect = (vercel.redirects || []).find((item) => item.source === '/attribute/earth/' && item.destination === '/attribute/rock/');
expect(redirect?.permanent === true, 'earth → rock の恒久リダイレクトがありません');
const friendsHtml = read('friends/index.html');
const friendsApi = read('api/friends.js');
expect(friendsHtml.includes('maxlength="50"') && friendsHtml.includes('maxlength="30"') && friendsHtml.includes('maxlength="150"'), 'friends: 入力上限が不足しています');
expect(friendsHtml.includes('name="website"') && friendsApi.includes('isAllowedOrigin'), 'friends: honeypot / Origin対策が不足しています');
expect(friendsApi.includes("X-Robots-Tag', 'noindex, nofollow") && friendsApi.includes("Cache-Control', 'no-store"), 'friends API: noindex / cache設定が不足しています');
expect(read('lib/friends-core.js').includes('postTtlSeconds: 30 * 24 * 60 * 60'), 'friends: 30日TTLが設定されていません');
expect(!friendsHtml.includes('FRIENDS_ADMIN_TOKEN') && !friendsHtml.includes('KV_REST_API_TOKEN'), 'friends: サーバー秘密値名がHTMLへ露出しています');

const brokenLinks = [];
for (const file of htmlFiles) {
  const html = read(file);
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const url = match[1];
    if (!url.startsWith('/') || url.startsWith('//') || url === '/attribute/earth/') continue;
    const target = url === '/' ? 'index.html' : url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
    if (!fs.existsSync(path.join(root, target))) brokenLinks.push(`${file} -> ${url}`);
  }
}
expect(brokenLinks.length === 0, `存在しない内部リンク:\n${brokenLinks.join('\n')}`);

const sitemap = read('sitemap.xml');
expect(!sitemap.includes('/attribute/earth/'), 'sitemap.xml に旧 earth URL が残っています');
expect(sitemap.includes(`${BASE_URL}/attribute/rock/`), 'sitemap.xml に rock URL がありません');
for (const route of ['/beginner-guide/', '/friends/', '/about/', '/search/', '/updates/', '/updates/2026-08-26/', '/privacy/', '/about-data/']) expect(sitemap.includes(`${BASE_URL}${route}`), `sitemap.xml に ${route} がありません`);
expect(!sitemap.includes('/404'), 'sitemap.xml に404が含まれています');
expect((sitemap.match(/<loc>/g) || []).length === (sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length, 'sitemap.xmlの全URLに有効なlastmodが必要です');
expect(read('robots.txt').includes(`Sitemap: ${BASE_URL}/sitemap.xml`), 'robots.txt のSitemap URLが不正');

const expectedSlots = ['article_after_summary', 'article_mid', 'article_bottom', 'tata_mid', 'beginner_mid'];
expect(monetization.adsEnabled === false, 'monetization: adsEnabled は false を維持してください');
expect(monetization.affiliateEnabled === true, 'monetization: affiliateEnabled は true を維持してください');
expect(expectedSlots.every((slot) => monetization.slots?.includes(slot)), 'monetization: 固定slot IDが不足しています');
expect(!publicFiles.map(read).join('\n').match(/adsbygoogle|doubleclick\.net|googlesyndication/i), '未承認の通常広告が混入しています');
const expectedAffiliatePages = Object.freeze({
  'beginner-guide/index.html': 'point_income_003',
  'evolution-priority/index.html': 'macromill_002',
  'index.html': 'warau_003',
  'normal-guide/index.html': 'ipsos_isay_001'
});
const affiliatePages = htmlFiles.filter((file) => read(file).includes('data-affiliate-offer='));
expect(JSON.stringify(affiliatePages.sort()) === JSON.stringify(Object.keys(expectedAffiliatePages).sort()), `affiliate掲載範囲が不正: ${affiliatePages.join(', ')}`);
for (const [file, offer] of Object.entries(expectedAffiliatePages)) {
  expect(read(file).includes(`data-affiliate-offer="${offer}"`), `${file}: affiliate案件が不正です`);
  expect((read(file).match(/data-affiliate-offer=/g) || []).length === 1, `${file}: affiliate広告は1件だけにしてください`);
  expect(read(file).includes('/monetization.js'), `${file}: monetization.jsがありません`);
}
const monetizationScript = read('monetization.js');
const a8Offers = [
  ['s00000025908001', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 'https://www28.a8.net/svt/bgt?aid=260824371058&wid=002&eno=01&mid=s00000025908001003000&mc=1', 'https://www16.a8.net/0.gif?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 300, 250],
  ['s00000018660003', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 'https://www25.a8.net/svt/bgt?aid=260824371056&wid=002&eno=01&mid=s00000018660003012000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 468, 60],
  ['s00000013554002', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+1JU+2WL0+CN8W1', 'https://www21.a8.net/svt/bgt?aid=260824371000&wid=002&eno=01&mid=s00000013554002124000&mc=1', 'https://www18.a8.net/0.gif?a8mat=4BADDF+1JU+2WL0+CN8W1', 120, 600],
  ['s00000018951001', 'https://px.a8.net/svt/ejp?a8mat=4BADDE+G8NPLM+4286+62U35', 'https://www21.a8.net/svt/bgt?aid=260824370982&wid=002&eno=01&mid=s00000018951001021000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDE+G8NPLM+4286+62U35', 250, 250]
];
for (const [programId, href, banner, tracking, width, height] of a8Offers) {
  expect(monetizationScript.includes(`offerId: '${programId}'`), `A8 program ID ${programId} がありません`);
  expect(monetizationScript.includes(href), `A8リンクURL ${programId} が不正です`);
  expect(monetizationScript.includes(banner), `A8バナーURL ${programId} が不正です`);
  expect(monetizationScript.includes(tracking), `A8計測タグ ${programId} が不正です`);
  expect(monetizationScript.includes(`width="${width}" height="${height}"`), `A8画像寸法 ${programId} が不正です`);
}
expect((monetizationScript.match(/width="1" height="1"/g) || []).length === a8Offers.length, 'A8 1x1計測画像が不足しています');
expect(read('site.js').includes('当サイトはアフィリエイト広告を利用しています。'), '共通footerのaffiliate開示がありません');
expect(read('privacy/index.html').includes('A8.netのアフィリエイトプログラム') && read('privacy/index.html').includes('Cookieや類似の識別技術'), 'privacyのaffiliate説明が不足しています');
for (const file of htmlFiles) {
  const html = read(file);
  expect(html.includes('/favicon.ico') && html.includes('/favicon-32x32.png') && html.includes('/apple-touch-icon.png'), `${file}: favicon設定が不足しています`);
}
for (const asset of ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/heroes/top-main.webp', 'assets/heroes/evolution-main.webp']) {
  expect(fs.existsSync(path.join(root, asset)), `${asset}: 画像ファイルがありません`);
}
expect(read('index.html').includes('/assets/heroes/top-main.webp'), 'トップHeroが新画像ではありません');
expect(read('evolution-priority/index.html').includes('/assets/heroes/evolution-main.webp'), '進化Heroが新画像ではありません');
for (const route of ['/beginner-guide/', '/friends/', '/about/']) {
  const file = `${route.slice(1)}index.html`;
  const html = read(file);
  expect(html.includes(`<link rel="canonical" href="${BASE_URL}${route}"`), `${file}: 固有canonicalがありません`);
  expect(html.includes('BreadcrumbList'), `${file}: BreadcrumbListがありません`);
  expect(html.includes(`<meta property="og:image" content="${BASE_URL}/`), `${file}: OG画像がありません`);
}

if (errors.length) {
  console.error(`サイト検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`サイト検証成功: 63系統 ${JSON.stringify(counts)} / HTML ${htmlFiles.length}ページ / 内部リンク正常`);
