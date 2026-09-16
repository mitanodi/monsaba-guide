import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const ARTICLE_COMMENT_IDS = Object.freeze(['ninjii-hunt']);
export const ARTICLE_COMMENT_CONFIG = Object.freeze({
  pageSize: 50,
  maxBodyBytes: 4096,
  maxNameLength: 30,
  maxContentLength: 500,
  cooldownSeconds: 30,
  hourlyMax: 20
});

export class ArticleCommentError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'ArticleCommentError';
    this.code = code;
    this.status = status;
  }
}

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const count = (value) => [...value].length;

function text(value, label, max, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new ArticleCommentError('INVALID_FIELD', `${label}の形式が正しくありません。`);
  const normalized = value.normalize('NFKC').replace(/\r\n?/g, '\n').trim();
  if (required && !normalized) throw new ArticleCommentError('REQUIRED_FIELD', `${label}を入力してください。`);
  if (count(normalized) > max) throw new ArticleCommentError('TOO_LONG', `${label}は${max}文字以内で入力してください。`);
  if (/[<>]/u.test(normalized) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) {
    throw new ArticleCommentError('INVALID_FIELD', `${label}に使用できない文字が含まれています。`);
  }
  return normalized;
}

export function normalizeArticleId(value) {
  const id = text(value, '記事ID', 80, true);
  if (!ARTICLE_COMMENT_IDS.includes(id)) throw new ArticleCommentError('ARTICLE_NOT_FOUND', '対象の記事が見つかりません。', 404);
  return id;
}

export function validateArticleComment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ArticleCommentError('INVALID_JSON', '送信内容の形式が正しくありません。');
  if (body.website) throw new ArticleCommentError('SPAM_DETECTED', '投稿を受け付けられませんでした。');
  return {
    articleId: normalizeArticleId(body.articleId),
    name: text(body.name, '名前', ARTICLE_COMMENT_CONFIG.maxNameLength),
    content: text(body.content, 'コメント', ARTICLE_COMMENT_CONFIG.maxContentLength, true)
  };
}

function equalHash(left, right) {
  if (!left || !right) return false;
  return timingSafeEqual(Buffer.from(sha256(left), 'hex'), Buffer.from(sha256(right), 'hex'));
}

function equalDigest(value, digest) {
  if (!value || !digest || !/^[a-f0-9]{64}$/u.test(digest)) return false;
  return timingSafeEqual(Buffer.from(sha256(value), 'hex'), Buffer.from(digest, 'hex'));
}

const publicComment = ({ deleteTokenHash, status, ...comment }) => comment;

export function createArticleCommentService({ store, ipHashSecret, adminToken, now = () => Date.now(), uuid = () => randomUUID(), deleteToken = () => randomBytes(32).toString('base64url') }) {
  if (!store || !ipHashSecret || !adminToken) throw new ArticleCommentError('SERVICE_UNAVAILABLE', '現在コメント欄を利用できません。時間を空けてお試しください。', 503);
  const ipHash = (ip) => createHmac('sha256', ipHashSecret).update(String(ip || 'unknown')).digest('hex');
  return {
    async list(articleId) {
      const id = normalizeArticleId(articleId);
      const comments = await store.listComments(id, ARTICLE_COMMENT_CONFIG.pageSize);
      return { comments: comments.filter((item) => item?.status === 'active').map(publicComment) };
    },
    async create(body, ip) {
      const input = validateArticleComment(body);
      const hash = ipHash(ip);
      for (const [key, seconds, max] of [[`short:${hash}`, ARTICLE_COMMENT_CONFIG.cooldownSeconds, 1], [`hour:${hash}`, 3600, ARTICLE_COMMENT_CONFIG.hourlyMax]]) {
        if (await store.incrementRateLimit(key, seconds) > max) throw new ArticleCommentError('RATE_LIMITED', '連続投稿が多いため、少し時間を空けてください。', 429);
      }
      const token = deleteToken();
      const comment = { id: uuid(), ...input, createdAt: new Date(now()).toISOString(), status: 'active', deleteTokenHash: sha256(token) };
      await store.createComment(comment);
      return { comment: publicComment(comment), deleteToken: token };
    },
    async remove({ articleId, id, deleteToken: supplied }, suppliedAdminToken = '') {
      const normalizedArticleId = normalizeArticleId(articleId);
      const commentId = text(id, 'コメントID', 80, true);
      const comment = await store.getComment(commentId);
      if (!comment || comment.articleId !== normalizedArticleId || comment.status !== 'active') throw new ArticleCommentError('COMMENT_NOT_FOUND', 'コメントが見つかりません。', 404);
      if (!equalHash(suppliedAdminToken, adminToken) && !equalDigest(supplied, comment.deleteTokenHash)) throw new ArticleCommentError('DELETE_TOKEN_INVALID', 'このコメントを削除する権限がありません。', 403);
      await store.removeComment(comment);
      return { removed: true };
    }
  };
}
