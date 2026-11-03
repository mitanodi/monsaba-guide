import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCommunityService, CommunityError } from '../lib/community-core.js';
import { createCommunityRedisStore } from '../lib/community-store.js';
import { decodeTeam, emptyTeam, encodeTeam, freeSlot, freeSlotCount } from '../team-builder/team-core.js';

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
const families = read('data/tatari.json').families;
const chips = read('data/zombie-rush/chips.json').chips;
const season = read('data/zombie-rush/seasons/season-1.json');
const seasons = [{
  id: season.meta.seasonId,
  maximumDifficulty: season.seasonRules.maximumDifficulty,
  roundsPerGame: season.seasonRules.roundsPerGame
}];

function memoryStore() {
  const builds = new Map();

  const comments = new Map();

  const duplicate = new Set();

  const actions = new Set();

  const rates = new Map();

  const reports = [];

  const trials = [];
  return {
    builds,
    comments,
    reports,
    trials,
    async incrementRateLimit(key) {

      const value = (rates.get(key) || 0) + 1;

      rates.set(key, value);

      return value;

    },
    async reserveDuplicate(ip, formation) {

      const key = `${ip}:${formation}`;

      if (duplicate.has(key))
        return false;

      duplicate.add(key);

      return true;

    },
    async reserveAction(kind, ip, target) {

      const key = `${kind}:${ip}:${target}`;

      if (actions.has(key))
        return false;

      actions.add(key);

      return true;

    },
    async createBuild(build) {

      builds.set(build.id, structuredClone(build));

    },
    async updateBuild(build) {

      builds.set(build.id, structuredClone(build));

    },
    async getBuild(id) {

      return structuredClone(builds.get(id));

    },
    async listBuilds({ offset, limit, mode = 'zombie', chapter = null, dojoAttribute = null, floor = null, stage = null, seasonId, difficulty, resultStatus, tag }) {

      const values = [...builds.values()].reverse().filter((b) => b.status === 'active' && (b.mode || 'zombie') === mode && (chapter === null || b.chapter === chapter) && (dojoAttribute === null || b.dojoAttribute === dojoAttribute) && (floor === null || b.floor === floor) && (stage === null || b.stageFrom == null || (b.stageFrom <= stage && b.stageTo >= stage)) && (!seasonId || b.seasonId === seasonId) && (!difficulty || b.difficulty === difficulty) && (!resultStatus || b.resultStatus === resultStatus) && (!tag || b.tags.includes(tag)));

      return {
        builds: values.slice(offset, offset + limit),
        hasMore: values.length > offset + limit,
        consumed: Math.min(limit, values.length - offset)
      };

    },
    async createTrial(trial) {

      trials.push(structuredClone(trial));

    },
    async createComment(comment) {

      comments.set(comment.id, structuredClone(comment));

    },
    async getComment(id) {

      return structuredClone(comments.get(id));

    },
    async listComments(buildId, { offset, limit }) {

      const values = [...comments.values()].filter((c) => c.buildId === buildId);

      return {
        comments: values.slice(offset, offset + limit),
        hasMore: values.length > offset + limit,
        consumed: Math.min(limit, values.length - offset)
      };

    },
    async createReport(report) {

      reports.push(structuredClone(report));

    },
    async removeBuild(id) {

      builds.delete(id);

    }
  };
}

function fixture() {
  const store = memoryStore();

  let sequence = 0;
  const service = createCommunityService({
    store,
    families,
    chips,
    seasons,
    ipHashSecret: 'test-ip-secret',
    adminToken: 'admin-test-token',
    now: () => Date.UTC(2026, 8, 4, 12, sequence++),
    uuid: () => `id-${sequence}`,
    ownerToken: () => `owner-${sequence}`
  });
  const team = emptyTeam();

  team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 };

  team.chips[1] = [chips[0].id];
  const formationCode = encodeTeam(team, families, chips);
  const body = {
    title: '難易度4の検証編成',
    note: 'ユーザー投稿の検証用',
    authorDisplayName: '投稿者',
    seasonId: seasons[0].id,
    difficulty: 4,
    resultStatus: 'round',
    highestRound: 18,
    tags: ['検証中'],
    formationCode
  };
  return { service, store, team, body };
}

