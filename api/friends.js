import { createFriendsService, FRIENDS_CONFIG, FriendsError } from '../lib/friends-core.js';
import { createRedisStore } from '../lib/friends-store.js';

const PRODUCTION_ORIGIN = 'https://monsaba-guide.vercel.app';

function setHeaders(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function send(response, status, payload) {
  setHeaders(response);
  return response.status(status).json(payload);
}

function sendError(response, error) {
  const known = error instanceof FriendsError;
  return send(response, known ? error.status : 503, {
    ok: false,
    error: {
      code: known ? error.code : 'SERVICE_UNAVAILABLE',
      message: known ? error.message : '現在掲示板を利用できません。時間をおいて再読み込みしてください。'
    }
  });
}

export function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host) return false;
    if (origin === PRODUCTION_ORIGIN) return true;
    if (process.env.VERCEL === '1' && parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app')) return true;
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function extractClientIp(request) {
  const value = request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown';
  return String(Array.isArray(value) ? value[0] : value).split(',')[0].trim();
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > FRIENDS_CONFIG.maxBodyBytes) throw new FriendsError('BODY_TOO_LARGE', '投稿内容が大きすぎます。', 413);
  if (request.body !== undefined) {
    if (typeof request.body === 'object' && request.body !== null && !Buffer.isBuffer(request.body)) {
      if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > FRIENDS_CONFIG.maxBodyBytes) throw new FriendsError('BODY_TOO_LARGE', '投稿内容が大きすぎます。', 413);
      return request.body;
    }
    try { return JSON.parse(Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body)); }
    catch { throw new FriendsError('INVALID_JSON', 'JSON形式が正しくありません。'); }
  }
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > FRIENDS_CONFIG.maxBodyBytes) throw new FriendsError('BODY_TOO_LARGE', '投稿内容が大きすぎます。', 413);
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw new FriendsError('INVALID_JSON', 'JSON形式が正しくありません。'); }
}

function createService() {
  return createFriendsService({
    store: createRedisStore(),
    ipHashSecret: process.env.FRIENDS_IP_HASH_SECRET,
    adminToken: process.env.FRIENDS_ADMIN_TOKEN
  });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const url = new URL(request.url, `https://${request.headers.host || 'monsaba-guide.vercel.app'}`);
      const result = await createService().list(url.searchParams.get('cursor'));
      return send(response, 200, { ok: true, ...result });
    }
    if (!['POST', 'DELETE'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST, DELETE');
      return send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'この操作は利用できません。' } });
    }
    if (!isAllowedOrigin(request)) throw new FriendsError('ORIGIN_NOT_ALLOWED', 'この送信元からは操作できません。', 403);
    const body = await readJsonBody(request);
    const service = createService();
    if (request.method === 'POST') {
      const result = await service.create(body, extractClientIp(request));
      return send(response, 201, { ok: true, ...result });
    }
    const url = new URL(request.url, `https://${request.headers.host}`);
    const id = url.searchParams.get('id') || request.query?.id || body.id;
    const authorization = String(request.headers.authorization || '');
    const adminToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const result = await service.remove(id, body.deleteToken, adminToken);
    return send(response, 200, { ok: true, ...result });
  } catch (error) {
    return sendError(response, error);
  }
}
