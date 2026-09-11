import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';
import { familyMatches } from '../my-monsaba/roster-core.js';
import { validateTataNameSources } from '../scripts/lib/validate-tata-name-sources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
const read = (file) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(path.join(root, file), 'utf8'); } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
};
const json = (file) => JSON.parse(read(file));
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const source = json('data/tata-name-i18n-sources.json');
const currentJapaneseNames = json('data/tata-japanese-name-corrections-2026-09-10.json');
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
  const englishPdfPages = source.forms.map((row) => row.englishSourcePage).filter(Number.isInteger);
  const chinesePdfPages = source.forms.map((row) => row.chineseSourcePage).filter(Number.isInteger);
  assert.equal(new Set(englishPdfPages).size, 230);
  assert.equal(new Set(chinesePdfPages).size, 230);
  assert.equal(source.forms.filter((row) => row.sourceType === 'official-name-table').length, 6);
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

test('independent current-name fixture protects externally confirmed Japanese names and stages', () => {
  for (const expected of currentJapaneseNames.corrections) {
    const family = tatari.families.find((item) => item.id === expected.familyId);
    const evolution = family?.evolutions.find((item) => item.stage === expected.stage);
    assert.ok(evolution, `${expected.familyId}:T${expected.stage}`);
    assert.equal(evolution.name, expected.name, `${expected.familyId}:T${expected.stage}:ja`);
    if (expected.englishName) assert.equal(evolution.nameEn, expected.englishName, `${expected.familyId}:T${expected.stage}:en`);
    assert.equal(getFamilyDisplayName(family), family.evolutions[0].name, `${expected.familyId}:family-display`);
  }
});

test('seven priority families have the reviewed stage chains and legacy names remain searchable', () => {
  const expected = {
    korotama: ['コロタマ', 'コロロック', 'スカラーべ', 'スカリギオ'],
    yanzaru: ['ヤンザル', 'ワルキー', 'イビルザル', 'サルタイセイ'],
    birimori: ['ビリモ', 'ビリモリ', 'パルバット', 'ヴァンパルス'],
    korokon: ['コロコン', 'ニコン', 'ヨウエンビ', 'キツネビア'],
    himori: ['ヒモリ', 'フレイモリ', 'ボルケザード', 'インフェルドラ'],
    tafupen: ['トコペン', 'タフペン', 'フブペン', 'ペンペラー'],
    shizukuchou: ['シズクジ', 'シズクチョウ', 'ミストリア', 'エーテリファル']
  };
  for (const [familyId, chain] of Object.entries(expected)) {
    const family = tatari.families.find((item) => item.id === familyId);
    assert.deepEqual(family.evolutions.map((item) => item.name), chain, familyId);
    assert.equal(getFamilyDisplayName(family), chain[0], `${familyId}:T1 family label`);
  }
  const legacy = {
    korotama: ['スカリギオ'],
    yanzaru: ['エテコウハ'],
    birimori: ['ビリリモリ'],
    korokon: ['タマキツネ', 'ニコキツネ', 'ミセキツネ'],
    himori: ['ツノイモリ', 'フレイドラ'],
    tafupen: ['トコペンギン', 'タフペンギン', 'フブペンギン'],
    shizukuchou: ['シズクムシ']
  };
  for (const [familyId, names] of Object.entries(legacy)) {
    const family = tatari.families.find((item) => item.id === familyId);
    const aliases = getFamilySearchAliases(family);
    for (const name of names) assert.ok(aliases.includes(name), `${familyId}:${name}`);
  }
});

test('no stage name is silently copied to another stage and pending evolutions stay unavailable', () => {
  for (const family of tatari.families) {
    const names = family.evolutions.map((item) => item.name);
    assert.equal(new Set(names).size, names.length, `${family.id}: duplicate Japanese stage name`);
  }
  for (const pending of currentJapaneseNames.pending) {
    if (['shizukuchou:4', 'tsubaruka:4'].includes(`${pending.familyId}:${pending.stage}`)) continue;
    const family = tatari.families.find((item) => item.id === pending.familyId);
    assert.equal(family.evolutions.some((item) => item.stage === pending.stage), false, `${pending.familyId}:T${pending.stage}:pending`);
  }
});
