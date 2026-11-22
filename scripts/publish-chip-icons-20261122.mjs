import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const referenceRoot = process.argv[2];
if (!referenceRoot) throw new Error('Supply the directory containing wiki-image-reference.json and reference-images/');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, data) => fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + '\n');
const catalog = read('data/zombie-rush/chips.json');
const evidence = read('data/zombie-rush/chip-supplement-2026-11-22.json');
const references = JSON.parse(fs.readFileSync(path.join(referenceRoot, 'wiki-image-reference.json'), 'utf8'));
const authorization = {
  date: '2026-11-22', sourceType: 'user_instruction',
  statement: 'ウィキに乗ってたよそのページに / 載せていいよ',
  scope: 'Publish the 24 name-, rank- and artwork-matched Wiki game cards using the existing game-material policy.',
  thirdPartyLicenseStatus: 'unconfirmed',
  note: 'User authorization is recorded separately from an independent third-party license. No TataCalc artwork or substitute images are used.'
};
for (const row of evidence.records) {
  const chip = catalog.chips.find(item => item.id === row.id);
  const ref = references.find(item => item.url === row.referenceImageUrl);
  if (!chip || !ref || row.nameAndRankComparison !== 'matched' || row.rarity !== chip.rarity || row.japaneseName !== chip.name.ja)
    throw new Error(`Unmatched card: ${row.id}`);
  if (['I', 'II', 'III'][ref.rank - 1] !== chip.rarity || !(chip.name.ja === ref.name || chip.name.ja === ref.name + chip.rarity))
    throw new Error(`Name/rank mismatch: ${row.id}`);
  const bytes = fs.readFileSync(path.join(referenceRoot, 'reference-images', `${ref.attachment}.webp`));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const metadata = await sharp(bytes).metadata();
  if (hash !== row.referenceSha256 || hash !== ref.sha256 || metadata.width !== ref.width || metadata.height !== ref.height)
    throw new Error(`Image/hash mismatch: ${row.id}`);
  const icon = `/assets/chips/${chip.id}-wiki-${hash.slice(0, 12)}.webp`;
  fs.writeFileSync(path.join(root, icon.slice(1)), bytes);
  chip.icon = icon;
  chip.iconStatus = 'verified';
  delete chip.iconPendingReason;
  chip.iconSource = {
    sourceType: 'public_wiki_game_card', pageUrl: evidence.sourceUrl,
    imageUrl: ref.url, attachmentId: ref.attachment, sourceSha256: hash,
    width: ref.width, height: ref.height, verifiedAt: '2026-11-22',
    nameAndRankComparison: 'matched', artworkComparison: 'visually-matched-original-card',
    userAuthorization: authorization
  };
  row.imagePublicationHistory ||= [{date: '2026-11-22', status: 'withheld-before-user-authorization', imagePermission: row.imagePermission}];
  row.imagePermission = 'user-authorized';
  row.thirdPartyLicenseStatus = 'unconfirmed';
  row.artworkComparison = 'visually-matched-original-card';
  row.publishedIcon = icon;
  row.width = ref.width;
  row.height = ref.height;
}
evidence.previousImageRights ||= structuredClone(evidence.imageRights);
evidence.imageRights = {...authorization, termsUrl: 'https://atwiki.jp/tos', originalGameCards: true};
evidence.imagesPublished = 24;
evidence.imagesPending = 0;
catalog.latestSupplement.imagesPublished = 24;
catalog.latestSupplement.imagesPending = 0;
catalog.iconSource.userAuthorization = 'Explicit user requests to publish the original 49 Wiki cards and the 24 additional matched Wiki game cards (2026-11-22).';
catalog.iconSource.retrievedAt = '2026-11-22';
write('data/zombie-rush/chips.json', catalog);
write('data/zombie-rush/chip-supplement-2026-11-22.json', evidence);
console.log('Published 24 original matched cards; 73 chip icons total.');
