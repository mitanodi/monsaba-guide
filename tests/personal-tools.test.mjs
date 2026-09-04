import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROSTER_KEY, ROSTER_VERSION, MAX_IMPORT_BYTES, emptyRoster, sanitizeRoster, loadRoster, saveRoster,
  removeRoster, exportRoster, importRosterText, familyMatches, rosterSummary, growthCandidates, modeCandidates
} from '../my-monsaba/roster-core.js';
import {
  TEAM_KEY, DRAFT_KEY, TEAM_VERSION, SHARE_VERSION, TEAM_ROWS, TEAM_COLUMNS, TEAM_SLOTS, MAX_SAVED_TEAMS, emptyTeam, sanitizeTeam,
  loadTeams, loadDraft, saveDraft, saveTeamList, upsertTeam, placeMember, copyMemberToPlayer, togglePlayerChip, removeMember, moveMember,
  placementIssue, setPlayerUnlock, playerCount, playerLimit, levelLimit,
  encodeTeam, decodeTeam, analyzeTeam, teamText, stage1ImageFor
} from '../team-builder/team-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const families = json('data/tatari.json').families;
const ratings = json('data/tier-ratings.json').overall.byFamily;
const evolution = json('data/evolution-priority.json');
const chips = json('data/zombie-rush/chips.json').chips;
const first = families[0];
const second = families[1];

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

test('データIntegrityは64系統・230体', () => {
  assert.equal(families.length, 64);
  assert.equal(families.flatMap((family) => family.evolutions).length, 230);
  assert.deepEqual(new Set(families.map((family) => family.attribute)), new Set(['草', '水', '火', '雷', '岩']));
});

test('手持ちはT1〜T4と未所持を安全に正規化する', () => {
  for (const stage of [1, 2, 3, 4]) assert.equal(sanitizeRoster({ entries: { [first.id]: { stage } } }, families).entries[first.id].stage, stage);
  assert.equal(sanitizeRoster({ entries: { [first.id]: { stage: 0 } } }, families).entries[first.id], undefined);
  assert.equal(sanitizeRoster({ entries: { unknown: { stage: 4 }, [first.id]: { stage: 99 } } }, families).entries[first.id], undefined);
});

test('手持ちschema versionとreload復元', () => {
  const box = storage();
  const saved = saveRoster(box, { ...emptyRoster(), entries: { [first.id]: { stage: 3, favorite: true } } }, families, new Date('2026-08-28T00:00:00Z'));
  assert.equal(saved.version, ROSTER_VERSION);
  assert.equal(loadRoster(box, families).entries[first.id].stage, 3);
});

test('全削除は専用keyだけを削除する', () => {
  const box = storage({ [ROSTER_KEY]: '{}', monsabaBoardThreadTokens: 'keep', monsabaFriendsToken: 'keep' });
  removeRoster(box);
  assert.equal(box.getItem(ROSTER_KEY), null);
  assert.equal(box.getItem('monsabaBoardThreadTokens'), 'keep');
  assert.equal(box.getItem('monsabaFriendsToken'), 'keep');
});

test('JSON backup export/importと未知ID除外', () => {
  const source = { version: 1, entries: { [first.id]: { stage: 2, training: true } } };
  const exported = exportRoster(source, families, new Date('2026-08-28T00:00:00Z'));
  const restored = importRosterText(exported, families);
  assert.equal(restored.entries[first.id].stage, 2);
  const unknown = importRosterText(JSON.stringify({ version: 1, entries: { unknown: { stage: 4 }, [second.id]: { stage: 1 } } }), families);
  assert.deepEqual(Object.keys(unknown.entries), [second.id]);
});

test('不正JSON・oversized importを拒否する', () => {
  assert.throws(() => importRosterText('{', families));
  assert.throws(() => importRosterText(JSON.stringify({ version: 999, entries: {} }), families));
  assert.throws(() => importRosterText('x'.repeat(MAX_IMPORT_BYTES + 1), families));
});

test('fuzzy searchは進化名・alias・表記揺れを扱う', () => {
  assert.equal(familyMatches(first, first.evolutions[2].name), true);
  assert.equal(familyMatches(first, '旧コパンダ', ['旧コパンダ']), true);
  assert.equal(familyMatches(first, first.familyName.slice(0, -1)), true);
  assert.equal(familyMatches(first, '絶対に一致しない検索'), false);
});

