import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/summer-party.json'), 'utf8'));
const fail = (message) => { throw new Error(message); };
const expect = (condition, message) => { if (!condition) fail(message); };
const routes = ['/events/summer-party/', '/en/events/summer-party/', '/zh-cn/events/summer-party/'];
const cards = data.album.sets.flatMap((set) => set.cards);

expect(data.officialDisplayName === 'サマーパーティ', 'official event display must be サマーパーティ');
expect(data.album.setCount === 15 && data.album.sets.length === 15, '15 sets required');
for (const set of data.album.sets) expect(set.cards.length === 9, `${set.name}: nine cards required`);
expect(data.album.totalSlots === 135 && cards.length === 135, '135 card slots required');
expect(cards.map((card) => card.cardNo).every((value, index) => value === index + 1), 'card numbers must be contiguous 1-135');
expect(cards.filter((card) => card.name === null).every((card) => card.status === 'pending'), 'hidden names must remain pending');
expect(!JSON.stringify(data).includes('114/135'), 'personal progress must not be stored');
expect(data.packs.length === 4, 'four pack types required');
for (const pack of data.packs) {
  const total = Object.values(pack.probabilities).reduce((sum, value) => sum + value, 0);
  expect(Math.abs(total - 100) < 1e-9, `${pack.id}: probabilities must total 100`);
}
expect(data.packs.find((pack) => pack.id === 'premium')?.cardCount === 4, 'premium must contain four cards');
expect(data.packs.find((pack) => pack.id === 'premium')?.guarantee === 'one_3_star_or_higher', 'premium guarantee missing');
expect(data.packs.find((pack) => pack.id === 'deluxe')?.cardCount === 5, 'deluxe must contain five cards');
expect(data.packs.find((pack) => pack.id === 'deluxe')?.guarantee === 'one_unowned_or_one_gold_if_all_owned', 'deluxe guarantee missing');
expect(data.collection.loaderPriceMarbles === 100 && data.collection.unusedLoadersCarryOver === true, 'Card Loader rules missing');

for (const route of routes) {
  const html = fs.readFileSync(path.join(root, route.slice(1), 'index.html'), 'utf8');
  expect(html.includes(`rel="canonical" href="https://monster-survival.com${route}"`), `${route}: self canonical missing`);
  for (const lang of ['ja', 'en', 'zh-Hans', 'x-default']) expect(html.includes(`hreflang="${lang}"`), `${route}: ${lang} hreflang missing`);
  expect(html.includes('dateModified":"2026-08-31"'), `${route}: dateModified missing`);
  expect(html.includes('Card Loader') && html.includes('Memory Gallery'), `${route}: Card Collection terms missing`);
  expect(!html.includes('114/135'), `${route}: personal progress leaked`);
  expect(!html.includes('金カードは交換できません'), `${route}: obsolete gold-card rule present`);
}

const redirects = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects;
for (const [source, destination] of [['/events/card-album/', '/events/summer-party/'], ['/en/events/card-album/', '/en/events/summer-party/'], ['/zh-cn/events/card-album/', '/zh-cn/events/summer-party/']]) {
  expect(redirects.some((redirect) => redirect.source === source && redirect.destination === destination && redirect.permanent === true), `${source}: permanent redirect missing`);
}

console.log(`Summer Party validation passed: ${data.album.sets.length} sets, ${cards.length} slots, ${data.packs.length} packs, 3 locales.`);
