import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import boardHandler, { extractBoardClientIp, isAllowedBoardOrigin } from '../api/board.js';
import { BOARD_CONFIG, BoardError, createBoardService, validateAnswerBody, validateThreadBody } from '../lib/board-core.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function memoryStore() {
  const threads = new Map(); const answers = new Map(); const reports = new Map(); const rates = new Map(); const reservations = new Set();
  return {
    threads, answers, reports, rates,
    async incrementRateLimit(key) { const count = (rates.get(key) || 0) + 1; rates.set(key, count); return count; },
    async reserveReport(ipHash, type, id) { const key = `${ipHash}:${type}:${id}`; if (reservations.has(key)) return false; reservations.add(key); return true; },
    async createThread(thread) { threads.set(thread.id, structuredClone(thread)); },
    async updateThread(thread) { threads.set(thread.id, structuredClone(thread)); },
    async getThread(id) { return threads.get(id) ? structuredClone(threads.get(id)) : null; },
    async getAnswer(id) { return answers.get(id) ? structuredClone(answers.get(id)) : null; },
    async listThreads({ offset, limit, sort, category, query, unanswered }) {
      let values = [...threads.values()].filter((item) => item.status === 'active');
      values.sort(sort === 'answers' ? (a, b) => b.answerCount - a.answerCount : (a, b) => b.createdAt.localeCompare(a.createdAt));
      if (category) values = values.filter((item) => item.category === category);
      if (unanswered) values = values.filter((item) => item.answerCount === 0);
      if (query) values = values.filter((item) => `${item.title}\n${item.content}\n${item.name}`.includes(query));
      const page = values.slice(offset, offset + limit + 1);
      return { threads: page.slice(0, limit).map((item) => structuredClone(item)), hasMore: page.length > limit, consumed: Math.min(page.length, limit) };
    },
    async createAnswer(answer) {
      answers.set(answer.id, structuredClone(answer));
      const thread = threads.get(answer.threadId); thread.answerCount += 1; thread.latestAnswerAt = answer.createdAt; thread.updatedAt = answer.createdAt;
    },
    async listAnswers(threadId, { offset, limit }) {
      const values = [...answers.values()].filter((item) => item.threadId === threadId && item.status === 'active').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const page = values.slice(offset, offset + limit + 1);
      return { answers: page.slice(0, limit).map((item) => structuredClone(item)), hasMore: page.length > limit, consumed: Math.min(page.length, limit) };
    },
    async removeAnswer(id, threadId) { answers.delete(id); const thread = threads.get(threadId); thread.answerCount = [...answers.values()].filter((item) => item.threadId === threadId).length; },
    async removeThread(id) { threads.delete(id); for (const [answerId, answer] of answers) if (answer.threadId === id) answers.delete(answerId); },
    async createReport(report) { reports.set(report.id, structuredClone(report)); },
    async listReports({ offset, limit }) { const values = [...reports.values()].reverse().slice(offset, offset + limit + 1); return { reports: values.slice(0, limit), hasMore: values.length > limit, consumed: Math.min(values.length, limit) }; }
  };
}

function serviceFixture() {
  const store = memoryStore(); let sequence = 0; let clock = Date.parse('2026-08-28T10:00:00+09:00');
  const service = createBoardService({ store, ipHashSecret: 'test-ip-secret', adminToken: 'test-admin-secret', now: () => clock++, uuid: () => `id-${++sequence}`, deleteToken: () => `delete-${sequence + 1}` });
  return { service, store };
}
const validThread = { title: '最初のT3について', content: '通常ステージを優先する場合の候補を教えてください。', name: '質問者', context: 'T2・レベル20', category: '進化', website: '' };

test('質問投稿・取得・検索・未回答フィルターが動く', async () => {
  const { service } = serviceFixture();
  const created = await service.createThread(validThread, '192.0.2.1');
  assert.equal(created.thread.title, validThread.title); assert.ok(created.deleteToken);
  assert.equal((await service.getThread(created.thread.id)).answers.length, 0);
  assert.equal((await service.listThreads({ query: 'T3', unanswered: true })).threads.length, 1);
});

