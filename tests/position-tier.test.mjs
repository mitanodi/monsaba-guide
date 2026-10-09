import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
const root = new URL('../', import.meta.url);
const read = f => fs.readFileSync(new URL(f, root), 'utf8');
const data = JSON.parse(read('data/zombie-rush/position-tiers.json'));
const expected = {
  front: { SS: 'アタタマ コマキリ ガオデン ツヨカニ シズクシ', S: 'フグマル ヒノムシ ヌスケ ヤミノメ ホネギョ', A: 'コワガルー パチルフ コロカメ ヒバイヌ パクマ', B: 'トコペン フクロクモ', HOLD: 'トラーニー エレキネコ' },
  middle: { SS: 'ブラピ', S: 'ヒマワリン ビリモ ヒノムシ マルッシュ フリコー', A: 'クンブー' },
  rear: { SS: 'ヤミノメ コロタマ イルカ シズクジ ヒニャオ', S: 'ウミミ モエミン ナミアシカ', A: 'スケダコ コパンダ トジコモル', B: 'ヒモリ コロコン ボウズヘビ ヤンザル', C: 'ビリジカ ネコオリ フルッグ ヒエビ', HOLD: 'モグリン ネムクラゲ' }
};
test('all 47 image entries preserve source grades and order independently by position', () => {
  assert.equal(data.entries.length, 47);
  for (const [position, tiers] of Object.entries(expected)) {
    for (const [tier, names] of Object.entries(tiers))
      assert.equal(data.entries.filter(e => e.position === position && e.tier === tier).map(e => e.sourceName).join(' '), names);
    const entries = data.entries.filter(e => e.position === position);
    assert.equal(new Set(entries.map(e => e.sourceName)).size, entries.length);
  }
  assert.deepEqual(data.entries.filter(e => e.status === 'name-pending'), []);
  assert.ok(data.entries.every(e => e.familyId));
  assert.deepEqual(data.entries.filter(e => e.familyId === 'yaminome').map(e => [e.position, e.tier]), [['front', 'S'], ['rear', 'SS']]);
});

const resolved = [
  { position: 'front', sourceName: 'シズクシ', familyId: 'shizukuchou', name: 'シズクジ', order: 4, labels: ['シズクジ系', 'Dewgrub Family', '露水虫系列'] },
  { position: 'middle', sourceName: 'ブラピ', familyId: 'purabi', name: 'プラビ', order: 0, labels: ['プラビ系', 'Cheerling Family', '星兔蛋系列'] },
  { position: 'rear', sourceName: 'イルカ', familyId: 'rukaron', name: 'ルカロン', order: 2, labels: ['ルカロン系', 'Dolphie Family', 'ルカロン系列'] }
];

test('user-confirmed correspondences retain each original SS position, order and source label', () => {
  assert.equal(data.entries.filter(e => e.status === 'user-confirmed').length, 3);
  for (const expected of resolved) {
    const entry = data.entries.find(e => e.position === expected.position && e.sourceName === expected.sourceName);
    assert.deepEqual([entry.familyId, entry.tier, entry.order, entry.status], [expected.familyId, 'SS', expected.order, 'user-confirmed']);
    assert.equal(entry.nameResolution.sourceType, 'user-confirmation');
    assert.equal(entry.nameResolution.confirmedDisplayName, expected.name);
    assert.equal(entry.nameResolution.previousFamilyId, null);
    assert.equal(entry.nameResolution.previousStatus, 'name-pending');
    assert.match(entry.nameResolution.confirmedAt, /^2026-10-07T.*\+09:00$/);
  }
});