async function rejectsCode(promise, code) {

  await assert.rejects(promise, (error) => error instanceof CommunityError && error.code === code);

}
const compact = (value) => Buffer.from(JSON.stringify({ v: 4, m: 2, u: 0, s: [[0, 0, 1, 1, 1]], ...value })).toString('base64url');

test('投稿・一覧・詳細は公開項目だけを返す', async () => {
  const { service, body } = fixture();

  const created = await service.create(body, '192.0.2.1');
  assert.equal(created.build.sourceType, 'community_user');

  assert.equal(created.build.playerCounts[1], 1);

  assert.ok(created.ownerToken);

  assert.equal('ownerTokenHash' in created.build, false);
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

test('Communityは自由枠の複数配置・Player・位置を検証して復元する', async () => {
  const { service, body } = fixture();

  const team = emptyTeam();

  team.slots[2] = freeSlot(1);

  team.slots[8] = freeSlot(1);

  team.slots[35] = freeSlot(2);
  const created = await service.create({ ...body, formationCode: encodeTeam(team, families, chips) }, '192.0.2.44');

  const restored = decodeTeam(created.build.formationCode, families, chips);
  assert.equal(freeSlotCount(restored, 1), 2);

  assert.equal(freeSlotCount(restored, 2), 1);

  assert.equal(restored.slots[35].playerId, 2);
  const invalid = Buffer.from(JSON.stringify({ v: 6, m: 2, u: 0, s: [[0, -1, 0, 3, 0]] })).toString('base64url');

  const next = fixture();

  await rejectsCode(next.service.create({ ...next.body, formationCode: invalid }, '192.0.2.45'), 'INVALID_FORMATION');
});

test('空編成・非ゾンビ・不正コード・不正メタ情報を拒否する', async () => {
  for (const mutate of [
    (x) => ({ ...x, formationCode: 'broken' }),
    (x) => {

      const team = emptyTeam();

      return { ...x, formationCode: encodeTeam(team, families, chips) };

    },
    (x) => {

      const team = emptyTeam();

      team.mode = 'normal';

      team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 };

      return { ...x, formationCode: encodeTeam(team, families, chips) };

    }
  ]) {

    const { service, body } = fixture();

    await rejectsCode(service.create(mutate(body), `198.51.100.${Math.random()}`), 'INVALID_FORMATION');

  }
  for (const change of [{ seasonId: 'season-x' }, { difficulty: 9 }, { highestRound: 26 }, { resultStatus: 'won' }, { tags: ['自由入力タグ'] }]) {

    const { service, body } = fixture();

    await rejectsCode(service.create({ ...body, ...change }, `203.0.113.${Math.random()}`), change.seasonId ? 'INVALID_SEASON' : change.tags ? 'INVALID_TAG' : change.resultStatus ? 'INVALID_RESULT' : 'INVALID_FIELD');

  }
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
  for (const [index, formationCode] of invalidCodes.entries()) {

    const { service, body } = fixture();

    await rejectsCode(service.create({ ...body, formationCode }, `198.51.100.${index}`), 'INVALID_FORMATION');

  }
});

test('重複投稿・連打リアクションを拒否する', async () => {
  const { service, body } = fixture();

  const created = await service.create(body, '192.0.2.2');
  await rejectsCode(service.create({ ...body, title: '同じ編成' }, '192.0.2.2'), 'RATE_LIMITED');
  assert.equal((await service.helpful({ id: created.build.id }, '192.0.2.3')).helpfulCount, 1);
  await rejectsCode(service.helpful({ id: created.build.id }, '192.0.2.3'), 'ALREADY_RECORDED');
});

test('編集・削除は所有者トークンで保護される', async () => {
  const { service, body } = fixture();

  const created = await service.create(body, '192.0.2.4');
  await rejectsCode(service.edit({ ...body, id: created.build.id, ownerToken: 'wrong' }), 'OWNER_TOKEN_INVALID');
  const edited = await service.edit({ ...body, id: created.build.id, ownerToken: created.ownerToken, title: '更新後' });

  assert.equal(edited.build.title, '更新後');
  await service.remove({ id: created.build.id, ownerToken: created.ownerToken });

  await rejectsCode(service.get(created.build.id), 'BUILD_NOT_FOUND');
});

test('試行結果・コメント・返信・通報を記録する', async () => {
  const { service, store, body } = fixture();

  const created = await service.create(body, '192.0.2.5');

  const id = created.build.id;
  const trial = await service.trial({
    id,
    seasonId: 'season-1',
    difficulty: 4,
    resultStatus: 'cleared',
    highestRound: 1,
    changed: false,
    comment: '再現できた'
  }, '192.0.2.6');

  assert.equal(trial.summary.reportedBestRound, 25);
  const first = await service.comment({ id, name: 'A', content: '参考になりました' }, '192.0.2.7');

  await service.comment({ id, name: 'B', content: '返信です', parentCommentId: first.comment.id }, '192.0.2.8');
  assert.equal((await service.get(id)).comments.length, 2);
  await service.report({ targetType: 'comment', targetId: first.comment.id, reason: 'スパム' }, '192.0.2.9');

  assert.equal(store.reports.length, 1);
});

test('一覧を10件ずつcursor paginationする', async () => {
  const { service, body } = fixture();
  for (let index = 0; index < 11; index += 1)
    await service.create({ ...body, title: `投稿${index}` }, `203.0.113.${index}`);
  const first = await service.list({ sort: 'new' });

  assert.equal(first.builds.length, 10);

  assert.ok(first.nextCursor);
  const second = await service.list({ sort: 'new', cursor: first.nextCursor });

  assert.equal(second.builds.length, 1);

  assert.equal(second.nextCursor, null);
});


function normalBody(overrides = {}) {
  const team = emptyTeam();
  team.mode = 'normal';
  team.context.normalStage = '別の入力';
  team.slots[0] = { familyId: families[0].id, stage: 1, playerId: 1, level: 1 };
  return { title: 'チャプター74の編成', mode: 'normal', chapter: 74, resultStatus: 'cleared', formationCode: encodeTeam(team, families, chips), ...overrides };
}

test('通常投稿は章とステージ範囲を保持し、ZRメタ不要で編成を復元する', async () => {
  const { service } = fixture();
  const created = await service.create(normalBody({ stageFrom: 1, stageTo: 4 }), '192.0.2.101');
  assert.equal(created.build.mode, 'normal');
  assert.equal(created.build.chapter, 74);
  assert.equal(created.build.stageFrom, 1);
  assert.equal(created.build.stageTo, 4);
  assert.equal(created.build.seasonId, '');
  assert.equal(created.build.difficulty, null);
  assert.equal(created.build.highestRound, 0);
  const team = decodeTeam(created.build.formationCode, families, chips);
  assert.equal(team.mode, 'normal');
  assert.equal(team.context.normalStage, '74-1〜74-4');
  assert.equal(team.slots[0].familyId, families[0].id);
  assert.equal('ownerTokenHash' in created.build, false);
  assert.equal((await service.get(created.build.id)).build.chapter, 74);
});

test('通常15体・自由枠を復元し、16体・P2・重複・範囲外配置を拒否する', async () => {
  const { service } = fixture();
  const team = emptyTeam();
  team.mode = 'normal';
  for (let index = 0; index < 14; index += 1)
    team.slots[index] = { familyId: families[index].id, stage: 1, playerId: 1, level: 1 };
  team.slots[24] = freeSlot(1);
  const created = await service.create(normalBody({ formationCode: encodeTeam(team, families, chips) }), '192.0.2.102');
  const restored = decodeTeam(created.build.formationCode, families, chips);
  assert.equal(created.build.playerCounts[1], 15);
  assert.equal(created.build.playerCounts[2], 0);
  assert.equal(freeSlotCount(restored, 1), 1);
  assert.equal(restored.context.normalStage, '74');
  const invalidSlots = [
    Array.from({ length: 16 }, (_, i) => [i, i, 1, 1, 1]),
    [[0, 0, 1, 2, 1]],
    [[0, 0, 1, 1, 1], [1, 0, 1, 1, 1]],
    [[35, 0, 1, 1, 1]]
  ];
  for (const [index, slots] of invalidSlots.entries()) {
    const next = fixture();
    const code = Buffer.from(JSON.stringify({ v: 6, m: 1, u: 0, s: slots })).toString('base64url');
    await rejectsCode(next.service.create(normalBody({ formationCode: code }), `192.0.2.${110 + index}`), 'INVALID_FORMATION');
  }
});

test('章一覧は通常・ZR・別章を混ぜず、ステージを範囲で絞り込む', async () => {
  const { service, store, body } = fixture();
  const legacy = await service.create(body, '192.0.2.120');
  // Simulate a pre-feature record: it has no mode/chapter fields and needs no migration.
  const legacyRecord = store.builds.get(legacy.build.id);
  delete legacyRecord.mode;
  delete legacyRecord.chapter;
  const normal = await service.create(normalBody({ stageFrom: 1, stageTo: 4 }), '192.0.2.121');
  await service.create(normalBody({ chapter: 75 }), '192.0.2.122');
  assert.deepEqual((await service.list()).builds.map((b) => b.id), [legacy.build.id]);
  assert.equal((await service.list({ mode: 'normal' })).builds.length, 2);
  assert.deepEqual((await service.list({ mode: 'normal', chapter: '74', stage: '3' })).builds.map((b) => b.id), [normal.build.id]);
  assert.equal((await service.list({ mode: 'normal', chapter: '74', stage: '5' })).builds.length, 0);
  assert.equal((await service.list({ mode: 'normal', chapter: '76' })).builds.length, 0);
});

test('通常の章・範囲・モード・結果を厳格検証する', async () => {
  for (const [change, code] of [
    [{ chapter: true }, 'INVALID_FIELD'], [{ chapter: [74] }, 'INVALID_FIELD'], [{ chapter: 0 }, 'INVALID_FIELD'], [{ chapter: 10000 }, 'INVALID_FIELD'], [{ chapter: 1.1 }, 'INVALID_FIELD'],
    [{ stageFrom: 0 }, 'INVALID_FIELD'], [{ stageFrom: 1, stageTo: 10000 }, 'INVALID_FIELD'],
    [{ stageTo: 2 }, 'INVALID_STAGE_RANGE'], [{ stageFrom: 4, stageTo: 1 }, 'INVALID_STAGE_RANGE'],
    [{ resultStatus: 'round' }, 'INVALID_RESULT'], [{ mode: 'boss' }, 'INVALID_MODE']
  ]) {
    const { service } = fixture();
    await rejectsCode(service.create(normalBody(change), '192.0.2.130'), code);
  }
  const { service, body } = fixture();
  await rejectsCode(service.create(normalBody({ formationCode: body.formationCode }), '192.0.2.131'), 'INVALID_FORMATION');
  await rejectsCode(service.list({ mode: 'normal', chapter: 'no' }), 'INVALID_FIELD');
  await rejectsCode(service.list({ mode: 'normal', stage: '1' }), 'INVALID_FIELD');
});

test('通常の編集・試行・コメント・通報・削除は既存保護を維持する', async () => {
  const { service, store } = fixture();
  const created = await service.create(normalBody(), '192.0.2.140');
  const id = created.build.id;
  await rejectsCode(service.edit({ ...normalBody(), id, ownerToken: 'wrong' }), 'OWNER_TOKEN_INVALID');
  await rejectsCode(service.edit({ ...normalBody(), id, ownerToken: created.ownerToken, mode: 'zombie' }), 'INVALID_MODE');
  const edited = await service.edit({ ...normalBody({ chapter: 75, stageFrom: 2 }), id, ownerToken: created.ownerToken });
  assert.equal(edited.build.chapter, 75);
  assert.equal(edited.build.stageTo, 2);
  assert.equal(decodeTeam(edited.build.formationCode, families, chips).context.normalStage, '75-2');
  const trial = await service.trial({ id, resultStatus: 'cleared', comment: '確認できた' }, '192.0.2.141');
  assert.equal(trial.trial.mode, 'normal');
  assert.equal(trial.trial.chapter, 75);
  assert.equal(trial.trial.highestRound, 0);
  assert.equal(trial.summary.clearReportCount, 1);
  assert.equal(trial.summary.reportedBestRound, 0);
  await rejectsCode(service.trial({ id, mode: 'zombie', resultStatus: 'cleared' }, '192.0.2.142'), 'INVALID_MODE');
  await service.comment({ id, content: '参考になりました' }, '192.0.2.143');
  await service.report({ targetType: 'build', targetId: id, reason: 'その他' }, '192.0.2.144');
  assert.equal(store.reports.length, 1);
  assert.equal((await service.get(id)).comments.length, 1);
  assert.equal((await service.helpful({ id }, '192.0.2.145')).helpfulCount, 1);
  await rejectsCode(service.helpful({ id }, '192.0.2.145'), 'ALREADY_RECORDED');
  await rejectsCode(service.create(normalBody({ website: 'honeypot' }), '192.0.2.146'), 'SPAM_DETECTED');
  await rejectsCode(service.create(normalBody({ note: '<script>bad</script>' }), '192.0.2.146'), 'UNSAFE_TEXT');
  await service.remove({ id, ownerToken: created.ownerToken });
  await rejectsCode(service.get(id), 'BUILD_NOT_FOUND');
});

function redisFixture() {
  const values = new Map();
  const sorted = new Map();
  const calls = [];
  const redis = {
    async get(key) { return structuredClone(values.get(key)); },
    async set(key, value) { values.set(key, structuredClone(value)); return 'OK'; },
    async del(key) { values.delete(key); sorted.delete(key); return 1; },
    async zadd(key, { score, member }) {
      if (!sorted.has(key)) sorted.set(key, new Map());
      sorted.get(key).set(member, score);
      return 1;
    },
    async zrem(key, member) { return sorted.get(key)?.delete(member) ? 1 : 0; },
    async zrange(key, start, end, { rev = false } = {}) {
      calls.push(key);
      const items = [...(sorted.get(key) || new Map())].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([member]) => member);
      if (rev) items.reverse();
      return items.slice(start, end === -1 ? undefined : end + 1);
    }
  };
  const pipeline = () => {
    const queue = [];
    const chain = { async exec() { const result = []; for (const [method, args] of queue) result.push(await redis[method](...args)); return result; } };
    for (const method of ['get', 'set', 'del', 'zadd', 'zrem'])
      chain[method] = (...args) => { queue.push([method, args]); return chain; };
    return chain;
  };
  redis.multi = pipeline;
  redis.pipeline = pipeline;
  return { redis, sorted, calls };
}

