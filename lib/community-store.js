import { Redis } from '@upstash/redis';

export function createCommunityRedisStore({ url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN, prefix = 'monsaba:community', redis: suppliedRedis } = {}) {
  if (!suppliedRedis && (!url || !token))
    throw new Error('Redis environment variables are missing');
  const redis = suppliedRedis || new Redis({ url, token });
  const indexes = {
    new: `${prefix}:builds:new`,
    helpful: `${prefix}:builds:helpful`,
    trials: `${prefix}:builds:trials`,
    clears: `${prefix}:builds:clears`,
    round: `${prefix}:builds:round`
  };
  const normalIndexes = (chapter = null) => Object.fromEntries(Object.keys(indexes).map((sort) => [sort, `${prefix}:normal:${chapter === null ? '' : `chapter:${chapter}:`}builds:${sort}`]));
  const dojoIndexes = (attribute = null, floor = null) => Object.fromEntries(Object.keys(indexes).map((sort) => [sort, `${prefix}:dojo:${attribute === null ? '' : `attribute:${attribute}:`}${floor === null ? '' : `floor:${floor}:`}builds:${sort}`]));
  const indexGroups = (build) => build.mode === 'normal' ? [normalIndexes(), normalIndexes(build.chapter)] : build.mode === 'dojo' ? [dojoIndexes(), dojoIndexes(build.dojoAttribute), dojoIndexes(build.dojoAttribute, build.floor)] : [indexes];
  const buildKey = (id) => `${prefix}:build:${id}`;
  const commentKey = (id) => `${prefix}:comment:${id}`;
  const commentsKey = (id) => `${prefix}:build:${id}:comments`;
  const trialsKey = (id) => `${prefix}:build:${id}:trials`;
  async function getMany(keys) {

    if (!keys.length)
      return [];

    const pipeline = redis.pipeline();

    keys.forEach((key) => pipeline.get(key));

    return pipeline.exec();

  }
  async function indexBuild(build) {
    const pipeline = redis.multi();
    for (const group of indexGroups(build)) {
      pipeline.zadd(group.new, { score: Date.parse(build.createdAt), member: build.id }).zadd(group.helpful, { score: build.helpfulCount, member: build.id }).zadd(group.trials, { score: build.trialCount, member: build.id }).zadd(group.clears, { score: build.clearReportCount, member: build.id }).zadd(group.round, { score: build.reportedBestRound || 0, member: build.id });
    }
    await pipeline.exec();
  }
  async function unindexBuild(build) {
    const pipeline = redis.pipeline();
    for (const group of indexGroups(build))
      Object.values(group).forEach((index) => pipeline.zrem(index, build.id));
    await pipeline.exec();
  }
  return {
    async incrementRateLimit(key, seconds) {

      const rateKey = `${prefix}:rate:${key}`;

      const [count] = await redis.multi().incr(rateKey).expire(rateKey, seconds).exec();

      return count;

    },
    async reserveDuplicate(ipHash, formationHash, seconds) {

      return (await redis.set(`${prefix}:duplicate:${ipHash}:${formationHash}`, '1', { nx: true, ex: seconds })) === 'OK';

    },
    async reserveAction(kind, ipHash, target, seconds) {

      return (await redis.set(`${prefix}:action:${kind}:${ipHash}:${target}`, '1', { nx: true, ex: seconds })) === 'OK';

    },
    async createBuild(build) {

      await redis.set(buildKey(build.id), build);

      await indexBuild(build);

    },
    async updateBuild(build) {

      const previous = await redis.get(buildKey(build.id));
      if (previous && (previous.mode !== build.mode || previous.chapter !== build.chapter || previous.dojoAttribute !== build.dojoAttribute || previous.floor !== build.floor))
        await unindexBuild(previous);
      await redis.set(buildKey(build.id), build);

      await indexBuild(build);

    },
    async getBuild(id) {

      return redis.get(buildKey(id));

    },
    async listBuilds({ offset, limit, scanLimit, sort, mode = 'zombie', chapter = null, dojoAttribute = null, floor = null, stage = null, seasonId, difficulty, resultStatus, tag }) {

      const filtered = Boolean(seasonId || difficulty || resultStatus || tag || stage !== null);

      const selectedIndexes = mode === 'normal' ? normalIndexes(chapter) : mode === 'dojo' ? dojoIndexes(dojoAttribute, floor) : indexes;
      const matches = (item) => item?.status === 'active' && (item.mode || 'zombie') === mode && (chapter === null || item.chapter === chapter) && (dojoAttribute === null || item.dojoAttribute === dojoAttribute) && (floor === null || item.floor === floor) && (stage === null || item.stageFrom == null || (item.stageFrom <= stage && item.stageTo >= stage)) && (!seasonId || item.seasonId === seasonId) && (!difficulty || item.difficulty === difficulty) && (!resultStatus || item.resultStatus === resultStatus) && (!tag || item.tags.includes(tag));
      if (mode !== 'zombie' && filtered) {
        // Cursor counts scanned records, so filters can reach older matching posts.
        const ids = await redis.zrange(selectedIndexes[sort] || selectedIndexes.new, offset, offset + scanLimit, { rev: true });
        const values = await getMany(ids.map(buildKey));
        const builds = [];
        const scanned = Math.min(scanLimit, ids.length);
        for (let index = 0; index < scanned; index += 1) {
          if (matches(values[index])) builds.push(values[index]);
          if (builds.length === limit)
            return { builds, hasMore: ids.length > index + 1, consumed: index + 1 };
        }
        return { builds, hasMore: ids.length > scanned, consumed: scanned };
      }
      const ids = await redis.zrange(selectedIndexes[sort] || selectedIndexes.new, filtered ? 0 : offset, filtered ? scanLimit - 1 : offset + limit, { rev: true });
      const values = (await getMany(ids.map(buildKey))).filter(Boolean);
      const matching = values.filter(matches);

      const page = filtered ? matching.slice(offset, offset + limit + 1) : matching;

      return {
        builds: page.slice(0, limit),
        hasMore: page.length > limit,
        consumed: Math.min(page.length, limit)
      };

    },
    async createTrial(trial) {

      await redis.zadd(trialsKey(trial.buildId), { score: Date.parse(trial.createdAt), member: JSON.stringify(trial) });

    },
    async createComment(comment) {

      await redis.multi().set(commentKey(comment.id), comment).zadd(commentsKey(comment.buildId), { score: Date.parse(comment.createdAt), member: comment.id }).exec();

    },
    async getComment(id) {

      return redis.get(commentKey(id));

    },
    async listComments(buildId, { offset, limit }) {

      const ids = await redis.zrange(commentsKey(buildId), offset, offset + limit, { rev: false });

      const values = (await getMany(ids.map(commentKey))).filter(Boolean);

      return {
        comments: values.slice(0, limit),
        hasMore: values.length > limit,
        consumed: Math.min(values.length, limit)
      };

    },
    async createReport(report, seconds) {

      await redis.set(`${prefix}:report:${report.id}`, report, { ex: seconds });

    },
    async removeBuild(id) {

      const build = await redis.get(buildKey(id));

      if (!build)
        return;

      const commentIds = await redis.zrange(commentsKey(id), 0, -1);

      const pipeline = redis.pipeline();

      commentIds.forEach((commentId) => pipeline.del(commentKey(commentId)));

      pipeline.del(commentsKey(id)).del(trialsKey(id)).del(buildKey(id));

      for (const group of indexGroups(build))
        Object.values(group).forEach((index) => pipeline.zrem(index, id));

      await pipeline.exec();

    }
  };
}
