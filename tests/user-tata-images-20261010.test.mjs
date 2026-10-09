import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { stageImageFor } from '../team-builder/team-core.js';
import { validateTataNameSources } from '../scripts/lib/validate-tata-name-sources.mjs';

const root = new URL('../', import.meta.url);
const json = f => JSON.parse(fs.readFileSync(new URL(f, root), 'utf8'));
const tatari = json('data/tatari.json'), images = json('data/tata-images.json');
const evidence = json('data/user-tata-evidence-2026-10-10.json');
const skills = json('data/tata-skills.json'), source = json('data/tata-name-i18n-sources.json');
const baseline = f => JSON.parse(execFileSync('git', ['show', `b4d2d7e769d6cf50b1f5b8cde0662fee9a9c2be6:${f}`], { cwd: root, encoding: 'utf8' }));
const expected = [
  ['shizukuchou', 4, 'エーテリファル'], ['hinyao', 4, 'ネコノミコト'],
  ['nenbutsuhebi', 4, 'ナムアミダイジャ'], ['erekineko', 4, 'トコヨニャット'],
  ['satorissamu', 1, 'サトリッサム'], ['satorissamu', 2, 'コモリッサム'],
  ['satorissamu', 3, 'フタリッサム'], ['satorissamu', 4, 'ファミリッサム']
];

test('eight user-confirmed names map to exact evolution stages and transparent, intact image outputs', async () => {
  assert.deepEqual(evidence.records.map(r => [r.familyId, r.stage, r.name]), expected);
  const mapping = new Map(images.families.map(f => [f.familyId, f]));
  for (const record of evidence.records) {
    const family = tatari.families.find(f => f.id === record.familyId);
    const evolution = family.evolutions.find(e => e.stage === record.stage);
    assert.equal(evolution.name, record.name);
    assert.equal(evolution.imageEvidence.recordId, record.id);
    const resolved = stageImageFor(family, record.stage, mapping);
    assert.equal(resolved.src, record.outputs['512'].path);
    assert.equal(evolution.image, resolved.src.slice(1));
    for (const size of [256, 512]) {
      const output = record.outputs[size], bytes = fs.readFileSync(new URL(output.path.slice(1), root));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), output.sha256);
      const metadata = await sharp(bytes).metadata();
      assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [size, size, true]);
    }
  }
  assert.equal(mapping.get('hikikomoru').forms[3].sourceType, 'official_creator_asset');
  assert.deepEqual(mapping.get('hikikomoru'), baseline('data/tata-images.json').families.find(f => f.familyId === 'hikikomoru'));
  assert.match(evidence.alternatives.find(r => r.sourceFile === 'unassigned-pink-cat.webp').action, /not adopted/);
});

test('all pre-existing skills, names, editorial ratings and position ratings stay unchanged', () => {
  for (const [id, old] of Object.entries(baseline('data/tata-skills.json').byFamily)) assert.deepEqual(skills.byFamily[id], old, id);
  for (const old of baseline('data/tata-tier.json').families) assert.deepEqual(json('data/tata-tier.json').families.find(f => f.familyId === old.familyId), old);
  assert.deepEqual(json('data/zombie-rush/position-tiers.json'), baseline('data/zombie-rush/position-tiers.json'));
  for (const old of baseline('data/tatari.json').families) {
    const current = structuredClone(tatari.families.find(f => f.id === old.id));
    for (const stage of current.evolutions) if (expected.some(([id, n]) => id === old.id && n === stage.stage)) {
      stage.image = old.evolutions.find(e => e.stage === stage.stage).image;
      delete stage.imageEvidence;
    }
    assert.deepEqual(current, old, old.id);
  }
});

test('new family does not invent foreign names, skill values or ratings', () => {
  const family = tatari.families.find(f => f.id === 'satorissamu');
  assert.equal(family.attribute, '岩');
  for (const stage of family.evolutions) { assert.equal(stage.nameEn, null); assert.equal(stage.nameZhHans, null); }
  for (const stage of skills.byFamily.satorissamu.stages) {
    assert.equal(stage.skillName, '確認待ち'); assert.deepEqual(stage.values, []);
    assert.equal(stage.evidence.skillEvidenceProvided, false);
  }
  for (const rating of Object.values(json('data/tata-tier.json').families.find(f => f.familyId === family.id).rankings)) {
    assert.equal(rating.tier, 'HOLD'); assert.equal(rating.status, 'hold');
  }
});

test('supplemental name evidence is traceable and wrong-stage evidence is rejected', () => {
  for (const row of source.forms.filter(f => f.familyId === 'satorissamu')) {
    const record = evidence.records.find(r => r.id === row.japaneseEvidence.recordId);
    assert.equal(row.japaneseEvidence.sourceSha256, record.sourceSha256);
    assert.equal(row.japaneseEvidence.manifest, 'data/user-tata-evidence-2026-10-10.json');
  }
  assert.deepEqual(validateTataNameSources({ source, tatari, skills }).errors, []);
  const changed = structuredClone(source);
  changed.forms.find(f => f.familyId === 'satorissamu').japaneseEvidence.recordId = 'satorissamu:T4';
  assert.ok(validateTataNameSources({ source: changed, tatari, skills }).errors.some(e => e.includes('Invalid supplemental Tata evidence')));
});

test('new family pages distinguish provided images from unverified names and gameplay', () => {
  for (const [prefix, note, pending] of [
    ['', '日本語名と進化画像は提供資料で確認しました。', '進化による性能の変化は判断できません'],
    ['en/', 'Japanese names and evolution images were checked against the provided material.', 'performance changes through evolution cannot yet be determined'],
    ['zh-cn/', '日文名称和进化图片已与提供资料核对。', '暂时无法判断进化带来的性能变化']
  ]) {
    const html = fs.readFileSync(new URL(`${prefix}tata/satorissamu/index.html`, root), 'utf8');
    assert.ok(html.includes(note), prefix);
    assert.ok(html.includes(pending), prefix);
    assert.doesNotMatch(html, /T1英語名は公式ストア|English name was checked against the official store|T1英文名称已通过官方商店/);
    for (const stage of [1, 2, 3, 4]) assert.ok(html.includes(`/satorissamu/t${stage}-512.webp`), `${prefix} T${stage}`);
  }
});