test('Redis索引はZR・章を分離し、他章200件以降も章投稿を取得・移動・削除できる', async () => {
  const { redis, sorted, calls } = redisFixture();
  const store = createCommunityRedisStore({ redis, prefix: 'isolated-test' });
  const record = { id: 'chapter74', mode: 'normal', chapter: 74, stageFrom: 1, stageTo: 4, createdAt: '2026-01-01T00:00:00Z', helpfulCount: 0, trialCount: 0, clearReportCount: 0, reportedBestRound: 0, status: 'active', tags: [] };
  await store.createBuild(record);
  for (let i = 0; i < 210; i += 1)
    await store.createBuild({ ...record, id: `other-${i}`, chapter: 99, createdAt: new Date(Date.UTC(2026, 1, 1, 0, i)).toISOString() });
  await store.createBuild({ ...record, id: 'legacy-zr', mode: undefined, chapter: undefined });
  const query = { offset: 0, limit: 10, scanLimit: 200, sort: 'new' };
  assert.deepEqual((await store.listBuilds({ ...query, mode: 'normal', chapter: 74 })).builds.map((b) => b.id), ['chapter74']);
  assert.ok(calls.includes('isolated-test:normal:chapter:74:builds:new'));
  assert.equal((await store.listBuilds({ ...query, mode: 'normal', chapter: 74, stage: 5 })).builds.length, 0);
  assert.equal((await store.listBuilds({ ...query, mode: 'normal', chapter: 74, stage: 4 })).builds.length, 1);
  assert.deepEqual((await store.listBuilds(query)).builds.map((b) => b.id), ['legacy-zr']);
  await store.updateBuild({ ...record, chapter: 75 });
  assert.equal((await store.listBuilds({ ...query, mode: 'normal', chapter: 74 })).builds.length, 0);
  assert.equal((await store.listBuilds({ ...query, mode: 'normal', chapter: 75 })).builds.length, 1);
  assert.equal(sorted.get('isolated-test:normal:chapter:74:builds:helpful').has('chapter74'), false);
  await store.removeBuild(record.id);
  assert.equal((await store.listBuilds({ ...query, mode: 'normal', chapter: 75 })).builds.length, 0);
  assert.equal(sorted.get('isolated-test:normal:builds:new').has('chapter74'), false);
});