test('ダッシュボードと属性・役割集計はlocal rosterだけから計算', () => {
  const roster = { entries: { [first.id]: { stage: 4 }, [second.id]: { stage: 3 } } };
  const summary = rosterSummary(roster, families, ratings);
  assert.equal(summary.owned, 2);
  assert.equal(summary.t3Plus, 2);
  assert.equal(summary.t4, 1);
  assert.equal(Object.values(summary.attributes).reduce((a, b) => a + b, 0), 2);
  assert.ok(Object.keys(summary.roleStatus).includes('回復'));
});

test('育成候補とモード候補は既存評価だけを返す', () => {
  const roster = { entries: Object.fromEntries(families.slice(0, 8).map((family) => [family.id, { stage: 1 }])) };
  assert.ok(growthCandidates(roster, families, ratings, evolution).length <= 5);
  assert.ok(modeCandidates(roster, families, ratings, 'zombie').every((item) => item.rating));
  assert.ok(modeCandidates(roster, families, ratings, 'boss').every((item) => item.rating === '評価データ不足'));
});

test('編成は常に6×6の36枠、許可IDと実在進化段階だけを保持', () => {
  const team = sanitizeTeam({ name: '<b>編成</b>\u0000', mode: 'zombie', slots: [{ familyId: first.id, stage: 2 }, { familyId: 'unknown', stage: 4 }] }, families);
  assert.equal(team.slots.length, TEAM_SLOTS);
  assert.deepEqual(team.slots[0], { familyId: first.id, stage: 2, playerId: 1, level: 1 });
  assert.equal(team.slots[1], null);
  assert.equal(team.mode, 'zombie');
  assert.ok(team.name.length <= 40);
  assert.equal(TEAM_ROWS, 6);
  assert.equal(TEAM_COLUMNS, 6);
  assert.equal(TEAM_SLOTS, 36);
});

test('編成の配置・stage変更・削除・入替はデータ構造で保持', () => {
  let team = placeMember(emptyTeam(), 0, { familyId: first.id, stage: 1, playerId: 1, level: 1 }, families);
  team = placeMember(team, 0, { familyId: first.id, stage: 4, playerId: 1, level: 7 }, families);
  team = placeMember(team, 1, { familyId: second.id, stage: 2, playerId: 2, level: 3 }, families);
  team = moveMember(team, 0, 1, families);
  const clean = removeMember(team, 1, families);
  assert.equal(clean.slots[0].familyId, second.id);
  assert.equal(clean.slots[1], null);
});

test('T4が存在しない系統へT4を配置できない', () => {
  const shortFamily = families.find((family) => !family.evolutions.some((item) => item.stage === 4));
  assert.ok(shortFamily);
  const team = placeMember(emptyTeam(), 0, { familyId: shortFamily.id, stage: 4, playerId: 1, level: 1 }, families);
  assert.equal(team.slots[0], null);
});

test('自動保存draftは専用keyへ保存・復元する', () => {
  const box = storage();
  const team = placeMember(emptyTeam(), 35, { familyId: first.id, stage: 3, playerId: 2, level: 7 }, families);
  saveDraft(box, team, families);
  assert.ok(box.getItem(DRAFT_KEY));
  assert.equal(loadDraft(box, families).slots[35].stage, 3);
});

test('保存編成はreload復元し10件を超えない', () => {
  const box = storage();
  const teams = Array.from({ length: MAX_SAVED_TEAMS }, (_, index) => ({ ...emptyTeam(), name: `編成${index}`, createdAt: new Date(2026, 0, index + 1).toISOString() }));
  saveTeamList(box, teams, families);
  assert.equal(loadTeams(box, families).length, 10);
  assert.throws(() => upsertTeam(box, teams, { ...emptyTeam(), name: '11件目' }, families, new Date('2027-01-01')));
  assert.ok(box.getItem(TEAM_KEY));
});

test('短縮共有hashはPlayer・Tier・Lv表示・チップ・解放状態を往復し編成名は含めない', () => {
  const team = emptyTeam(); team.name = 'URLへ含めない名前'; team.mode = 'zombie'; team.showLevels = false; team.chips[1] = [chips[0].id, chips[1].id]; team.playerSettings[2].levelCapPlusOne = true; team.slots[7] = { familyId: first.id, stage: 3, playerId: 2, level: 8 };
  const encoded = encodeTeam(team, families, chips);
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  assert.equal(payload.v, SHARE_VERSION);
  assert.doesNotMatch(encoded, /URL|名前/);
  const decoded = decodeTeam(encoded, families, chips);
  assert.equal(decoded.name, '');
  assert.equal(decoded.slots[7].familyId, first.id);
  assert.equal(decoded.slots[7].stage, 3);
  assert.equal(decoded.slots[7].playerId, 2);
  assert.equal(decoded.slots[7].level, 8);
  assert.equal(decoded.playerSettings[2].levelCapPlusOne, true);
  assert.equal(decoded.showLevels, false);
  assert.deepEqual(decoded.chips[1], [chips[0].id, chips[1].id]);
  assert.throws(() => decodeTeam('broken!!!', families));
});

