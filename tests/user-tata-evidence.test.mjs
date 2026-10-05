import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { validateTataNameSources } from '../scripts/lib/validate-tata-name-sources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const evidence = json('data/user-tata-evidence-2026-10-06.json');
const tatari = json('data/tatari.json');
const images = json('data/tata-images.json');
const skills = json('data/tata-skills.json');
const source = json('data/tata-name-i18n-sources.json');
const fixture = () => structuredClone({ source, tatari, skills });

test('the reviewed PDF pages map to twelve complete, transparent character images', async () => {
  assert.equal(evidence.sourceSha256, 'b587e5e6c0453e7406c71e867edc8adf1abe545433269ad48eae29598dd103df');
  assert.equal(evidence.pageCount, 14);
  const expected = {
    rukaron: ['ルカロン', 'パステルカ', 'メルフィン', 'オパーリア'],
    pakuma: ['パクマ', 'クマッシュ', 'マリンベア', 'ブリズリー'],
    nusuke: ['ヌスケ', 'ラクディット', 'マスクーン', 'トリックーン']
  };
  assert.equal(evidence.records.length, 12);
  for (const [id, names] of Object.entries(expected)) {
    const family = tatari.families.find((item) => item.id === id);
    assert.deepEqual(family.evolutions.map((item) => item.name), names);
    for (const evolution of family.evolutions) {
      const form = images.families.find((item) => item.familyId === id).forms.find((item) => item.stage === evolution.stage);
      const record = evidence.records.find((item) => item.familyId === id && item.stage === evolution.stage);
      assert.equal(record.sourcePage, (id === 'rukaron' ? 0 : id === 'pakuma' ? 4 : 9) + evolution.stage);
      assert.equal(form.sourceType, 'user-provided-pdf');
      assert.equal(form.sourcePage, record.sourcePage);
      assert.equal(evolution.image, form.src.slice(1));
      for (const size of [256, 512]) {
        const output = record.outputs[size];
        const buffer = fs.readFileSync(path.join(root, output.path.slice(1)));
        assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), output.sha256);
        const metadata = await sharp(buffer).metadata();
        assert.equal(metadata.width, size);
        assert.equal(metadata.height, size);
        assert.equal(metadata.hasAlpha, true);
      }
      assert.equal(form.sha256, record.outputs[512].sha256);
    }
  }
});

test('new family has no invented skill numbers, ratings, or evolution requirements', () => {
  assert.equal(tatari.families.find((family) => family.id === 'rukaron').evolutions[0].nameEn, 'Dolphie');
  assert.equal(tatari.families.find((family) => family.id === 'pakuma').evolutions[0].nameEn, 'Snowcub');
  for (const stage of skills.byFamily.rukaron.stages) {
    assert.equal(stage.verificationStatus, 'pending-user-skill-evidence');
    assert.deepEqual(stage.values, []);
    assert.equal(stage.skillName, '確認待ち');
  }
  const ratings = json('data/tier-ratings.json');
  assert.equal(ratings.overall.byFamily.rukaron.tier, null);
  assert.equal(ratings.zombieRush.byFamily.rukaron.tier, null);
  for (const condition of json('data/evolution-trials.json').families.find((family) => family.familyId === 'rukaron').conditions)
    assert.equal(condition.status, 'pending');
});

test('pending names cannot be filled with wiki names or invented translations', () => {
  for (const [field, value] of [['nameEn', 'Blubbles'], ['nameZhHans', '虚构名称']]) {
    const data = fixture();
    data.tatari.families.find((family) => family.id === 'rukaron').evolutions[1][field] = value;
    assert.ok(validateTataNameSources(data).errors.length > 0);
  }
  const data = fixture();
  const row = data.source.forms.find((item) => item.familyId === 'rukaron' && item.stage === 2);
  row.englishName = 'Blubbles';
  data.tatari.families.find((family) => family.id === 'rukaron').evolutions[1].nameEn = 'Blubbles';
  assert.ok(validateTataNameSources(data).errors.some((error) => error.includes('Pending Tata name')));
});

test('untrusted URLs and missing uncertainty states cannot become official evidence', () => {
  const data = fixture();
  data.source.forms.find((item) => item.familyId === 'rukaron' && item.stage === 1).localizedEvidence.en.url = 'https://w.atwiki.jp/monstersurvival/pages/17.html';
  assert.ok(validateTataNameSources(data).errors.some((error) => error.includes('Invalid supplemental localized source')));
  const missing = fixture();
  delete missing.tatari.families.find((family) => family.id === 'rukaron').evolutions[1].nameVerification;
  assert.ok(validateTataNameSources(missing).errors.some((error) => error.includes('Supplemental Tata name source mismatch')));
});
