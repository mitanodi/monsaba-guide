import fs from 'node:fs';
import path from 'node:path';
import { PDF_EVIDENCE, assertPdfPage, assertPdfRange, pagesInRange } from './pdf-evidence.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const tatari = readJson('tatari.json');
const skills = readJson('tata-skills.json');
const chips = readJson('zombie-rush/chips.json');
const trials = readJson('evolution-trials.json');
const events = readJson('events.json');
const byId = new Map(tatari.families.map((family) => [family.id, family]));
const equalPages = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const expectPages = (actual, range, label) => expect(equalPages(actual, pagesInRange(range)), `${label}: expected PDF pages ${range[0]}-${range[1]}, got ${JSON.stringify(actual)}`);

function validatePdfMetadata(value, label = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePdfMetadata(item, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.sourceName?.includes(PDF_EVIDENCE.fileName) || value.fileName === PDF_EVIDENCE.fileName) {
    if ('pdfPage' in value) assertPdfPage(value.pdfPage, `${label}.pdfPage`);
    if ('pdfPages' in value) {
      expect(Array.isArray(value.pdfPages) && value.pdfPages.length > 0, `${label}.pdfPages must be a non-empty array`);
      value.pdfPages.forEach((page, index) => assertPdfPage(page, `${label}.pdfPages[${index}]`));
      assertPdfRange(value.pdfPages[0], value.pdfPages.at(-1), `${label}.pdfPages`);
      expect(value.pdfPages.every((page, index) => index === 0 || page > value.pdfPages[index - 1]), `${label}.pdfPages must be strictly ascending`);
    }
  }
  for (const [key, child] of Object.entries(value)) validatePdfMetadata(child, `${label}.${key}`);
}

function validateReferenceText(relative) {
  const text = fs.readFileSync(path.join(root, relative), 'utf8');
  const patterns = [
    /写真\.pdf p\.(\d+)(?:[-〜](\d+))?/g,
    /PDF pp?\.\s*(\d+)(?:\s*[–-]\s*(\d+))?/gi,
    /PDF第(\d+)(?:[–-](\d+))?页/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) assertPdfRange(Number(match[1]), Number(match[2] || match[1]), `${relative}: ${match[0]}`);
  }
  expect(!/写真\.pdf p\.92\b/.test(text), `${relative}: p.92 is forbidden`);
}