test('最大20体の共有URLデータも従来形式より十分短く復元できる', () => {
  let team = emptyTeam();
  for (let index = 0; index < 10; index += 1) team = placeMember(team, index, { familyId: families[index].id, stage: 1, playerId: 1, level: 7 }, families);
  for (let index = 10; index < 20; index += 1) team = placeMember(team, index, { familyId: families[index - 10].id, stage: 2, playerId: 2, level: 7 }, families);
  team.chips[1] = chips.slice(0, 3).map((chip) => chip.id); team.chips[2] = chips.slice(3, 6).map((chip) => chip.id);
  const encoded = encodeTeam(team, families, chips); const restored = decodeTeam(encoded, families, chips);
  assert.ok(encoded.length < 500, `short share payload was ${encoded.length} characters`);
  assert.equal(playerCount(restored, 1), 10); assert.equal(playerCount(restored, 2), 10);
  assert.deepEqual(restored.chips, team.chips);
});

test('ゾンビラッシュのチップは49種類からPlayerごとに最大3種類を選べる', () => {
  assert.equal(chips.length, 49); const ids = new Set(chips.map((chip) => chip.id)); let team = emptyTeam();
  for (const chip of chips.slice(0, 3)) { const result = togglePlayerChip(team, 1, chip.id, families, ids); assert.equal(result.ok, true); team = result.team; }
  const full = togglePlayerChip(team, 1, chips[3].id, families, ids); assert.equal(full.ok, false); assert.equal(full.reason, 'chip-full');
  const playerTwo = togglePlayerChip(team, 2, chips[3].id, families, ids); assert.equal(playerTwo.ok, true); team = playerTwo.team;
  assert.equal(team.chips[1].length, 3); assert.deepEqual(team.chips[2], [chips[3].id]);
  const removed = togglePlayerChip(team, 1, chips[0].id, families, ids); assert.equal(removed.ok, true); assert.equal(removed.selected, false); assert.equal(removed.team.chips[1].length, 2);
  assert.equal(togglePlayerChip(team, 1, 'unknown-chip', families, ids).reason, 'invalid-chip');
});

test('旧15枠の保存・共有は6×6左上へ移行する', () => {
  const legacySlots = Array(15).fill(null); legacySlots[14] = { familyId: first.id, stage: 2 };
  const migrated = sanitizeTeam({ version: 1, slots: legacySlots }, families);
  assert.equal(migrated.slots[16].familyId, first.id);
  const compact = { v: 1, m: 'free', s: legacySlots.map((slot) => slot ? [slot.familyId, slot.stage] : null) };
  const encoded = Buffer.from(JSON.stringify(compact)).toString('base64url');
  assert.equal(decodeTeam(encoded, families).slots[16].stage, 2);
});

test('v2共有は36枠を保ち、旧要素へPlayerとLvの安全な初期値を付ける', () => {
  const slots = Array(36).fill(null); slots[0] = [first.id, 1]; slots[35] = [second.id, 2];
  const encoded = Buffer.from(JSON.stringify({ v: 2, r: 6, c: 6, m: 'zombie', s: slots })).toString('base64url');
  const migrated = decodeTeam(encoded, families);
  assert.equal(migrated.version, TEAM_VERSION);
  assert.deepEqual(migrated.slots[0], { familyId: first.id, stage: 1, playerId: 1, level: 1 });
  assert.deepEqual(migrated.slots[35], { familyId: second.id, stage: 2, playerId: 1, level: 1 });
});

test('P1/P2は通常各10体で独立し、11体目を拒否する', () => {
  let team = emptyTeam();
  for (let index = 0; index < 10; index += 1) team = placeMember(team, index, { familyId: families[index].id, stage: 1, playerId: 1, level: 1 }, families);
  for (let index = 10; index < 20; index += 1) team = placeMember(team, index, { familyId: families[index - 10].id, stage: 1, playerId: 2, level: 7 }, families);
  assert.equal(playerCount(team, 1), 10); assert.equal(playerCount(team, 2), 10);
  assert.equal(playerLimit(team, 1), 10); assert.equal(playerLimit(team, 2), 10);
  assert.equal(placementIssue(team, 20, { familyId: families[10].id, stage: 1, playerId: 1, level: 1 }, families), 'player-full');
  assert.equal(placeMember(team, 20, { familyId: families[10].id, stage: 1, playerId: 1, level: 1 }, families).slots[20], null);
});

