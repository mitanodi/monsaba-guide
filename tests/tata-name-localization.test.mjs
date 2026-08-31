import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';

const root = path.resolve(import.meta.dirname, '..');
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
const readFile = (file) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(file, 'utf8'); } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
};
const tatari = JSON.parse(readFile(path.join(root, 'data/tatari.json')));
const { getTataDisplayName, getFamilyDisplayLabel, getEvolutionChain } = globalThis.MONSABA_FAMILY;
const yanzaru = tatari.families.find((family) => family.id === 'yanzaru');

test('shared resolver returns official names for every canonical form', () => {
  const forms = tatari.families.flatMap((family) => family.evolutions);
  assert.equal(tatari.families.length, 64);
  assert.equal(forms.length, 230);
  for (const form of forms) {
    assert.equal(getTataDisplayName(form, 'ja'), form.name);
    assert.equal(getTataDisplayName(form, 'en'), form.nameEn);
    assert.equal(getTataDisplayName(form, 'zh-CN'), form.nameZhHans);
    assert.notEqual(getTataDisplayName(form, 'en'), form.name);
    assert.notEqual(getTataDisplayName(form, 'zh-CN'), form.name);
  }
});

test('family labels and chains use the requested locale without changing IDs', () => {
  assert.equal(yanzaru.id, 'yanzaru');
  assert.equal(getFamilyDisplayLabel(yanzaru, 'ja'), 'ヤンザル系');
  assert.equal(getFamilyDisplayLabel(yanzaru, 'en'), 'Punchimp Family');
  assert.equal(getFamilyDisplayLabel(yanzaru, 'zh-CN'), '顽皮吗喽系列');
  assert.equal(getEvolutionChain(yanzaru, 'en'), 'Punchimp → Rockfu → Rockwu → Rockong');
  assert.equal(getEvolutionChain(yanzaru, 'zh-CN'), '顽皮吗喽 → 棍棒吗喽 → 天命吗喽 → 大圣吗喽');
});

test('representative localized detail pages use official primary and Japanese secondary names', () => {
  for (const familyId of ['yanzaru', 'purabi', 'pakuma']) {
    const family = tatari.families.find((item) => item.id === familyId);
    for (const [locale, directory, prefix] of [['en', 'en', 'Japanese: '], ['zh-CN', 'zh-cn', '日文名：']]) {
      const html = readFile(path.join(root, directory, 'tata', familyId, 'index.html'));
      assert.ok(html.includes(`<h1>${getFamilyDisplayLabel(family, locale)}</h1>`));
      assert.ok(html.includes(getEvolutionChain(family, locale)));
      for (const evolution of family.evolutions) {
        assert.ok(html.includes(`<strong>${getTataDisplayName(evolution, locale)}</strong>`));
        assert.ok(html.includes(`${prefix}${evolution.name}`));
      }
    }
  }
});

test('dynamic search, compare, consult, team builder, and roster use the shared resolver', () => {
  for (const file of ['search/search.js', 'compare/compare.js', 'consult/consult.js', 'team-builder/team-builder.js', 'my-monsaba/my-monsaba.js']) {
    const source = readFile(path.join(root, file));
    assert.match(source, /getTataDisplayName|getEvolutionChain/, file);
  }
});
