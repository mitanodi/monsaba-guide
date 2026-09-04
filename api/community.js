import fs from 'node:fs';
import path from 'node:path';
import { CommunityError, COMMUNITY_CONFIG, createCommunityService } from '../lib/community-core.js';
import { createCommunityRedisStore } from '../lib/community-store.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const families = read('data/tatari.json').families;
const chips = read('data/zombie-rush/chips.json').chips;
const season = read('data/zombie-rush/seasons/season-1.json');
const seasons = [{ id: season.meta.seasonId, maximumDifficulty: season.seasonRules.maximumDifficulty, roundsPerGame: season.seasonRules.roundsPerGame }];
const PRODUCTION_ORIGIN = 'https://monster-survival.com';
const headers = (res) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); };
const send = (res, status, payload) => { headers(res); return res.status(status).json(payload); };
const error = (res, value) => { const known = value instanceof CommunityError; return send(res, known ? value.status : 503, { ok: false, error: { code: known ? value.code : 'SERVICE_UNAVAILABLE', message: known ? value.message : '現在、みんなの編成を利用できません。' } }); };
export function isAllowedCommunityOrigin(req) { const origin = req.headers.origin; const host = req.headers.host; if (!origin || !host) return false; try { const parsed = new URL(origin); if (parsed.host !== host) return false; if (origin === PRODUCTION_ORIGIN) return true; if (process.env.VERCEL === '1' && parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app')) return true; return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname); } catch { return false; } }
const ip = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
async function body(req) { const length = Number(req.headers['content-length'] || 0); if (length > COMMUNITY_CONFIG.maxBodyBytes) throw new CommunityError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413); if (req.body !== undefined) { if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) { if (Buffer.byteLength(JSON.stringify(req.body)) > COMMUNITY_CONFIG.maxBodyBytes) throw new CommunityError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413); return req.body; } try { return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body)); } catch { throw new CommunityError('INVALID_JSON', '送信内容の形式が正しくありません。'); } } let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > COMMUNITY_CONFIG.maxBodyBytes) throw new CommunityError('BODY_TOO_LARGE', '送信内容が大きすぎます。', 413); } try { return JSON.parse(raw || '{}'); } catch { throw new CommunityError('INVALID_JSON', '送信内容の形式が正しくありません。'); } }
const bearer = (req) => String(req.headers.authorization || '').startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : '';
const service = () => createCommunityService({ store: createCommunityRedisStore(), families, chips, seasons, ipHashSecret: process.env.BOARD_IP_HASH_SECRET || process.env.FRIENDS_IP_HASH_SECRET, adminToken: process.env.BOARD_ADMIN_TOKEN || process.env.FRIENDS_ADMIN_TOKEN });

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'monster-survival.com'}`);
    if (req.method === 'GET') { const current = service(); if (url.searchParams.get('id')) return send(res, 200, { ok: true, ...await current.get(url.searchParams.get('id'), url.searchParams.get('cursor')) }); return send(res, 200, { ok: true, ...await current.list(Object.fromEntries(url.searchParams)) }); }
    if (!['POST', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, DELETE'); return send(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'この操作は利用できません。' } }); }
    if (!isAllowedCommunityOrigin(req)) throw new CommunityError('ORIGIN_NOT_ALLOWED', 'この送信元からは操作できません。', 403);
    const input = await body(req); const current = service(); if (req.method === 'DELETE') return send(res, 200, { ok: true, ...await current.remove(input, bearer(req)) });
    const actions = { create: () => current.create(input, ip(req)), edit: () => current.edit(input, bearer(req)), helpful: () => current.helpful(input, ip(req)), trial: () => current.trial(input, ip(req)), comment: () => current.comment(input, ip(req)), report: () => current.report(input, ip(req)) };
    if (!actions[input.action]) throw new CommunityError('INVALID_ACTION', '操作内容が正しくありません。');
    return send(res, input.action === 'edit' ? 200 : 201, { ok: true, ...await actions[input.action]() });
  } catch (value) { return error(res, value); }
}