function dojoBody(overrides = {}) {
  const team = emptyTeam();
  team.mode = 'dojo';
  team.context.dojoAttribute = 'fire';
  team.context.note = '任意メモを保持';
  for (let i = 0; i < 5; i += 1)
    team.slots[i] = { familyId: families[i].id, stage: 1, playerId: 1, level: 1 };
  return { title: '水の道場5階', mode: 'dojo', dojoAttribute: 'water', floor: 5, stageFrom: 1, stageTo: 10, resultStatus: 'cleared', formationCode: encodeTeam(team, families, chips), ...overrides };
}

test('道場は5体・属性・階層・範囲を保持し、ZR/通常/別属性/別階と分離する', async () => {
  const { service, body } = fixture();
  await service.create(body, '192.0.2.150');
  await service.create(normalBody(), '192.0.2.151');
  const created = await service.create(dojoBody(), '192.0.2.152');
  await service.create(dojoBody({ dojoAttribute: 'fire' }), '192.0.2.153');
  await service.create(dojoBody({ floor: 6 }), '192.0.2.154');
  const restored = decodeTeam(created.build.formationCode, families, chips);
  assert.equal(restored.mode, 'dojo');
  assert.equal(restored.context.dojoAttribute, 'water');
  assert.equal(restored.context.dojoFloor, 5);
  assert.equal(restored.context.dojoStage, 1);
  assert.equal(restored.context.note, '任意メモを保持');
  assert.equal(created.build.playerCounts[1], 5);
  assert.equal(created.build.floor, 5);
  assert.equal(created.build.stageTo, 10);
  assert.equal(created.build.chapter, null);
  assert.equal((await service.list()).builds.length, 1);
  assert.equal((await service.list({ mode: 'dojo' })).builds.length, 3);
  assert.equal((await service.list({ mode: 'dojo', dojoAttribute: 'water' })).builds.length, 2);
  assert.deepEqual((await service.list({ mode: 'dojo', dojoAttribute: 'water', floor: '5', stage: '8' })).builds.map((b) => b.id), [created.build.id]);
  assert.equal((await service.list({ mode: 'dojo', dojoAttribute: 'water', floor: '5', stage: '11' })).builds.length, 0);
  const trial = await service.trial({ id: created.build.id, resultStatus: 'cleared' }, '192.0.2.155');
  assert.equal(trial.trial.dojoAttribute, 'water');
  assert.equal(trial.trial.floor, 5);
  assert.equal(trial.trial.stageTo, 10);
  assert.equal(trial.summary.clearReportCount, 1);
  assert.equal(trial.summary.reportedBestRound, 0);
  await rejectsCode(service.trial({ id: created.build.id, floor: 6, resultStatus: 'cleared' }, '192.0.2.156'), 'INVALID_MODE');
  const edited = await service.edit({ ...dojoBody({ dojoAttribute: 'rock', floor: 4 }), id: created.build.id, ownerToken: created.ownerToken });
  assert.equal(edited.build.dojoAttribute, 'rock');
  assert.equal(edited.build.floor, 4);
  await service.remove({ id: created.build.id, ownerToken: created.ownerToken });
  await rejectsCode(service.get(created.build.id), 'BUILD_NOT_FOUND');
});