test('回答投稿・取得で回答数と最新回答日時を更新する', async () => {
  const { service } = serviceFixture(); const question = await service.createThread(validThread, '192.0.2.2');
  const result = await service.createAnswer({ threadId: question.thread.id, content: '手持ちと必要星数も確認しましょう。', name: '回答者', website: '' }, '192.0.2.3');
  const loaded = await service.getThread(question.thread.id);
  assert.equal(result.answer.content, '手持ちと必要星数も確認しましょう。'); assert.equal(loaded.thread.answerCount, 1); assert.equal(loaded.answers.length, 1); assert.ok(loaded.thread.latestAnswerAt);
});

test('空投稿、タイトル・本文・名前の上限超過を拒否する', () => {
  assert.throws(() => validateThreadBody({ ...validThread, title: '' }), BoardError);
  assert.throws(() => validateThreadBody({ ...validThread, title: 'あ'.repeat(81) }), /80文字以内/);
  assert.throws(() => validateThreadBody({ ...validThread, content: 'あ'.repeat(1601) }), /1600文字以内/);
  assert.throws(() => validateThreadBody({ ...validThread, name: 'あ'.repeat(31) }), /30文字以内/);
  assert.throws(() => validateAnswerBody({ threadId: 'x', content: 'あ'.repeat(1201), name: '' }), /1200文字以内/);
});