test('four unrated positions and all previous combined mode ratings remain unchanged', () => {
  assert.deepEqual(data.entries.filter(e => e.tier === 'HOLD').map(e => [e.position, e.sourceName, e.familyId, e.status]), [
    ['front', 'トラーニー', 'haamitora', 'unrated'],
    ['front', 'エレキネコ', 'erekineko', 'unrated'],
    ['rear', 'モグリン', 'mogurin', 'unrated'],
    ['rear', 'ネムクラゲ', 'nemukurage', 'unrated']
  ]);
  for (const [file, expectedHash] of Object.entries({
    'data/tata-tier.json': '7f9da44c8ef73484cef4c36908cac7cdaceabfdb610c1ebc86cdee8bd808bc49',
    'data/tier-ratings.json': '23113b86bdb16667fc05aa4e2683bf9257e55b2770be2f5cfad7a1e14f7ffcda',
    'data/evolution-priority.json': '8e38ea84dee41c0ae806d1dbe3fcb9192ddb9c2623e29aa0443e2de822274688'
  })) {
    let source=read(file).replace(/\r\n/g,'\n');
    if(file==='data/tata-tier.json') {const d=JSON.parse(source); d.families=d.families.filter(f=>f.familyId!=='satorissamu'); source=JSON.stringify(d,null,2)+'\n';}
    if(file==='data/tier-ratings.json') {const d=JSON.parse(source); for(const mode of ['overall','zombieRush']) {d[mode].groups=d[mode].groups.map(g=>({...g,ids:g.ids.filter(id=>id!=='satorissamu')})).filter(g=>g.ids.length); delete d[mode].byFamily?.satorissamu;} source=JSON.stringify(d,null,2)+'\n';}
    assert.equal(createHash('sha256').update(source).digest('hex'), expectedHash, file);
  }
});

test('resolved entries use existing localized names, images, attributes and links, and synchronize detail position ratings', () => {
  const images = JSON.parse(read('data/tata-images.json')).families;
  const families = JSON.parse(read('data/tatari.json')).families;
  for (const [localeIndex, prefix] of ['', 'en/', 'zh-cn/'].entries()) {
    const $ = load(read(`${prefix}tata-tier/index.html`));
    assert.equal($('.tier-name-pending').length, 0);
    for (const expected of resolved) {
      const family = families.find(f => f.id === expected.familyId);
      const card = $(`[data-tier-position="${expected.position}"] [data-family-id="${expected.familyId}"]`);
      assert.equal(card.length, 1);
      assert.equal(card.closest('[data-tier]').attr('data-tier'), 'SS');
      assert.equal(card.attr('data-source-key'), String(expected.order));
      assert.equal(card.attr('data-attribute'), family.attribute);
      assert.equal(card.find('.tier-family-name').text(), expected.labels[localeIndex]);
      assert.ok(card.find('[data-tier-source-name]').text().endsWith(expected.sourceName));
      assert.equal(card.find('img').attr('src'), images.find(f => f.familyId === expected.familyId).stage1.src);
      assert.equal(card.find('img').attr('alt'), expected.labels[localeIndex]);
      assert.equal(card.attr('href'), `/${prefix}tata/${expected.familyId}/`);
      const detail = load(read(`${prefix}tata/${expected.familyId}/index.html`));
      const role = { front: ['前衛', 'Front', '前卫'], middle: ['中衛', 'Middle', '中卫'], rear: ['後衛', 'Rear', '后卫'] }[expected.position][localeIndex];
      assert.ok(detail('[data-zombie-position-ratings]').text().includes(`${role} SS`));
      assert.equal(detail('[data-zombie-position-ratings] a').attr('href'), `/${prefix}tata-tier/#mode-zombie`);
    }
  }
});
test('three locales expose three role charts without JavaScript and keep previous ratings labelled separately', () => {
  for (const prefix of ['', 'en/', 'zh-cn/']) {
    const $ = load(read(`${prefix}tata-tier/index.html`));
    assert.equal($('[data-tier-position]').length, 3);
    assert.equal($('[data-tier-role]').length, 4);
    assert.equal($('[data-tier-search]').length, 1);
    assert.equal($('.tier-legacy-reference').attr('open'), undefined);
    assert.equal($('.tier-contributor a').attr('href'), 'https://x.com/twx84');
    for (const position of Object.keys(expected)) {
      const board = $(`[data-tier-position="${position}"]`);
      const entries = board.find('[data-tier-entry]');
      const source = data.entries.filter(e => e.position === position);
      assert.equal(entries.length, source.length);
      entries.each((i, el) => {
        const card = $(el), entry = source[i];
        if (entry.familyId) assert.ok(card.find('[data-tier-source-name]').text().endsWith(entry.sourceName));
        else assert.equal(card.attr('data-source-name'), entry.sourceName);
        assert.equal(card.closest('[data-tier]').attr('data-tier'), entry.tier);
        if (entry.familyId) assert.equal(card.attr('href'), `/${prefix}tata/${entry.familyId}/`);
        else {
          assert.equal(card.is('a'), false);
          assert.equal(card.find('img').length, 0);
        }
      });
    }
  }
});
