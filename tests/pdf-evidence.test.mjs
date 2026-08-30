import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
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

test('target pages use Aug 30 dateModified in all three languages', () => {
  const sourceRoutes = [
    '/tata/pakuma/', '/tata/sukedako/', '/tata/nenbutsuhebi/',
    '/zombie-rush/chips/', '/evolution/trials/', '/events/', '/updates/2026-08-30/'
  ];
  for (const sourceRoute of sourceRoutes) {
    for (const prefix of ['', '/en', '/zh-cn']) {
      const route = `${prefix}${sourceRoute}`;
      const file = path.join(root, route.slice(1), 'index.html');
      const html = fs.readFileSync(file, 'utf8');
      assert.match(html, /["']dateModified["']\s*:\s*["']2026-08-30["']/, route);
    }
  }
});
