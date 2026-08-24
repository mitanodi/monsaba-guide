import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, HERO_BY_ROUTE } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const errors = [];
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

const publicFiles = textFiles.filter((file) => !file.startsWith('scripts/'));
for (const file of publicFiles) {
  const content = read(file);
  if (file !== 'vercel.json') expect(!content.includes('/attribute/earth/'), `${file}: 旧 earth URL`);
  expect(!content.includes('ヒヒドッグ'), `${file}: ヒヒドッグ`);
  expect(!content.includes('当サイトdojo評価'), `${file}: 当サイトdojo評価`);
  if (!['consult/consult.js', 'search/search.js'].includes(file)) expect(!content.includes('土属性'), `${file}: 土属性`);
  expect(!content.includes('monster-survival.com'), `${file}: 未移行ドメインが混入`);
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
  expect(/"image":"https:\/\/monsaba-guide\.vercel\.app\//.test(html), `${file}: JSON-LD image がありません`);
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
  expect(html.includes('data-monetization-slot="tata_mid" hidden'), `${file}: 非表示の将来広告枠がありません`);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  expect(Boolean(imageMatch), `${file}: og:image がありません`);
  if (imageMatch) {
    const localImage = imageMatch[1].replace(`${BASE_URL}/`, '');
    expect(fs.existsSync(path.join(root, localImage)), `${file}: og:image 実体がありません`);
  }
}

for (const label of ['タタ図鑑', 'タタTier', '進化優先度', 'コンテンツ攻略', '攻略相談', '検索', '初心者ガイド', 'フレンド掲示板']) expect(read('site.js').includes(label), `共通ヘッダーに ${label} がありません`);
const siteJs = read('site.js');
expect(siteJs.includes("['/friends/', 'フレンド掲示板', '']"), 'フレンド掲示板がPC常設ナビになっていません');
expect(siteJs.indexOf("['/#content-guides'") < siteJs.indexOf("['/friends/'") && siteJs.indexOf("['/friends/'") < siteJs.indexOf("['/consult/'"), '共通ナビのフレンド掲示板の並びが不正です');
expect(read('site.js').includes("aria-current', 'page'"), 'aria-current 共通処理がありません');
expect(read('site.js').includes('/_vercel/insights/script.js') && read('site.js').includes('/_vercel/speed-insights/script.js'), 'Vercel計測スクリプトが不足');

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
for (const route of ['/beginner-guide/', '/friends/', '/about/', '/search/', '/updates/', '/privacy/', '/about-data/']) expect(sitemap.includes(`${BASE_URL}${route}`), `sitemap.xml に ${route} がありません`);
expect(!sitemap.includes('/404'), 'sitemap.xml に404が含まれています');
expect(read('robots.txt').includes(`Sitemap: ${BASE_URL}/sitemap.xml`), 'robots.txt のSitemap URLが不正');

const expectedSlots = ['article_after_summary', 'article_mid', 'article_bottom', 'tata_mid', 'beginner_mid'];
expect(monetization.adsEnabled === false, 'monetization: adsEnabled は false を維持してください');
expect(monetization.affiliateEnabled === false, 'monetization: affiliateEnabled は false を維持してください');
expect(expectedSlots.every((slot) => monetization.slots?.includes(slot)), 'monetization: 固定slot IDが不足しています');
expect(!publicFiles.map(read).join('\n').match(/adsbygoogle|doubleclick\.net|googlesyndication|data-affiliate-link/i), '実広告またはaffiliateリンクが混入しています');
for (const route of ['/beginner-guide/', '/friends/', '/about/']) {
  const file = `${route.slice(1)}index.html`;
  const html = read(file);
  expect(html.includes(`<link rel="canonical" href="${BASE_URL}${route}"`), `${file}: 固有canonicalがありません`);
  expect(html.includes('BreadcrumbList'), `${file}: BreadcrumbListがありません`);
  expect(/<meta property="og:image" content="https:\/\/monsaba-guide\.vercel\.app\//.test(html), `${file}: OG画像がありません`);
}

if (errors.length) {
  console.error(`サイト検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`サイト検証成功: 63系統 ${JSON.stringify(counts)} / HTML ${htmlFiles.length}ページ / 内部リンク正常`);
