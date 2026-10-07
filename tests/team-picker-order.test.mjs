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
  for (const position of ['all', 'front', 'middle', 'rear']) {
    // 'all' reads the three boards in page order and keeps each Tata at its first appearance.
    const board = position === 'all' ? [...new Set(['front', 'middle', 'rear'].flatMap(boardOf))] : boardOf(position);
    const actual = ids(pickerOrder(families, { tierData, positionData }, 'zombie', position));
    assert.deepEqual(actual.slice(0, board.length), board, position);
    const rest = families.map(family => family.id).filter(id => !board.includes(id));
    assert.deepEqual(actual.slice(board.length), rest, position);
  }
});

test('Picker keeps catalog order when Tier data is unavailable', () => {
  assert.deepEqual(ids(pickerOrder(families, {}, 'normal')), ids(families));
  assert.deepEqual(ids(pickerOrder(families, {}, 'zombie', 'front')), ids(families));
  assert.deepEqual(ids(pickerOrder(families, {}, 'zombie')), ids(families));
});
