import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const FRIENDS_CONFIG = Object.freeze({
  pageSize: 25,
  postTtlSeconds: 30 * 24 * 60 * 60,
  ipRateLimitMax: 3,
  ipRateLimitWindowSeconds: 10 * 60,
  uidCooldownSeconds: 10 * 60,
  maxBodyBytes: 4096,
  maxUidLength: 50,
  maxUsernameLength: 30,
  maxCommentLength: 150
});

export class FriendsError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'FriendsError';
    this.code = code;
    this.status = status;
  }
}

const countCharacters = (value) => [...value].length;
const containsHtml = (value) => /[<>]/.test(value);
const containsUrl = (value) => /(?:https?:\/\/|www\.)/iu.test(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const publicPost = ({ deleteTokenHash, ipHash, status, ...post }) => post;

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new FriendsError('INVALID_FIELD', `${label}の形式が正しくありません。`);
  const normalized = value.trim();
  if (countCharacters(normalized) > maxLength) throw new FriendsError('TOO_LONG', `${label}は${maxLength}文字以内で入力してください。`);
  if (containsHtml(normalized)) throw new FriendsError('HTML_NOT_ALLOWED', `${label}にHTMLは使用できません。`);
  if (containsUrl(normalized)) throw new FriendsError('URL_NOT_ALLOWED', `${label}にURLは投稿できません。`);
  return normalized;
}

export function validatePostBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new FriendsError('INVALID_JSON', '投稿内容の形式が正しくありません。');
  if (body.website) throw new FriendsError('SPAM_DETECTED', '投稿を受け付けられませんでした。', 400);
  if (typeof body.uid !== 'string') throw new FriendsError('UID_REQUIRED', 'UIDを入力してください。');
  const uid = body.uid.trim();
  if (!uid) throw new FriendsError('UID_REQUIRED', 'UIDを入力してください。');
  if (countCharacters(uid) > FRIENDS_CONFIG.maxUidLength) throw new FriendsError('UID_TOO_LONG', `UIDは${FRIENDS_CONFIG.maxUidLength}文字以内で入力してください。`);
  if (containsHtml(uid)) throw new FriendsError('HTML_NOT_ALLOWED', 'UIDにHTMLは使用できません。');
  const username = optionalText(body.username, 'ユーザー名', FRIENDS_CONFIG.maxUsernameLength);
  const comment = optionalText(body.comment, 'ひとこと', FRIENDS_CONFIG.maxCommentLength);
  let tataLevel = null;
  if (body.tataLevel !== undefined && body.tataLevel !== null && body.tataLevel !== '') {
    const validNumber = typeof body.tataLevel === 'number' && Number.isSafeInteger(body.tataLevel) && body.tataLevel > 0;
    const validString = typeof body.tataLevel === 'string' && /^[1-9]\d*$/.test(body.tataLevel.trim());
    if (!validNumber && !validString) throw new FriendsError('INVALID_TATA_LEVEL', 'タタレベルは正の整数で入力してください。');
    tataLevel = Number(body.tataLevel);
    if (!Number.isSafeInteger(tataLevel)) throw new FriendsError('INVALID_TATA_LEVEL', 'タタレベルは正の整数で入力してください。');
  }
  return { uid, username, tataLevel, comment };
}

export function encodeCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid');
    return value;
  } catch {
    throw new FriendsError('INVALID_CURSOR', '一覧の続き位置が正しくありません。');
  }
}

function safeTextEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftHash = Buffer.from(sha256(left), 'hex');
  const rightHash = Buffer.from(sha256(right), 'hex');
  return timingSafeEqual(leftHash, rightHash);
}

export function createFriendsService({
  store,
  ipHashSecret,
  adminToken,
  now = () => Date.now(),
  uuid = () => randomUUID(),
  deleteToken = () => randomBytes(32).toString('base64url')
}) {
  if (!store || !ipHashSecret || !adminToken) throw new FriendsError('SERVICE_UNAVAILABLE', '掲示板を現在利用できません。', 503);

  return {
    async list(cursor) {
      const offset = decodeCursor(cursor);
      const currentTime = now();
      const result = await store.list({
        offset,
        limit: FRIENDS_CONFIG.pageSize,
        expiresBefore: currentTime - FRIENDS_CONFIG.postTtlSeconds * 1000
      });
      const posts = result.posts.filter((post) => post?.status === 'active').map(publicPost);
      const consumed = result.consumed ?? result.posts.length;
      return {
        posts,
        nextCursor: result.hasMore ? encodeCursor(offset + consumed) : null
      };
    },

    async create(body, ipAddress) {
      const input = validatePostBody(body);
      const ipHash = createHmac('sha256', ipHashSecret).update(String(ipAddress || 'unknown')).digest('hex');
      const attempts = await store.incrementRateLimit(ipHash, FRIENDS_CONFIG.ipRateLimitWindowSeconds);
      if (attempts > FRIENDS_CONFIG.ipRateLimitMax) throw new FriendsError('RATE_LIMITED', '短時間の投稿回数が上限に達しました。しばらく待ってください。', 429);
      const uidHash = sha256(input.uid.normalize('NFKC').toLowerCase());
      const reserved = await store.reserveUid(uidHash, FRIENDS_CONFIG.uidCooldownSeconds);
      if (!reserved) throw new FriendsError('UID_COOLDOWN', '同じUIDは短時間に続けて投稿できません。しばらく待ってください。', 429);
      const token = deleteToken();
      const createdAt = new Date(now()).toISOString();
      const post = {
        id: uuid(),
        ...input,
        createdAt,
        status: 'active',
        deleteTokenHash: sha256(token),
        ipHash
      };
      try {
        await store.create(post, FRIENDS_CONFIG.postTtlSeconds);
      } catch (error) {
        await store.releaseUid(uidHash).catch(() => {});
        throw error;
      }
      return { post: publicPost(post), deleteToken: token };
    },

    async remove(id, suppliedToken, suppliedAdminToken = '') {
      if (!id || typeof id !== 'string') throw new FriendsError('POST_NOT_FOUND', '投稿が見つかりません。', 404);
      const post = await store.get(id);
      if (!post || post.status !== 'active') throw new FriendsError('POST_NOT_FOUND', '投稿が見つかりません。', 404);
      const adminAuthorized = safeTextEqual(suppliedAdminToken, adminToken);
      if (!adminAuthorized) {
        if (!suppliedToken || typeof suppliedToken !== 'string') throw new FriendsError('DELETE_TOKEN_REQUIRED', '削除情報がありません。', 401);
        if (!safeTextEqual(sha256(suppliedToken), post.deleteTokenHash)) throw new FriendsError('DELETE_TOKEN_INVALID', '削除情報が正しくありません。', 403);
      }
      await store.remove(id);
      return { id };
    }
  };
}
