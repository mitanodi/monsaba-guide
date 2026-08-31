import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const key = (familyId, stage) => `${familyId}:T${stage}`;

const source = readJson('data/tata-name-i18n-sources.json');
const tatari = readJson('data/tatari.json');
const skills = readJson('data/tata-skills.json');
const rows = source.forms || [];
const byKey = new Map();

for (const row of rows) {
  const rowKey = key(row.familyId, row.stage);
  if (byKey.has(rowKey)) throw new Error(`Duplicate Tata i18n source row: ${rowKey}`);
  if (row.confidence !== 'confirmed') throw new Error(`Only confirmed names may be applied: ${rowKey}`);
  if (!row.englishName || !row.simplifiedChineseName) throw new Error(`Missing localized name: ${rowKey}`);
  byKey.set(rowKey, row);
}

let evolutionCount = 0;
for (const family of tatari.families || []) {
  for (const evolution of family.evolutions || []) {
    evolutionCount += 1;
    const rowKey = key(family.id, evolution.stage);
    const row = byKey.get(rowKey);
    if (!row) throw new Error(`Missing Tata i18n source row: ${rowKey}`);
    if (row.japaneseName !== evolution.name) throw new Error(`Japanese name mismatch: ${rowKey}`);
    evolution.nameEn = row.englishName;
    evolution.nameZhHans = row.simplifiedChineseName;
  }
}

if (byKey.size !== evolutionCount) throw new Error(`Source/canonical count mismatch: ${byKey.size}/${evolutionCount}`);

for (const [familyId, familySkills] of Object.entries(skills.byFamily || {})) {
  for (const stage of familySkills.stages || []) {
    const rowKey = key(familyId, stage.stage);
    const row = byKey.get(rowKey);
    if (!row) throw new Error(`Missing skill-stage i18n source row: ${rowKey}`);
    if (row.japaneseName !== stage.tataName) throw new Error(`Skill-stage Japanese name mismatch: ${rowKey}`);
    stage.nameEn = row.englishName;
    stage.nameZhHans = row.simplifiedChineseName;
  }
}

writeJson('data/tatari.json', tatari);
writeJson('data/tata-skills.json', skills);
console.log(`Applied official English and Simplified Chinese names to ${evolutionCount} Tata forms.`);
