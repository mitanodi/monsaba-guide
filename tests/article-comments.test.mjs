import test from 'node:test';
import assert from 'node:assert/strict';
import { createArticleCommentService, validateArticleComment } from '../lib/article-comments-core.js';

function memoryStore() {
  const comments = new Map(), rates = new Map();
  return {
    comments,
    async incrementRateLimit(key) { const value = (rates.get(key) || 0) + 1; rates.set(key, value); return value; },
    async createComment(comment) { comments.set(comment.id, structuredClone(comment)); },
    async getComment(id) { return comments.get(id) ? structuredClone(comments.get(id)) : null; },
    async listComments(articleId, limit) { return [...comments.values()].filter((item) => item.articleId === articleId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); },
    async removeComment(comment) { comments.delete(comment.id); }
  };
}

test('記事コメントは公開項目だけを返し投稿者が削除できる', async () => {
  const store = memoryStore();
  const service = createArticleCommentService({ store, ipHashSecret:'secret', adminToken:'admin', now:() => Date.parse('2026-09-17T00:00:00Z'), uuid:() => 'comment-1', deleteToken:() => 'delete-me' });
  const created = await service.create({ articleId:'ninjii-hunt', name:'プレイヤー', content:'現在の版で確認できました。' }, '192.0.2.1');
  assert.equal(created.deleteToken, 'delete-me');
  const listed = await service.list('ninjii-hunt');
  assert.deepEqual(listed.comments[0], { id:'comment-1', articleId:'ninjii-hunt', name:'プレイヤー', content:'現在の版で確認できました。', createdAt:'2026-09-17T00:00:00.000Z' });
  await service.remove({ articleId:'ninjii-hunt', id:'comment-1', deleteToken:'delete-me' });
  assert.equal((await service.list('ninjii-hunt')).comments.length, 0);
});

test('HTML・honeypot・未知記事・長すぎる本文を拒否する', () => {
  for (const input of [
    { articleId:'ninjii-hunt', content:'<script>' },
    { articleId:'ninjii-hunt', content:'本文', website:'bot' },
    { articleId:'unknown', content:'本文' },
    { articleId:'ninjii-hunt', content:'あ'.repeat(501) }
  ]) assert.throws(() => validateArticleComment(input));
});

test('連続投稿を制限し、生IPや秘密値を保存しない', async () => {
  const store = memoryStore();
  const service = createArticleCommentService({ store, ipHashSecret:'secret', adminToken:'admin', uuid:() => crypto.randomUUID(), deleteToken:() => 'token' });
  await service.create({ articleId:'ninjii-hunt', content:'1件目' }, '192.0.2.2');
  await assert.rejects(service.create({ articleId:'ninjii-hunt', content:'2件目' }, '192.0.2.2'), (error) => error.code === 'RATE_LIMITED');
  const raw = JSON.stringify([...store.comments.values()]);
  assert.doesNotMatch(raw, /192\.0\.2\.2|secret|delete-me/);
});