test('配置上限+1はPlayerごとに11体目だけを許可し12体目を拒否する', () => {
  let team = emptyTeam();
  for (let index = 0; index < 10; index += 1) team = placeMember(team, index, { familyId: families[index].id, stage: 1, playerId: 1, level: 1 }, families);
  const unlocked = setPlayerUnlock(team, 1, 'slotLimitPlusOne', true, families);
  assert.equal(unlocked.ok, true); team = unlocked.team;
  team = placeMember(team, 10, { familyId: families[10].id, stage: 1, playerId: 1, level: 7 }, families);
  assert.equal(playerCount(team, 1), 11); assert.equal(playerLimit(team, 1), 11); assert.equal(playerLimit(team, 2), 10);
  assert.equal(placementIssue(team, 11, { familyId: families[11].id, stage: 1, playerId: 1, level: 1 }, families), 'player-full');
  assert.equal(setPlayerUnlock(team, 1, 'slotLimitPlusOne', false, families).reason, 'player-over-limit');
});

test('同じPlayerは同一タタ系統を1体だけ配置でき、別Playerには同じ系統を配置できる', () => {
  let team = placeMember(emptyTeam(), 0, { familyId: first.id, stage: 1, playerId: 1, level: 1 }, families);
  assert.equal(placementIssue(team, 1, { familyId: first.id, stage: 2, playerId: 1, level: 7 }, families), 'duplicate-family');
  assert.equal(placeMember(team, 1, { familyId: first.id, stage: 2, playerId: 1, level: 7 }, families).slots[1], null);
  team = placeMember(team, 1, { familyId: first.id, stage: 2, playerId: 2, level: 7 }, families);
  assert.equal(team.slots[1].familyId, first.id);
  assert.equal(placementIssue(team, 0, { ...team.slots[0], stage: 3 }, families), null);
  assert.equal(placementIssue(team, 1, { ...team.slots[1], playerId: 1 }, families), 'duplicate-family');
  assert.match(read('team-builder/team-builder.js'), /else reportIssue\(issue, replacement\.playerId\)/);
});

test('配置済みタタは同じTier・Lvのまま相手Playerの最初の空きへコピーできる', () => {
  const team = placeMember(emptyTeam(), 4, { familyId: first.id, stage: 3, playerId: 1, level: 6 }, families);
  const result = copyMemberToPlayer(team, 4, 2, families);
  assert.equal(result.ok, true); assert.equal(result.slotIndex, 0);
  assert.deepEqual(result.team.slots[0], { familyId: first.id, stage: 3, playerId: 2, level: 6 });
  assert.deepEqual(result.team.slots[4], { familyId: first.id, stage: 3, playerId: 1, level: 6 });
});

test('相手Playerに同じ系統がある場合と上限超過時はコピーしない', () => {
  let duplicate = placeMember(emptyTeam(), 0, { familyId: first.id, stage: 1, playerId: 1, level: 1 }, families);
  duplicate = placeMember(duplicate, 1, { familyId: first.id, stage: 2, playerId: 2, level: 2 }, families);
  assert.equal(copyMemberToPlayer(duplicate, 0, 2, families).reason, 'duplicate-family');
  let full = placeMember(emptyTeam(), 20, { familyId: families[20].id, stage: 1, playerId: 1, level: 1 }, families);
  for (let index = 0; index < 10; index += 1) full = placeMember(full, index, { familyId: families[index].id, stage: 1, playerId: 2, level: 1 }, families);
  assert.equal(copyMemberToPlayer(full, 20, 2, families).reason, 'player-full');
});

test('Lvは通常1〜7、解放後のみ8でPlayerごとに独立する', () => {
  let team = emptyTeam();
  assert.equal(levelLimit(team, 1), 7);
  assert.equal(placementIssue(team, 0, { familyId: first.id, stage: 1, playerId: 1, level: 8 }, families), 'invalid-level');
  team = setPlayerUnlock(team, 1, 'levelCapPlusOne', true, families).team;
  assert.equal(levelLimit(team, 1), 8); assert.equal(levelLimit(team, 2), 7);
  team = placeMember(team, 0, { familyId: first.id, stage: 1, playerId: 1, level: 8 }, families);
  assert.equal(team.slots[0].level, 8);
  assert.equal(placementIssue(team, 1, { familyId: second.id, stage: 1, playerId: 2, level: 8 }, families), 'invalid-level');
});

