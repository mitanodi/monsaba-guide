import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCommunityService, CommunityError } from '../lib/community-core.js';
import { decodeTeam, emptyTeam, encodeTeam } from '../team-builder/team-core.js';

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
const families = read('data/tatari.json').families;
const chips = read('data/zombie-rush/chips.json').chips;
const season = read('data/zombie-rush/seasons/season-1.json');
const seasons = [{ id: season.meta.seasonId, maximumDifficulty: season.seasonRules.maximumDifficulty, roundsPerGame: season.seasonRules.roundsPerGame }];

function memoryStore() {
  const builds = new Map(); const comments = new Map(); const duplicate = new Set(); const actions = new Set(); const rates = new Map(); const reports = []; const trials = [];
  return {
    builds, comments, reports, trials,
    async incrementRateLimit(key) { const value = (rates.get(key) || 0) + 1; rates.set(key, value); return value; },
    async reserveDuplicate(ip, formation) { const key = `${ip}:${formation}`; if (duplicate.has(key)) return false; duplicate.add(key); return true; },
    async reserveAction(kind, ip, target) { const key = `${kind}:${ip}:${target}`; if (actions.has(key)) return false; actions.add(key); return true; },
    async createBuild(build) { builds.set(build.id, structuredClone(build)); },
    async updateBuild(build) { builds.set(build.id, structuredClone(build)); },
    async getBuild(id) { return structuredClone(builds.get(id)); },
    async listBuilds({ offset, limit, seasonId, difficulty, resultStatus, tag }) { const values = [...builds.values()].reverse().filter((b) => b.status === 'active' && (!seasonId || b.seasonId === seasonId) && (!difficulty || b.difficulty === difficulty) && (!resultStatus || b.resultStatus === resultStatus) && (!tag || b.tags.includes(tag))); return { builds: values.slice(offset, offset + limit), hasMore: values.length > offset + limit, consumed: Math.min(limit, values.length - offset) }; },
    async createTrial(trial) { trials.push(structuredClone(trial)); },
    async createComment(comment) { comments.set(comment.id, structuredClone(comment)); },
    async getComment(id) { return structuredClone(comments.get(id)); },
    async listComments(buildId, { offset, limit }) { const values = [...comments.values()].filter((c) => c.buildId === buildId); return { comments: values.slice(offset, offset + limit), hasMore: values.length > offset + limit, consumed: Math.min(limit, values.length - offset) }; },
    async createReport(report) { reports.push(structuredClone(report)); },
    async removeBuild(id) { builds.delete(id); }
  };
}

function fixture() {
  const store = memoryStore(); let sequence = 0;
  const service = createCommunityService({ store, families, chips, seasons, ipHashSecret: 'test-ip-secret', adminToken: 'admin-test-token', now: () => Date.UTC(2026, 8, 4, 12, sequence++), uuid: () => `id-${sequence}`, ownerToken: () => `owner-${sequence}` });
  const team = emptyTeam(); team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 }; team.chips[1] = [chips[0].id];
  const formationCode = encodeTeam(team, families, chips);
  const body = { title: '難易度4の検証編成', note: 'ユーザー投稿の検証用', authorDisplayName: '投稿者', seasonId: seasons[0].id, difficulty: 4, resultStatus: 'round', highestRound: 18, tags: ['検証中'], formationCode };
  return { service, store, team, body };
}

async function rejectsCode(promise, code) { await assert.rejects(promise, (error) => error instanceof CommunityError && error.code === code); }
const compact = (value) => Buffer.from(JSON.stringify({ v: 4, m: 2, u: 0, s: [[0, 0, 1, 1, 1]], ...value })).toString('base64url');

test('投稿・一覧・詳細は公開項目だけを返す', async () => {
  const { service, body } = fixture(); const created = await service.create(body, '192.0.2.1');
  assert.equal(created.build.sourceType, 'community_user'); assert.equal(created.build.playerCounts[1], 1); assert.ok(created.ownerToken); assert.equal('ownerTokenHash' in created.build, false);
  assert.equal((await service.list({ seasonId: 'season-1', difficulty: '4', tag: '検証中' })).builds.length, 1);
  assert.equal((await service.get(created.build.id)).build.id, created.build.id);
});

test('P1/P2・配置・Tier・Lv・チップ・解放設定を投稿後も完全復元する', async () => {
  const { service, body } = fixture();
  const family = families.find((item) => item.evolutions.some((evolution) => Number(evolution.stage) === 4));
  const team = emptyTeam();
  team.playerSettings[1] = { slotLimitPlusOne: true, levelCapPlusOne: true };
  team.playerSettings[2] = { slotLimitPlusOne: false, levelCapPlusOne: true };
  team.slots[0] = { familyId: family.id, stage: 4, playerId: 1, level: 8 };
  team.slots[35] = { familyId: family.id, stage: 3, playerId: 2, level: 7 };
  team.chips[1] = chips.slice(0, 3).map((chip) => chip.id);
  team.chips[2] = chips.slice(3, 6).map((chip) => chip.id);
  const created = await service.create({ ...body, formationCode: encodeTeam(team, families, chips) }, '192.0.2.10');
  const restored = decodeTeam(created.build.formationCode, families, chips);
  assert.deepEqual(restored.slots, team.slots);
  assert.deepEqual(restored.playerSettings, team.playerSettings);
  assert.deepEqual(restored.chips, team.chips);
});