test('道場の不正属性/階層/6体/P2/非道場コードを拒否する', async () => {
  for (const [change, code] of [
    [{ dojoAttribute: '' }, 'REQUIRED_FIELD'], [{ dojoAttribute: 'other' }, 'INVALID_DOJO_ATTRIBUTE'],
    [{ floor: undefined }, 'INVALID_FIELD'], [{ floor: 0 }, 'INVALID_FIELD'], [{ floor: 10000 }, 'INVALID_FIELD']
  ]) {
    const { service } = fixture();
    await rejectsCode(service.create(dojoBody(change), '192.0.2.160'), code);
  }
  for (const slots of [Array.from({ length: 6 }, (_, i) => [i, i, 1, 1, 1]), [[0, 0, 1, 2, 1]]]) {
    const { service } = fixture();
    const code = Buffer.from(JSON.stringify({ v: 6, m: 3, u: 0, s: slots })).toString('base64url');
    await rejectsCode(service.create(dojoBody({ formationCode: code }), '192.0.2.161'), 'INVALID_FORMATION');
  }
  const { service, body } = fixture();
  await rejectsCode(service.create(dojoBody({ formationCode: body.formationCode }), '192.0.2.162'), 'INVALID_FORMATION');
  await rejectsCode(service.list({ mode: 'dojo', dojoAttribute: 'other' }), 'INVALID_DOJO_ATTRIBUTE');
  await rejectsCode(service.list({ mode: 'dojo', floor: '5' }), 'INVALID_FIELD');
  await rejectsCode(service.list({ mode: 'dojo', dojoAttribute: 'water', stage: '1' }), 'INVALID_FIELD');
});

