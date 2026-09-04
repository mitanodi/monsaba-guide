import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { PDF_EVIDENCE, assertPdfRange, isValidPdfPage, pagesInRange } from '../scripts/pdf-evidence.mjs';

const root = path.resolve(import.meta.dirname, '..');
const json = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const chips = json('data/zombie-rush/chips.json');
const byId = new Map(tatari.families.map((family) => [family.id, family]));

test('写真.pdf evidence coordinate system accepts only integer pages 1 through 91', () => {
  assert.equal(PDF_EVIDENCE.fileName, '写真.pdf');
  assert.equal(PDF_EVIDENCE.totalPages, 91);
  assert.equal(PDF_EVIDENCE.physicalPages, 92);
  assert.equal(PDF_EVIDENCE.excludedFrontMatterPages, 1);
  assert.equal(isValidPdfPage(1), true);
  assert.equal(isValidPdfPage(91), true);
  assert.equal(isValidPdfPage(0), false);
  assert.equal(isValidPdfPage(92), false);
  assert.equal(isValidPdfPage(1.5), false);
  assert.equal(isValidPdfPage('1'), false);
  assert.doesNotThrow(() => assertPdfRange(1, 91));
  assert.throws(() => assertPdfRange(20, 19), /start must not exceed end/);
});

test('known evidence ranges match the corrected content-page mapping', () => {
  assert.deepEqual(PDF_EVIDENCE.knownRanges.pakumaFishToss, [11, 14]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.kumashFishShot, [15, 18]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.marineBearFishCrunch, [19, 22]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.blizzlyFishBonanza, [23, 27]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.namuamidaija, [28, 33]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.roadpass, [34, 37]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.chipIndex, [40, 42]);
  assert.deepEqual(PDF_EVIDENCE.knownRanges.chipDetails, [43, 91]);
});

test('Tatari and chip source metadata store the corrected ranges', () => {
  const pakuma = byId.get('pakuma');
  const expectedPakumaSkills = [
    PDF_EVIDENCE.knownRanges.pakumaFishToss,
    PDF_EVIDENCE.knownRanges.kumashFishShot,
    PDF_EVIDENCE.knownRanges.marineBearFishCrunch,
    PDF_EVIDENCE.knownRanges.blizzlyFishBonanza
  ];
  for (const [index, range] of expectedPakumaSkills.entries()) {
    assert.deepEqual(pakuma.skills[index].source.pdfPages, pagesInRange(range));
    assert.deepEqual(skills.byFamily.pakuma.stages[index].sourceMetadata.pdfPages, pagesInRange(range));
  }
  assert.deepEqual(byId.get('nenbutsuhebi').skills[3].source.pdfPages, pagesInRange(PDF_EVIDENCE.knownRanges.namuamidaija));
  assert.deepEqual(byId.get('sukedako').skills[3].source.pdfPages, pagesInRange(PDF_EVIDENCE.knownRanges.roadpass));
  assert.deepEqual(chips.source.pdfPages, pagesInRange([40, 91]));
  assert.deepEqual(chips.chips.map((chip) => chip.source.pdfPage), pagesInRange(PDF_EVIDENCE.knownRanges.chipDetails));
});

test('target pages keep their current evidence dateModified in all three languages', () => {
  const aug30Routes = [
    '/tata/pakuma/', '/tata/sukedako/', '/tata/nenbutsuhebi/',
    '/zombie-rush/chips/', '/evolution/trials/', '/updates/2026-08-30/'
  ];
  const expectedDates = new Map([
    ...aug30Routes.map((route) => [route, '2026-08-30']),
    ['/events/', '2026-09-05']
  ]);
  for (const [sourceRoute, expectedDate] of expectedDates) {
    for (const prefix of ['', '/en', '/zh-cn']) {
      const route = `${prefix}${sourceRoute}`;
      const file = path.join(root, route.slice(1), 'index.html');
      const html = fs.readFileSync(file, 'utf8');
      assert.match(html, new RegExp(`["']dateModified["']\\s*:\\s*["']${expectedDate}["']`), route);
    }
  }
});

test('four corrected chip icons keep their ID, display name, hashed asset and 96px dimensions', async () => {
  const expected = {
    'rock-ii': ['岩の息吹II', 'rock-ii-d27266e7e6f3.webp'],
    'lightning-ii': ['雷の息吹II', 'lightning-ii-adb75288a7f7.webp'],
    'glass-cannon': ['ガラス大砲', 'glass-cannon-6964d4975725.webp'],
    'boss-killer': ['ボスキラー', 'boss-killer-1eea45bf2c0c.webp']
  };
  const chipsById = new Map(chips.chips.map((chip) => [chip.id, chip]));
  for (const [id, [displayName, fileName]] of Object.entries(expected)) {
    const chip = chipsById.get(id);
    assert.equal(chip?.name.ja, displayName);
    assert.equal(path.basename(chip?.icon || ''), fileName);
    const asset = path.join(root, chip.icon.slice(1));
    const bytes = fs.readFileSync(asset);
    const digest = createHash('sha256').update(bytes).digest('hex');
    assert.equal(fileName.endsWith(`${digest.slice(0, 12)}.webp`), true, `${id}: stale asset hash`);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 96, `${id}: width`);
    assert.equal(metadata.height, 96, `${id}: height`);
  }
});
