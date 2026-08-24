import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { isAllowedOrigin } from '../api/friends.js';
import { createFriendsService, FRIENDS_CONFIG, FriendsError, validatePostBody } from '../lib/friends-core.js';
import { copyUid, relativeTime } from '../friends/friends.js';

class MemoryStore {
  constructor(now = () => Date.now()) { this.now = now; this.posts = new Map(); this.rates = new Map(); this.uids = new Map(); }
  async incrementRateLimit(key) { const value = (this.rates.get(key) || 0) + 1; this.rates.set(key, value); return value; }
  async reserveUid(key, ttl) { if ((this.uids.get(key) || 0) > this.now()) return false; this.uids.set(key, this.now() + ttl * 1000); return true; }
  async releaseUid(key) { this.uids.delete(key); }
  async create(post, ttl) { this.posts.set(post.id, { ...post, expiresAt: this.now() + ttl * 1000 }); }
  async list({ offset, limit, expiresBefore }) {
    for (const [id, post] of this.posts) if (Date.parse(post.createdAt) <= expiresBefore || post.expiresAt <= this.now()) this.posts.delete(id);
    const posts = [...this.posts.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(offset, offset + limit + 1);
    return { posts: posts.slice(0, limit), hasMore: posts.length > limit, consumed: Math.min(posts.length, limit) };
  }
  async get(id) { return this.posts.get(id); }
  async remove(id) { this.posts.delete(id); }
}

function fixture(start = Date.parse('2026-08-24T00:00:00.000Z')) {
  let current = start;
  let serial = 0;
  const store = new MemoryStore(() => current);
  const service = createFriendsService({
    store, ipHashSecret: 'i'.repeat(48), adminToken: 'a'.repeat(48), now: () => current,
    uuid: () => `post-${++serial}`, deleteToken: () => `delete-token-${serial}`
  });
  return { store, service, advance: (ms) => { current += ms; }, now: () => current };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof FriendsError && error.code === code);
}

test('UIDだけで投稿でき、公開結果にサーバー管理値を含めない', async () => {
  const { service } = fixture();
  const result = await service.create({ uid: '  UID-001  ' }, '192.0.2.1');
  assert.equal(result.post.uid, 'UID-001');
  assert.equal(result.post.username, '');
  assert.equal(result.post.tataLevel, null);
  assert.ok(result.deleteToken);
  assert.equal('deleteTokenHash' in result.post, false);
  assert.equal('ipHash' in result.post, false);
});

test('全項目を検証して投稿できる', async () => {
  const { service } = fixture();
  const { post } = await service.create({ uid: 'UID-ALL', username: 'おぢ', tataLevel: '123', comment: 'よろしく！' }, '192.0.2.2');
  assert.deepEqual({ uid: post.uid, username: post.username, tataLevel: post.tataLevel, comment: post.comment }, { uid: 'UID-ALL', username: 'おぢ', tataLevel: 123, comment: 'よろしく！' });
});

test('UID空欄と空白だけを拒否する', () => {
  assert.throws(() => validatePostBody({}), (error) => error.code === 'UID_REQUIRED');
  assert.throws(() => validatePostBody({ uid: '   ' }), (error) => error.code === 'UID_REQUIRED');
});

test('入力長をサーバー側で制限する', () => {
  assert.doesNotThrow(() => validatePostBody({ uid: 'u', username: '名'.repeat(30), comment: '文'.repeat(150) }));
  assert.throws(() => validatePostBody({ uid: 'u', username: '名'.repeat(31) }), (error) => error.code === 'TOO_LONG');
  assert.throws(() => validatePostBody({ uid: 'u', comment: '文'.repeat(151) }), (error) => error.code === 'TOO_LONG');
});

test('タタレベルは正の整数だけ受け付ける', () => {
  for (const tataLevel of ['abc', '0', '-1', '1.5']) assert.throws(() => validatePostBody({ uid: 'u', tataLevel }), (error) => error.code === 'INVALID_TATA_LEVEL');
  assert.equal(validatePostBody({ uid: 'u', tataLevel: '999999' }).tataLevel, 999999);
});

test('UID・ユーザー名・ひとことのHTMLを拒否する', () => {
  for (const body of [{ uid: '<script>' }, { uid: 'u', username: '<img>' }, { uid: 'u', comment: '<script>alert(1)</script>' }]) {
    assert.throws(() => validatePostBody(body), (error) => error.code === 'HTML_NOT_ALLOWED');
  }
});

test('honeypotを拒否する', () => assert.throws(() => validatePostBody({ uid: 'u', website: 'bot' }), (error) => error.code === 'SPAM_DETECTED'));

