import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { clearOfficialXMemoryCache } from '../api/official-x.js';
import { fetchOfficialXPosts, OfficialXError } from '../lib/official-x-core.js';

const response = (payload, ok = true, status = ok ? 200 : 401) => ({ ok, status, async json() { return payload; } });

test('設定済みUser IDから通常投稿5件だけを要求し、本文と安全な画像を返す', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return response({
      data: [{
        id: '1234567890',
        text: '短い本文',
        note_post: { text: '改変しない長文\n2行目' },
        created_at: '2026-08-25T01:02:03.000Z',
        attachments: { media_keys: ['photo-1', 'unsafe-1'] },
      }],
      includes: { media: [
        { media_key: 'photo-1', type: 'photo', url: 'https://pbs.twimg.com/media/example.jpg', alt_text: '公式画像', width: 1200, height: 675 },
        { media_key: 'unsafe-1', type: 'photo', url: 'https://example.com/not-x.jpg' },
      ] },
    });
  };

  const result = await fetchOfficialXPosts({ bearerToken: 'server-secret', configuredUserId: '999', fetchImpl });
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/2/users/999/tweets');
  assert.equal(url.searchParams.get('max_results'), '5');
  assert.equal(url.searchParams.get('exclude'), 'replies,retweets');
  assert.equal(url.searchParams.has('tweet.fields'), false);
  assert.match(url.searchParams.get('post.fields'), /note_post/);
  assert.match(url.searchParams.get('expansions'), /attachments\.media_keys/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer server-secret');
  assert.equal(result.posts[0].text, '改変しない長文\n2行目');
  assert.equal(result.posts[0].url, 'https://x.com/monsaba_jp/status/1234567890');
  assert.deepEqual(result.posts[0].media, [{ type: 'photo', url: 'https://pbs.twimg.com/media/example.jpg', altText: '公式画像', width: 1200, height: 675 }]);
  assert.equal(JSON.stringify(result).includes('server-secret'), false);
});

test('User ID未設定時だけusername lookupを1回行う', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname);
    if (paths.length === 1) return response({ data: { id: '777' } });
    return response({ data: [{ id: '1', text: '投稿', created_at: '2026-08-25T02:00:00Z' }] });
  };
  const result = await fetchOfficialXPosts({ bearerToken: 'token', fetchImpl });
  assert.deepEqual(paths, ['/2/users/by/username/monsaba_jp', '/2/users/777/tweets']);
  assert.equal(result.account.id, '777');
  assert.equal(result.posts.length, 1);
});

test('Bearer Tokenなし・不正User ID・X API失敗を安全に拒否する', async () => {
  await assert.rejects(fetchOfficialXPosts(), (error) => error instanceof OfficialXError && error.code === 'X_API_NOT_CONFIGURED');
  await assert.rejects(fetchOfficialXPosts({ bearerToken: 'token', configuredUserId: 'not-an-id', fetchImpl: async () => response({}) }), (error) => error.code === 'X_API_CONFIG_INVALID');
  await assert.rejects(fetchOfficialXPosts({ bearerToken: 'token', configuredUserId: '123', fetchImpl: async () => response({ title: 'Unauthorized', detail: 'secret upstream detail' }, false, 401) }), (error) => {
    const serialized = JSON.stringify(error.diagnostics);
    return error.code === 'X_API_UNAVAILABLE'
      && error.diagnostics.upstreamStatus === 401
      && error.diagnostics.upstreamCode === 'Unauthorized'
      && !error.message.includes('secret upstream detail')
      && !serialized.includes('secret upstream detail')
      && !serialized.includes('token');
  });
});

function mockApiResponse() {
  const headers = new Map();
  return {
    headers,
    statusCode: 0,
    body: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('Vercel APIは認証未設定時に秘密値名を返さず短時間cacheの503にする', async () => {
  const previousToken = process.env.X_API_BEARER_TOKEN;
  const previousUserId = process.env.X_OFFICIAL_USER_ID;
  delete process.env.X_API_BEARER_TOKEN;
  delete process.env.X_OFFICIAL_USER_ID;
  clearOfficialXMemoryCache();
  const apiResponse = mockApiResponse();
  try {
    await handler({ method: 'GET' }, apiResponse);
  } finally {
    if (previousToken === undefined) delete process.env.X_API_BEARER_TOKEN;
    else process.env.X_API_BEARER_TOKEN = previousToken;
    if (previousUserId === undefined) delete process.env.X_OFFICIAL_USER_ID;
    else process.env.X_OFFICIAL_USER_ID = previousUserId;
  }
  assert.equal(apiResponse.statusCode, 503);
  assert.equal(apiResponse.body.ok, false);
  assert.equal(JSON.stringify(apiResponse.body).includes('X_API_BEARER_TOKEN'), false);
  assert.match(apiResponse.headers.get('vercel-cdn-cache-control'), /s-maxage=300/);
  assert.equal(apiResponse.headers.get('x-robots-tag'), 'noindex, nofollow');
});
