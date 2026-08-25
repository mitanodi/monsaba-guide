import { fetchOfficialXPosts, OFFICIAL_X_CONFIG, OfficialXError } from '../lib/official-x-core.js';

const CACHE_MILLISECONDS = OFFICIAL_X_CONFIG.cacheSeconds * 1000;
let memoryCache = null;

function setBaseHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function setSuccessCacheHeaders(response) {
  response.setHeader('Cache-Control', 'public, max-age=60');
  response.setHeader('CDN-Cache-Control', `public, s-maxage=${OFFICIAL_X_CONFIG.cacheSeconds}, stale-while-revalidate=86400, stale-if-error=86400`);
  response.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${OFFICIAL_X_CONFIG.cacheSeconds}, stale-while-revalidate=86400, stale-if-error=86400`);
}

function setErrorCacheHeaders(response) {
  response.setHeader('Cache-Control', 'public, max-age=30');
  response.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=300');
}

function send(response, status, payload, cache = false) {
  setBaseHeaders(response);
  if (cache) setSuccessCacheHeaders(response);
  else setErrorCacheHeaders(response);
  return response.status(status).json(payload);
}

export function clearOfficialXMemoryCache() {
  memoryCache = null;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'この操作は利用できません。' } });
  }

  const now = Date.now();
  if (memoryCache?.expiresAt > now) return send(response, 200, memoryCache.payload, true);

  try {
    const result = await fetchOfficialXPosts({
      bearerToken: process.env.X_API_BEARER_TOKEN,
      configuredUserId: process.env.X_OFFICIAL_USER_ID,
    });
    const payload = { ok: true, ...result, fetchedAt: new Date(now).toISOString() };
    memoryCache = { payload, expiresAt: now + CACHE_MILLISECONDS };
    return send(response, 200, payload, true);
  } catch (error) {
    const known = error instanceof OfficialXError;
    if (known && error.diagnostics) {
      console.warn('[official-x] X API request failed', {
        code: error.code,
        ...error.diagnostics,
      });
    }
    return send(response, known ? error.status : 503, {
      ok: false,
      error: {
        code: known ? error.code : 'SERVICE_UNAVAILABLE',
        message: '公式Xの投稿を現在取得できません。',
      },
    });
  }
}