test('正しい削除tokenだけで削除でき、再削除は404になる', async () => {
  const { service } = fixture();
  const created = await service.create({ uid: 'DELETE-1' }, '192.0.2.3');
  await rejectsCode(service.remove(created.post.id, ''), 'DELETE_TOKEN_REQUIRED');
  await rejectsCode(service.remove(created.post.id, 'wrong'), 'DELETE_TOKEN_INVALID');
  await service.remove(created.post.id, created.deleteToken);
  await rejectsCode(service.remove(created.post.id, created.deleteToken), 'POST_NOT_FOUND');
});

test('管理tokenで投稿を削除できる', async () => {
  const { service } = fixture();
  const created = await service.create({ uid: 'ADMIN-DELETE' }, '192.0.2.4');
  await service.remove(created.post.id, '', 'a'.repeat(48));
  assert.equal((await service.list()).posts.length, 0);
});

test('同一IPは10分で3投稿までに制限する', async () => {
  const { service } = fixture();
  for (const uid of ['RATE-1', 'RATE-2', 'RATE-3']) await service.create({ uid }, '192.0.2.5');
  await rejectsCode(service.create({ uid: 'RATE-4' }, '192.0.2.5'), 'RATE_LIMITED');
});

test('同じUIDの短時間連投を異なるIPでも拒否する', async () => {
  const { service } = fixture();
  await service.create({ uid: 'SAME-UID' }, '192.0.2.6');
  await rejectsCode(service.create({ uid: 'same-uid' }, '192.0.2.7'), 'UID_COOLDOWN');
});

test('一覧は新着順で、日時はUTC ISO形式', async () => {
  const f = fixture();
  await f.service.create({ uid: 'OLD' }, '192.0.2.8');
  f.advance(1000);
  await f.service.create({ uid: 'NEW' }, '192.0.2.9');
  const { posts } = await f.service.list();
  assert.deepEqual(posts.map((post) => post.uid), ['NEW', 'OLD']);
  assert.match(posts[0].createdAt, /Z$/);
});

test('0件一覧と30日経過後の期限切れcleanup', async () => {
  const f = fixture();
  assert.deepEqual((await f.service.list()).posts, []);
  await f.service.create({ uid: 'EXPIRE' }, '192.0.2.10');
  f.advance(FRIENDS_CONFIG.postTtlSeconds * 1000 + 1);
  assert.deepEqual((await f.service.list()).posts, []);
});

test('相対日時を表示する', () => {
  const now = Date.parse('2026-08-24T01:00:00Z');
  assert.equal(relativeTime('2026-08-24T00:59:50Z', now), 'たった今');
  assert.equal(relativeTime('2026-08-24T00:55:00Z', now), '5分前');
  assert.equal(relativeTime('2026-08-23T23:00:00Z', now), '2時間前');
  assert.equal(relativeTime('2026-08-23T00:30:00Z', now), '昨日');
});

test('Clipboard API成功と手動選択fallback', async () => {
  let copied = '';
  assert.equal(await copyUid('UID-COPY', { writeText: async (value) => { copied = value; } }), true);
  assert.equal(copied, 'UID-COPY');
  let selected = false;
  assert.equal(await copyUid('UID-COPY', null, () => { selected = true; }), false);
  assert.equal(selected, true);
});

function responseRecorder() {
  return { statusCode: 0, headers: {}, payload: null, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

test('Originは本番same-origin・localhostだけを許可する', () => {
  assert.equal(isAllowedOrigin({ headers: { origin: 'https://monster-survival.com', host: 'monster-survival.com' } }), true);
  assert.equal(isAllowedOrigin({ headers: { origin: 'http://localhost:3000', host: 'localhost:3000' } }), true);
  assert.equal(isAllowedOrigin({ headers: { origin: 'https://evil.example', host: 'monster-survival.com' } }), false);
});

test('invalid JSON、oversized body、不正OriginをAPIで拒否する', async () => {
  for (const [request, status, code] of [
    [{ method: 'POST', url: '/api/friends', headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' }, body: '{' }, 400, 'INVALID_JSON'],
    [{ method: 'POST', url: '/api/friends', headers: { origin: 'http://localhost', host: 'localhost', 'content-length': String(FRIENDS_CONFIG.maxBodyBytes + 1) }, body: '{}' }, 413, 'BODY_TOO_LARGE'],
    [{ method: 'POST', url: '/api/friends', headers: { origin: 'https://evil.example', host: 'monster-survival.com' }, body: '{}' }, 403, 'ORIGIN_NOT_ALLOWED']
  ]) {
    const response = responseRecorder();
    await handler(request, response);
    assert.equal(response.statusCode, status);
    assert.equal(response.payload.error.code, code);
  }
});

test('Redis設定不足でもstackを返さず統一503にする', async () => {
  const previous = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  const response = responseRecorder();
  await handler({ method: 'GET', url: '/api/friends', headers: { host: 'localhost' } }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal('stack' in response.payload.error, false);
  if (previous.url) process.env.KV_REST_API_URL = previous.url;
  if (previous.token) process.env.KV_REST_API_TOKEN = previous.token;
});
