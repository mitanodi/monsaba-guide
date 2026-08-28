import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, HERO_BY_ROUTE } from './site-config.mjs';
import '../family-display.js';

const { getFamilyDisplayName, getFamilyDisplayLabel, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => {
  const target = path.join(root, file);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(target, 'utf8'); }
    catch (error) { if (error.code !== 'EBUSY' || attempt === 11) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40); }
  }
};
const json = (file) => JSON.parse(read(file));
const errors = [];
const LEGACY_BASE_URL = 'https://monsaba-guide.vercel.app';
const expect = (condition, message) => { if (!condition) errors.push(message); };
const ignored = new Set(['.git', '.github', '.vercel', '.agents', 'node_modules', 'assets', 'promo']);
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
const affiliateOffers = json('data/affiliate-offers.json');
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
const renamedFamilies = (tatari.families || []).filter((family) => family.familyName !== getFamilyDisplayName(family));
expect(renamedFamilies.length === 32, `初期形態名とlegacy familyNameが異なる系統数: ${renamedFamilies.length}`);
for (const family of tatari.families || []) {
  expect(getFamilyDisplayName(family) === family.evolutions[0]?.name, `${family.id}: 表示名が初期形態名と不一致`);
  const aliases = getFamilySearchAliases(family);
  for (const evolution of family.evolutions || []) expect(aliases.includes(evolution.name), `${family.id}: 検索aliasに ${evolution.name} がありません`);
  expect(aliases.includes(family.familyName), `${family.id}: legacy familyName検索aliasがありません`);
}
const bowzuhebi = ratings.overall?.byFamily?.nenbutsuhebi;
for (const [mode, expected] of Object.entries({ tier: 'SS', normal: 'SS', zombie: 'SS', dojo: 'SS', beginner: 'SS' })) {
  expect(bowzuhebi?.[mode] === expected, `nenbutsuhebi ${mode}: ${bowzuhebi?.[mode] || '未設定'} / expected ${expected}`);
}
const pikaru = (tatari.families || []).find((family) => family.id === 'hikaru');
const pikaruNames = ['ピカル', 'ボルタル', 'ルシフェル', 'ルミナリオン'];
expect(JSON.stringify(pikaru?.evolutions?.map((stage) => stage.name)) === JSON.stringify(pikaruNames), `hikaru進化列: ${pikaru?.evolutions?.map((stage) => stage.name).join(' → ')}`);
expect(getFamilyDisplayLabel(pikaru) === 'ピカル系', 'hikaruの表示系統名がピカル系ではありません');

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
  if (html.includes('class="site-header"')) expect(/<script\s+src="(?:\/|\.\/)site\.js(?:\?[^"#]*)?"/.test(html), `${file}: 共通サイトスクリプトがありません`);
  if (html.includes('class="site-header"')) expect(/src="\/family-display\.js(?:\?[^"#]*)?"/.test(html), `${file}: 系統表示名の共通スクリプトがありません`);
  if (html.includes('<footer')) {
    expect(html.includes('href="/friends/"'), `${file}: footerにフレンド掲示板リンクがありません`);
    const xContactLinks = html.match(/href="https:\/\/x\.com\/odi_monsaba" target="_blank" rel="noopener noreferrer"/g) || [];
    const expectedXLinks = file === 'about/index.html' ? 2 : 1;
    expect(xContactLinks.length === expectedXLinks, `${file}: 安全なX問い合わせリンクが${expectedXLinks}件ではありません`);
    expect(!html.includes('href="#contact"'), `${file}: X問い合わせがページ内リンクのままです`);
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
  const hasPageRelationship = /"mainEntityOfPage":/.test(html)
    || (route === '/' && /"@type":"WebPage"/.test(html) && /"isPartOf":/.test(html));
  expect(hasPageRelationship && /"dateModified":/.test(html), `${file}: JSON-LD主要項目が不足`);
}

for (const family of tatari.families || []) {
  const file = `tata/${family.id}/index.html`;
  expect(fs.existsSync(path.join(root, file)), `${file}: 個別ページがありません`);
  if (!fs.existsSync(path.join(root, file))) continue;
  const html = read(file);
  const displayName = getFamilyDisplayName(family);
  const displayLabel = getFamilyDisplayLabel(family);
  expect(html.includes(displayLabel), `${file}: 初期形態の系統名がありません`);
  expect(html.includes(`${BASE_URL}/tata/${family.id}/`), `${file}: 固有canonical/URLがありません`);
  expect(html.includes(`${displayName}は強い？`), `${file}: 強さのクイック回答がありません`);
  expect(html.includes(`${displayLabel}のおすすめ用途`), `${file}: おすすめ用途がありません`);
  expect(html.includes(`${displayName}の進化先`), `${file}: 進化先がありません`);
  expect(html.includes(`${displayLabel}のスキル一覧`), `${file}: スキル一覧がありません`);
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

for (const family of renamedFamilies) {
  const legacyLabel = `${family.familyName}系`;
  for (const file of htmlFiles) expect(!read(file).includes(legacyLabel), `${file}: legacy系統表示 ${legacyLabel} が残っています`);
}
for (const file of htmlFiles) {
  const html = read(file);
  for (const wrongName of ['ヒカル系', 'ホルタル', 'ルシフタル']) expect(!html.includes(wrongName), `${file}: 旧ピカル系表示 ${wrongName} が残っています`);
}

const sharedLayout = read('scripts/shared-layout.mjs');
for (const label of ['タタ図鑑', 'タタTier', '進化優先度', '攻略ハブ', '通常ステージ', 'ゾンビラッシュ', 'ボスラリー', 'バッジ道場', '比較', '攻略相談', '検索', '初心者ガイド', 'フレンド掲示板']) expect(sharedLayout.includes(label), `共通ヘッダーに ${label} がありません`);
const siteJs = read('site.js');
const stylesCss = read('styles.css');
expect(sharedLayout.includes("href: '/friends/', label: 'フレンド掲示板' })"), 'フレンド掲示板がPC常設ナビになっていません');
expect(sharedLayout.indexOf("href: '/consult/'") < sharedLayout.indexOf("href: '/friends/'") && sharedLayout.indexOf("href: '/friends/'") < sharedLayout.indexOf("href: '/search/'"), '共通ナビの攻略相談・フレンド掲示板・検索の並びが不正です');
expect(sharedLayout.indexOf("href: '/guides/'") < sharedLayout.indexOf("href: '/compare/'") && sharedLayout.indexOf("href: '/compare/'") < sharedLayout.indexOf("href: '/consult/'"), '共通ナビの攻略ハブ・比較・相談の並びが不正です');
const mobileGuideNavItems = [['/normal-guide/', '通常ステージ'], ['/zombie-rush/', 'ゾンビラッシュ'], ['/boss-rally/', 'ボスラリー'], ['/badge-dojo/', 'バッジ道場']];
expect(sharedLayout.includes("href: '/guides/', label: '攻略ハブ', className: 'desktop-only-nav-link'") && mobileGuideNavItems.every(([href, label]) => sharedLayout.includes(`href: '${href}', label: '${label}', className: 'mobile-only-nav-link'`)) && (sharedLayout.match(/className: 'mobile-only-nav-link'/g) || []).length === 5, 'PC攻略ハブまたはスマホ4攻略リンクの表示区分が不正です');
expect(read('site.js').includes("aria-current', 'page'"), 'aria-current 共通処理がありません');
expect(read('site.js').includes('/_vercel/insights/script.js') && read('site.js').includes('/_vercel/speed-insights/script.js'), 'Vercel計測スクリプトが不足');
expect(siteJs.includes("hostname === 'monster-survival.com'") && siteJs.includes("hostname.endsWith('.vercel.app')") && !siteJs.includes("hostname === 'localhost'"), 'Vercel計測対象hostが不正です');
expect(stylesCss.includes('@media(max-width:820px)') && stylesCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'mobile navが820px以下の2列gridではありません');
expect(stylesCss.includes('.site-header nav .desktop-only-nav-link{display:none!important}') && stylesCss.includes('.mobile-only-nav-link{display:none!important}'), 'PC・スマホ専用navの表示切替が不足しています');
expect(stylesCss.includes('min-height:44px') && stylesCss.includes('.site-header nav a[aria-current="page"]'), 'mobile navのタップ高さまたはactive表示が不足しています');
expect(read('site.js').includes("matchMedia('(min-width: 821px)')"), '821px以上でmobile navを閉じる回帰処理がありません');

for (const file of htmlFiles) {
  const html = read(file);
  expect(html.includes('id="global-navigation"'), `${file}: 初期HTMLに共通navがありません`);
  expect(html.includes('フレンド掲示板'), `${file}: 初期HTMLの共通navが不完全です`);
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  expect((header.match(/href="\/friends\/"/g) || []).length === 1, `${file}: ヘッダーのフレンド掲示板が重複しています`);
  expect(!/href="\/friends\/" class="mobile-only-nav-link"/.test(header), `${file}: フレンド掲示板がPCで非表示です`);
}
for (const [route, label] of [['normal-guide', '通常ステージ'], ['zombie-rush', 'ゾンビラッシュ'], ['boss-rally', 'ボスラリー'], ['badge-dojo', 'バッジ道場']]) {
  const header = read(`${route}/index.html`).match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  expect(header.includes(`href="/${route}/" class="mobile-only-nav-link" aria-current="page">${label}</a>`), `${route}: スマホ攻略リンクのactive表示がありません`);
  expect(header.includes('href="/guides/" class="desktop-only-nav-link" aria-current="page">攻略ハブ</a>'), `${route}: PC攻略ハブのactive表示がありません`);
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
expect(updatePreviewHtml.includes('2026年8月26日 実装済み・詳細確認中'), '8/26アップデートページに公開後ステータスがありません');
expect(updatePreviewHtml.includes('公式ゲーム内') && updatePreviewHtml.includes('公式X投稿'), '8/26アップデートページに公式情報源の表示がありません');
expect(updatePreviewHtml.includes('ゾンビラッシュ専用スキル') && updatePreviewHtml.includes('通常スキルではありません'), '専用スキルと通常スキルの区別が不足しています');
expect((updatePreviewHtml.match(/class="zr-balance-card"/g) || []).length === 35, '専用スキル調整カードが35体ではありません');
expect(updatePreviewHtml.includes('160%') && updatePreviewHtml.includes('230%') && updatePreviewHtml.includes('火焔爆裂'), 'トラーニー火焔爆裂の公式値が不足しています');
expect(seasonOne.meta?.status === 'implemented-details-verifying' && seasonOne.meta?.scope === 'zombie-rush-only', 'Season 1データの公開後状態・範囲が不正です');
expect((seasonOne.tataSkillBalance || []).length === 35, 'Season 1専用スキル対象が35体ではありません');
expect(read('zombie-rush/index.html').includes('旧環境Tier') && read('zombie-rush/index.html').includes('Season 1実戦Tier'), 'ゾンビラッシュの新旧Tier分離がありません');
expect(read('tata-tier/index.html').includes('この予定変更だけを理由に総合Tier・通常・道場・ボスラリー評価は変更しません'), '総合Tierに専用調整の注意がありません');
expect(read('search/search.js').includes("href:'/updates/2026-08-26/'"), 'サイト内検索に8/26アップデート予定がありません');
expect(topHtml.includes('data-official-x') && topHtml.includes('data-x-feed') && topHtml.includes('https://x.com/monsaba_jp') && topHtml.includes('/official-x.js'), 'TOPの公式Xセクションが不足しています');
const xScript = read('official-x.js');
const officialXApi = read('api/official-x.js');
const officialXCore = read('lib/official-x-core.js');
expect(xScript.includes('IntersectionObserver') && xScript.includes("fetch('/api/official-x'"), '公式X APIの遅延読込が不足しています');
expect(xScript.includes("text.textContent = post.text") && xScript.includes("link.textContent = 'Xで投稿を見る'"), '公式X投稿カードの安全な描画が不足しています');
expect(!xScript.includes('widgets.js') && !topHtml.includes('twitter-timeline'), '不安定なX Timeline Widgetが残っています');
expect(officialXCore.includes('/2/users/${userId}/tweets') && officialXCore.includes("'replies,retweets'") && officialXCore.includes('postCount: 5'), '公式X APIの取得条件が不正です');
expect(officialXApi.includes('process.env.X_API_BEARER_TOKEN') && officialXApi.includes('process.env.X_OFFICIAL_USER_ID'), '公式X APIのサーバー環境変数が不足しています');
expect(officialXApi.includes('Vercel-CDN-Cache-Control') && officialXCore.includes('cacheSeconds: 60 * 60'), '公式X APIのVercel cacheが不足しています');
expect(!topHtml.includes('X_API_BEARER_TOKEN') && !xScript.includes('X_API_BEARER_TOKEN'), 'X API秘密値名をブラウザへ露出しています');
expect(read('privacy/index.html').includes('当サイトのサーバーからX APIへ問い合わせ') && read('privacy/index.html').includes('認証情報を閲覧者のブラウザへ送ることはありません'), 'PrivacyのX API説明が不足しています');

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
for (const route of ['/beginner-guide/', '/friends/', '/about/', '/guides/', '/faq/', '/updates/', '/updates/2026-08-26/', '/privacy/', '/about-data/']) expect(sitemap.includes(`${BASE_URL}${route}`), `sitemap.xml に ${route} がありません`);
expect(!sitemap.includes(`${BASE_URL}/search/`), 'noindexの検索ページをsitemapへ含めないでください');
expect(!sitemap.includes(`${BASE_URL}/compare/`), 'noindexの比較ページをsitemapへ含めないでください');
expect(!sitemap.includes('/404'), 'sitemap.xml に404が含まれています');
expect((sitemap.match(/<loc>/g) || []).length === (sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\+09:00)?<\/lastmod>/g) || []).length, 'sitemap.xmlの全URLに有効なlastmodが必要です');
expect(read('robots.txt').includes(`Sitemap: ${BASE_URL}/sitemap.xml`), 'robots.txt のSitemap URLが不正');

const expectedSlots = ['article_after_summary', 'article_mid', 'article_bottom', 'tata_mid', 'beginner_mid', 'affiliate_top', 'affiliate_mid', 'affiliate_bottom', 'affiliate_floating'];
expect(monetization.adsEnabled === false, 'monetization: adsEnabled は false を維持してください');
expect(monetization.affiliateEnabled === true, 'monetization: affiliateEnabled は true を維持してください');
expect(expectedSlots.every((slot) => monetization.slots?.includes(slot)), 'monetization: 固定slot IDが不足しています');
expect(monetization.affiliateDensity === 'low', 'monetization: affiliateDensity は審査前の low を維持してください');
expect(monetization.stickyAffiliateEnabled === false && monetization.slideAffiliateEnabled === false && monetization.bottomAffiliateEnabled === false, 'monetization: 審査前は固定affiliateを停止してください');
expect(monetization.slideAffiliateSide === 'right' && monetization.slideAffiliateDelaySeconds === 10, 'monetization: 右slideまたはdelayが不正です');
expect(monetization.bottomAffiliateDelaySeconds === 7 && monetization.floatingAffiliateSessionLimit === 1, 'monetization: bottom delayまたはsession上限が不正です');
expect(monetization.desktopRailAffiliateEnabled === false && monetization.desktopRailAffiliateMinWidth >= 1600, 'monetization: desktop railは審査前OFF・安全幅設定維持が必要です');
expect(!publicFiles.map(read).join('\n').match(/adsbygoogle|doubleclick\.net|googlesyndication/i), '未承認の通常広告が混入しています');
const matchesAffiliatePath = (pattern, route) => pattern.endsWith('*') ? route.startsWith(pattern.slice(0, -1)) : route === pattern;
const routeForHtmlFile = (file) => file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
const affiliateEligibleFiles = htmlFiles.filter((file) => monetization.pageProfiles?.some((rule) => matchesAffiliatePath(rule.match, routeForHtmlFile(file))));
expect(affiliateEligibleFiles.length === 79, `affiliate対象ページ数: ${affiliateEligibleFiles.length}`);
for (const file of affiliateEligibleFiles) expect(read(file).includes('/monetization.js'), `${file}: monetization.jsがありません`);
for (const route of ['/privacy/', '/about/', '/about-data/', '/updates/', '/search/', '/consult/', '/faq/']) {
  expect(!monetization.pageProfiles?.some((rule) => matchesAffiliatePath(rule.match, route)), `affiliate非対象ページ ${route} が有効です`);
}
expect(read('monetization.js').includes("link.rel = 'sponsored nofollow noopener'"), 'affiliate rel生成が不正です');
expect(read('monetization.js').includes("aria-label', '広告を閉じる'"), '固定広告のclose UIがありません');
expect(read('monetization.js').includes('SESSION_COUNT_KEY') && read('monetization.js').includes('sessionCanShow'), '固定広告のsession制御がありません');
expect(read('monetization.js').includes("'.site-header.nav-open") && read('monetization.js').includes('document.activeElement'), '固定広告の操作中抑止がありません');
expect(read('styles.css').includes('safe-area-inset-bottom') && read('styles.css').includes('translate(110%,-50%)') && read('styles.css').includes('translate(-50%,110%)'), '固定広告のsafe areaまたはslide animationが不足しています');
expect(read('growth.js').includes("'affiliate_impression'") && read('growth.js').includes('intersectionRatio < 0.5'), 'affiliate impression計測が不足しています');
expect(fs.existsSync(path.join(root, 'docs/ad-placement-audit.md')) && read('docs/ad-placement-audit.md').includes('A8表示ページ数: 4'), '審査前の広告配置監査が未生成です');
expect(fs.existsSync(path.join(root, 'docs/a8-ad-url-submission.csv')), 'A8追加URL提出CSVがありません');
const a8Offers = [
  ['s00000025908001', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 'https://www28.a8.net/svt/bgt?aid=260824371058&wid=002&eno=01&mid=s00000025908001003000&mc=1', 'https://www16.a8.net/0.gif?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 300, 250],
  ['s00000018660003', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 'https://www25.a8.net/svt/bgt?aid=260824371056&wid=002&eno=01&mid=s00000018660003012000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 468, 60],
  ['s00000013554002', 'https://px.a8.net/svt/ejp?a8mat=4BADDF+1JU+2WL0+CN8W1', 'https://www21.a8.net/svt/bgt?aid=260824371000&wid=002&eno=01&mid=s00000013554002124000&mc=1', 'https://www18.a8.net/0.gif?a8mat=4BADDF+1JU+2WL0+CN8W1', 120, 600],
  ['s00000018951001', 'https://px.a8.net/svt/ejp?a8mat=4BADDE+G8NPLM+4286+62U35', 'https://www21.a8.net/svt/bgt?aid=260824370982&wid=002&eno=01&mid=s00000018951001021000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDE+G8NPLM+4286+62U35', 250, 250]
];
for (const [programId, href, banner, tracking, width, height] of a8Offers) {
  const offer = affiliateOffers.offers?.find((item) => item.trackingId === programId);
  expect(Boolean(offer), `A8 program ID ${programId} がありません`);
  expect(offer?.destination === href, `A8リンクURL ${programId} が不正です`);
  expect(offer?.mediaSource === banner, `A8バナーURL ${programId} が不正です`);
  expect(offer?.trackingPixel === tracking, `A8計測タグ ${programId} が不正です`);
  expect(offer?.width === width && offer?.height === height, `A8画像寸法 ${programId} が不正です`);
}
expect(read('monetization.js').includes("pixel.width = 1") && read('monetization.js').includes("pixel.height = 1"), 'A8 1x1計測画像の生成処理が不足しています');
expect(read('site.js').includes('当サイトはアフィリエイト広告を利用しています。'), '共通footerのaffiliate開示がありません');
expect(siteJs.includes("(max-width: 820px) and (pointer: coarse)") && siteJs.includes('navigator.maxTouchPoints > 0'), 'Pull to Refreshのスマホ限定条件がありません');
expect(siteJs.includes('const PULL_THRESHOLD = 72') && siteJs.includes("pullReady = deltaY >= PULL_THRESHOLD"), 'Pull to Refreshの72px閾値がありません');
expect(siteJs.includes('引っ張って更新') && siteJs.includes('離して更新') && siteJs.includes('location.reload()'), 'Pull to Refreshの表示文言または更新処理がありません');
expect(siteJs.includes("{ passive: false }") && siteJs.includes('event.preventDefault()') && siteJs.includes('absoluteY > absoluteX * 1.25'), 'Pull to Refreshの標準更新・横スワイプ競合対策がありません');
expect(siteJs.includes("header.classList.contains('nav-open')") && siteJs.includes("target.closest('.floating-affiliate')") && siteJs.includes("target.closest('form,input,textarea,select,option,button"), 'Pull to Refreshの操作中抑止条件が不足しています');
expect(siteJs.includes('window.scrollY <= 0') && siteJs.includes('pullReloading'), 'Pull to Refreshの最上部限定または二重更新防止がありません');
expect(stylesCss.includes('safe-area-inset-top') && stylesCss.includes('max-width:calc(100vw - 24px)') && stylesCss.includes('overscroll-behavior-y:none'), 'Pull to Refreshのsafe-area・横幅・標準更新競合対策がありません');
expect(stylesCss.includes('@media(prefers-reduced-motion:reduce){.pull-to-refresh'), 'Pull to Refreshのreduced-motion対応がありません');
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