test('Redis道場索引は属性・階層ごとに分離し、編集と削除で全索引を追従する', async () => {
  const { redis, sorted } = redisFixture();
  const store = createCommunityRedisStore({ redis, prefix: 'dojo-isolated' });
  const record = { id: 'dojo-water5', mode: 'dojo', dojoAttribute: 'water', floor: 5, stageFrom: 1, stageTo: 10, createdAt: '2026-01-01T00:00:00Z', helpfulCount: 0, trialCount: 0, clearReportCount: 0, reportedBestRound: 0, status: 'active', tags: [] };
  await store.createBuild(record);
  await store.createBuild({ ...record, id: 'dojo-water6', floor: 6 });
  await store.createBuild({ ...record, id: 'dojo-fire5', dojoAttribute: 'fire' });
  const query = { offset: 0, limit: 10, scanLimit: 200, sort: 'new', mode: 'dojo' };
  assert.equal((await store.listBuilds(query)).builds.length, 3);
  assert.equal((await store.listBuilds({ ...query, dojoAttribute: 'water' })).builds.length, 2);
  assert.deepEqual((await store.listBuilds({ ...query, dojoAttribute: 'water', floor: 5 })).builds.map((b) => b.id), ['dojo-water5']);
  assert.equal((await store.listBuilds({ ...query, dojoAttribute: 'water', floor: 5, stage: 8 })).builds.length, 1);
  assert.equal((await store.listBuilds({ ...query, mode: 'zombie' })).builds.length, 0);
  await store.updateBuild({ ...record, dojoAttribute: 'rock', floor: 4 });
  assert.equal((await store.listBuilds({ ...query, dojoAttribute: 'water', floor: 5 })).builds.length, 0);
  assert.equal((await store.listBuilds({ ...query, dojoAttribute: 'rock', floor: 4 })).builds.length, 1);
  assert.equal(sorted.get('dojo-isolated:dojo:attribute:water:floor:5:builds:helpful').has(record.id), false);
  await store.removeBuild(record.id);
  assert.equal(sorted.get('dojo-isolated:dojo:builds:new').has(record.id), false);
  assert.equal(sorted.get('dojo-isolated:dojo:attribute:rock:builds:new').has(record.id), false);
  assert.equal(sorted.get('dojo-isolated:dojo:attribute:rock:floor:4:builds:new').has(record.id), false);
});

