import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
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
expect(read('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage structured dataがありません');
expect(read('guides/index.html').includes('"@type":"ItemList"'), '攻略ハブのItemListがありません');

const growthConfig = json('data/growth-config.json');
const requiredEvents = ['page_view', 'nav_click', 'internal_link_click', 'related_content_click', 'site_search', 'search_result_click', 'filter_use', 'tata_compare_start', 'tata_compare_view', 'external_link_click', 'affiliate_click', 'ad_click', 'cta_click'];
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
  for (const field of ['published', 'updated', 'verified']) expect(/^\d{4}-\d{2}-\d{2}$/.test(value[field] || ''), `${route}: ${field}が不正です`);
}

const monetization = json('data/monetization.json');
const offers = json('data/affiliate-offers.json').offers || [];
expect(monetization.adsEnabled === false && monetization.affiliateEnabled === true, '既存の収益化flagを維持してください');
expect(new Set(offers.map((offer) => offer.id)).size === offers.length, 'affiliate offer idが重複しています');
for (const offer of offers) {
  for (const field of ['id', 'name', 'destination', 'targetPages', 'start', 'disclosure', 'enabled', 'trackingId', 'placementId', 'mediaSource', 'trackingPixel']) expect(offer[field] !== undefined && offer[field] !== '', `${offer.id || 'offer'}: ${field}がありません`);
  expect(/^https:\/\//.test(offer.destination) && /^https:\/\//.test(offer.mediaSource) && /^https:\/\//.test(offer.trackingPixel), `${offer.id}: URLがHTTPSではありません`);
  if (offer.end) expect(offer.start <= offer.end, `${offer.id}: 掲載期間が逆転しています`);
  for (const route of offer.targetPages || []) {
    const file = routeFiles.get(route);
    expect(Boolean(file), `${offer.id}: target page ${route}がありません`);
    if (file) expect(read(file).includes(`data-affiliate-offer="${offer.id}"`), `${offer.id}: ${route}の掲載slotと一致しません`);
  }
}
expect(read('monetization.js').includes("rel = 'sponsored nofollow noopener'"), 'affiliateリンクのrelが不足しています');
expect(read('monetization.js').includes('createAdSlot'), '共通AdSlotがありません');

if (errors.length) {
  console.error(`Growth検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Growth検証成功: ${htmlFiles.length} HTML / indexable ${indexable.size} / orphan 0 / metadata・schema・analytics・freshness・affiliate正常`);
