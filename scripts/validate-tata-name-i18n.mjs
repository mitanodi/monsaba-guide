import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const key = (familyId, stage) => `${familyId}:T${stage}`;

const source = json('data/tata-name-i18n-sources.json');
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const forms = source.forms || [];
const evolutions = (tatari.families || []).flatMap((family) => family.evolutions.map((evolution) => ({ family, evolution })));

expect(source.sources?.english?.pageCount === 235, 'English PDF page_count must be 235');
expect(source.sources?.simplifiedChinese?.pageCount === 231, 'Simplified Chinese PDF page_count must be 231');
expect(evolutions.length === 230, `Canonical Tata form count must remain 230 (actual ${evolutions.length})`);
expect(forms.length === evolutions.length, `i18n source count mismatch (${forms.length}/${evolutions.length})`);
expect(source.summary?.englishConfirmed === 230, 'English confirmed count must be 230');
expect(source.summary?.simplifiedChineseConfirmed === 230, 'Simplified Chinese confirmed count must be 230');
expect(source.summary?.bothConfirmed === 230, 'Both-locale confirmed count must be 230');
expect(source.summary?.needsReview === 0, 'needs-review entries must not be applied');

const familyIds = (tatari.families || []).map((family) => family.id);
expect(new Set(familyIds).size === familyIds.length, 'Duplicate family ID/slug detected');

const rowByKey = new Map();
const englishNames = new Set();
const chineseNames = new Set();
const englishPages = new Set();
const chinesePages = new Set();
for (const row of forms) {
  const rowKey = key(row.familyId, row.stage);
  expect(!rowByKey.has(rowKey), `Duplicate localized assignment: ${rowKey}`);
  rowByKey.set(rowKey, row);
  expect(row.confidence === 'confirmed', `Unconfirmed row must not be registered: ${rowKey}`);
  expect(typeof row.englishName === 'string' && /^[A-Za-z]+$/.test(row.englishName), `Invalid English name: ${rowKey}`);
  expect(typeof row.simplifiedChineseName === 'string' && /[\u3400-\u9fff]/.test(row.simplifiedChineseName), `Invalid Simplified Chinese name: ${rowKey}`);
  expect(!englishNames.has(row.englishName), `Duplicate English official name: ${row.englishName}`);
  expect(!chineseNames.has(row.simplifiedChineseName), `Duplicate Simplified Chinese official name: ${row.simplifiedChineseName}`);
  englishNames.add(row.englishName);
  chineseNames.add(row.simplifiedChineseName);
  expect(Number.isInteger(row.englishSourcePage) && row.englishSourcePage >= 1 && row.englishSourcePage <= 235, `Invalid English source page: ${rowKey}`);
  expect(Number.isInteger(row.chineseSourcePage) && row.chineseSourcePage >= 1 && row.chineseSourcePage <= 231, `Invalid Chinese source page: ${rowKey}`);
  expect(!englishPages.has(row.englishSourcePage), `English source page assigned twice: p.${row.englishSourcePage}`);
  expect(!chinesePages.has(row.chineseSourcePage), `Chinese source page assigned twice: p.${row.chineseSourcePage}`);
  englishPages.add(row.englishSourcePage);
  chinesePages.add(row.chineseSourcePage);
}

for (const page of source.sources?.english?.duplicatePages || []) expect(!englishPages.has(page), `English duplicate page is assigned: p.${page}`);
for (const page of source.sources?.simplifiedChinese?.duplicatePages || []) expect(!chinesePages.has(page), `Chinese duplicate page is assigned: p.${page}`);

for (const { family, evolution } of evolutions) {
  const rowKey = key(family.id, evolution.stage);
  const row = rowByKey.get(rowKey);
  expect(Boolean(row), `Missing localized source row: ${rowKey}`);
  if (!row) continue;
  expect(evolution.name === row.japaneseName, `Japanese name changed or mismatched: ${rowKey}`);
  expect(evolution.nameEn === row.englishName, `English name mismatch: ${rowKey}`);
  expect(evolution.nameZhHans === row.simplifiedChineseName, `Simplified Chinese name mismatch: ${rowKey}`);
  const stage = skills.byFamily?.[family.id]?.stages?.find((item) => item.stage === evolution.stage);
  expect(stage?.tataName === evolution.name, `Skill-stage Japanese name mismatch: ${rowKey}`);
  expect(stage?.nameEn === evolution.nameEn, `Skill-stage English name mismatch: ${rowKey}`);
  expect(stage?.nameZhHans === evolution.nameZhHans, `Skill-stage Chinese name mismatch: ${rowKey}`);
  const aliases = globalThis.MONSABA_FAMILY.getFamilySearchAliases(family);
  expect(aliases.includes(evolution.nameEn), `English search alias missing: ${rowKey}`);
  expect(aliases.includes(evolution.nameZhHans), `Chinese search alias missing: ${rowKey}`);
}

const examples = [
  ['yanzaru', 1, 'Punchimp', '顽皮吗喽'],
  ['yanzaru', 4, 'Rockong', '大圣吗喽'],
  ['shizukuchou', 1, 'Dewgrub', '露水虫'],
  ['shizukuchou', 3, 'Waveflutter', '水舞蝶'],
  ['rokuju', 1, 'Rubblet', '小岩蜥'],
  ['rokuju', 4, 'Meteorax', '陨岩龙']
];
for (const [familyId, stage, englishName, chineseName] of examples) {
  const row = rowByKey.get(key(familyId, stage));
  expect(row?.englishName === englishName && row?.simplifiedChineseName === chineseName, `Confirmed example mismatch: ${familyId}:T${stage}`);
}

for (const family of tatari.families || []) {
  const html = read(`tata/${family.id}/index.html`);
  for (const evolution of family.evolutions || []) {
    expect(html.includes(`English:</b> ${evolution.nameEn}`), `${family.id}:T${evolution.stage} English name missing from detail page`);
    expect(html.includes(`简体中文:</b> ${evolution.nameZhHans}`), `${family.id}:T${evolution.stage} Chinese name missing from detail page`);
  }
}

expect(read('family-display.js').includes('evolution?.nameEn') && read('family-display.js').includes('evolution?.nameZhHans'), 'Shared family aliases do not include official names');
expect(read('search/search.js').includes('item.nameEn') && read('search/search.js').includes('item.nameZhHans'), 'Site search does not match official names');
expect(read('consult/consult.js').includes('stage.nameEn') && read('consult/consult.js').includes('stage.nameZhHans'), 'Consult does not resolve official stage names');

if (errors.length) {
  console.error(`Tata name i18n validation failed (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Tata name i18n validation passed: ${evolutions.length} forms / EN ${englishNames.size} / zh-Hans ${chineseNames.size} / needs-review 0`);