test('空編成・非ゾンビ・不正コード・不正メタ情報を拒否する', async () => {
  for (const mutate of [
    (x) => ({ ...x, formationCode: 'broken' }),
    (x) => { const team = emptyTeam(); return { ...x, formationCode: encodeTeam(team, families, chips) }; },
    (x) => { const team = emptyTeam(); team.mode = 'normal'; team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 }; return { ...x, formationCode: encodeTeam(team, families, chips) }; }
  ]) { const { service, body } = fixture(); await rejectsCode(service.create(mutate(body), `198.51.100.${Math.random()}`), 'INVALID_FORMATION'); }
  for (const change of [{ seasonId: 'season-x' }, { difficulty: 9 }, { highestRound: 26 }, { resultStatus: 'won' }, { tags: ['自由入力タグ'] }]) { const { service, body } = fixture(); await rejectsCode(service.create({ ...body, ...change }, `203.0.113.${Math.random()}`), change.seasonId ? 'INVALID_SEASON' : change.tags ? 'INVALID_TAG' : change.resultStatus ? 'INVALID_RESULT' : 'INVALID_FIELD'); }
});

test('family・Tier・Lv・Player・上限・重複・chipを厳格検証する', async () => {
  const invalidCodes = [
    compact({ s: [[0, 9999, 1, 1, 1]] }),
    compact({ s: [[0, 0, 99, 1, 1]] }),
    compact({ s: [[0, 0, 1, 1, 8]] }),
    compact({ s: [[0, 0, 1, 3, 1]] }),
    compact({ s: [[0, 0, 1, 1, 1], [1, 0, 1, 1, 1]] }),
    compact({ s: Array.from({ length: 11 }, (_, index) => [index, index, 1, 1, 1]) }),
    compact({ p: [[0, 1, 2, 3], []] }),
    compact({ p: [[9999], []] })
  ];
  for (const [index, formationCode] of invalidCodes.entries()) { const { service, body } = fixture(); await rejectsCode(service.create({ ...body, formationCode }, `198.51.100.${index}`), 'INVALID_FORMATION'); }
});

test('重複投稿・連打リアクションを拒否する', async () => {
  const { service, body } = fixture(); const created = await service.create(body, '192.0.2.2');
  await rejectsCode(service.create({ ...body, title: '同じ編成' }, '192.0.2.2'), 'RATE_LIMITED');
  assert.equal((await service.helpful({ id: created.build.id }, '192.0.2.3')).helpfulCount, 1);
  await rejectsCode(service.helpful({ id: created.build.id }, '192.0.2.3'), 'ALREADY_RECORDED');
});

test('編集・削除は所有者トークンで保護される', async () => {
  const { service, body } = fixture(); const created = await service.create(body, '192.0.2.4');
  await rejectsCode(service.edit({ ...body, id: created.build.id, ownerToken: 'wrong' }), 'OWNER_TOKEN_INVALID');
  const edited = await service.edit({ ...body, id: created.build.id, ownerToken: created.ownerToken, title: '更新後' }); assert.equal(edited.build.title, '更新後');
  await service.remove({ id: created.build.id, ownerToken: created.ownerToken }); await rejectsCode(service.get(created.build.id), 'BUILD_NOT_FOUND');
});

test('試行結果・コメント・返信・通報を記録する', async () => {
  const { service, store, body } = fixture(); const created = await service.create(body, '192.0.2.5'); const id = created.build.id;
  const trial = await service.trial({ id, seasonId: 'season-1', difficulty: 4, resultStatus: 'cleared', highestRound: 1, changed: false, comment: '再現できた' }, '192.0.2.6'); assert.equal(trial.summary.reportedBestRound, 25);
  const first = await service.comment({ id, name: 'A', content: '参考になりました' }, '192.0.2.7'); await service.comment({ id, name: 'B', content: '返信です', parentCommentId: first.comment.id }, '192.0.2.8');
  assert.equal((await service.get(id)).comments.length, 2);
  await service.report({ targetType: 'comment', targetId: first.comment.id, reason: 'スパム' }, '192.0.2.9'); assert.equal(store.reports.length, 1);
});

test('一覧を10件ずつcursor paginationする', async () => {
  const { service, body } = fixture();
  for (let index = 0; index < 11; index += 1) await service.create({ ...body, title: `投稿${index}` }, `203.0.113.${index}`);
  const first = await service.list({ sort: 'new' }); assert.equal(first.builds.length, 10); assert.ok(first.nextCursor);
  const second = await service.list({ sort: 'new', cursor: first.nextCursor }); assert.equal(second.builds.length, 1); assert.equal(second.nextCursor, null);
});
