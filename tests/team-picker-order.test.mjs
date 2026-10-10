import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pickerOrder } from '../team-builder/team-core.js';
import { groupRankings } from '../lib/tata-tier.mjs';
import { createState } from '../tier-maker/core.js';
import { TIER_DRAFT_KEY, ORDER_KEY, readPersonalTiers, personalTierOptions, validOrder, loadOrder, saveOrder, personalTierOrder } from '../team-builder/personal-tier-order.js';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const families = read('data/tatari.json').families;
const tierData = read('data/tata-tier.json');
const positionData = read('data/zombie-rush/position-tiers.json');
const ids = list => list.map(family => family.id);

test('Team Builder picker reads each Tier board from the top-left', () => {
  for (const [mode, board] of [['normal', 'normal'], ['dojo', 'dojo'], ['free', 'overall'], ['boss', 'overall']]) {
    const expected = groupRankings(tierData, board).flatMap(group => group.entries.map(entry => entry.familyId)).filter(id => families.some(family => family.id === id));
    const actual = ids(pickerOrder(families, { tierData, positionData }, mode));
    assert.deepEqual(actual.slice(0, expected.length), expected, mode);
    assert.equal(new Set(actual).size, families.length, mode);
  }
});

test('Zombie Rush picker follows the selected position board, then keeps catalog order', () => {
  const boardOf = position => ['SS', 'S', 'A', 'B', 'C', 'HOLD'].flatMap(tier => positionData.entries.filter(entry => entry.position === position && entry.tier === tier).sort((a, b) => a.order - b.order).map(entry => entry.familyId)).filter(Boolean);
  for (const position of ['front', 'middle', 'rear']) {
    const board = boardOf(position);
    const actual = ids(pickerOrder(families, { tierData, positionData }, 'zombie', position));
    assert.deepEqual(actual.slice(0, board.length), board, position);
    const rest = families.map(family => family.id).filter(id => !board.includes(id));
    assert.deepEqual(actual.slice(board.length), rest, position);
  }
});

test('Zombie Rush all orders by Tier, then position, and uses each family at its highest Tier', () => {
  const catalog = ['unlisted', 'front-s', 'shared', 'rear-ss', 'middle-ss', 'front-ss-2', 'front-ss-1', 'hold', 'rear-sss'].map(id => ({ id }));
  const entries = [
    { familyId: 'hold', position: 'front', tier: 'HOLD', order: 0 },
    { familyId: 'front-s', position: 'front', tier: 'S', order: 0 },
    { familyId: 'shared', position: 'front', tier: 'S', order: 1 },
    { familyId: 'rear-sss', position: 'rear', tier: 'SSS', order: 0 },
    { familyId: 'rear-ss', position: 'rear', tier: 'SS', order: 0 },
    { familyId: 'middle-ss', position: 'middle', tier: 'SS', order: 0 },
    { familyId: 'shared', position: 'middle', tier: 'SS', order: 1 },
    { familyId: 'front-ss-2', position: 'front', tier: 'SS', order: 1 },
    { familyId: 'front-ss-1', position: 'front', tier: 'SS', order: 0 },
    { familyId: null, position: 'front', tier: 'SS', order: 2 }
  ];
  const before = structuredClone(entries);
  const actual = ids(pickerOrder(catalog, { positionData: { entries } }, 'zombie', 'all'));
  assert.deepEqual(actual, ['rear-sss', 'front-ss-1', 'front-ss-2', 'middle-ss', 'shared', 'rear-ss', 'front-s', 'hold', 'unlisted']);
  assert.deepEqual(entries, before, 'source grades and ordering must not be mutated');
  assert.equal(new Set(actual).size, catalog.length);
});

test('Zombie Rush all exhausts SS before S and keeps the resolved SS families', () => {
  const actual = ids(pickerOrder(families, { positionData }, 'zombie', 'all'));
  const ss = new Set(positionData.entries.filter(e => e.tier === 'SS' && e.familyId).map(e => e.familyId));
  assert.deepEqual(new Set(actual.slice(0, ss.size)), ss);
  for (const [position, familyId, order] of [['front', 'shizukuchou', 4], ['middle', 'purabi', 0], ['rear', 'rukaron', 2]]) {
    const entry = positionData.entries.find(e => e.position === position && e.familyId === familyId);
    assert.equal(entry.tier, 'SS');
    assert.equal(entry.order, order);
    assert.ok(actual.indexOf(familyId) < ss.size);
  }
  assert.equal(positionData.entries.filter(e => e.tier === 'HOLD').length, 4);
});

test('Picker keeps catalog order when Tier data is unavailable', () => {
  assert.deepEqual(ids(pickerOrder(families, {}, 'normal')), ids(families));
  assert.deepEqual(ids(pickerOrder(families, {}, 'zombie', 'front')), ids(families));
  assert.deepEqual(ids(pickerOrder(families, {}, 'zombie')), ids(families));
});

