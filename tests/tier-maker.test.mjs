import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createState, parseState, updateState, unplacedIds, exportLayout, categoryName } from '../tier-maker/core.js';
import { COPY } from '../tier-maker/copy.js';
const ids = ['takepanda', 'hinyao', 'shizukuchou'];
const move = (s, categoryId, tierId, cardId, beforeId) => updateState(s, { type: 'move', categoryId, tierId, cardId, beforeId }, ids);

test('each initial role has an independent, empty S–D table', () => {
  const s = createState();
  assert.deepEqual(s.categories.map(c => categoryName(c, COPY.ja)), ['前衛', 'ヒーラー', 'DPS', 'バフ', '総合']);
  for (const c of s.categories) { assert.deepEqual(c.tiers.map(t => t.name), ['S', 'A', 'B', 'C', 'D']); assert.deepEqual(unplacedIds(c, ids), ids); }
  const first = s.categories[0], second = s.categories[1];
  let result = move(s, first.id, first.tiers[0].id, ids[0]);
  result = move(result, second.id, second.tiers[3].id, ids[0]);
  assert.deepEqual(result.categories[0].tiers[0].cards, [ids[0]]);
  assert.deepEqual(result.categories[1].tiers[3].cards, [ids[0]]);
  assert.deepEqual(s.categories[0].tiers[0].cards, []);
});
test('moving within and across tiers never duplicates or loses characters; returning restores the pool', () => {
  let s = createState(); const c = s.categories[0], [a, b] = c.tiers;
  for (const id of ids) s = move(s, c.id, a.id, id);
  s = move(s, c.id, a.id, ids[2], ids[0]);
  assert.deepEqual(s.categories[0].tiers[0].cards, [ids[2], ids[0], ids[1]]);
  s = move(s, c.id, b.id, ids[0]);
  assert.deepEqual(s.categories[0].tiers[0].cards, [ids[2], ids[1]]);
  assert.deepEqual(s.categories[0].tiers[1].cards, [ids[0]]);
  assert.deepEqual(unplacedIds(s.categories[0], ids), []);
  s = move(s, c.id, null, ids[0]);
  assert.deepEqual(unplacedIds(s.categories[0], ids), [ids[0]]);
  assert.deepEqual(move(s, c.id, 'missing-tier', ids[1]), s);
  assert.deepEqual(move(s, c.id, a.id, 'invented-character'), s);
});
test('tier deletion returns cards to unrated; names, colors and tier order are independent from placement', () => {
  let s = createState(); const c = s.categories[0], a = c.tiers[0];
  s = move(s, c.id, a.id, ids[0]);
  s = updateState(s, { type: 'rename-tier', categoryId: c.id, tierId: a.id, name: '必須' }, ids);
  s = updateState(s, { type: 'color', categoryId: c.id, tierId: a.id, value: '#123456' }, ids);
  s = updateState(s, { type: 'reorder-tier', categoryId: c.id, tierId: a.id, offset: 1 }, ids);
  assert.deepEqual(s.categories[0].tiers[1], { ...a, name: '必須', color: '#123456', cards: [ids[0]] });
  s = updateState(s, { type: 'delete-tier', categoryId: c.id, tierId: a.id }, ids);
  assert.deepEqual(unplacedIds(s.categories[0], ids), ids);
  assert.equal(s.categories[0].tiers.length, 4);
  while (s.categories[0].tiers.length > 1) s = updateState(s, { type: 'delete-tier', categoryId: c.id, tierId: s.categories[0].tiers[0].id }, ids);
  assert.deepEqual(updateState(s, { type: 'delete-tier', categoryId: c.id, tierId: s.categories[0].tiers[0].id }, ids), s);
});
test('draft round-trip retains edits and unknown IDs; invalid duplicate placements are rejected', () => {
  const s = createState(); s.categories[0].tiers[0].cards = ['future-character'];
  assert.deepEqual(parseState(JSON.stringify(s)), s);
  s.categories[0].tiers[1].cards = ['future-character'];
  assert.throws(() => parseState(JSON.stringify(s)));
  assert.throws(() => parseState('{broken'));
  assert.throws(() => parseState(JSON.stringify({ ...createState(), version: 2 })));
  const badId = createState(); badId.categories[0].id = '" onmouseover="alert(1)';
  assert.throws(() => parseState(JSON.stringify(badId)));
});
test('clear preserves custom tiers; reset restores the five initial roles and S–D', () => {
  let s = createState(); const c = s.categories[0];
  s = move(s, c.id, c.tiers[0].id, ids[0]);
  s = updateState(s, { type: 'rename-category', categoryId: c.id, name: 'ボス向け' }, ids);
  s = updateState(s, { type: 'add-tier', categoryId: c.id, name: 'SS' }, ids);
  const cleared = updateState(s, { type: 'clear' }, ids);
  assert.equal(cleared.categories[0].name, 'ボス向け');
  assert.equal(cleared.categories[0].tiers.length, 6);
  assert.deepEqual(unplacedIds(cleared.categories[0], ids), ids);
  const reset = updateState(s, { type: 'reset' }, ids);
  assert.equal(reset.categories[0].role, 'front');
  assert.equal(reset.categories.length, 5);
});

test('four-category drafts are preserved and can add and rename overall with a custom title', () => {
  const old = createState(); old.categories.pop();
  old.categories[0].tiers[0].cards = [ids[0]];
  const restored = parseState(JSON.stringify(old));
  assert.deepEqual(restored, old);
  let edited = updateState(restored, { type: 'add-category', name: '総合' }, ids);
  const added = edited.categories.at(-1);
  edited = move(edited, added.id, added.tiers[0].id, ids[1]);
  edited = updateState(edited, { type: 'rename-category', categoryId: added.id, name: 'お気に入り' }, ids);
  edited = updateState(edited, { type: 'title', value: '私の評価表' }, ids);
  assert.equal(edited.title, '私の評価表');
  assert.equal(categoryName(edited.categories.at(-1), COPY.ja), 'お気に入り');
  assert.deepEqual(edited.categories[0], old.categories[0]);
  assert.deepEqual(edited.categories.at(-1).tiers[0].cards, [ids[1]]);
  assert.deepEqual(parseState(JSON.stringify(edited)), edited);
});
test('image layout preserves exact order and optionally includes all unrated characters', () => {
  const c = createState().categories[0]; c.tiers[0].cards = [ids[2], ids[0]];
  const rows = exportLayout(c, ids, true, 1200);
  assert.deepEqual(rows[0].cards, [ids[2], ids[0]]);
  assert.deepEqual(rows.at(-1).cards, [ids[1]]);
  assert.equal(exportLayout(c, ids, false).length, 5);
  assert.ok(rows.every(row => row.height >= 100));
});
test('three localized pages use one runtime and separate canonical URLs', () => {
  for (const [locale, prefix] of [['ja', ''], ['en', 'en/'], ['zh-CN', 'zh-cn/']]) {
    const html = fs.readFileSync(new URL(`../${prefix}tier-maker/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<html lang="${locale}"`));
    assert.ok(html.includes(`href="https://monster-survival.com/${prefix}tier-maker/"`));
    assert.ok(html.includes('src="/tier-maker/tier-maker.js"'));
    assert.ok(html.includes('content="noindex,follow"'));
    assert.ok(html.includes(COPY[locale].intro));
  }
});
