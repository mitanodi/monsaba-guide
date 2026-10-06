import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  assert.deepEqual(data.entries.filter(e => e.status === 'name-pending').map(e => e.sourceName), ['シズクシ', 'ブラピ', 'イルカ']);
  assert.ok(data.entries.filter(e => e.status === 'name-pending').every(e => e.familyId === null));
  assert.deepEqual(data.entries.filter(e => e.familyId === 'yaminome').map(e => [e.position, e.tier]), [['front', 'S'], ['rear', 'SS']]);
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