test('personal order follows saved row/card positions, keeps unrated fallback, and never changes source data', () => {
  const draft = createState(), category = draft.categories[4];
  category.tiers[0].name = '必須';
  category.tiers[0].cards = ['hinyao', 'takepanda', 'future-character'];
  category.tiers[1].name = 'SSS'; // labels do not define the sort order
  category.tiers[1].cards = ['shizukuchou'];
  draft.categories[0].tiers[0].cards = ['shizukuchou', 'takepanda'];
  const before = structuredClone(draft);
  for (const mode of ['free', 'boss', 'normal', 'dojo', 'zombie']) {
    const fallback = pickerOrder(families, { tierData, positionData }, mode);
    const actual = ids(personalTierOrder(fallback, draft, category.id));
    assert.deepEqual(actual.slice(0, 3), ['hinyao', 'takepanda', 'shizukuchou']);
    assert.deepEqual(actual.slice(3), ids(fallback).filter(id => !actual.slice(0, 3).includes(id)));
    assert.equal(new Set(actual).size, families.length);
    assert.deepEqual(ids(personalTierOrder(fallback, draft, 'missing')), ids(fallback));
    assert.deepEqual(ids(personalTierOrder(fallback, draft, draft.categories[1].id)), ids(fallback));
  }
  assert.deepEqual(ids(personalTierOrder(families, draft, draft.categories[0].id)).slice(0, 2), ['shizukuchou', 'takepanda']);
  assert.deepEqual(draft, before);
});

test('personal Tier integration safely reads old/custom drafts and keeps preference separate from formations', () => {
  const draft = createState();
  draft.categories.length = 4; // old drafts do not gain categories
  draft.categories[0].role = null; draft.categories[0].name = '<自作の前衛>';
  const values = new Map([[TIER_DRAFT_KEY, JSON.stringify(draft)]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readPersonalTiers(storage), draft);
  assert.equal(personalTierOptions(draft, 'ja')[0].name, '<自作の前衛>');
  assert.equal(personalTierOptions(draft, 'en')[1].name, 'Healer');
  assert.equal(personalTierOptions(draft, 'zh-CN')[1].name, '治疗');
  const id = draft.categories[0].id;
  saveOrder(storage, id); assert.equal(loadOrder(storage, draft), id);
  assert.equal(values.get(TIER_DRAFT_KEY), JSON.stringify(draft), 'must never write the Tier draft');
  assert.equal(values.size, 2); assert.equal(values.get(ORDER_KEY), id);
  assert.equal(validOrder(id, { ...draft, categories: draft.categories.slice(1) }), '');
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readPersonalTiers(broken), null); assert.equal(loadOrder(broken, draft), '');
  assert.doesNotThrow(() => saveOrder(broken, id));
  values.set(TIER_DRAFT_KEY, '{'); assert.equal(readPersonalTiers(storage), null);
  assert.equal(values.get(TIER_DRAFT_KEY), '{');
  const duplicate = structuredClone(draft); duplicate.categories[0].tiers[0].cards = ['takepanda', 'takepanda'];
  values.set(TIER_DRAFT_KEY, JSON.stringify(duplicate)); assert.equal(readPersonalTiers(storage), null);
});

test('home defaults to the editorial overall Tier order, with catalog order available in every language', () => {
  const fixture = ['unrated', 'a', 'top', 'second', 'hold'].map(id => ({ id }));
  const ratings = { overall: { groups: [{ ids: ['top', 'second'] }, { ids: ['a'] }, { ids: ['hold'] }] }, zombieRush: { groups: [{ ids: ['a', 'top'] }] } };
  assert.deepEqual(ids(globalThis.MONSABA_CATALOG_ORDER.overall(fixture, ratings)), ['top', 'second', 'a', 'hold', 'unrated']);
  assert.deepEqual(ids(globalThis.MONSABA_CATALOG_ORDER.overall(fixture, null)), ids(fixture));
  const expected = ids(pickerOrder(families, { tierData }, 'free'));
  assert.deepEqual(ids(globalThis.MONSABA_CATALOG_ORDER.overall(families, read('data/tier-ratings.json'))), expected);
  for (const [prefix, label] of [['', '総合Tier順'], ['en/', 'Overall Tier order'], ['zh-cn/', '综合强度榜顺序']]) {
    const $ = load(fs.readFileSync(path.join(root, prefix, 'index.html'), 'utf8'));
    assert.deepEqual($('#cards .catalog-card').map((_, el) => $(el).attr('data-family')).get(), expected, prefix);
    assert.equal($('#sort option').first().text(), label);
    assert.equal($('#sort option[value="catalog"]').length, 1);
    assert.equal($('script[src="/catalog-order.js"]').length, 1);
  }
});
