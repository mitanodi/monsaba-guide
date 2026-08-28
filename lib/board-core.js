import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const BOARD_CATEGORIES = Object.freeze([
  '初心者', '育成', '進化', '編成', 'タタ性能', '通常ステージ',
  'Zombie Rush', 'バッジ道場', 'ボスラリー', 'イベント', 'システム', 'その他'
]);

export const BOARD_REPORT_REASONS = Object.freeze([
  '荒らし', '誹謗中傷', 'スパム', '個人情報', '不適切内容', 'その他'
]);

export const BOARD_CONFIG = Object.freeze({
  pageSize: 20,
  answerPageSize: 20,
  maxSearchScan: 200,
  maxBodyBytes: 8192,
  maxTitleLength: 80,
  maxQuestionLength: 1600,
  maxAnswerLength: 1200,
  maxNameLength: 30,
  maxContextLength: 100,
  questionCooldownSeconds: 3 * 60,
  questionHourlyMax: 5,
  answerCooldownSeconds: 45,
  answerHourlyMax: 30,
  reportSameTargetSeconds: 24 * 60 * 60,
  reportDailyMax: 20,
  reportTtlSeconds: 180 * 24 * 60 * 60
});

export class BoardError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'BoardError';
    this.code = code;
    this.status = status;
  }
}

const countCharacters = (value) => [...value].length;
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const containsHtml = (value) => /[<>]/u.test(value);
const containsControl = (value) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

function normalizeText(value, label, maxLength, { required = false, singleLine = false } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new BoardError('INVALID_FIELD', `${label}の形式が正しくありません。`);
  let normalized = value.normalize('NFKC').replace(/\r\n?/g, '\n').trim();
  if (singleLine) normalized = normalized.replace(/\s+/gu, ' ');
  if (required && !normalized) throw new BoardError('REQUIRED_FIELD', `${label}を入力してください。`);
  if (countCharacters(normalized) > maxLength) throw new BoardError('TOO_LONG', `${label}は${maxLength}文字以内で入力してください。`);
  if (containsHtml(normalized)) throw new BoardError('HTML_NOT_ALLOWED', `${label}にHTMLは使用できません。`);
  if (containsControl(normalized)) throw new BoardError('INVALID_FIELD', `${label}に使用できない文字が含まれています。`);
  return normalized;
}

function assertObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BoardError('INVALID_JSON', '送信内容の形式が正しくありません。');
  }
  if (body.website) throw new BoardError('SPAM_DETECTED', '投稿を受け付けられませんでした。');
}

export function validateThreadBody(body) {
  assertObject(body);
  const title = normalizeText(body.title, 'タイトル', BOARD_CONFIG.maxTitleLength, { required: true, singleLine: true });
  const content = normalizeText(body.content, '本文', BOARD_CONFIG.maxQuestionLength, { required: true });
  const name = normalizeText(body.name, '名前', BOARD_CONFIG.maxNameLength, { singleLine: true });
  const context = normalizeText(body.context, 'プレイ状況', BOARD_CONFIG.maxContextLength, { singleLine: true });
  const category = normalizeText(body.category, 'カテゴリ', 30, { required: true, singleLine: true });
  if (!BOARD_CATEGORIES.includes(category)) throw new BoardError('INVALID_CATEGORY', 'カテゴリを選択してください。');
  return { title, content, name, context, category };
}

export function validateAnswerBody(body) {
  assertObject(body);
  const threadId = normalizeText(body.threadId, '質問ID', 80, { required: true, singleLine: true });
  const content = normalizeText(body.content, '回答本文', BOARD_CONFIG.maxAnswerLength, { required: true });
  const name = normalizeText(body.name, '名前', BOARD_CONFIG.maxNameLength, { singleLine: true });
  return { threadId, content, name };
}

export function validateReportBody(body) {
  assertObject(body);
  const targetType = normalizeText(body.targetType, '対象種別', 10, { required: true, singleLine: true });
  const targetId = normalizeText(body.targetId, '投稿ID', 80, { required: true, singleLine: true });
  const reason = normalizeText(body.reason, '通報理由', 20, { required: true, singleLine: true });
  if (!['thread', 'answer'].includes(targetType)) throw new BoardError('INVALID_TARGET', '通報対象が正しくありません。');
  if (!BOARD_REPORT_REASONS.includes(reason)) throw new BoardError('INVALID_REASON', '通報理由を選択してください。');
  return { targetType, targetId, reason };
}

