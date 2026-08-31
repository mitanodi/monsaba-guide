import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';
import { familyMatches } from '../my-monsaba/roster-core.js';
import { validateTataNameSources } from '../scripts/lib/validate-tata-name-sources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const source = json('data/tata-name-i18n-sources.json');
const totalForms = tatari.families.reduce((total, family) => total + family.evolutions.length, 0);
const cloneFixture = () => ({
  source: structuredClone(source),
  tatari: structuredClone(tatari),
  skills: structuredClone(skills)
});
const validate = (fixture = cloneFixture()) => validateTataNameSources(fixture);
const includesError = (result, label, fragments = []) => result.errors.some((error) => error.includes(`[${label}]`) && fragments.every((fragment) => error.includes(fragment)));
const { getFamilyDisplayName, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;

test('A: current repository has complete confirmed source coverage', () => {
  const result = validate();
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.formsChecked, totalForms);
  assert.equal(result.stats.enNames, totalForms);
  assert.equal(result.stats.enSourceCoverage, totalForms);
  assert.equal(result.stats.zhCnNames, totalForms);
  assert.equal(result.stats.zhCnSourceCoverage, totalForms);
});

test('B: changing only an English official name fails exact source matching', () => {
  const fixture = cloneFixture();
  fixture.tatari.families.find((family) => family.id === 'yanzaru').evolutions[0].nameEn = 'PunchimpChanged';
  const result = validate(fixture);
  assert.ok(includesError(result, 'Tata name source mismatch', ['family="yanzaru"', 'stage=1', 'locale="en"', 'DB="PunchimpChanged"', 'source="Punchimp"']));
});

test('C: changing only a Simplified Chinese official name fails exact source matching', () => {
  const fixture = cloneFixture();
  fixture.tatari.families.find((family) => family.id === 'yanzaru').evolutions[0].nameZhHans = '顽皮吗喽改';
  const result = validate(fixture);
  assert.ok(includesError(result, 'Tata name source mismatch', ['family="yanzaru"', 'stage=1', 'locale="zh-CN"', 'DB="顽皮吗喽改"', 'source="顽皮吗喽"']));
});

test('D: a missing source page fails with an actionable error', () => {
  const fixture = cloneFixture();
  delete fixture.source.forms.find((row) => row.familyId === 'yanzaru' && row.stage === 1).englishSourcePage;
  const result = validate(fixture);
  assert.ok(includesError(result, 'Invalid Tata name source page', ['family="yanzaru"', 'stage=1', 'locale="en"', 'source_page="missing"']));
});

test('E: a missing source document fails', () => {
  const fixture = cloneFixture();
  delete fixture.source.sources.english.observedFileName;
  const result = validate(fixture);
  assert.ok(includesError(result, 'Invalid Tata source document', ['locale="en"', 'source_document="missing"']));
});

test('F: a source mapping for a nonexistent family is rejected as orphaned', () => {
  const fixture = cloneFixture();
  fixture.source.forms.push({
    familyId: 'does-not-exist',
    stage: 1,
    japaneseName: '不存在',
    englishName: 'NoSuchTata',
    englishSourcePage: 235,
    simplifiedChineseName: '不存在塔塔',
    chineseSourcePage: 231,
    confidence: 'confirmed'
  });
  const result = validate(fixture);
  assert.ok(includesError(result, 'Orphan Tata name source', ['family="does-not-exist"', 'stage=1']));
});

test('G: duplicate family/stage/locale source mappings are rejected', () => {
  const fixture = cloneFixture();
  fixture.source.forms.push(structuredClone(fixture.source.forms[0]));
  const result = validate(fixture);
  assert.ok(includesError(result, 'Duplicate Tata name source mapping', ['locale="en"']));
  assert.ok(includesError(result, 'Duplicate Tata name source mapping', ['locale="zh-CN"']));
});

test('H: pending evidence cannot back a published official name', () => {
  const fixture = cloneFixture();
  fixture.source.forms.find((row) => row.familyId === 'yanzaru' && row.stage === 1).confidence = 'pending';
  const result = validate(fixture);
  assert.ok(includesError(result, 'Unconfirmed Tata source used as official name', ['family="yanzaru"', 'verification_status="pending"']));
});

test('I/J: EN and zh-CN coverage are computed dynamically from all canonical forms', () => {
  const result = validate();
  assert.equal(result.stats.enSourceCoverage, result.stats.formsChecked);
  assert.equal(result.stats.zhCnSourceCoverage, result.stats.formsChecked);
  assert.equal(result.stats.formsChecked, totalForms);
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

test('PDF source pages remain one-to-one after documented duplicate removal', () => {
  assert.equal(new Set(source.forms.map((row) => row.englishSourcePage)).size, totalForms);
  assert.equal(new Set(source.forms.map((row) => row.chineseSourcePage)).size, totalForms);
  assert.deepEqual(source.sources.english.duplicatePages, [81, 84, 118, 171, 231]);
  assert.deepEqual(source.sources.simplifiedChinese.duplicatePages, [24]);
});

test('all generated locale detail cards show both official names without replacing Japanese', () => {
  for (const family of tatari.families) {
    for (const localePath of ['tata', 'en/tata', 'zh-cn/tata']) {
      const html = read(`${localePath}/${family.id}/index.html`);
      for (const evolution of family.evolutions) {
        assert.ok(html.includes(`English:</b> ${evolution.nameEn}`), `${localePath}:${family.id}:T${evolution.stage}:en`);
        assert.ok(html.includes(`简体中文:</b> ${evolution.nameZhHans}`), `${localePath}:${family.id}:T${evolution.stage}:zh-CN`);
      }
    }
  }
});
