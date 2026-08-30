import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/summer-party.json'), 'utf8'));
const readRoute = (route) => fs.readFileSync(path.join(root, route.slice(1), 'index.html'), 'utf8');
const walkHtml = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walkHtml(target) : entry.name.endsWith('.html') ? [target] : [];
});

test('Summer Party album has 15 sets, nine cards per set and 135 slots', () => {
  assert.equal(data.officialDisplayName, 'サマーパーティ');
  assert.equal(data.album.sets.length, 15);
  assert.ok(data.album.sets.every((set) => set.cards.length === 9));
  assert.equal(data.album.sets.flatMap((set) => set.cards).length, 135);
});

test('hidden card names remain null and account-specific fields are excluded', () => {
  const cards = data.album.sets.flatMap((set) => set.cards);
  assert.ok(cards.some((card) => card.name === null));
  assert.ok(cards.filter((card) => card.name === null).every((card) => card.status === 'pending'));
  assert.equal(JSON.stringify(data).includes('114/135'), false);
  assert.ok(data.privacy.excludedPersonalFields.includes('duplicateCounts'));
});

test('pack counts, guarantees and displayed probabilities match in-game evidence', () => {
  assert.deepEqual(data.packs.map((pack) => pack.cardCount), [2, 3, 4, 5]);
  assert.equal(data.packs[2].guarantee, 'one_3_star_or_higher');
  assert.equal(data.packs[3].guarantee, 'one_unowned_or_one_gold_if_all_owned');
  for (const pack of data.packs) assert.equal(Object.values(pack.probabilities).reduce((sum, value) => sum + value, 0), 100);
});

test('exchange, Stars and Card Collection rules appear in all locales', () => {
  const routes = [
    ['/events/summer-party/', /スター/, /カードローダー/, /思い出ギャラリー/],
    ['/en/events/summer-party/', /Star/, /Card Loader/, /Memory Gallery/],
    ['/zh-cn/events/summer-party/', /Stars/, /Card Loader/, /Memory Gallery/]
  ];
  for (const [route, star, loader, gallery] of routes) {
    const html = readRoute(route);
    assert.match(html, /special periods|特定の時期|特定时期/);
    assert.match(html, star);
    assert.match(html, loader);
    assert.match(html, gallery);
    assert.doesNotMatch(html, /金カードは交換できません/);
  }
});

test('SEO points to the new canonical routes and old routes redirect permanently', () => {
  for (const route of ['/events/summer-party/', '/en/events/summer-party/', '/zh-cn/events/summer-party/']) {
    const html = readRoute(route);
    assert.ok(html.includes(`rel="canonical" href="https://monster-survival.com${route}"`));
    assert.ok(html.includes('hreflang="ja"'));
    assert.ok(html.includes('hreflang="en"'));
    assert.ok(html.includes('hreflang="zh-Hans"'));
    assert.ok(html.includes('dateModified":"2026-08-31"'));
  }
  const redirects = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects;
  assert.equal(redirects.filter((redirect) => redirect.destination.endsWith('/events/summer-party/') && redirect.permanent).length, 3);
});

test('site search includes every requested Summer Party alias', () => {
  const search = fs.readFileSync(path.join(root, 'search/search.js'), 'utf8');
  for (const alias of ['サマーパーティ', 'カードアルバム', 'アルバム', 'カードコレクション', 'カードローダー', 'カード交換', 'カードパック', 'Summer Bash']) assert.ok(search.includes(alias));
});

test('localized Summer Party summary labels do not repeat their counts', () => {
  const ja = readRoute('/events/summer-party/');
  const en = readRoute('/en/events/summer-party/');
  const zh = readRoute('/zh-cn/events/summer-party/');

  assert.match(ja, /<strong>4<\/strong><span>カードパック種類<\/span>/);
  assert.doesNotMatch(ja, /<strong>4<\/strong><span>カードパック4種類<\/span>/);
  assert.match(en, /<strong>4<\/strong><span>Card pack types<\/span>/);
  assert.doesNotMatch(en, /<strong>4<\/strong><span>Four card pack types<\/span>/);
  assert.match(zh, /<strong>4<\/strong><span>卡包种类<\/span>/);
  assert.doesNotMatch(zh, /<strong>4<\/strong><span>4种卡包<\/span>/);
});

test('localized Summer Party copy, pending label, footer and Chinese skip link are correct', () => {
  const ja = readRoute('/events/summer-party/');
  const en = readRoute('/en/events/summer-party/');
  const zh = readRoute('/zh-cn/events/summer-party/');

  assert.match(ja, /カードセット・カードパック・交換・スター・セット報酬/);
  assert.match(ja, /カードローダー・思い出ギャラリー・装飾カード/);
  assert.doesNotMatch(ja, /Card sets · Card packs · Exchange · Stars · Set rewards/);
  assert.doesNotMatch(ja, /Card Loader · Memory Gallery · Decorated cards/);
  assert.match(ja, /カード名21件確認中/);
  assert.match(en, /21 card names pending/);
  assert.match(zh, /21 个卡名待确认/);
  assert.match(en, /<div class="footer-meta">64 families \/ 230 Tatari<\/div>/);
  assert.match(zh, /<div class="footer-meta">64 个系列 \/ 230 个 Tatari<\/div>/);
  assert.match(zh, />跳到正文<\/a>/);
  assert.doesNotMatch(zh, />Skip to content<\/a>/);
});

test('no generated English or Chinese page has a search label in footer metadata', () => {
  for (const file of walkHtml(path.join(root, 'en'))) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /<div class="footer-meta">Site search<\/div>/, file);
  }
  for (const file of walkHtml(path.join(root, 'zh-cn'))) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /<div class="footer-meta">站内搜索<\/div>/, file);
    assert.doesNotMatch(html, />Skip to content<\/a>/, file);
  }
});
