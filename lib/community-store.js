import { Redis } from '@upstash/redis';

export function createCommunityRedisStore({ url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN, prefix = 'monsaba:community' } = {}) {
  if (!url || !token) throw new Error('Redis environment variables are missing');
  const redis = new Redis({ url, token });
  const indexes = { new: `${prefix}:builds:new`, helpful: `${prefix}:builds:helpful`, trials: `${prefix}:builds:trials`, clears: `${prefix}:builds:clears`, round: `${prefix}:builds:round` };
  const buildKey = (id) => `${prefix}:build:${id}`;
  const commentKey = (id) => `${prefix}:comment:${id}`;
  const commentsKey = (id) => `${prefix}:build:${id}:comments`;
  const trialsKey = (id) => `${prefix}:build:${id}:trials`;
  async function getMany(keys) { if (!keys.length) return []; const pipeline = redis.pipeline(); keys.forEach((key) => pipeline.get(key)); return pipeline.exec(); }
  async function indexBuild(build) { await redis.multi().zadd(indexes.new, { score: Date.parse(build.createdAt), member: build.id }).zadd(indexes.helpful, { score: build.helpfulCount, member: build.id }).zadd(indexes.trials, { score: build.trialCount, member: build.id }).zadd(indexes.clears, { score: build.clearReportCount, member: build.id }).zadd(indexes.round, { score: build.reportedBestRound || 0, member: build.id }).exec(); }
  return {
    async incrementRateLimit(key, seconds) { const rateKey = `${prefix}:rate:${key}`; const [count] = await redis.multi().incr(rateKey).expire(rateKey, seconds).exec(); return count; },
    async reserveDuplicate(ipHash, formationHash, seconds) { return (await redis.set(`${prefix}:duplicate:${ipHash}:${formationHash}`, '1', { nx: true, ex: seconds })) === 'OK'; },
    async reserveAction(kind, ipHash, target, seconds) { return (await redis.set(`${prefix}:action:${kind}:${ipHash}:${target}`, '1', { nx: true, ex: seconds })) === 'OK'; },
    async createBuild(build) { await redis.set(buildKey(build.id), build); await indexBuild(build); },
    async updateBuild(build) { await redis.set(buildKey(build.id), build); await indexBuild(build); },
    async getBuild(id) { return redis.get(buildKey(id)); },
    async listBuilds({ offset, limit, scanLimit, sort, seasonId, difficulty, resultStatus, tag }) { const filtered = Boolean(seasonId || difficulty || resultStatus || tag); const ids = await redis.zrange(indexes[sort] || indexes.new, filtered ? 0 : offset, filtered ? scanLimit - 1 : offset + limit, { rev: true }); const values = (await getMany(ids.map(buildKey))).filter(Boolean); const matching = values.filter((item) => item.status === 'active' && (!seasonId || item.seasonId === seasonId) && (!difficulty || item.difficulty === difficulty) && (!resultStatus || item.resultStatus === resultStatus) && (!tag || item.tags.includes(tag))); const page = filtered ? matching.slice(offset, offset + limit + 1) : matching; return { builds: page.slice(0, limit), hasMore: page.length > limit, consumed: Math.min(page.length, limit) }; },
    async createTrial(trial) { await redis.zadd(trialsKey(trial.buildId), { score: Date.parse(trial.createdAt), member: JSON.stringify(trial) }); },
    async createComment(comment) { await redis.multi().set(commentKey(comment.id), comment).zadd(commentsKey(comment.buildId), { score: Date.parse(comment.createdAt), member: comment.id }).exec(); },
    async getComment(id) { return redis.get(commentKey(id)); },
    async listComments(buildId, { offset, limit }) { const ids = await redis.zrange(commentsKey(buildId), offset, offset + limit, { rev: false }); const values = (await getMany(ids.map(commentKey))).filter(Boolean); return { comments: values.slice(0, limit), hasMore: values.length > limit, consumed: Math.min(values.length, limit) }; },
    async createReport(report, seconds) { await redis.set(`${prefix}:report:${report.id}`, report, { ex: seconds }); },
    async removeBuild(id) { const build = await redis.get(buildKey(id)); if (!build) return; const commentIds = await redis.zrange(commentsKey(id), 0, -1); const pipeline = redis.pipeline(); commentIds.forEach((commentId) => pipeline.del(commentKey(commentId))); pipeline.del(commentsKey(id)).del(trialsKey(id)).del(buildKey(id)); Object.values(indexes).forEach((index) => pipeline.zrem(index, id)); await pipeline.exec(); }
  };
}