test('Lv8配置中の解放解除は確認相当の明示指定がなければ変更しない', () => {
  let team = emptyTeam(); team = setPlayerUnlock(team, 1, 'levelCapPlusOne', true, families).team;
  team = placeMember(team, 0, { familyId: first.id, stage: 1, playerId: 1, level: 8 }, families);
  const blocked = setPlayerUnlock(team, 1, 'levelCapPlusOne', false, families);
  assert.equal(blocked.reason, 'level-eight-present'); assert.equal(blocked.team.slots[0].level, 8);
  const approved = setPlayerUnlock(team, 1, 'levelCapPlusOne', false, families, { downgrade: true });
  assert.equal(approved.ok, true); assert.equal(approved.team.slots[0].level, 7); assert.equal(approved.team.playerSettings[1].levelCapPlusOne, false);
});

test('Player変更は変更先上限を検証し、セル入替は所属を維持する', () => {
  let team = emptyTeam();
  for (let index = 0; index < 10; index += 1) team = placeMember(team, index, { familyId: families[index].id, stage: 1, playerId: 2, level: 1 }, families);
  team = placeMember(team, 10, { familyId: families[20].id, stage: 2, playerId: 1, level: 7 }, families);
  assert.equal(placementIssue(team, 10, { ...team.slots[10], playerId: 2 }, families), 'player-full');
  const swapped = moveMember(team, 0, 10, families);
  assert.equal(swapped.slots[0].playerId, 1); assert.equal(swapped.slots[10].playerId, 2);
});

test('v3 validatorは不正Player・Lv・人数超過を共有URLで拒否する', () => {
  const make = (slots, unlocks = [[0, 0], [0, 0]]) => Buffer.from(JSON.stringify({ v: 3, r: 6, c: 6, m: 'zombie', s: slots, u: unlocks })).toString('base64url');
  const blank = Array(36).fill(null);
  const invalidPlayer = [...blank]; invalidPlayer[0] = [first.id, 1, 3, 1]; assert.throws(() => decodeTeam(make(invalidPlayer), families));
  const invalidLevel = [...blank]; invalidLevel[0] = [first.id, 1, 1, 8]; assert.throws(() => decodeTeam(make(invalidLevel), families));
  const tooMany = [...blank]; for (let index = 0; index < 11; index += 1) tooMany[index] = [families[index].id, 1, 1, 1]; assert.throws(() => decodeTeam(make(tooMany), families));
  const duplicate = [...blank]; duplicate[0] = [first.id, 1, 1, 1]; duplicate[1] = [first.id, 2, 1, 1]; assert.throws(() => decodeTeam(make(duplicate), families));
});

test('v3 localStorage sanitizerは不正Player・Lv・人数超過を残さない', () => {
  const slots = Array(36).fill(null); slots[0] = { familyId: first.id, stage: 1, playerId: 9, level: 1 }; slots[1] = { familyId: first.id, stage: 1, playerId: 1, level: 8 };
  for (let index = 2; index < 14; index += 1) slots[index] = { familyId: families[index].id, stage: 1, playerId: 1, level: 1 };
  const clean = sanitizeTeam({ version: 3, slots, playerSettings: { 1: {}, 2: {} } }, families);
  assert.equal(clean.slots[0], null); assert.equal(clean.slots[1], null); assert.equal(playerCount(clean, 1), 10);
});

test('localStorage移行では同じPlayerの重複を除外し、別Playerの同じ系統は保持する', () => {
  const slots = Array(36).fill(null);
  slots[0] = { familyId: first.id, stage: 1, playerId: 1, level: 1 };
  slots[1] = { familyId: first.id, stage: 2, playerId: 1, level: 2 };
  slots[2] = { familyId: first.id, stage: 3, playerId: 2, level: 3 };
  const clean = sanitizeTeam({ version: 3, slots, playerSettings: { 1: {}, 2: {} } }, families);
  assert.equal(clean.slots[0].familyId, first.id); assert.equal(clean.slots[1], null); assert.equal(clean.slots[2].familyId, first.id);
});

test('短縮共有はPlayer・Tier・Lv・両Player解放・将来投稿メタデータを往復する', () => {
  let team = emptyTeam(); team.playerSettings[1].slotLimitPlusOne = true; team.playerSettings[2].levelCapPlusOne = true;
  team.challenge = { difficulty: 4, seasonId: 'season-1', highestRound: 25, cleared: false, tags: ['低育成'] };
  team = placeMember(team, 5, { familyId: first.id, stage: 4, playerId: 2, level: 8 }, families);
  const restored = decodeTeam(encodeTeam(team, families), families);
  assert.equal(restored.slots[5].playerId, 2); assert.equal(restored.slots[5].stage, 4); assert.equal(restored.slots[5].level, 8);
  assert.equal(restored.playerSettings[1].slotLimitPlusOne, true); assert.equal(restored.playerSettings[2].levelCapPlusOne, true);
  assert.equal(restored.challenge.difficulty, 4); assert.equal(restored.challenge.seasonId, 'season-1');
  assert.equal(emptyTeam().challenge.highestRound, null);
});

