import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const tatari = readJson('data/tatari.json');
const images = readJson('data/tata-images.json');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const dbFamilies = tatari.families || [];
const imageFamilies = images.families || [];
const byId = new Map(imageFamilies.map((family) => [family.familyId, family]));
const dbForms = dbFamilies.flatMap((family) => family.evolutions.map((form) => ({ family, form })));
const mappedForms = imageFamilies.flatMap((family) => family.forms || []);
const verifiedForms = mappedForms.filter((form) => form.status === 'verified');
const pendingForms = mappedForms.filter((form) => form.status === 'pending');

expect(dbFamilies.length === 64, `DB family count must be 64, got ${dbFamilies.length}`);
expect(dbForms.length === 230, `DB form count must be 230, got ${dbForms.length}`);
expect(imageFamilies.length === 64, `image family count must be 64, got ${imageFamilies.length}`);
expect(new Set(imageFamilies.map((family) => family.familyId)).size === 64, 'image family IDs must be unique');
expect(verifiedForms.length === 225, `verified form count must be 225, got ${verifiedForms.length}`);
expect(pendingForms.length === 5, `pending form count must be 5, got ${pendingForms.length}`);
expect(verifiedForms.filter((form) => form.sourceType === 'official_creator_asset').length === 121, 'official creator asset form count must be 121');
expect(images.sourcePolicy?.lockedSilhouettesPublished === false, 'locked silhouettes must not be published');
expect(images.sourcePolicy?.competitorImages === false, 'competitor images must be false');
expect(images.sourcePolicy?.aiGeneratedPixels === false, 'AI-generated pixels must be false');

const attributes = Object.fromEntries(['草', '水', '火', '雷', '岩'].map((attribute) => [attribute, dbFamilies.filter((family) => family.attribute === attribute).length]));
expect(JSON.stringify(attributes) === JSON.stringify({ 草: 13, 水: 13, 火: 13, 雷: 13, 岩: 12 }), `attribute counts mismatch: ${JSON.stringify(attributes)}`);

const stageHashes = [];
for (const family of dbFamilies) {
  const mapped = byId.get(family.id);
  expect(Boolean(mapped), `${family.id}: image mapping missing`);
  if (!mapped) continue;
  expect(mapped.attribute === family.attribute, `${family.id}: attribute mismatch`);
  expect(mapped.stage1?.name === family.evolutions[0]?.name, `${family.id}: Stage 1 name mismatch`);
  expect(mapped.stage1?.status === 'verified', `${family.id}: Stage 1 must be verified`);
  expect((mapped.forms || []).length === family.evolutions.length, `${family.id}: form mapping count mismatch`);
  const stageFile = path.join(root, mapped.stage1.src.replace(/^\//, ''));
  expect(fs.existsSync(stageFile), `${family.id}: Stage 1 file missing`);
  if (fs.existsSync(stageFile)) {
    const metadata = await sharp(stageFile).metadata();
    expect(metadata.format === 'webp', `${family.id}: Stage 1 must be WebP`);
    expect(metadata.width === metadata.height && metadata.width > 0, `${family.id}: Stage 1 must be square`);
    expect(metadata.width === mapped.stage1.width && metadata.height === mapped.stage1.height, `${family.id}: Stage 1 dimensions mismatch`);
    expect(sha256(stageFile) === mapped.stage1.sha256, `${family.id}: Stage 1 hash mismatch`);
    stageHashes.push(mapped.stage1.sha256);
  }
  for (const evolution of family.evolutions) {
    const form = mapped.forms.find((entry) => entry.stage === evolution.stage);
    expect(Boolean(form), `${family.id} T${evolution.stage}: form mapping missing`);
    if (!form) continue;
    expect(form.name === evolution.name, `${family.id} T${evolution.stage}: name mismatch`);
    if (form.status === 'pending') {
      expect(form.src === null, `${family.id} T${evolution.stage}: pending form must not have src`);
      expect(form.reason === 'locked_silhouette_only', `${family.id} T${evolution.stage}: pending reason mismatch`);
      continue;
    }
    if (form.sourceType === 'official_creator_asset') {
      expect(/^MSOA-\d{5}$/.test(form.officialAssetId || ''), `${family.id} T${evolution.stage}: official asset ID missing`);
      expect(/^[a-f0-9]{64}$/.test(form.sourceSha256 || ''), `${family.id} T${evolution.stage}: source SHA-256 missing`);
      expect(form.optimizedPath === form.src, `${family.id} T${evolution.stage}: optimized path mismatch`);
      expect(form.verifiedAt === '2026-09-04', `${family.id} T${evolution.stage}: verification date mismatch`);
      expect(typeof form.srcset === 'string' && form.srcset.includes('256w') && form.srcset.includes('512w'), `${family.id} T${evolution.stage}: responsive srcset missing`);
      for (const candidate of form.srcset.match(/\/assets\/[^ ]+/g) || []) {
        expect(fs.existsSync(path.join(root, candidate.slice(1))), `${family.id} T${evolution.stage}: srcset file missing ${candidate}`);
      }
    }
    const formFile = path.join(root, form.src.replace(/^\//, ''));
    expect(fs.existsSync(formFile), `${family.id} T${evolution.stage}: verified file missing`);
    if (fs.existsSync(formFile)) {
      const metadata = await sharp(formFile).metadata();
      expect(metadata.format === 'webp', `${family.id} T${evolution.stage}: must be WebP`);
      expect(metadata.width === metadata.height && metadata.width > 0, `${family.id} T${evolution.stage}: must be square`);
      expect(metadata.width === form.width && metadata.height === form.height, `${family.id} T${evolution.stage}: dimensions mismatch`);
      expect(sha256(formFile) === form.sha256, `${family.id} T${evolution.stage}: hash mismatch`);
    }
  }
}

expect(new Set(stageHashes).size === 64, 'Stage 1 images must have 64 unique hashes');
expect(new Set(verifiedForms.map((form) => form.src)).size === verifiedForms.length, 'verified form paths must be unique');
expect(!fs.existsSync(path.join(root, 'assets', 'tata-crops', '05_contact_sheets')), 'contact sheets must not be published');

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`タタ画像検証成功: Stage1 64 / verified ${verifiedForms.length} / pending ${pendingForms.length} / 属性 ${Object.values(attributes).join('/')}`);
