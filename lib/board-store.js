import { Redis } from '@upstash/redis';

export function createBoardRedisStore({
  url = process.env.KV_REST_API_URL,
  token = process.env.KV_REST_API_TOKEN,
  prefix = 'monsaba:board'
} = {}) {
  if (!url || !token) throw new Error('Redis environment variables are missing');
  const redis = new Redis({ url, token });
  const newIndex = `${prefix}:threads:new`;
  const answerIndex = `${prefix}:threads:answers`;
  const reportIndex = `${prefix}:reports`;
  const threadKey = (id) => `${prefix}:thread:${id}`;
  const answerKey = (id) => `${prefix}:answer:${id}`;
  const answersKey = (threadId) => `${prefix}:thread:${threadId}:answers`;
  const reportKey = (id) => `${prefix}:report:${id}`;

  async function getMany(keys) {
    if (!keys.length) return [];
    const pipeline = redis.pipeline();
    keys.forEach((key) => pipeline.get(key));
    return pipeline.exec();
  }

  async function refreshThreadStats(threadId) {
    const thread = await redis.get(threadKey(threadId));
    if (!thread) return;
    const answerCount = await redis.zcard(answersKey(threadId));
    const latestIds = await redis.zrange(answersKey(threadId), 0, 0, { rev: true });
    const latest = latestIds[0] ? await redis.get(answerKey(latestIds[0])) : null;
    const updated = { ...thread, answerCount, latestAnswerAt: latest?.createdAt || null, updatedAt: latest?.createdAt || thread.createdAt };
    await redis.multi().set(threadKey(threadId), updated).zadd(answerIndex, { score: answerCount, member: threadId }).exec();
  }

  return {
    async incrementRateLimit(key, windowSeconds) {
      const rateKey = `${prefix}:rate:${key}`;
      const [count] = await redis.multi().incr(rateKey).expire(rateKey, windowSeconds).exec();
      return count;
    },
    async reserveReport(ipHash, targetType, targetId, ttlSeconds) {
      return (await redis.set(`${prefix}:reported:${ipHash}:${targetType}:${targetId}`, '1', { nx: true, ex: ttlSeconds })) === 'OK';
    },
    async createThread(thread) {
      await redis.multi()
        .set(threadKey(thread.id), thread)
        .zadd(newIndex, { score: Date.parse(thread.createdAt), member: thread.id })
        .zadd(answerIndex, { score: 0, member: thread.id })
        .exec();
    },
    async updateThread(thread) {
      await redis.set(threadKey(thread.id), thread);
    },
    async getThread(id) { return redis.get(threadKey(id)); },
    async getAnswer(id) { return redis.get(answerKey(id)); },
    async listThreads({ offset, limit, scanLimit, sort, category, query, unanswered }) {
      const filtered = Boolean(category || query || unanswered);
      const index = sort === 'answers' ? answerIndex : newIndex;
      const ids = filtered
        ? await redis.zrange(index, 0, scanLimit - 1, { rev: true })
        : await redis.zrange(index, offset, offset + limit, { rev: true });
      const values = (await getMany(ids.map(threadKey))).filter(Boolean);
      const needle = query.normalize('NFKC').toLocaleLowerCase('ja');
      const matching = values.filter((thread) => thread.status === 'active'
        && (!category || thread.category === category)
        && (!unanswered || thread.answerCount === 0)
        && (!needle || `${thread.title}\n${thread.content}\n${thread.name}`.normalize('NFKC').toLocaleLowerCase('ja').includes(needle)));
      const page = filtered ? matching.slice(offset, offset + limit + 1) : matching;
      return {
        threads: page.slice(0, limit),
        hasMore: page.length > limit,
        consumed: Math.min(page.length, limit)
      };
    },
    async createAnswer(answer) {
      await redis.multi()
        .set(answerKey(answer.id), answer)
        .zadd(answersKey(answer.threadId), { score: Date.parse(answer.createdAt), member: answer.id })
        .exec();
      await refreshThreadStats(answer.threadId);
    },
    async listAnswers(threadId, { offset, limit }) {
      const ids = await redis.zrange(answersKey(threadId), offset, offset + limit, { rev: false });
      const values = (await getMany(ids.map(answerKey))).filter(Boolean);
      return { answers: values.slice(0, limit), hasMore: values.length > limit, consumed: Math.min(values.length, limit) };
    },
    async removeAnswer(id, threadId) {
      await redis.multi().del(answerKey(id)).zrem(answersKey(threadId), id).exec();
      await refreshThreadStats(threadId);
    },
    async removeThread(id) {
      const answerIds = await redis.zrange(answersKey(id), 0, -1);
      const pipeline = redis.pipeline();
      answerIds.forEach((answerId) => pipeline.del(answerKey(answerId)));
      pipeline.del(answersKey(id)).del(threadKey(id)).zrem(newIndex, id).zrem(answerIndex, id);
      await pipeline.exec();
    },
    async createReport(report, ttlSeconds) {
      await redis.multi()
        .set(reportKey(report.id), report, { ex: ttlSeconds })
        .zadd(reportIndex, { score: Date.parse(report.createdAt), member: report.id })
        .exec();
    },
    async listReports({ offset, limit }) {
      const ids = await redis.zrange(reportIndex, offset, offset + limit, { rev: true });
      const values = await getMany(ids.map(reportKey));
      const expired = ids.filter((_, index) => !values[index]);
      if (expired.length) {
        const cleanup = redis.pipeline();
        expired.forEach((id) => cleanup.zrem(reportIndex, id));
        await cleanup.exec();
      }
      const reports = values.filter(Boolean);
      return { reports: reports.slice(0, limit), hasMore: reports.length > limit, consumed: Math.min(reports.length, limit) };
    }
  };
}