test('T2〜T4を選んでも盤面画像resolverはverified T1だけを返す', () => {
  const images = json('data/tata-images.json');
  const imageMap = new Map(images.families.map((item) => [item.familyId, item]));
  const image = stage1ImageFor(first, imageMap);
  assert.equal(image.status, 'verified');
  assert.match(image.src, /(?:\/t1-512\.webp|\/forms\/[^/]+\/t1\.webp)$/);
  assert.equal(stage1ImageFor(first, new Map([[first.id, { stage1: { status: 'pending' } }]])), null);
});

test('互換用集計では別Playerの同一系統を重複扱いしない', () => {
  const team = emptyTeam(); team.mode = 'zombie'; team.slots[0] = { familyId: first.id, stage: 4, playerId: 1, level: 7 }; team.slots[1] = { familyId: first.id, stage: 3, playerId: 2, level: 5 };
  const analysis = analyzeTeam(team, families, ratings);
  assert.equal(analysis.members.length, 2);
  assert.equal(analysis.duplicateCount, 0);
  assert.equal(Object.values(analysis.tiers).reduce((a, b) => a + b, 0), 2);
});

test('コピー用テキストは6行の36枠を持つ', () => {
  const text = teamText(emptyTeam(), families);
  assert.match(text, /1行目/);
  assert.match(text, /6行目/);
  assert.match(text, /monster-survival\.com/);
});

test('コピー用テキストはゾンビラッシュの選択チップを含み、Lv非表示時はLvを含めない', () => {
  let team = emptyTeam(); team.showLevels = false; team.chips[1] = [chips[0].id]; team = placeMember(team, 0, { familyId: first.id, stage: 1, playerId: 1, level: 7 }, families);
  const text = teamText(team, families, 'ja', chips); assert.match(text, new RegExp(chips[0].name.ja)); assert.doesNotMatch(text, /Lv7/);
  team.showLevels = true; assert.equal((teamText(team, families, 'ja', chips).match(/Lv7/g) || []).length, 1);
  team.mode = 'normal'; assert.doesNotMatch(teamText(team, families, 'ja', chips), new RegExp(chips[0].name.ja));
});

