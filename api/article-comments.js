import { ARTICLE_COMMENT_CONFIG, ArticleCommentError, createArticleCommentService } from '../lib/article-comments-core.js';
import { createArticleCommentRedisStore } from '../lib/article-comments-store.js';

const PRODUCTION_ORIGIN = 'https://monster-survival.com';
const headers = (res) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); };
const send = (res, status, payload) => { headers(res); return res.status(status).json(payload); };
const bearer = (req) => String(req.headers.authorization || '').startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : '';
const ip = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

function allowedOrigin(req) {
  const origin = req.headers.origin, host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && (origin === PRODUCTION_ORIGIN || (process.env.VERCEL === '1' && parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app')) || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)));
  } catch { return false; }
}

async function body(req) {
  const size = Number(req.headers['content-length'] || 0);
  if (size > ARTICLE_COMMENT_CONFIG.maxBodyBytes) throw new ArticleCommentError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413);
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '{}')); }
  catch { throw new ArticleCommentError('INVALID_JSON', '送信内容の形式が正しくありません。'); }
}

const service = () => createArticleCommentService({ store: createArticleCommentRedisStore(), ipHashSecret: process.env.BOARD_IP_HASH_SECRET || process.env.FRIENDS_IP_HASH_SECRET, adminToken: process.env.BOARD_ADMIN_TOKEN || process.env.FRIENDS_ADMIN_TOKEN });

export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'production' && !['GET', 'HEAD'].includes(req.method)) return send(res, 405, { ok:false, error:{ code:'PREVIEW_READ_ONLY', message:'Previewでは投稿できません。' } });
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'monster-survival.com'}`);
    if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, { ok:true, ...await service().list(url.searchParams.get('article')) });
    if (!['POST', 'DELETE'].includes(req.method)) return send(res, 405, { ok:false, error:{ code:'METHOD_NOT_ALLOWED', message:'この操作は利用できません。' } });
    if (!allowedOrigin(req)) throw new ArticleCommentError('ORIGIN_NOT_ALLOWED', 'この送信元からは操作できません。', 403);
    const input = await body(req);
    if (req.method === 'POST') return send(res, 201, { ok:true, ...await service().create(input, ip(req)) });
    return send(res, 200, { ok:true, ...await service().remove(input, bearer(req)) });
  } catch (error) {
    const known = error instanceof ArticleCommentError;
    return send(res, known ? error.status : 503, { ok:false, error:{ code:known ? error.code : 'SERVICE_UNAVAILABLE', message:known ? error.message : 'コメント欄を利用できません。少し時間を空けてください。' } });
  }
}
