import { BOARD_CONFIG, BoardError, createBoardService } from '../lib/board-core.js';
import { createBoardRedisStore } from '../lib/board-store.js';

const PRODUCTION_ORIGIN = 'https://monster-survival.com';

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
  const known = error instanceof BoardError;
  return send(response, known ? error.status : 503, {
    ok: false,
    error: {
      code: known ? error.code : 'SERVICE_UNAVAILABLE',
      message: known ? error.message : '投稿できませんでした。少し時間を空けてもう一度お試しください。'
    }
  });
}

export function isAllowedBoardOrigin(request) {
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

export function extractBoardClientIp(request) {
  const value = request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown';
  return String(Array.isArray(value) ? value[0] : value).split(',')[0].trim();
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > BOARD_CONFIG.maxBodyBytes) throw new BoardError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413);
  if (request.body !== undefined) {
    if (typeof request.body === 'object' && request.body !== null && !Buffer.isBuffer(request.body)) {
      if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > BOARD_CONFIG.maxBodyBytes) throw new BoardError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413);
      return request.body;
    }
    try { return JSON.parse(Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body)); }
    catch { throw new BoardError('INVALID_JSON', '送信内容の形式が正しくありません。'); }
  }
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > BOARD_CONFIG.maxBodyBytes) throw new BoardError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413);
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw new BoardError('INVALID_JSON', '送信内容の形式が正しくありません。'); }
}

function bearerToken(request) {
  const authorization = String(request.headers.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function createService() {
  return createBoardService({
    store: createBoardRedisStore(),
    ipHashSecret: process.env.BOARD_IP_HASH_SECRET || process.env.FRIENDS_IP_HASH_SECRET,
    adminToken: process.env.BOARD_ADMIN_TOKEN || process.env.FRIENDS_ADMIN_TOKEN
  });
}

export default async function handler(request, response) {
  try {
    const url = new URL(request.url, `https://${request.headers.host || 'monster-survival.com'}`);
    if (request.method === 'GET') {
      const service = createService();
      if (url.searchParams.get('admin') === 'reports') {
        const result = await service.listReports(bearerToken(request), url.searchParams.get('cursor'));
        return send(response, 200, { ok: true, ...result });
      }
      if (url.searchParams.get('thread')) {
        const result = await service.getThread(url.searchParams.get('thread'), url.searchParams.get('cursor'));
        return send(response, 200, { ok: true, ...result });
      }
      const result = await service.listThreads({
        cursor: url.searchParams.get('cursor'),
        sort: url.searchParams.get('sort') || 'new',
        category: url.searchParams.get('category') || '',
        query: url.searchParams.get('q') || '',
        unanswered: url.searchParams.get('unanswered') === '1'
      });
      return send(response, 200, { ok: true, ...result });
    }
    if (!['POST', 'DELETE'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST, DELETE');
      return send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'この操作は利用できません。' } });
    }
    if (!isAllowedBoardOrigin(request)) throw new BoardError('ORIGIN_NOT_ALLOWED', 'この送信元からは操作できません。', 403);
    const body = await readJsonBody(request);
    const service = createService();
    if (request.method === 'DELETE') {
      const result = await service.remove({
        type: url.searchParams.get('type') || body.type,
        id: url.searchParams.get('id') || body.id,
        deleteToken: body.deleteToken
      }, bearerToken(request));
      return send(response, 200, { ok: true, ...result });
    }
    const action = body.action;
    const ip = extractBoardClientIp(request);
    if (action === 'create_thread') return send(response, 201, { ok: true, ...await service.createThread(body, ip) });
    if (action === 'create_answer') return send(response, 201, { ok: true, ...await service.createAnswer(body, ip) });
    if (action === 'report') return send(response, 201, { ok: true, ...await service.report(body, ip) });
    if (action === 'resolve') return send(response, 200, { ok: true, ...await service.setResolved(body, bearerToken(request)) });
    throw new BoardError('INVALID_ACTION', '操作内容が正しくありません。');
  } catch (error) {
    return sendError(response, error);
  }
}
