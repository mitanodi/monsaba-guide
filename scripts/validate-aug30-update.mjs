import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const tatari = readJson('tatari.json');
const skills = readJson('tata-skills.json');
const chips = readJson('zombie-rush/chips.json');
const trials = readJson('evolution-trials.json');
const events = readJson('events.json');
const byId = new Map(tatari.families.map((family) => [family.id, family]));

expect(tatari.families.length === 64, 'family count must be 64');
expect(tatari.families.flatMap((family) => family.evolutions).length === 230, 'form count must be 230');
expect(skills.totals.stages === 230, 'skill stage count must be 230');
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
  expect(fs.existsSync(path.join(root, chip.icon.slice(1))), `${chip.id}: icon missing`);
}
expect(trials.families.length === 64 && new Set(trials.families.map((family) => family.familyId)).size === 64, 'evolution trials must map 64 unique families');
expect(trials.families.every((family) => byId.has(family.familyId)), 'evolution trial family ID mismatch');
expect(events.events.length === 9, 'event guide count must be 9');
for (const route of ['/zombie-rush/chips/', '/evolution/trials/', '/updates/2026-08-30/', ...events.events.map((event) => `/events/${event.id}/`)]) expect(fs.existsSync(path.join(root, route.slice(1), 'index.html')), `${route}: page missing`);
expect(!JSON.stringify(chips).includes('IMG_') && !JSON.stringify(chips).includes('UID'), 'chip data contains account identifiers');
expect(!fs.readFileSync(path.join(root, 'zombie-rush/chips/chips.js'), 'utf8').includes('query_text'), 'analytics must not send search text');
console.log('2026-08-30 update validation passed: 64 families / 230 forms / 49 chips / 64 trials / 9 events.');
