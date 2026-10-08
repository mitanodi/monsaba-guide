import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pickerOrder } from '../team-builder/team-core.js';
import { groupRankings } from '../lib/tata-tier.mjs';

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
  const catalog = ['unlisted', 'front-s', 'shared', 'rear-ss', 'middle-ss', 'front-ss-2', 'front-ss-1', 'hold'].map(id => ({ id }));
  const entries = [
    { familyId: 'hold', position: 'front', tier: 'HOLD', order: 0 },
    { familyId: 'front-s', position: 'front', tier: 'S', order: 0 },
    { familyId: 'shared', position: 'front', tier: 'S', order: 1 },
    { familyId: 'rear-ss', position: 'rear', tier: 'SS', order: 0 },
    { familyId: 'middle-ss', position: 'middle', tier: 'SS', order: 0 },
    { familyId: 'shared', position: 'middle', tier: 'SS', order: 1 },
    { familyId: 'front-ss-2', position: 'front', tier: 'SS', order: 1 },
    { familyId: 'front-ss-1', position: 'front', tier: 'SS', order: 0 },
    { familyId: null, position: 'front', tier: 'SS', order: 2 }
  ];
  const before = structuredClone(entries);
  const actual = ids(pickerOrder(catalog, { positionData: { entries } }, 'zombie', 'all'));
  assert.deepEqual(actual, ['front-ss-1', 'front-ss-2', 'middle-ss', 'shared', 'rear-ss', 'front-s', 'hold', 'unlisted']);
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
