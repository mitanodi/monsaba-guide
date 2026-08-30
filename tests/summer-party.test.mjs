import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/summer-party.json'), 'utf8'));
const readRoute = (route) => fs.readFileSync(path.join(root, route.slice(1), 'index.html'), 'utf8');

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
  for (const route of ['/events/summer-party/', '/en/events/summer-party/', '/zh-cn/events/summer-party/']) {
    const html = readRoute(route);
    assert.match(html, /special periods|特定の時期|特定时期/);
    assert.match(html, /Star/);
    assert.match(html, /Card Loader/);
    assert.match(html, /Memory Gallery/);
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
  for (const alias of ['サマーパーティ', 'カードアルバム', 'アルバム', 'カードコレクション', 'カードローダー', 'カード交換', 'カードパック']) assert.ok(search.includes(alias));
});
