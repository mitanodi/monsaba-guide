import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const images = json('data/tata-images.json');
const tatari = json('data/tatari.json');
const sourceMap = json('data/official-assets/tata-source-map.json');
const expectedPending = ['nenbutsuhebi:T4', 'pakuma:T2', 'pakuma:T3', 'pakuma:T4', 'sukedako:T4'];

const forms = images.families.flatMap((family) => family.forms.map((form) => ({ familyId: family.familyId, ...form })));
const official = forms.filter((form) => form.sourceType === 'official_creator_asset');
const pending = forms.filter((form) => form.status === 'pending');

test('all 230 Tata forms have one stage-correct mapping with only five expected pending', () => {
  assert.equal(forms.length, 230);
  assert.equal(new Set(forms.map((form) => `${form.familyId}:T${form.stage}`)).size, 230);
  assert.equal(official.length, 224);
  assert.deepEqual(pending.map((form) => `${form.familyId}:T${form.stage}`).sort(), expectedPending);
  assert.equal(forms.filter((form) => form.status === 'verified' && form.sourceType !== 'official_creator_asset').length, 1);
  assert.equal(forms.find((form) => form.familyId === 'pakuma' && form.stage === 1).src, '/assets/tata-crops/forms/pakuma/t1.webp');
});
test('official source mapping has no duplicate, stage mismatch, fallback, or missing optimized file', async () => {
  assert.equal(sourceMap.assets.length, 224);
  assert.equal(new Set(sourceMap.assets.map((record) => record.officialAssetId)).size, 224, 'duplicate official asset ID');
  assert.equal(new Set(sourceMap.assets.map((record) => `${record.familyId}:T${record.stage}`)).size, 224, 'duplicate family/stage mapping');
  for (const record of sourceMap.assets) {
    const form = forms.find((candidate) => candidate.familyId === record.familyId && candidate.stage === record.stage);
    assert.ok(form, `${record.familyId}:T${record.stage} missing`);
    assert.equal(form.sourceType, 'official_creator_asset');
    assert.equal(form.officialAssetId, record.officialAssetId);
    assert.equal(form.src, record.optimizedPath);
    assert.doesNotMatch(form.src, /assets\/(?:monsters|thumbs|tata-crops)\//);
    for (const file of [form.src.replace('-512.webp', '-256.webp'), form.src]) {
      const absolute = path.join(root, file.slice(1));
      assert.ok(fs.existsSync(absolute), `${file} missing`);
      const metadata = await sharp(absolute).metadata();
      const expectedSize = file.includes('-256.webp') ? 256 : 512;
      assert.equal(metadata.width, expectedSize);
      assert.equal(metadata.height, expectedSize);
    }
    assert.equal(sha256(path.join(root, form.src.slice(1))), form.sha256);
  }
});

test('database and every major consumer use the same official-capable SSOT', () => {
  for (const family of tatari.families) {
    for (const evolution of family.evolutions) {
      const form = forms.find((candidate) => candidate.familyId === family.id && candidate.stage === evolution.stage);
      if (form.status === 'verified') assert.equal(evolution.image, form.src.slice(1), `${family.id}:T${evolution.stage}`);
    }
  }
  for (const file of ['app.js', 'tata-tier/tata-tier.js', 'evolution-priority/evolution-priority.js', 'team-builder/team-builder.js', 'zombie-rush/zombie-rush.js', 'attribute/attribute-guide.js', 'search/search.js', 'compare/compare.js', 'my-monsaba/my-monsaba.js']) {
    assert.match(read(file), /data\/tata-images\.json/, `${file}: shared mapping missing`);
  }
  assert.equal(images.families.filter((family) => family.stage1.sourceType === 'official_creator_asset').length, 63);
  assert.doesNotMatch(read('team-builder/team-builder.js'), /assets\/(?:monsters|thumbs|tata-crops)\//);
  assert.doesNotMatch(read('team-builder/community/community.js'), /assets\/(?:monsters|thumbs|tata-crops)\//);
});

test('legacy cleanup retains only evidence-backed exceptions', () => {
  assert.equal(fs.existsSync(path.join(root, 'assets', 'thumbs')), false);
  const monsters = fs.readdirSync(path.join(root, 'assets', 'monsters')).sort();
  assert.deepEqual(monsters, ['blizzly.webp', 'kumash.webp', 'marine-bear.webp', 'namuamidaija.webp', 'roadpass.webp']);
  const cropFiles = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute); else cropFiles.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
  };
  walk(path.join(root, 'assets', 'tata-crops'));
  assert.deepEqual(cropFiles, ['assets/tata-crops/forms/pakuma/t1.webp']);
  assert.match(read('docs/evidence/official-assets-full-replacement-2026-09-04.md'), /公式対応可能なのに未置換: 0/);
});
