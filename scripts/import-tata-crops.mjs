import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(sourceRoot)) {
  throw new Error('Usage: node scripts/import-tata-crops.mjs <extracted-character-pack>');
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const tatari = readJson(path.join(root, 'data', 'tatari.json'));
const verifiedRows = readJson(path.join(sourceRoot, 'manifest.json'));
const verifiedByKey = new Map(verifiedRows.map((row) => [`${row.family_id}:${row.stage}`, row]));
const stageRoot = path.join(root, 'assets', 'tata-crops', 'stage1');
const formsRoot = path.join(root, 'assets', 'tata-crops', 'forms');

if (tatari.families.length !== 64) throw new Error(`Expected 64 families, got ${tatari.families.length}`);
if (verifiedRows.length !== 111) throw new Error(`Expected 111 verified forms, got ${verifiedRows.length}`);
if (verifiedRows.some((row) => row.crop_status !== 'verified' || row.image_status !== 'verified_actual_character_image')) {
  throw new Error('The input manifest contains an unverified image');
}

fs.mkdirSync(stageRoot, { recursive: true });
fs.mkdirSync(formsRoot, { recursive: true });

const families = tatari.families.map((family, familyIndex) => {
  const stageOne = verifiedByKey.get(`${family.id}:1`);
  if (!stageOne) throw new Error(`${family.id}: missing verified Stage 1 image`);
  const stageSource = path.join(sourceRoot, '01_stage1_64_ascii', `${family.id}.webp`);
  const stageDestination = path.join(stageRoot, `${family.id}.webp`);
  if (!fs.existsSync(stageSource)) throw new Error(`${family.id}: missing Stage 1 source file`);
  if (sha256(stageSource) !== stageOne.sha256) throw new Error(`${family.id}: Stage 1 hash mismatch`);
  fs.copyFileSync(stageSource, stageDestination);

  const forms = family.evolutions.map((evolution) => {
    const verified = verifiedByKey.get(`${family.id}:${evolution.stage}`);
    if (!verified) {
      return {
        stage: evolution.stage,
        name: evolution.name,
        src: null,
        width: null,
        height: null,
        status: 'pending',
        reason: 'locked_silhouette_only'
      };
    }
    const source = path.join(sourceRoot, verified.crop_image);
    const familyDirectory = path.join(formsRoot, family.id);
    const destination = path.join(familyDirectory, `t${evolution.stage}.webp`);
    if (!fs.existsSync(source)) throw new Error(`${family.id} T${evolution.stage}: missing verified crop`);
    if (sha256(source) !== verified.sha256) throw new Error(`${family.id} T${evolution.stage}: hash mismatch`);
    fs.mkdirSync(familyDirectory, { recursive: true });
    fs.copyFileSync(source, destination);
    return {
      stage: evolution.stage,
      name: evolution.name,
      src: `/assets/tata-crops/forms/${family.id}/t${evolution.stage}.webp`,
      width: Number(verified.width),
      height: Number(verified.height),
      status: 'verified',
      sha256: verified.sha256
    };
  });

  return {
    order: familyIndex + 1,
    familyId: family.id,
    familyDisplay: family.familyName,
    attribute: family.attribute,
    stage1: {
      stage: 1,
      name: family.evolutions[0].name,
      src: `/assets/tata-crops/stage1/${family.id}.webp`,
      width: Number(stageOne.width),
      height: Number(stageOne.height),
      status: 'verified',
      sha256: stageOne.sha256
    },
    forms
  };
});

const allForms = families.flatMap((family) => family.forms);
const payload = {
  version: 1,
  generatedFrom: 'monsaba-tata-character-crops-64families-2026-09-01.zip',
  sourcePolicy: {
    gameImagesOnly: true,
    competitorImages: false,
    aiGeneratedPixels: false,
    lockedSilhouettesPublished: false
  },
  counts: {
    families: families.length,
    forms: allForms.length,
    verifiedForms: allForms.filter((form) => form.status === 'verified').length,
    pendingForms: allForms.filter((form) => form.status === 'pending').length
  },
  families
};

fs.writeFileSync(path.join(root, 'data', 'tata-images.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`タタ画像を導入しました: Stage1 ${families.length} / verified ${payload.counts.verifiedForms} / pending ${payload.counts.pendingForms}`);