const fileForRoute = (route) => path.join(root, route.slice(1), 'index.html');
const dateModifiedFor = (route) => fs.readFileSync(fileForRoute(route), 'utf8').match(/["']dateModified["']\s*:\s*["']([^"']+)["']/)?.[1];

expect(tatari.families.length === 64, 'family count must be 64');
expect(tatari.families.flatMap((family) => family.evolutions).length === 230, 'form count must be 230');
expect(skills.totals.stages === 230, 'skill stage count must be 230');
expect(tatari.meta.latestEvidence?.fileName === PDF_EVIDENCE.fileName && tatari.meta.latestEvidence?.pages === PDF_EVIDENCE.totalPages, 'tatari latestEvidence must use 写真.pdf evidence pages 1-91');
expect(skills.sourceEvidence?.fileName === PDF_EVIDENCE.fileName && skills.sourceEvidence?.pages === PDF_EVIDENCE.totalPages, 'skill sourceEvidence must use 写真.pdf evidence pages 1-91');
expect(byId.get('pakuma')?.evolutions.map((item) => item.name).join('|') === 'パクマ|クマッシュ|マリンベア|ブリズリー', 'Pakuma line mismatch');
expect(byId.get('sukedako')?.evolutions[3]?.name === 'ロードパス', 'Roadpass missing');
expect(byId.get('nenbutsuhebi')?.evolutions[3]?.name === 'ナムアミダイジャ', 'Namuamidaija missing');
expect(skills.byFamily.pakuma?.stages[3]?.values.some((item) => item.label === 'オーラ・水 最大回復量' && item.value === '対象最大HPの2.5%'), 'Pakuma aura mismatch');
expect(skills.byFamily.nenbutsuhebi?.stages[3]?.values.some((item) => item.label === 'オーラ・岩 最大被ダメージ軽減' && item.value === '17.5%'), 'Rock aura mismatch');
expect(chips.chips.length === 49 && new Set(chips.chips.map((chip) => chip.id)).size === 49, 'chip count or IDs mismatch');
for (const chip of chips.chips) {
  expect(chip.name?.ja && chip.effect?.ja && chip.effect?.en && chip.effect?.['zh-CN'], `${chip.id}: localized effect missing`);
  expect(['I', 'II', 'III'].includes(chip.rarity), `${chip.id}: invalid rank`);
  expect(Number.isInteger(chip.source?.pdfPage), `${chip.id}: PDF page missing`);
  assertPdfPage(chip.source.pdfPage, `${chip.id}: PDF page`);
  expect(fs.existsSync(path.join(root, chip.icon.slice(1))), `${chip.id}: icon missing`);
}
validatePdfMetadata(tatari, 'tatari');
validatePdfMetadata(skills, 'skills');
validatePdfMetadata(chips, 'chips');

const pakuma = byId.get('pakuma');
const pakumaSkillRanges = [
  PDF_EVIDENCE.knownRanges.pakumaFishToss,
  PDF_EVIDENCE.knownRanges.kumashFishShot,
  PDF_EVIDENCE.knownRanges.marineBearFishCrunch,
  PDF_EVIDENCE.knownRanges.blizzlyFishBonanza
];
const pakumaEvolutionRanges = [[6, 7], [8, 8], [9, 9], [10, 10]];
pakumaEvolutionRanges.forEach((range, index) => expectPages(pakuma.evolutions[index].sourceMetadata.pdfPages, range, `Pakuma evolution ${index + 1}`));
pakumaSkillRanges.forEach((range, index) => {
  expectPages(pakuma.skills[index].source.pdfPages, range, `Pakuma skill ${index + 1}`);
  expectPages(skills.byFamily.pakuma.stages[index].sourceMetadata.pdfPages, range, `Pakuma skill DB ${index + 1}`);
});
expectPages(byId.get('nenbutsuhebi').skills[3].source.pdfPages, PDF_EVIDENCE.knownRanges.namuamidaija, 'Namuamidaija');
expectPages(byId.get('sukedako').skills[3].source.pdfPages, PDF_EVIDENCE.knownRanges.roadpass, 'Roadpass');
expectPages(chips.source.pdfPages, [40, 91], 'Chip source coverage');
expect(equalPages(chips.chips.map((chip) => chip.source.pdfPage), pagesInRange(PDF_EVIDENCE.knownRanges.chipDetails)), 'Chip detail pages must be 43-91 in display order');

const referenceFiles = [
  'data/tatari.json', 'data/tata-skills.json', 'data/zombie-rush/chips.json',
  'docs/evidence/2026-08-30-gigafile-manifest.md', 'scripts/generate-2026-08-30-mega-update.mjs',
  ...['', 'en/', 'zh-cn/'].flatMap((prefix) => [
    `${prefix}tata/pakuma/index.html`, `${prefix}tata/sukedako/index.html`, `${prefix}tata/nenbutsuhebi/index.html`, `${prefix}zombie-rush/chips/index.html`
  ])
];
referenceFiles.forEach(validateReferenceText);
expect(trials.families.length === 64 && new Set(trials.families.map((family) => family.familyId)).size === 64, 'evolution trials must map 64 unique families');
expect(trials.families.every((family) => byId.has(family.familyId)), 'evolution trial family ID mismatch');
expect(events.events.length === 9, 'event guide count must be 9');
for (const route of ['/zombie-rush/chips/', '/evolution/trials/', '/updates/2026-08-30/', ...events.events.map((event) => `/events/${event.id}/`)]) expect(fs.existsSync(path.join(root, route.slice(1), 'index.html')), `${route}: page missing`);
const modifiedRoutes = ['/tata/pakuma/', '/tata/sukedako/', '/tata/nenbutsuhebi/', '/zombie-rush/chips/', '/evolution/trials/', '/events/', '/updates/2026-08-30/'];
for (const route of modifiedRoutes) {
  for (const prefix of ['', '/en', '/zh-cn']) {
    const localizedRoute = `${prefix}${route}`;
    expect(dateModifiedFor(localizedRoute) === '2026-08-30', `${localizedRoute}: dateModified must be 2026-08-30`);
  }
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const route of modifiedRoutes) {
  for (const prefix of ['', '/en', '/zh-cn']) {
    const localizedRoute = `${prefix}${route}`;
    const url = `https://monster-survival.com${localizedRoute}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(new RegExp(`<loc>${url}</loc><lastmod>2026-08-30</lastmod>`).test(sitemap), `${localizedRoute}: sitemap lastmod must be 2026-08-30`);
  }
}
expect(!/<loc>https:\/\/monster-survival\.com\/tata\/takepanda\/<\/loc><lastmod>2026-08-30<\/lastmod>/.test(sitemap), 'unrelated Tata pages must not be stamped 2026-08-30');
expect(!JSON.stringify(chips).includes('IMG_') && !JSON.stringify(chips).includes('UID'), 'chip data contains account identifiers');
expect(!fs.readFileSync(path.join(root, 'zombie-rush/chips/chips.js'), 'utf8').includes('query_text'), 'analytics must not send search text');
console.log('2026-08-30 update validation passed: PDF evidence pages 1-91 / 64 families / 230 forms / 49 chips / 64 trials / 9 events / localized dates.');
