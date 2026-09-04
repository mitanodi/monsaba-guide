import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const tataImages = readJson('data/tata-images.json');
const tataSources = readJson('data/official-assets/tata-source-map.json');
const skillIcons = readJson('data/official-assets/skill-icons.json');
const eventImages = readJson('data/official-assets/event-images.json');
const siteIcons = readJson('data/official-assets/site-icons.json');
const nameAudit = readJson('data/official-assets/name-audit.json');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const forms = tataImages.families.flatMap((family) => family.forms.map((form) => ({ familyId: family.familyId, ...form })));
const officialForms = forms.filter((form) => form.sourceType === 'official_creator_asset');
const pending = forms.filter((form) => form.status === 'pending').map((form) => `${form.familyId}:T${form.stage}`).sort();
expect(officialForms.length === 224, `official Tata forms must be 224, got ${officialForms.length}`);
expect(tataSources.assets.length === 224, `Tata source records must be 224, got ${tataSources.assets.length}`);
expect(tataSources.counts.pending_to_official === 114, 'pending to official count must be 114');
expect(tataSources.counts.verified_to_official === 110, 'verified-to-official replacement count must be 110');
expect(JSON.stringify(pending) === JSON.stringify(['nenbutsuhebi:T4', 'pakuma:T2', 'pakuma:T3', 'pakuma:T4', 'sukedako:T4']), `pending forms mismatch: ${pending.join(', ')}`);
expect(skillIcons.count === 58 && skillIcons.icons.length === 58, 'skill icon count must be 58');
expect(eventImages.count === 4 && eventImages.events.length === 4, 'event image count must be 4');
expect(siteIcons.count === 1 && siteIcons.outputs.length === 5, 'site icon source/output count mismatch');
expect(nameAudit.confirmed.count === 223 && nameAudit.confirmed.differences === 0 && nameAudit.confirmed.changes === 0, 'confirmed name audit mismatch');
expect(nameAudit.candidate.count === 7 && nameAudit.candidate.changes === 0, 'candidate names must remain unchanged');
expect(nameAudit.internalOnly.count === 4 && nameAudit.internalOnly.changes === 0, 'internal-only names must remain unchanged');

const records = [
  ...officialForms.map((form) => ({ id: form.officialAssetId, path: form.src, expectedHash: form.sha256, width: form.width, height: form.height })),
  ...skillIcons.icons.map((icon) => ({ id: icon.officialAssetId, path: icon.optimizedPath, expectedHash: icon.optimizedSha256, width: icon.width, height: icon.height })),
  ...eventImages.events.map((image) => ({ id: image.officialAssetId, path: image.optimizedPath, expectedHash: image.optimizedSha256, width: image.width, height: image.height })),
];
const sourceIds = [...records.map((record) => record.id), siteIcons.officialAssetId];
expect(sourceIds.length === 287 && new Set(sourceIds).size === 287, 'official asset IDs must be unique across 287 adopted sources');
for (const record of records) {
  expect(/^MSOA-\d{5}$/.test(record.id), `${record.id}: invalid asset ID`);
  expect(record.path.startsWith('/assets/official/') && !/^https?:/i.test(record.path), `${record.id}: local optimized path required`);
  const file = path.join(root, record.path.slice(1));
  expect(fs.existsSync(file), `${record.id}: optimized file missing`);
  if (!fs.existsSync(file)) continue;
  const metadata = await sharp(file).metadata();
  expect(metadata.format === 'webp', `${record.id}: WebP required`);
  expect(metadata.width === record.width && metadata.height === record.height, `${record.id}: dimensions mismatch`);
  expect(hash(file) === record.expectedHash, `${record.id}: optimized SHA-256 mismatch`);
}
expect(/^MSOA-\d{5}$/.test(siteIcons.officialAssetId), 'site icon asset ID invalid');
expect(/^[a-f0-9]{64}$/.test(siteIcons.sourceSha256), 'site icon source SHA-256 invalid');
for (const output of siteIcons.outputs) {
  const file = path.join(root, output.path.slice(1));
  expect(fs.existsSync(file), `${output.path}: site icon output missing`);
  if (fs.existsSync(file)) expect(hash(file) === output.sha256, `${output.path}: site icon SHA-256 mismatch`);
}

const publicFiles = ['index.html', 'team-builder/team-builder.js', 'tata-tier/tata-tier.js', 'compare/compare.js', 'search/search.js', 'events/treasure-hunt/index.html'];
for (const file of publicFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  expect(!/drive\.google\.com|googleusercontent\.com/i.test(source), `${file}: Google Drive hotlink detected`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('公式素材検証成功: asset 287 / Tata 224 / skill 58 / event 4 / site icon 1 / pending 5');
