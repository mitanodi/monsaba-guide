import { Redis } from '@upstash/redis';

export function createArticleCommentRedisStore({ url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN, prefix = 'monsaba:article-comments' } = {}) {
  if (!url || !token) throw new Error('Redis environment variables are missing');
  const redis = new Redis({ url, token });
  const commentKey = (id) => `${prefix}:comment:${id}`;
  const indexKey = (articleId) => `${prefix}:article:${articleId}:comments`;
  return {
    async incrementRateLimit(key, seconds) {
      const rateKey = `${prefix}:rate:${key}`;
      const [value] = await redis.multi().incr(rateKey).expire(rateKey, seconds).exec();
      return value;
    },
    async createComment(comment) {
      await redis.multi().set(commentKey(comment.id), comment).zadd(indexKey(comment.articleId), { score: Date.parse(comment.createdAt), member: comment.id }).exec();
    },
    async getComment(id) { return redis.get(commentKey(id)); },
    async listComments(articleId, limit) {
      const ids = await redis.zrange(indexKey(articleId), 0, limit - 1, { rev: true });
      if (!ids.length) return [];
      const pipeline = redis.pipeline();
      ids.forEach((id) => pipeline.get(commentKey(id)));
      return (await pipeline.exec()).filter(Boolean);
    },
    async removeComment(comment) {
      await redis.multi().del(commentKey(comment.id)).zrem(indexKey(comment.articleId), comment.id).exec();
    }
  };
}