test('ステージ絞り込みは200件スキャン上限の先へcursorで継続できる', async () => {
  const { redis } = redisFixture();
  const store = createCommunityRedisStore({ redis, prefix: 'scan-isolated' });
  const record = { id: 'old-match', mode: 'normal', chapter: 74, stageFrom: 1, stageTo: 1, createdAt: '2026-01-01T00:00:00Z', helpfulCount: 0, trialCount: 0, clearReportCount: 0, reportedBestRound: 0, status: 'active', tags: [] };
  await store.createBuild(record);
  for (let i = 0; i < 210; i += 1)
    await store.createBuild({ ...record, id: `new-nonmatch-${i}`, stageFrom: 2, stageTo: 2, createdAt: new Date(Date.UTC(2026, 1, 1, 0, i)).toISOString() });
  const query = { offset: 0, limit: 10, scanLimit: 200, sort: 'new', mode: 'normal', chapter: 74, stage: 1 };
  const first = await store.listBuilds(query);
  assert.equal(first.builds.length, 0);
  assert.equal(first.consumed, 200);
  assert.equal(first.hasMore, true);
  const second = await store.listBuilds({ ...query, offset: first.consumed });
  assert.deepEqual(second.builds.map((b) => b.id), ['old-match']);
  assert.equal(second.hasMore, false);
});
