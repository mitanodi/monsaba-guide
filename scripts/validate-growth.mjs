import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const read = (file) => {
  const target = path.join(root, file);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(target, 'utf8'); }
    catch (error) { if (error.code !== 'EBUSY' || attempt === 11) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40); }
  }
};
const json = (file) => JSON.parse(read(file));
const ignored = new Set(['.git', '.github', '.vercel', '.agents', 'node_modules', 'assets', 'data', 'scripts', 'promo']);
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [path.relative(root, full).replaceAll('\\', '/')] : [];
  });
}
const routeFor = (file) => file === 'index.html' ? '/' : file === '404.html' ? '/404/' : `/${path.posix.dirname(file)}/`;
const htmlFiles = walk(root);
const routeFiles = new Map(htmlFiles.map((file) => [routeFor(file), file]));
const indexable = new Set();
const inbound = new Map([...routeFiles.keys()].map((route) => [route, 0]));
const canonicalOwners = new Map();

for (const file of htmlFiles) {
  const html = read(file);
  const route = routeFor(file);
  expect(html.includes('/growth.js'), `${file}: growth.jsがありません`);
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  if (!noindex && route !== '/404/') indexable.add(route);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (route !== '/404/') {
    expect(Boolean(canonical), `${file}: canonicalがありません`);
    expect(!canonical?.includes('?') && !canonical?.includes('#'), `${file}: canonicalにquery/hashがあります`);
    expect(!canonicalOwners.has(canonical), `${file}: canonicalが${canonicalOwners.get(canonical)}と重複しています`);
    canonicalOwners.set(canonical, file);
  }
  expect((html.match(/<title>/g) || []).length === 1, `${file}: titleが一意ではありません`);
  expect((html.match(/<meta name="description"/g) || []).length === 1, `${file}: descriptionが一意ではありません`);
  if (route !== '/404/') {
    for (const field of ['og:title', 'og:description', 'og:url']) expect(html.includes(`property="${field}"`), `${file}: ${field}がありません`);
    expect(html.includes('name="twitter:card"'), `${file}: Twitter/X metadataがありません`);
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${file}: JSON-LD parse error ${error.message}`); }
  }
  for (const match of html.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const href = match[1];
    const target = href === '/' ? '/' : href.endsWith('/') ? href : null;
    if (target && inbound.has(target) && target !== route) inbound.set(target, inbound.get(target) + 1);
  }
}

for (const route of indexable) if (route !== '/') expect(inbound.get(route) > 0, `孤立ページ: ${route}`);
expect(read('compare/index.html').includes('content="noindex,follow"'), 'compare: noindex,followがありません');
expect(!read('sitemap.xml').includes('https://monster-survival.com/compare/'), 'compare: sitemapへ含まれています');
expect(read('search/index.html').includes('content="noindex,follow"'), 'search: noindex,followがありません');
expect(!read('sitemap.xml').includes('https://monster-survival.com/search/'), 'search: sitemapへ含まれています');
expect(read('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage structured dataがありません');
expect(read('guides/index.html').includes('"@type":"ItemList"'), '攻略ハブのItemListがありません');

// ブランド検索でトップと更新履歴の役割が逆転しないためのSEO regression。
const homeHtml = read('index.html');
const updatesHtml = read('updates/index.html');
const extractJsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const homeGraph = extractJsonLd(homeHtml).flatMap((value) => value['@graph'] || [value]);
const updatesGraph = extractJsonLd(updatesHtml).flatMap((value) => value['@graph'] || [value]);
const websiteSchema = homeGraph.find((node) => node['@type'] === 'WebSite');
const homePageSchema = homeGraph.find((node) => node['@type'] === 'WebPage');
const updatesPageSchema = updatesGraph.find((node) => node['@type'] === 'WebPage');
const homeTitle = 'モンサバ攻略DB｜タタ図鑑・Tier・進化・スキル一覧';
expect(homeHtml.includes(`<title>${homeTitle}</title>`), 'トップ: titleのブランド名・ページ役割が不正です');
expect(homeHtml.includes(`<meta property="og:title" content="${homeTitle}"`), 'トップ: og:titleがtitleと一致しません');
expect(homeHtml.includes('<link rel="canonical" href="https://monster-survival.com/"'), 'トップ: 自己canonicalが不正です');
expect(homeHtml.includes(`<h1>${homeTitle}</h1>`), 'トップ: H1からサイト代表ページだと判別できません');
expect(homeHtml.includes('<meta property="og:site_name" content="モンサバ攻略DB"'), 'トップ: og:site_nameが不正です');
expect(homeHtml.includes('<a class="brand" href="/" aria-label="モンサバ攻略DB トップ"'), 'トップ: ブランドリンクが不正です');
expect(websiteSchema?.name === 'モンサバ攻略DB', 'トップ: WebSite nameはサイト名だけにしてください');
expect(websiteSchema?.alternateName === 'モンサバ攻略', 'トップ: WebSite alternateNameが不正です');
expect(websiteSchema?.url === 'https://monster-survival.com/', 'トップ: WebSite urlが不正です');
expect(homePageSchema?.name === homeTitle, 'トップ: WebPage nameがページtitleと一致しません');
expect(homePageSchema?.isPartOf?.['@id'] === websiteSchema?.['@id'], 'トップ: WebPageとWebSiteの関連付けが不正です');
expect((homeGraph.filter((node) => node['@type'] === 'WebSite')).length === 1, 'トップ: WebSite schemaは1件だけにしてください');
expect(updatesHtml.includes('<title>更新履歴｜モンサバ攻略DB</title>'), '更新履歴: titleのページ役割が不正です');
expect(updatesHtml.includes('<h1>更新履歴</h1>'), '更新履歴: H1はページ役割を主役にしてください');
expect(updatesHtml.includes('<link rel="canonical" href="https://monster-survival.com/updates/"'), '更新履歴: 自己canonicalが不正です');
expect(!/<meta name="robots" content="[^"]*noindex/i.test(updatesHtml), '更新履歴: indexableを維持してください');
expect(updatesPageSchema?.name === '更新履歴｜モンサバ攻略DB', '更新履歴: WebPage nameが不正です');
const sitemap = read('sitemap.xml');
expect(sitemap.includes('<loc>https://monster-survival.com/</loc>'), 'sitemap: トップがありません');
expect(sitemap.includes('<loc>https://monster-survival.com/updates/</loc>'), 'sitemap: 更新履歴がありません');

// 公式XはTimeline Widgetではなく、サーバー側X APIから実投稿を描画する。
const officialXScript = read('official-x.js');
const officialXApi = read('api/official-x.js');
const officialXCore = read('lib/official-x-core.js');
expect(homeHtml.includes('href="https://x.com/monsaba_jp"'), '公式X: アカウントURLが不正です');
expect(homeHtml.includes('X公式投稿・公式一次情報') && homeHtml.includes('当サイトによる整理記事・更新履歴'), '公式X: 一次情報とサイト記事の区別が不足しています');
expect(homeHtml.includes('公式Xの投稿を表示できません。') && homeHtml.includes('公式Xで最新情報を見る'), '公式X: 明示的fallbackがありません');
expect(officialXScript.includes("fetch('/api/official-x'") && officialXScript.includes('createPost(post)'), '公式X: API投稿カード描画が不足しています');
expect(officialXScript.includes("text.textContent = post.text") && !officialXScript.includes('innerHTML'), '公式X: 投稿本文は改変・HTML解釈せず描画してください');
expect(officialXCore.includes('/2/users/${userId}/tweets') && officialXCore.includes("timelineUrl.searchParams.set('max_results', String(OFFICIAL_X_CONFIG.postCount))"), '公式X: API endpoint・件数が不正です');
expect(officialXCore.includes("timelineUrl.searchParams.set('exclude', 'replies,retweets')"), '公式X: replies/reposts除外がありません');
expect(officialXApi.includes('Vercel-CDN-Cache-Control') && officialXCore.includes('cacheSeconds: 60 * 60'), '公式X: 1時間cacheがありません');
expect(!homeHtml.includes('X_API_BEARER_TOKEN') && !officialXScript.includes('X_API_BEARER_TOKEN'), '公式X: Bearer Tokenをブラウザへ露出しています');
expect(officialXScript.includes('IntersectionObserver'), '公式X: 遅延読み込みを維持してください');

const growthConfig = json('data/growth-config.json');
const requiredEvents = ['page_view', 'nav_click', 'internal_link_click', 'related_content_click', 'site_search', 'search_result_click', 'filter_use', 'tata_compare_start', 'tata_compare_view', 'external_link_click', 'affiliate_click', 'affiliate_impression', 'ad_click', 'cta_click'];
expect(growthConfig.analytics?.automaticPageView === true, 'Analyticsの自動page_view設定がありません');
expect(requiredEvents.every((event) => growthConfig.analytics?.events?.includes(event)), 'Analyticsイベント定義が不足しています');
const growthScript = read('growth.js');
for (const event of requiredEvents.filter((event) => event !== 'page_view')) expect(growthScript.includes(`'${event}'`), `growth.js: ${event}がありません`);
expect(!growthScript.includes('query_text') && !growthScript.includes('search_term'), '検索入力文字列を送信するプロパティは禁止です');

const freshness = json('data/page-freshness.json');
const freshnessKeys = Object.keys(freshness.routes || {});
const isCovered = (route) => freshnessKeys.some((key) => key === route || (key.endsWith('*') && route.startsWith(key.slice(0, -1))));
for (const route of indexable) expect(isCovered(route), `${route}: freshness管理がありません`);
for (const [route, override] of Object.entries(freshness.routes || {})) {
  const value = { ...freshness.default, ...override };
  for (const field of ['published', 'verified']) expect(/^\d{4}-\d{2}-\d{2}$/.test(value[field] || ''), `${route}: ${field}が不正です`);
  expect(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\+09:00)?$/.test(value.updated || ''), `${route}: updatedが不正です`);
}

const monetization = json('data/monetization.json');
const offers = json('data/affiliate-offers.json').offers || [];
expect(monetization.adsEnabled === false && monetization.affiliateEnabled === true, '既存の収益化flagを維持してください');
expect(monetization.affiliateDensity === 'low' && monetization.floatingAffiliateSessionLimit === 1, 'affiliate密度またはsession上限が不正です');
expect(monetization.stickyAffiliateEnabled === false && monetization.slideAffiliateEnabled === false && monetization.bottomAffiliateEnabled === false && monetization.desktopRailAffiliateEnabled === false, '審査前の固定affiliate停止設定が不正です');
expect(new Set(offers.map((offer) => offer.id)).size === offers.length, 'affiliate offer idが重複しています');
const matchesTarget = (pattern, route) => pattern.endsWith('*') ? route.startsWith(pattern.slice(0, -1)) : route === pattern;
for (const offer of offers) {
  for (const field of ['id', 'name', 'destination', 'targetPages', 'start', 'disclosure', 'enabled', 'trackingId', 'placementId', 'mediaSource', 'trackingPixel']) expect(offer[field] !== undefined && offer[field] !== '', `${offer.id || 'offer'}: ${field}がありません`);
  expect(/^https:\/\//.test(offer.destination) && /^https:\/\//.test(offer.mediaSource) && /^https:\/\//.test(offer.trackingPixel), `${offer.id}: URLがHTTPSではありません`);
  if (offer.end) expect(offer.start <= offer.end, `${offer.id}: 掲載期間が逆転しています`);
  for (const pattern of offer.targetPages || []) {
    const matchedRoutes = [...routeFiles.keys()].filter((route) => matchesTarget(pattern, route));
    expect(matchedRoutes.length > 0, `${offer.id}: target page ${pattern}がありません`);
    for (const route of matchedRoutes) expect(read(routeFiles.get(route)).includes('/monetization.js'), `${offer.id}: ${route}にmonetization.jsがありません`);
  }
}
expect(read('monetization.js').includes("rel = 'sponsored nofollow noopener'"), 'affiliateリンクのrelが不足しています');
expect(read('monetization.js').includes('createAdSlot'), '共通AdSlotがありません');

if (errors.length) {
  console.error(`Growth検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Growth検証成功: ${htmlFiles.length} HTML / indexable ${indexable.size} / orphan 0 / metadata・schema・analytics・freshness・affiliate正常`);