export function encodeBoardCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export function decodeBoardCursor(cursor) {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid');
    return value;
  } catch {
    throw new BoardError('INVALID_CURSOR', '一覧の続き位置が正しくありません。');
  }
}

function safeTextEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
  return timingSafeEqual(Buffer.from(sha256(left), 'hex'), Buffer.from(sha256(right), 'hex'));
}

const publicThread = ({ deleteTokenHash, status, ...thread }) => thread;
const publicAnswer = ({ deleteTokenHash, status, ...answer }) => answer;
const publicReport = ({ status, ...report }) => report;
const normalizeId = (value, label = '投稿ID') => normalizeText(value, label, 80, { required: true, singleLine: true });

function authorize(record, suppliedToken, suppliedAdminToken, adminToken) {
  if (safeTextEqual(suppliedAdminToken, adminToken)) return;
  if (!suppliedToken || typeof suppliedToken !== 'string') {
    throw new BoardError('DELETE_TOKEN_REQUIRED', 'この操作に必要な投稿者情報がありません。', 401);
  }
  if (!safeTextEqual(sha256(suppliedToken), record.deleteTokenHash)) {
    throw new BoardError('DELETE_TOKEN_INVALID', 'この投稿を操作する権限がありません。', 403);
  }
}

export function createBoardService({
  store,
  ipHashSecret,
  adminToken,
  now = () => Date.now(),
  uuid = () => randomUUID(),
  deleteToken = () => randomBytes(32).toString('base64url')
}) {
  if (!store || !ipHashSecret || !adminToken) {
    throw new BoardError('SERVICE_UNAVAILABLE', '現在、質問掲示板を利用できません。時間を空けてお試しください。', 503);
  }

  const ipHash = (ipAddress) => createHmac('sha256', ipHashSecret).update(String(ipAddress || 'unknown')).digest('hex');
  const requireAdmin = (supplied) => {
    if (!safeTextEqual(supplied, adminToken)) throw new BoardError('ADMIN_UNAUTHORIZED', '管理者権限が必要です。', 403);
  };
  const checkRate = async (kind, hash) => {
    const rules = kind === 'question'
      ? [[`question:short:${hash}`, BOARD_CONFIG.questionCooldownSeconds, 1], [`question:hour:${hash}`, 3600, BOARD_CONFIG.questionHourlyMax]]
      : kind === 'answer'
        ? [[`answer:short:${hash}`, BOARD_CONFIG.answerCooldownSeconds, 1], [`answer:hour:${hash}`, 3600, BOARD_CONFIG.answerHourlyMax]]
        : [[`report:day:${hash}`, 86400, BOARD_CONFIG.reportDailyMax]];
    for (const [key, seconds, max] of rules) {
      if (await store.incrementRateLimit(key, seconds) > max) {
        throw new BoardError('RATE_LIMITED', '連続操作が多いため、少し時間を空けてもう一度お試しください。', 429);
      }
    }
  };

  return {
    async listThreads({ cursor, sort = 'new', category = '', query = '', unanswered = false } = {}) {
      if (!['new', 'answers'].includes(sort)) throw new BoardError('INVALID_SORT', '並び順が正しくありません。');
      if (category && !BOARD_CATEGORIES.includes(category)) throw new BoardError('INVALID_CATEGORY', 'カテゴリが正しくありません。');
      const search = normalizeText(query, '検索語', 80, { singleLine: true });
      const offset = decodeBoardCursor(cursor);
      const result = await store.listThreads({
        offset,
        limit: BOARD_CONFIG.pageSize,
        scanLimit: BOARD_CONFIG.maxSearchScan,
        sort,
        category,
        query: search,
        unanswered: Boolean(unanswered)
      });
      return {
        threads: result.threads.filter((thread) => thread?.status === 'active').map(publicThread),
        nextCursor: result.hasMore ? encodeBoardCursor(offset + result.consumed) : null
      };
    },

    async getThread(id, cursor) {
      const threadId = normalizeId(id, '質問ID');
      const thread = await store.getThread(threadId);
      if (!thread || thread.status !== 'active') throw new BoardError('THREAD_NOT_FOUND', '質問が見つかりません。', 404);
      const offset = decodeBoardCursor(cursor);
      const result = await store.listAnswers(threadId, { offset, limit: BOARD_CONFIG.answerPageSize });
      return {
        thread: publicThread(thread),
        answers: result.answers.filter((answer) => answer?.status === 'active').map(publicAnswer),
        nextCursor: result.hasMore ? encodeBoardCursor(offset + result.consumed) : null
      };
    },

    async createThread(body, ipAddress) {
      const input = validateThreadBody(body);
      await checkRate('question', ipHash(ipAddress));
      const token = deleteToken();
      const createdAt = new Date(now()).toISOString();
      const thread = {
        id: uuid(),
        ...input,
        createdAt,
        updatedAt: createdAt,
        latestAnswerAt: null,
        answerCount: 0,
        resolved: false,
        status: 'active',
        deleteTokenHash: sha256(token)
      };
      await store.createThread(thread);
      return { thread: publicThread(thread), deleteToken: token };
    },

    async createAnswer(body, ipAddress) {
      const input = validateAnswerBody(body);
      const thread = await store.getThread(input.threadId);
      if (!thread || thread.status !== 'active') throw new BoardError('THREAD_NOT_FOUND', '質問が見つかりません。', 404);
      await checkRate('answer', ipHash(ipAddress));
      const token = deleteToken();
      const answer = {
        id: uuid(),
        ...input,
        createdAt: new Date(now()).toISOString(),
        status: 'active',
        deleteTokenHash: sha256(token)
      };
      await store.createAnswer(answer);
      return { answer: publicAnswer(answer), deleteToken: token };
    },

    async setResolved({ threadId, resolved, deleteToken: suppliedToken }, suppliedAdminToken = '') {
      if (typeof resolved !== 'boolean') throw new BoardError('INVALID_FIELD', '解決状態が正しくありません。');
      const normalizedThreadId = normalizeId(threadId, '質問ID');
      const thread = await store.getThread(normalizedThreadId);
      if (!thread || thread.status !== 'active') throw new BoardError('THREAD_NOT_FOUND', '質問が見つかりません。', 404);
      authorize(thread, suppliedToken, suppliedAdminToken, adminToken);
      const updated = { ...thread, resolved, updatedAt: new Date(now()).toISOString() };
      await store.updateThread(updated);
      return { thread: publicThread(updated) };
    },

    async remove({ type, id, deleteToken: suppliedToken }, suppliedAdminToken = '') {
      if (!['thread', 'answer'].includes(type)) throw new BoardError('INVALID_TARGET', '削除対象が正しくありません。');
      const normalizedId = normalizeId(id);
      const record = type === 'thread' ? await store.getThread(normalizedId) : await store.getAnswer(normalizedId);
      if (!record || record.status !== 'active') throw new BoardError('POST_NOT_FOUND', '投稿が見つかりません。', 404);
      authorize(record, suppliedToken, suppliedAdminToken, adminToken);
      if (type === 'thread') await store.removeThread(normalizedId);
      else await store.removeAnswer(normalizedId, record.threadId);
      return { type, id: normalizedId };
    },

    async report(body, ipAddress) {
      const input = validateReportBody(body);
      const target = input.targetType === 'thread' ? await store.getThread(input.targetId) : await store.getAnswer(input.targetId);
      if (!target || target.status !== 'active') throw new BoardError('POST_NOT_FOUND', '通報対象が見つかりません。', 404);
      const hash = ipHash(ipAddress);
      await checkRate('report', hash);
      const reserved = await store.reserveReport(hash, input.targetType, input.targetId, BOARD_CONFIG.reportSameTargetSeconds);
      if (!reserved) throw new BoardError('ALREADY_REPORTED', 'この投稿はすでに通報済みです。管理者の確認をお待ちください。', 429);
      const report = { id: uuid(), ...input, createdAt: new Date(now()).toISOString(), status: 'pending' };
      await store.createReport(report, BOARD_CONFIG.reportTtlSeconds);
      return { accepted: true };
    },

    async listReports(suppliedAdminToken, cursor) {
      requireAdmin(suppliedAdminToken);
      const offset = decodeBoardCursor(cursor);
      const result = await store.listReports({ offset, limit: 50 });
      return {
        reports: result.reports.filter(Boolean).map(publicReport),
        nextCursor: result.hasMore ? encodeBoardCursor(offset + result.consumed) : null
      };
    }
  };
}
