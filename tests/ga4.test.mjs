import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const measurementId = 'G-PTV8TYNYMR';
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo']);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

function walkHtml(directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.name.endsWith('.html') ? [path.relative(root, full).replaceAll('\\', '/')] : [];
  });
}

const count = (text, pattern) => [...text.matchAll(pattern)].length;

test('GA4 Measurement IDを共通生成元で一元管理する', () => {
  const generator = read('scripts/update-ga4-tag.mjs');
  assert.match(generator, /GA4_MEASUREMENT_ID = 'G-PTV8TYNYMR'/);
  assert.match(generator, /monsaba-ga4:start/);
  assert.equal(json('data/growth-config.json').analytics.ga4MeasurementId, measurementId);
  assert.match(read('package.json'), /"generate:ga4": "node scripts\/update-ga4-tag\.mjs"/);
});

test('全HTMLにGoogle tag loaderとconfigが各1個だけある', () => {
  const htmlFiles = walkHtml();
  assert.ok(htmlFiles.length >= 100);
  for (const file of htmlFiles) {
    const html = read(file);
    assert.equal(count(html, /googletagmanager\.com\/gtag\/js\?id=G-PTV8TYNYMR/g), 1, `${file}: loader`);
    assert.equal(count(html, /gtag\('config', 'G-PTV8TYNYMR'/g), 1, `${file}: config`);
    assert.equal(count(html, /<!-- monsaba-ga4:start -->/g), 1, `${file}: start marker`);
    assert.equal(count(html, /<!-- monsaba-ga4:end -->/g), 1, `${file}: end marker`);
  }
});

test('主要ページでもGA4 tagを1個だけ読み込む', () => {
  for (const file of ['index.html', 'board/index.html', 'board/thread/index.html', 'friends/index.html', 'search/index.html', 'tata-tier/index.html', 'privacy/index.html']) {
    const html = read(file);
    assert.equal(count(html, /data-monsaba-ga4="loader"/g), 1, file);
    assert.equal(count(html, /data-monsaba-ga4="config"/g), 1, file);
  }
});

test('Google tagはasyncで描画をブロックしない', () => {
  for (const file of walkHtml()) assert.match(read(file), /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-PTV8TYNYMR"/);
});

test('page_viewはconfigによる自動送信だけでhistory listenerを追加しない', () => {
  const generator = read('scripts/update-ga4-tag.mjs');
  const growth = read('growth.js');
  assert.equal(count(generator, /gtag\('config'/g), 1);
  assert.doesNotMatch(generator + growth, /gtag\(['"]event['"]\s*,\s*['"]page_view['"]/);
  assert.doesNotMatch(generator + growth, /pushState|popstate|hashchange/);
});

test('GA4のpage locationとreferrerからquery・fragmentを除外する', () => {
  const generator = read('scripts/update-ga4-tag.mjs');
  assert.match(generator, /return url\.origin \+ url\.pathname/);
  assert.match(generator, /page_location: monsabaPageLocation/);
  assert.match(generator, /page_referrer: monsabaPageReferrer/);
  assert.match(read('growth.js'), /ga4Safe\.page_location = `\$\{location\.origin\}\$\{location\.pathname\}`/);
  assert.ok(generator.indexOf('protectPrivateSearchParameters') < generator.indexOf('googletagmanager.com/gtag/js'));
  assert.match(generator, /\['q', 's', 'search', 'query', 'keyword'\]/);
  assert.match(generator, /history\.replaceState/);
});

test('GA4 custom eventsはイベント別allowlist以外のpropertyを送らない', () => {
  const growth = read('growth.js');
  const block = growth.slice(growth.indexOf('const ga4AllowedProperties'), growth.indexOf('const safeValue'));
  for (const forbidden of ['title', 'content', 'name', 'uid', 'tata_name', 'query', 'search_term', 'thread_id', 'post_id', 'parent_answer_id', 'ip']) {
    assert.doesNotMatch(block, new RegExp(`['"]${forbidden}['"]`, 'i'), forbidden);
  }
  assert.match(growth, /allowed\.filter\(\(key\) => Object\.hasOwn\(safe, key\)\)/);
});

test('検索イベントは文字数と結果件数だけで検索語を送らない', () => {
  const sources = read('app.js') + read('search/search.js');
  assert.match(sources, /query_length/);
  assert.match(sources, /result_count/);
  assert.match(sources, /__MONSABA_PRIVATE_SEARCH__/);
  assert.doesNotMatch(sources, /searchParams\.set\(['"]q['"]/);
  assert.doesNotMatch(sources, /MONSABA_TRACK[^\n]*(search_term|query_text|query:|search_query)/);
});

test('Board本文・名前・投稿IDをGA4イベントへ送らない', () => {
  const board = read('board/board.js');
  assert.doesNotMatch(board, /track\([^\n]*(title|content|name|thread_id|post_id|parent_answer_id|targetId|search_query)/i);
  assert.doesNotMatch(read('growth.js'), /ga4Safe\.(title|content|name|thread_id|post_id|parent_answer_id)/i);
});

test('UIDとタタ名をcustom eventへ送らない', () => {
  const friends = read('friends/friends.js');
  const site = read('site.js');
  const compare = read('compare/compare.js');
  assert.match(friends, /friend_uid_copy', \{ result:/);
  assert.doesNotMatch(friends, /friend_uid_copy', \{[^}]*\b(uid|username|comment)\s*:/i);
  assert.match(site, /event\('favorite', \{ action:/);
  assert.doesNotMatch(site, /event\('favorite', \{[^}]*\b(familyId|familyName|tata)\s*:/i);
  assert.match(compare, /tata_compare_view', \{ mode, left_attribute: a\.attribute, right_attribute: b\.attribute \}/);
  assert.doesNotMatch(compare, /tata_compare_(?:start|view)', \{[^}]*\b(family|name|stage|tata)\s*:/i);
});

test('既存Vercel Web AnalyticsとSpeed Insightsを維持する', () => {
  const site = read('site.js');
  const growth = read('growth.js');
  assert.match(site, /\/_vercel\/insights\/script\.js/);
  assert.match(site, /\/_vercel\/speed-insights\/script\.js/);
  assert.match(growth, /window\.va\('event', name, safe\)/);
  assert.deepEqual(json('data/growth-config.json').analytics.providers, ['vercel-web-analytics', 'google-analytics-4']);
});

test('PrivacyはGA4利用と非送信情報を正確に説明する', () => {
  const privacy = read('privacy/index.html');
  for (const phrase of ['Google Analytics 4（GA4）を利用しています', 'Google tag', 'ページ閲覧、流入元', 'サイト内検索語・掲示板検索語', 'フレンドUID', 'タタ名', 'クエリ文字列を除外', 'Googleプライバシーポリシー', 'Googleの広告設定']) assert.ok(privacy.includes(phrase), phrase);
  assert.doesNotMatch(privacy, /Google Analyticsは現時点では導入していません/);
});

test('AdSense・ads.txt・Board除外・A8非表示を維持する', () => {
  const adsense = json('data/adsense-config.json');
  assert.equal(adsense.enabled, false);
  assert.equal(adsense.autoAds, false);
  assert.ok(adsense.excludedPages.includes('/board/'));
  assert.ok(adsense.excludedPages.includes('/board/*'));
  assert.equal(read('ads.txt').trim(), 'google.com, pub-2710725734378326, DIRECT, f08c47fec0942fa0');
  assert.doesNotMatch(read('board/index.html') + read('board/thread/index.html'), /monetization\.js|data-affiliate-offer|a8mat|adsbygoogle/i);
});

test('既存security headersを維持しCSPを無関係に拡張しない', () => {
  const vercel = json('vercel.json');
  const headers = JSON.stringify(vercel.headers);
  assert.match(headers, /X-Content-Type-Options/);
  assert.match(headers, /Referrer-Policy/);
  assert.match(headers, /Permissions-Policy/);
  assert.doesNotMatch(headers, /Content-Security-Policy|script-src|connect-src/);
});
