import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';

const root = path.resolve(import.meta.dirname, '..');
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tatari.json'), 'utf8'));
const ratings = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tier-ratings.json'), 'utf8'));
const { getFamilyDisplayName, getFamilyDisplayLabel, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;

test('all 64 family labels use the stage 1 name while retaining every search alias', () => {
  assert.equal(tatari.families.length, 64);
  assert.equal(tatari.families.flatMap((family) => family.evolutions).length, 230);
  assert.equal(tatari.families.filter((family) => family.familyName !== family.evolutions[0].name).length, 32);

  for (const family of tatari.families) {
    assert.equal(getFamilyDisplayName(family), family.evolutions[0].name, family.id);
    assert.equal(getFamilyDisplayLabel(family), `${family.evolutions[0].name}系`, family.id);
    const aliases = getFamilySearchAliases(family);
    assert.ok(aliases.includes(family.familyName), `${family.id}: legacy familyName`);
    for (const evolution of family.evolutions) assert.ok(aliases.includes(evolution.name), `${family.id}: ${evolution.name}`);
  }
});

test('Bowzuhebi has SS overall and all four mode tiers', () => {
  const rating = ratings.overall.byFamily.nenbutsuhebi;
  assert.deepEqual(
    Object.fromEntries(['tier', 'normal', 'zombie', 'dojo', 'beginner'].map((key) => [key, rating[key]])),
    { tier: 'SS', normal: 'SS', zombie: 'SS', dojo: 'SS', beginner: 'SS' }
  );
});

test('Pikaru keeps the public hikaru slug while using the corrected four-stage names', () => {
  const family = tatari.families.find((item) => item.id === 'hikaru');
  assert.ok(family);
  assert.deepEqual(family.evolutions.map((stage) => stage.name), ['ピカル', 'ボルタル', 'ルシフェル', 'ルミナリオン']);
  assert.equal(getFamilyDisplayLabel(family), 'ピカル系');
  for (const legacy of ['ヒカル', 'ホルタル', 'ルシフタル']) assert.ok(getFamilySearchAliases(family).includes(legacy));
});
