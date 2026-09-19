import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const manifestRoot = process.argv.find((argument) => argument.startsWith('--manifest-root='))?.slice('--manifest-root='.length);
if (!manifestRoot) throw new Error('Usage: node scripts/import-official-feeding-assets.mjs --manifest-root=<04_MANIFEST>');

const manifest = JSON.parse(fs.readFileSync(path.join(manifestRoot, 'assets-master.json'), 'utf8'));
const selection = [
  ['MSOA-05152', 'soda'], ['MSOA-05137', 'ice-cream'], ['MSOA-05145', 'potatoes'],
  ['MSOA-05142', 'noodles'], ['MSOA-05148', 'salad'], ['MSOA-05151', 'smoothie'],
  ['MSOA-05144', 'pizza'], ['MSOA-05153', 'soup'], ['MSOA-05155', 'sushi'],
  ['MSOA-06185', 'automatic-feeder']
];
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const outputRoot = path.join(root, 'assets', 'official', 'feeding');
fs.mkdirSync(outputRoot, { recursive: true });

const assets = [];
for (const [assetId, slug] of selection) {
  const asset = manifest.assets.find((entry) => entry.asset_id === assetId);
  if (!asset) throw new Error(`${assetId}: manifest record not found`);
  const source = asset.local_original_path;
  if (!fs.existsSync(source)) throw new Error(`${assetId}: source image not found`);
  if (hash(source) !== asset.sha256) throw new Error(`${assetId}: source SHA-256 mismatch`);
  const filename = `${slug}.webp`;
  const target = path.join(outputRoot, filename);
  await sharp(source).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(target);
  const metadata = await sharp(target).metadata();
  assets.push({
    officialAssetId: assetId,
    sourceSha256: asset.sha256,
    originalDrivePath: asset.original_drive_path,
    slug,
    optimizedPath: `/assets/official/feeding/${filename}`,
    optimizedSha256: hash(target),
    width: metadata.width,
    height: metadata.height,
    alpha: Boolean(asset.alpha)
  });
}

const output = {
  generatedAt: new Date().toISOString(),
  source: 'MonsterSurvival Official Creator Assets',
  count: assets.length,
  assets
};
fs.writeFileSync(path.join(root, 'data', 'official-assets', 'feeding-images.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`餌付け公式素材を最適化: ${assets.length}件`);
