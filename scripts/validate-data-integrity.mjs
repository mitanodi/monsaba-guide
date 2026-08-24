import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = ['tatari.json', 'tata-skills.json', 'tier-ratings.json', 'evolution-priority.json', 'content-guides.json'];
const errors = [];
const warnings = [];
const fail = (condition, message) => { if (!condition) errors.push(message); };
const readJson = (name) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8')); }
  catch (error) { errors.push(`${name}: JSON parse error: ${error.message}`); return {}; }
};
const [tatari, skills, ratings, evolution, guides] = files.map(readJson);

fail(Array.isArray(tatari.families), 'tatari.json: families must be an array');
fail(skills.byFamily && typeof skills.byFamily === 'object' && !Array.isArray(skills.byFamily), 'tata-skills.json: byFamily must be an object');
fail(ratings.overall && typeof ratings.overall === 'object', 'tier-ratings.json: overall is required');
fail(evolution.version !== undefined && evolution.t3Roadmap, 'evolution-priority.json: version and t3Roadmap are required');
fail(guides.version !== undefined && guides.sources && guides.modes, 'content-guides.json: version, sources and modes are required');

const families = Array.isArray(tatari.families) ? tatari.families : [];
const familyIds = families.map((family) => family.id);
const validIds = new Set(familyIds);
fail(familyIds.length === 63, `tatari.json: family count ${familyIds.length}, expected 63`);
fail(new Set(familyIds).size === familyIds.length, 'tatari.json: duplicate family id');

let evolutionCount = 0;
for (const family of families) {
  fail(typeof family.id === 'string' && family.id.length > 0, 'tatari.json: family id is required');
  fail(typeof family.familyName === 'string' && family.familyName.length > 0, `${family.id}: familyName is required`);
  fail(['草', '水', '火', '雷', '岩'].includes(family.attribute), `${family.id}: invalid attribute ${family.attribute}`);
  fail(Array.isArray(family.evolutions) && family.evolutions.length > 0, `${family.id}: evolutions are required`);
  const stages = family.evolutions || [];
  evolutionCount += stages.length;
  fail(new Set(stages.map((stage) => stage.stage)).size === stages.length, `${family.id}: duplicate evolution stage`);
  for (const stage of stages) {
    fail(Number.isInteger(stage.stage), `${family.id}: evolution stage must be an integer`);
    fail(typeof stage.name === 'string' && stage.name.length > 0, `${family.id} T${stage.stage}: evolution name is required`);
  }
}
fail(evolutionCount === 224, `tatari.json: evolution count ${evolutionCount}, expected 224`);
fail(tatari.meta?.familyCount === 63 && tatari.meta?.monsterCount === 224, 'tatari.json: meta counts must remain 63/224');

const skillFamilies = Object.keys(skills.byFamily || {});
fail(skillFamilies.length === 63, `tata-skills.json: family count ${skillFamilies.length}, expected 63`);
fail(skills.totals?.families === 63 && skills.totals?.stages === 224, 'tata-skills.json: totals must remain 63/224');
let skillStageCount = 0;
for (const [familyId, skillFamily] of Object.entries(skills.byFamily || {})) {
  fail(validIds.has(familyId), `tata-skills.json: unknown familyId ${familyId}`);
  fail(skillFamily.familyId === familyId, `tata-skills.json: key/familyId mismatch ${familyId}`);
  const sourceFamily = families.find((family) => family.id === familyId);
  fail(skillFamily.familyName === sourceFamily?.familyName, `${familyId}: familyName differs between JSON files`);
  fail(skillFamily.attribute === sourceFamily?.attribute, `${familyId}: attribute differs between JSON files`);
  const stages = Array.isArray(skillFamily.stages) ? skillFamily.stages : [];
  skillStageCount += stages.length;
  fail(new Set(stages.map((stage) => stage.stage)).size === stages.length, `${familyId}: duplicate skill stage`);
  for (const stage of stages) {
    const sourceStage = sourceFamily?.evolutions?.find((item) => item.stage === stage.stage);
    fail(Boolean(sourceStage), `${familyId} T${stage.stage}: stage missing from tatari.json`);
    fail(stage.tataName === sourceStage?.name, `${familyId} T${stage.stage}: tataName mismatch (${stage.tataName} / ${sourceStage?.name})`);
    fail(typeof stage.skillName === 'string' && stage.skillName.trim().length > 0, `${familyId} T${stage.stage}: skillName is empty`);
    if (typeof stage.description !== 'string' || !stage.description.trim()) warnings.push(`${familyId} T${stage.stage}: description is empty`);
  }
  fail(stages.length === (sourceFamily?.evolutions?.length || 0), `${familyId}: stage count differs between JSON files`);
}
fail(skillStageCount === 224, `tata-skills.json: stage count ${skillStageCount}, expected 224`);

function validateReferences(value, file, trail = file) {
  if (Array.isArray(value)) {
    const directIds = value.filter((item) => item && typeof item === 'object' && typeof item.familyId === 'string').map((item) => item.familyId);
    if (new Set(directIds).size !== directIds.length) errors.push(`${trail}: duplicate familyId in the same list`);
    value.forEach((item, index) => validateReferences(item, file, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'familyId' && typeof child === 'string' && !validIds.has(child)) errors.push(`${trail}.${key}: unknown familyId ${child}`);
    if ((key === 'familyIds' || key === 'ids') && Array.isArray(child)) {
      const ids = child.filter((id) => typeof id === 'string');
      if (new Set(ids).size !== ids.length) errors.push(`${trail}.${key}: duplicate familyId`);
      for (const id of ids) if (!validIds.has(id)) errors.push(`${trail}.${key}: unknown familyId ${id}`);
    }
    validateReferences(child, file, `${trail}.${key}`);
  }
}
validateReferences(ratings, 'tier-ratings.json');
validateReferences(evolution, 'evolution-priority.json');
validateReferences(guides, 'content-guides.json');
for (const section of [ratings.overall, ratings.zombieRush]) {
  for (const id of Object.keys(section?.byFamily || {})) if (!validIds.has(id)) errors.push(`tier-ratings.json.byFamily: unknown familyId ${id}`);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  console.error(`データ整合性検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`データ整合性検証成功: 5 JSON / 63系統 / 224体 / warning ${warnings.length}`);