test('マイモンサバ・編成メーカーのUIと連携を静的検証', () => {
  const rosterPage = read('my-monsaba/index.html');
  const builder = read('team-builder/index.html');
  const builderJs = read('team-builder/team-builder.js');
  assert.match(rosterPage, /id="roster-grid"/);
  assert.match(rosterPage, /id="roster-import"/);
  assert.match(builder, /id="team-board"/);
  assert.match(builder, /width="1258" height="1450"/);
  assert.match(builder, /id="team-chip-settings"/);
  assert.doesNotMatch(builder, /こちらからゾンビが来ます|6×6/);
  assert.match(builderJs, /formation-stage-badge/);
  assert.match(builderJs, /formation-level-badge/);
  assert.match(builderJs, /formation-player-badge/);
  assert.doesNotMatch(builder, /編成診断|モード評価/);
  assert.match(builderJs, /sessionStorage\.setItem\(HANDOFF_KEY/);
  assert.doesNotMatch(builderJs, /fetch\([^\n]*board|action:\s*['"]create_thread/);
  assert.match(read('board/board.js'), /TEAM_HANDOFF_KEY/);
});

test('個別タタ登録・TOP・PC/スマホナビ導線を持つ', () => {
  assert.match(read('scripts/generate-tata-pages.mjs'), /tata-roster-button/);
  assert.match(read('index.html'), /href="\/my-monsaba\/"/);
  assert.match(read('index.html'), /href="\/team-builder\/"/);
  const nav = read('scripts/shared-layout.mjs');
  assert.match(nav, /href: '\/my-monsaba\/'/);
  assert.match(nav, /href: '\/team-builder\/'/);
  assert.match(nav, /href: '\/team-builder\/', label: '編成メーカー', className: 'team-builder-nav-link'/);
});

test('編成メーカーはTOP・ゾンビラッシュ攻略・チップ一覧から直接開ける', () => {
  const top = read('index.html');
  const zombie = read('zombie-rush/index.html');
  const chipsPage = read('zombie-rush/chips/index.html');
  assert.match(top, /class="wrap zombie-entry team-builder-entry"/);
  assert.match(top, /タタ配置/); assert.match(top, /Lv・チップ設定/); assert.match(top, /P1\/P2対応/); assert.match(top, /保存・共有/);
  assert.match(zombie, /data-cta-id="team_builder_zombie_guide"/);
  assert.match(chipsPage, /href="\/team-builder\/">チップを使って編成を作る<\/a>/);
});

test('EN・zh-CNにも編成メーカー導線が自然な文言で生成される', () => {
  assert.match(read('en/index.html'), /Zombie Rush Team Builder/);
  assert.match(read('en/zombie-rush/index.html'), /Open Team Builder/);
  assert.match(read('en/zombie-rush/chips/index.html'), /Build a Team with Chips/);
  assert.match(read('zh-cn/index.html'), /Zombie Rush阵容编辑器/);
  assert.match(read('zh-cn/zombie-rush/index.html'), /打开阵容编辑器/);
  assert.match(read('zh-cn/zombie-rush/chips/index.html'), /使用芯片创建阵容/);
});

test('Analyticsは手持ち・編成内容をpropertiesへ送らない', () => {
  const source = read('team-builder/team-builder.js') + read('my-monsaba/my-monsaba.js') + read('tata-roster.js');
  const calls = source.match(/MONSABA_TRACK[^\n]+/g) || [];
  for (const call of calls) assert.doesNotMatch(call, /\{[^}]*\b(familyId|family_id|tata_name|name|build|content|uid|query)\s*:/i);
  for (const name of ['formation_open', 'formation_place', 'formation_remove', 'formation_share', 'formation_save', 'formation_export_image']) assert.match(source, new RegExp(name));
  assert.match(read('growth.js'), /'formation_share'/);
});

test('SEO・広告・Privacy方針を維持する', () => {
  assert.match(read('my-monsaba/index.html'), /noindex,follow/);
  assert.match(read('team-builder/index.html'), /index,follow/);
  const adsense = json('data/adsense-config.json');
  assert.equal(adsense.enabled, false); assert.equal(adsense.autoAds, false);
  assert.ok(adsense.excludedPages.includes('/my-monsaba/'));
  assert.ok(adsense.excludedPages.includes('/team-builder/'));
  assert.doesNotMatch(read('my-monsaba/index.html') + read('team-builder/index.html'), /data-affiliate-offer|a8mat|adsbygoogle/i);
  assert.match(read('privacy/index.html'), /マイモンサバ/);
});

test('レスポンシブ・キーボード操作・保存不能時の表示を備える', () => {
  const css = read('my-tools.css');
  for (const width of ['1024', '820', '430', '340']) assert.match(css, new RegExp(`max-width:${width}px`));
  assert.doesNotMatch(css, /min-width:\s*[5-9]\d\dpx/);
  assert.match(css, /formation-stage-badge\{right:1px;bottom:1px;min-width:0/);
  assert.match(read('team-builder/team-builder.js'), /data-cell/);
  assert.match(read('my-monsaba/my-monsaba.js'), /このブラウザでは保存機能を利用できません/);
});

test('P1は赤、P2は青の固定表示で文字ラベルも併用する', () => {
  const css = read('my-tools.css'); const source = read('team-builder/team-builder.js');
  assert.match(css, /formation-cell\.is-player-1\{border-color:#ef5f61/);
  assert.match(css, /formation-cell\.is-player-2\{border-color:#4a91e8/);
  assert.match(source, /formation-player-badge">P\$\{slot\.playerId\}/);
});

test('盤面badgeはPを左上、Lvを左下、Tierを右下へ分離する', () => {
  const css = read('my-tools.css');
  assert.match(css, /formation-player-badge\{top:3px;left:3px/);
  assert.match(css, /formation-level-badge\{left:3px;bottom:3px/);
  assert.match(css, /formation-stage-badge\{right:3px;bottom:3px/);
});

test('配置セル右上のマイナスボタンから直接削除でき、セル編集ボタンと入れ子にならない', () => {
  const source = read('team-builder/team-builder.js'); const css = read('my-tools.css');
  assert.match(source, /class="formation-quick-remove"/);
  assert.match(source, /data-quick-remove="\$\{index\}"/);
  assert.match(source, /commit\(removeMember\(team, index, families\), COPY\.removed\)/);
  assert.match(source, /<div class="formation-cell is-filled/);
  assert.doesNotMatch(source, /<button class="formation-cell is-filled[^`]*<button/);
  assert.match(css, /formation-quick-remove\{position:absolute;z-index:2;top:3px;right:3px/);
});

test('画像出力は2Player集計・赤青枠・任意Lv・Tier・チップ・ドメインを描画する', () => {
  const source = read('team-builder/team-builder.js');
  for (const token of ['playerCount(team, id)', 'playerLimit(team, id)', '`Lv${slot.level}`', '`T${slot.stage}`', 'chipById.get(chipId)', 'monster-survival.com']) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(source, /COPY\.direction|context\.fillText\(`P\$\{id\}[^\n]*levelLimit/);
  assert.match(source, /slot\.playerId === 1 \? '#ef5f61' : '#4a91e8'/);
});

test('Player・Tier・Lv・移動・変更・削除は配置済みdialogから編集できる', () => {
  const source = read('team-builder/team-builder.js');
  for (const action of ['data-edit-player', 'data-edit-stage', 'data-edit-level', 'data-edit-move', 'data-edit-change', 'data-edit-remove']) assert.match(source, new RegExp(action));
});

test('Lv表示とチップ選択はゾンビラッシュ時だけ表示し、各Player最大3種類に制限する', () => {
  const source = read('team-builder/team-builder.js'); const page = read('team-builder/index.html');
  assert.match(source, /team\.mode === 'zombie' && team\.showLevels/); assert.match(source, /team\.mode !== 'zombie'/);
  assert.match(source, /togglePlayerChip/); assert.match(source, /data-chip-id/); assert.match(source, /chips\.json/);
  assert.match(page, /id="team-show-levels"/); assert.match(page, /id="team-chip-settings"/);
});

test('配置済みdialogから相手Playerへコピーでき、一覧と盤面のドラッグ操作を備える', () => {
  const source = read('team-builder/team-builder.js'); const css = read('my-tools.css');
  for (const token of ['data-copy-player', 'copyMemberToPlayer', 'data-drag-family', 'data-drag-cell']) assert.match(source, new RegExp(token));
  assert.match(source, /addEventListener\('dragstart'/); assert.match(source, /addEventListener\('drop'/); assert.match(source, /addEventListener\('pointermove'/); assert.match(source, /elementFromPoint/); assert.match(source, /draggable="true"/);
  assert.match(css, /formation-cell\.is-drop-target/); assert.match(css, /cursor:grab/);
});

test('Lv8解除はconfirmのキャンセルと承認を分け、承認時だけdowngradeする', () => {
  const source = read('team-builder/team-builder.js');
  assert.match(source, /confirm\(COPY\.levelOffConfirm\)/);
  assert.match(source, /\{ downgrade: true \}/);
  assert.match(source, /target\.checked = true; return/);
});

test('Player・Lv・解放設定の変更は共通commitを通りUndoとRedo対象になる', () => {
  const source = read('team-builder/team-builder.js');
  assert.match(source, /commit\(placeMember\(team, editingIndex, candidate/);
  assert.match(source, /commit\(result\.team, COPY\.changed\)/);
  assert.match(source, /undoStack\.push\(cloneTeam/); assert.match(source, /redoStack\.push\(cloneTeam/);
});

test('全セルはbuttonでキーボード操作でき詳細aria-labelにPlayer・Tと任意Lvを含む', () => {
  const source = read('team-builder/team-builder.js');
  assert.match(source, /<button class="formation-cell/);
  assert.match(source, /Player \$\{slot\.playerId\} \$\{getFamilyDisplayLabel\(member\.family\)\} T\$\{slot\.stage\}\$\{level\}/);
});

test('JA・EN・zh-CNの生成ページは新UIを持ち診断UIを持たない', () => {
  for (const file of ['team-builder/index.html', 'en/team-builder/index.html', 'zh-cn/team-builder/index.html']) {
    const html = read(file); assert.match(html, /team-player-settings/); assert.match(html, /team-placement-controls/); assert.match(html, /team-chip-settings/); assert.doesNotMatch(html, /team-diagnosis|team-role-counts|team-tier-counts/);
  }
});

test('Lv8は複数の確認済みチップ効果に存在するためUIで架空の専用名を付けない', () => {
  const chips = json('data/zombie-rush/chips.json').chips.filter((chip) => chip.effect.ja.includes('Lv.8まで'));
  assert.ok(chips.length > 1); assert.match(read('team-builder/team-builder.js'), /levelUnlock: 'Lv上限\+1'/);
  assert.doesNotMatch(read('team-builder/index.html'), /チップ取得済み/);
});
