import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chapterContext, openChapterDraft, openDojoDraft } from '../team-builder/chapter-context.js';
import { emptyTeam, encodeTeam, decodeTeam, sanitizeTeam, saveDraft, loadDraft } from '../team-builder/team-core.js';

const families = JSON.parse(fs.readFileSync(new URL('../data/tatari.json', import.meta.url))).families;
const occupied = mode => {
  const team = { ...emptyTeam(), mode };
  team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 };
  return sanitizeTeam(team, families);
};

test('chapter entry preserves the previous mode and uses the saved normal board without mutating it', () => {
  const current = occupied('zombie');
  const normal = occupied('normal');
  normal.context.normalStage = '2-10';
  const before = JSON.stringify({ current, normal });
  const result = openChapterDraft(new URLSearchParams('mode=normal&chapter=74&stage=10'), current, { normal }, families);
  assert.equal(result.team.context.normalStage, '74-10');
  assert.equal(result.team.slots[0].familyId, families[0].id);
  assert.deepEqual(result.drafts.zombie, current);
  assert.equal(JSON.stringify({ current, normal }), before);
  assert.equal(openChapterDraft(new URLSearchParams('mode=normal&chapter=74'), current, {}, families, true), null);
  assert.equal(openChapterDraft(new URLSearchParams('mode=normal&chapter=0'), current, {}, families), null);
  assert.deepEqual(chapterContext('74-10〜74-15'), { chapter: 74, stage: 10 });
});

test('a first chapter entry starts an empty normal board while preserving the zombie board', () => {
  const current = occupied('zombie');
  const result = openChapterDraft(new URLSearchParams('mode=normal&chapter=74'), current, {}, families);
  assert.equal(result.team.slots.filter(Boolean).length, 0);
  assert.equal(result.drafts.zombie.slots.filter(Boolean).length, 1);
});

test('dojo entry and v6 sharing preserve attribute, floor, stage and original note', () => {
  const current = occupied('normal');
  const dojo = occupied('dojo');
  dojo.context.note = '配置メモ';
  const result = openDojoDraft(new URLSearchParams('mode=dojo&attribute=water&floor=5&stage=8'), current, { dojo }, families);
  assert.equal(result.team.context.dojoAttribute, 'water');
  assert.equal(result.team.context.dojoFloor, 5);
  assert.equal(result.team.context.dojoStage, 8);
  const decoded = decodeTeam(encodeTeam(result.team, families), families);
  assert.deepEqual(decoded.context, result.team.context);
  assert.equal(decoded.slots[0].familyId, dojo.slots[0].familyId);
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) };
  saveDraft(storage, result.team, families);
  assert.deepEqual(loadDraft(storage, families).context, result.team.context);
  assert.equal(openDojoDraft(new URLSearchParams('mode=dojo&attribute=invalid'), current, {}, families), null);
});

test('existing v6 context without new dojo fields re-encodes to identical bytes', () => {
  const legacy = { v: 6, m: 3, u: 0, s: [], c: [null, 'thunder', '', 'old note'], l: 0 };
  const code = Buffer.from(JSON.stringify(legacy)).toString('base64url');
  const restored = decodeTeam(code, families);
  assert.equal(restored.context.dojoFloor, undefined);
  assert.equal(encodeTeam(restored, families), code);
  const invalid = sanitizeTeam({ ...restored, context: { ...restored.context, dojoFloor: -1, dojoStage: 'not a number' } }, families);
  assert.equal(invalid.context.dojoFloor, undefined);
  assert.equal(invalid.context.dojoStage, undefined);
});
