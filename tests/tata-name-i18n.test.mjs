import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';
import { familyMatches } from '../my-monsaba/roster-core.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const source = json('data/tata-name-i18n-sources.json');
const { getFamilyDisplayName, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;

test('all canonical forms have confirmed official EN and zh-Hans names', () => {
  const evolutions = tatari.families.flatMap((family) => family.evolutions);
  assert.equal(evolutions.length, 230);
  assert.equal(source.forms.length, 230);
  assert.equal(source.forms.filter((row) => row.confidence === 'confirmed').length, 230);
  assert.equal(new Set(evolutions.map((item) => item.nameEn)).size, 230);
  assert.equal(new Set(evolutions.map((item) => item.nameZhHans)).size, 230);
});

test('Japanese remains the primary display name while official names are aliases', () => {
  const family = tatari.families.find((item) => item.id === 'yanzaru');
  assert.equal(getFamilyDisplayName(family), 'ヤンザル');
  const aliases = getFamilySearchAliases(family);
  for (const name of ['Punchimp', 'Rockfu', 'Rockwu', 'Rockong', '顽皮吗喽', '棍棒吗喽', '天命吗喽', '大圣吗喽']) {
    assert.ok(aliases.includes(name), name);
    assert.equal(familyMatches(family, name), true, name);
  }
});

test('English and Chinese stage names stay synchronized with skill-stage data', () => {
  for (const family of tatari.families) {
    const stageMap = new Map(skills.byFamily[family.id].stages.map((stage) => [stage.stage, stage]));
    for (const evolution of family.evolutions) {
      const stage = stageMap.get(evolution.stage);
      assert.equal(stage.nameEn, evolution.nameEn, `${family.id}:T${evolution.stage}:en`);
      assert.equal(stage.nameZhHans, evolution.nameZhHans, `${family.id}:T${evolution.stage}:zh-Hans`);
    }
  }
});

test('PDF source pages are one-to-one after documented duplicate removal', () => {
  assert.equal(source.sources.english.pageCount, 235);
  assert.equal(source.sources.simplifiedChinese.pageCount, 231);
  assert.equal(new Set(source.forms.map((row) => row.englishSourcePage)).size, 230);
  assert.equal(new Set(source.forms.map((row) => row.chineseSourcePage)).size, 230);
  assert.deepEqual(source.sources.english.duplicatePages, [81, 84, 118, 171, 231]);
  assert.deepEqual(source.sources.simplifiedChinese.duplicatePages, [24]);
});

test('generated Tata detail cards show both official names without replacing Japanese', () => {
  const family = tatari.families.find((item) => item.id === 'rokuju');
  const html = read('tata/rokuju/index.html');
  for (const evolution of family.evolutions) {
    assert.match(html, new RegExp(`<strong>${evolution.name}</strong>`));
    assert.ok(html.includes(`English:</b> ${evolution.nameEn}`));
    assert.ok(html.includes(`简体中文:</b> ${evolution.nameZhHans}`));
  }
});
