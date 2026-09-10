import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';

const { getFamilyDisplayName, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;

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
const seasonOne = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'data', 'zombie-rush', 'seasons', 'season-1.json'), 'utf8')); }
  catch (error) { errors.push(`zombie-rush/seasons/season-1.json: JSON parse error: ${error.message}`); return {}; }
})();

fail(Array.isArray(tatari.families), 'tatari.json: families must be an array');
fail(skills.byFamily && typeof skills.byFamily === 'object' && !Array.isArray(skills.byFamily), 'tata-skills.json: byFamily must be an object');
fail(ratings.overall && typeof ratings.overall === 'object', 'tier-ratings.json: overall is required');
fail(evolution.version !== undefined && evolution.t3Roadmap, 'evolution-priority.json: version and t3Roadmap are required');
fail(guides.version !== undefined && guides.sources && guides.modes, 'content-guides.json: version, sources and modes are required');
fail(seasonOne.meta?.status === 'implemented-details-verifying', 'season-1.json: status must reflect implementation with details still verifying');
fail(seasonOne.meta?.sourceType === 'official-in-game-notice', 'season-1.json: sourceType must be official-in-game-notice');
fail(seasonOne.meta?.scope === 'zombie-rush-only', 'season-1.json: scope must be zombie-rush-only');
fail(seasonOne.meta?.effectiveDate === '2026-08-26', 'season-1.json: effectiveDate must be 2026-08-26');

const families = Array.isArray(tatari.families) ? tatari.families : [];
const familyIds = families.map((family) => family.id);
const validIds = new Set(familyIds);
fail(familyIds.length === 64, `tatari.json: family count ${familyIds.length}, expected 64`);
fail(new Set(familyIds).size === familyIds.length, 'tatari.json: duplicate family id');

let evolutionCount = 0;
for (const family of families) {
  fail(typeof family.id === 'string' && family.id.length > 0, 'tatari.json: family id is required');
  fail(typeof family.familyName === 'string' && family.familyName.length > 0, `${family.id}: familyName is required`);
  fail(['草', '水', '火', '雷', '岩'].includes(family.attribute), `${family.id}: invalid attribute ${family.attribute}`);
  fail(Array.isArray(family.evolutions) && family.evolutions.length > 0, `${family.id}: evolutions are required`);
  const stages = family.evolutions || [];
  fail(getFamilyDisplayName(family) === stages[0]?.name, `${family.id}: display family name must equal evolutions[0].name`);
  const searchAliases = getFamilySearchAliases(family);
  for (const evolution of stages) fail(searchAliases.includes(evolution.name), `${family.id}: search alias missing ${evolution.name}`);
  fail(searchAliases.includes(family.familyName), `${family.id}: legacy familyName search alias is missing`);
  evolutionCount += stages.length;
  fail(new Set(stages.map((stage) => stage.stage)).size === stages.length, `${family.id}: duplicate evolution stage`);
  for (const stage of stages) {
    fail(Number.isInteger(stage.stage), `${family.id}: evolution stage must be an integer`);
    fail(typeof stage.name === 'string' && stage.name.length > 0, `${family.id} T${stage.stage}: evolution name is required`);
  }
}
fail(evolutionCount === 230, `tatari.json: evolution count ${evolutionCount}, expected 230`);
fail(tatari.meta?.familyCount === familyIds.length && tatari.meta?.monsterCount === evolutionCount, 'tatari.json: meta counts must match calculated totals');

const skillFamilies = Object.keys(skills.byFamily || {});
fail(skillFamilies.length === familyIds.length, `tata-skills.json: family count ${skillFamilies.length}, expected ${familyIds.length}`);
fail(skills.totals?.families === familyIds.length && skills.totals?.stages === evolutionCount, 'tata-skills.json: totals must match calculated Tatari totals');
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
fail(skillStageCount === evolutionCount, `tata-skills.json: stage count ${skillStageCount}, expected ${evolutionCount}`);

const bowzuhebi = ratings.overall?.byFamily?.nenbutsuhebi;
for (const [mode, expected] of Object.entries({ tier: 'SS', normal: 'SS', zombie: 'SS', dojo: 'SS', beginner: 'SS' })) {
  fail(bowzuhebi?.[mode] === expected, `tier-ratings.json: nenbutsuhebi ${mode} must be ${expected}`);
}
const pikaru = families.find((family) => family.id === 'hikaru');
const pikaruNames = ['ピカル', 'ボルタル', 'ルシフェル', 'ルミナリオン'];
fail(JSON.stringify(pikaru?.evolutions?.map((stage) => stage.name)) === JSON.stringify(pikaruNames), `tatari.json: hikaru進化列は${pikaruNames.join(' → ')}である必要があります`);
fail(JSON.stringify(skills.byFamily?.hikaru?.stages?.map((stage) => stage.tataName)) === JSON.stringify(pikaruNames), `tata-skills.json: hikaru進化列は${pikaruNames.join(' → ')}である必要があります`);

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
validateReferences(seasonOne, 'zombie-rush/seasons/season-1.json');
const seasonTargets = Array.isArray(seasonOne.tataSkillBalance) ? seasonOne.tataSkillBalance : [];
fail(seasonTargets.length === 35, `season-1.json: tata skill target count ${seasonTargets.length}, expected 35`);
fail(new Set(seasonTargets.map((item) => item.familyId)).size === seasonTargets.length, 'season-1.json: duplicate familyId in tataSkillBalance');
fail(Array.isArray(seasonOne.chipBalance) && seasonOne.chipBalance.length === 13, 'season-1.json: chip balance count must be 13');
for (const item of seasonTargets) {
  const family = families.find((entry) => entry.id === item.familyId);
  const stage = family?.evolutions?.find((entry) => entry.stage === item.stage);
  fail(Boolean(stage), `season-1.json: ${item.officialTataName} family/stage is missing`);
  fail(stage?.name === item.databaseTataName, `season-1.json: ${item.officialTataName} databaseTataName mismatch`);
  fail(['exact', 'official-name-review'].includes(item.mappingStatus), `season-1.json: ${item.officialTataName} mappingStatus is invalid`);
  fail(['up', 'down', 'mixed'].includes(item.direction), `season-1.json: ${item.officialTataName} direction is invalid`);
  fail(Array.isArray(item.skills) && item.skills.length > 0, `season-1.json: ${item.officialTataName} skills are required`);
  for (const skill of item.skills || []) {
    fail(typeof skill.name === 'string' && skill.name.length > 0, `season-1.json: ${item.officialTataName} skill name is required`);
    for (const change of skill.changes || []) fail(Boolean(change.metric && change.before && change.after), `season-1.json: ${item.officialTataName}/${skill.name} change is incomplete`);
  }
}
const toraani = seasonTargets.find((item) => item.officialTataName === 'トラーニー');
const fireBurst = toraani?.skills?.find((skill) => skill.name === '火焔爆裂')?.changes?.find((change) => change.metric === 'ダメージ倍率');
fail(fireBurst?.before === '160%' && fireBurst?.after === '230%', 'season-1.json: トラーニー火焔爆裂は160% → 230%である必要があります');
for (const section of [ratings.overall, ratings.zombieRush]) {
  for (const id of Object.keys(section?.byFamily || {})) if (!validIds.has(id)) errors.push(`tier-ratings.json.byFamily: unknown familyId ${id}`);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  console.error(`データ整合性検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`データ整合性検証成功: 主要5 JSON + Season 1 / ${familyIds.length}系統 / ${evolutionCount}体 / 専用スキル35体 / warning ${warnings.length}`);
