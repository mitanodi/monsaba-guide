import { Redis } from '@upstash/redis';

export function createRedisStore({
  url = process.env.KV_REST_API_URL,
  token = process.env.KV_REST_API_TOKEN,
  prefix = 'monsaba:friends'
} = {}) {
  if (!url || !token) throw new Error('Redis environment variables are missing');
  const redis = new Redis({ url, token });
  const indexKey = `${prefix}:posts`;
  const postKey = (id) => `${prefix}:post:${id}`;

  return {
    async incrementRateLimit(ipHash, windowSeconds) {
      const key = `${prefix}:rate:${ipHash}`;
      const [count] = await redis.multi().incr(key).expire(key, windowSeconds).exec();
      return count;
    },
    async reserveUid(uidHash, ttlSeconds) {
      return (await redis.set(`${prefix}:uid:${uidHash}`, '1', { nx: true, ex: ttlSeconds })) === 'OK';
    },
    async releaseUid(uidHash) {
      await redis.del(`${prefix}:uid:${uidHash}`);
    },
    async create(post, ttlSeconds) {
      const created = Date.parse(post.createdAt);
      await redis.multi()
        .set(postKey(post.id), post, { ex: ttlSeconds })
        .zadd(indexKey, { score: created, member: post.id })
        .exec();
    },
    async list({ offset, limit, expiresBefore }) {
      await redis.zremrangebyscore(indexKey, 0, expiresBefore);
      const ids = await redis.zrange(indexKey, offset, offset + limit, { rev: true });
      if (!ids.length) return { posts: [], hasMore: false, consumed: 0 };
      const pipeline = redis.pipeline();
      for (const id of ids) pipeline.get(postKey(id));
      const values = await pipeline.exec();
      const hasMore = ids.length > limit;
      return { posts: values.slice(0, limit).filter(Boolean), hasMore, consumed: Math.min(ids.length, limit) };
    },
    async get(id) {
      return redis.get(postKey(id));
    },
    async remove(id) {
      await redis.multi().del(postKey(id)).zrem(indexKey, id).exec();
    }
  };
}