test('honeypotとHTML/XSS文字列を拒否し、UIはtextContentだけで表示する', () => {
  assert.throws(() => validateThreadBody({ ...validThread, website: 'bot.example' }), /受け付けられません/);
  for (const value of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>']) assert.throws(() => validateThreadBody({ ...validThread, content: value }), /HTML/);
  const client = read('board/board.js');
  assert.match(client, /node\.textContent = text/); assert.doesNotMatch(client, /innerHTML\s*=/); assert.doesNotMatch(client, /linkify|autolink/i);
});

test('投稿者tokenで解決・削除でき、誤tokenは拒否する', async () => {
  const { service } = serviceFixture(); const created = await service.createThread(validThread, '192.0.2.4');
  await assert.rejects(service.setResolved({ threadId: created.thread.id, resolved: true, deleteToken: 'wrong' }), /権限/);
  assert.equal((await service.setResolved({ threadId: created.thread.id, resolved: true, deleteToken: created.deleteToken })).thread.resolved, true);
  await service.remove({ type: 'thread', id: created.thread.id, deleteToken: created.deleteToken });
  await assert.rejects(service.getThread(created.thread.id), /見つかりません/);
});

test('回答者tokenと管理者tokenで投稿を削除できる', async () => {
  const { service, store } = serviceFixture(); const question = await service.createThread(validThread, '192.0.2.5');
  const answer = await service.createAnswer({ threadId: question.thread.id, content: '回答です', name: '', website: '' }, '192.0.2.6');
  await service.remove({ type: 'answer', id: answer.answer.id, deleteToken: answer.deleteToken }); assert.equal(store.answers.size, 0);
  const second = await service.createAnswer({ threadId: question.thread.id, content: '管理対象です', name: '', website: '' }, '192.0.2.7');
  await service.remove({ type: 'answer', id: second.answer.id }, 'test-admin-secret'); assert.equal(store.answers.size, 0);
});

test('通報は保存するが自動削除せず、同一対象への重複通報を拒否する', async () => {
  const { service, store } = serviceFixture(); const question = await service.createThread(validThread, '192.0.2.8');
  assert.deepEqual(await service.report({ targetType: 'thread', targetId: question.thread.id, reason: 'スパム', website: '' }, '192.0.2.9'), { accepted: true });
  assert.equal(store.threads.size, 1); assert.equal(store.reports.size, 1);
  await assert.rejects(service.report({ targetType: 'thread', targetId: question.thread.id, reason: 'スパム', website: '' }, '192.0.2.9'), /すでに通報済み/);
  assert.equal((await service.listReports('test-admin-secret')).reports.length, 1);
});

test('質問・回答のrate limitは用途別に作動する', async () => {
  const { service } = serviceFixture(); await service.createThread(validThread, '192.0.2.10');
  await assert.rejects(service.createThread({ ...validThread, title: '2件目' }, '192.0.2.10'), /少し時間/);
  const other = await service.createThread({ ...validThread, title: '別の質問' }, '192.0.2.11');
  await service.createAnswer({ threadId: other.thread.id, content: '1件目', name: '', website: '' }, '192.0.2.12');
  await assert.rejects(service.createAnswer({ threadId: other.thread.id, content: '2件目', name: '', website: '' }, '192.0.2.12'), /少し時間/);
});

test('保存レコードに生IPもIP hashも含めない', async () => {
  const { service, store } = serviceFixture(); await service.createThread(validThread, '203.0.113.99');
  const serialized = JSON.stringify([...store.threads.values()]);
  assert.doesNotMatch(serialized, /203\.0\.113\.99/); assert.doesNotMatch(serialized, /ipAddress|ipHash|rawIp/i);
});

test('Origin検証は本番同一originを許可し第三者originを拒否する', () => {
  assert.equal(isAllowedBoardOrigin({ headers: { origin: 'https://monster-survival.com', host: 'monster-survival.com' } }), true);
  assert.equal(isAllowedBoardOrigin({ headers: { origin: 'https://evil.example', host: 'monster-survival.com' } }), false);
  assert.equal(extractBoardClientIp({ headers: { 'x-vercel-forwarded-for': '192.0.2.20, 192.0.2.21' } }), '192.0.2.20');
});

test('巨大bodyをAPI入口で413拒否し、内部情報を返さない', async () => {
  const request = { method: 'POST', url: '/api/board', headers: { origin: 'https://monster-survival.com', host: 'monster-survival.com', 'content-length': String(BOARD_CONFIG.maxBodyBytes + 1) }, body: {} };
  let statusCode; let payload;
  const response = { setHeader() {}, status(value) { statusCode = value; return this; }, json(value) { payload = value; return value; } };
  await boardHandler(request, response);
  assert.equal(statusCode, 413); assert.equal(payload.error.code, 'BODY_TOO_LARGE'); assert.doesNotMatch(JSON.stringify(payload), /stack|Redis|secret/i);
});

test('掲示板のSEO、広告除外、Privacy、匿名Analyticsを維持する', () => {
  const main = read('board/index.html'); const thread = read('board/thread/index.html'); const analytics = read('board/board.js');
  assert.match(main, /<meta name="robots" content="index,follow/); assert.match(thread, /<meta name="robots" content="noindex,follow"/);
  assert.doesNotMatch(main + thread, /monetization\.js|data-affiliate-offer|a8mat|adsbygoogle/i);
  const excluded = JSON.parse(read('data/adsense-config.json')).excludedPages; assert.ok(excluded.includes('/board/')); assert.ok(excluded.includes('/board/*'));
  const privacy = read('privacy/index.html'); for (const phrase of ['質問・回答へ個人情報を書かない', '生のIPアドレスを保存せず', '通報', '自動削除', 'タイトル・本文・回答・名前・検索語・投稿ID・IPアドレスは送りません']) assert.ok(privacy.includes(phrase), phrase);
  assert.doesNotMatch(analytics, /track\([^\n]*(title|content|name|targetId|postId|search_query|query:)/);
  for (const event of ['board_view', 'board_question_submit', 'board_answer_submit', 'board_filter_use', 'board_report', 'board_resolved']) assert.ok(read('growth.js').includes(`'${event}'`), event);
});

test('掲示板はsitemapに本体だけ含み、導線・レスポンシブ条件を持つ', () => {
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /https:\/\/monster-survival\.com\/board\//); assert.doesNotMatch(sitemap, /\/board\/thread\//);
  assert.match(read('index.html'), /href="\/board\/"/); assert.match(read('consult/index.html'), /href="\/board\/"/); assert.match(read('scripts/shared-layout.mjs'), /href: '\/board\/'/);
  const css = read('board/board.css'); assert.match(css, /@media\(max-width:820px\)/); assert.match(css, /@media\(max-width:430px\)/); assert.match(css, /min-height:44px/); assert.doesNotMatch(css, /min-width:\s*[5-9]\d\dpx/);
});

test('friendsの分離、掲示板prefix、保持方針、管理ドキュメントを確認する', () => {
  assert.match(read('lib/board-store.js'), /monsaba:board/); assert.doesNotMatch(read('lib/board-store.js'), /monsaba:friends/);
  assert.doesNotMatch(read('lib/board-store.js'), /expire\(threadKey|expire\(answerKey/);
  for (const file of ['api/friends.js', 'lib/friends-core.js', 'lib/friends-store.js']) assert.doesNotMatch(read(file), /monsaba:board/);
  const docs = read('docs/board-moderation.md'); for (const phrase of ['確認手順', '削除手順', '通報確認手順', 'BOARD_ADMIN_TOKEN', 'FRIENDS_ADMIN_TOKEN']) assert.ok(docs.includes(phrase), phrase);
});
