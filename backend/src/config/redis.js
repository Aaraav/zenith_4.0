// @ts-check
const { env } = require('./env');
const { logger } = require('./logger');

let redisClient = null;

function getRedis() {
  if (redisClient !== null) return redisClient;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    logger.warn({ event: 'redis-disabled' }, '⚠️  Upstash Redis not configured — using in-memory matchmaking store (single-instance only)');
    redisClient = false;
    return null;
  }

  // Upstash Redis REST API wrapper
  const upstashUrl = env.UPSTASH_REDIS_REST_URL;
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN;

  /**
   * @type {{
   *   zadd: (key: string, score: number, member: string) => Promise<number>;
   *   zrange: (key: string, min: number, max: number, opts?: {withscores?: boolean}) => Promise<string[]>;
   *   zrangebyscore: (key: string, min: number, max: number) => Promise<string[]>;
   *   zrem: (key: string, member: string) => Promise<number>;
   *   hset: (key: string, data: Record<string, any>) => Promise<number>;
   *   hget: (key: string, field: string) => Promise<string | null>;
   *   getall: (key: string) => Promise<Record<string, any>>;
   *   set: (key: string, value: string, ttl?: number) => Promise<string>;
   *   get: (key: string) => Promise<string | null>;
   *   del: (key: string) => Promise<number>;
   *   expire: (key: string, seconds: number) => Promise<number>;
   * }}
   */
  const client = {
    async zadd(key, score, member) {
      const res = await fetch(`${upstashUrl}/zadd/${key}/${score}/${member}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || 0;
    },

    async zrange(key, min, max, opts = {}) {
      const url = new URL(`${upstashUrl}/zrange/${key}/${min}/${max}`);
      if (opts.withscores) url.searchParams.set('withscores', '1');
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || [];
    },

    async zrangebyscore(key, min, max) {
      const res = await fetch(`${upstashUrl}/zrangebyscore/${key}/${min}/${max}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || [];
    },

    async zrem(key, member) {
      const res = await fetch(`${upstashUrl}/zrem/${key}/${member}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || 0;
    },

    async hset(key, data) {
      const body = Object.entries(data).flat();
      const res = await fetch(`${upstashUrl}/hset/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      return json.result || 0;
    },

    async hget(key, field) {
      const res = await fetch(`${upstashUrl}/hget/${key}/${field}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || null;
    },

    async getall(key) {
      const res = await fetch(`${upstashUrl}/hgetall/${key}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      const result = json.result || [];
      const obj = {};
      for (let i = 0; i < result.length; i += 2) {
        obj[result[i]] = result[i + 1];
      }
      return obj;
    },

    async set(key, value, ttl) {
      const url = new URL(`${upstashUrl}/set/${key}`);
      if (ttl) url.searchParams.set('ex', String(ttl));
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      const json = await res.json();
      return json.result || 'OK';
    },

    async get(key) {
      const res = await fetch(`${upstashUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || null;
    },

    async del(key) {
      const res = await fetch(`${upstashUrl}/del/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || 0;
    },

    async expire(key, seconds) {
      const res = await fetch(`${upstashUrl}/expire/${key}/${seconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const json = await res.json();
      return json.result || 0;
    },
  };

  logger.info({ event: 'redis-connected' }, '✅ Upstash Redis REST API connected');
  redisClient = client;
  return redisClient;
}

module.exports = { getRedis };
