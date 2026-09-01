import { createClient, type RedisClientType } from "redis";
import type { Cache, RateLimiter } from "./ports";

/**
 * Redis adapters (staging/production) behind the frozen ports.
 *   - RedisCache backs the emergency_view cache; `del` is the active revocation
 *     purge that keeps a rebuild/revoke from ever serving stale content.
 *   - RedisRateLimiter is a sliding-window limiter (sorted set per key) for the
 *     scanner + auth + break-glass abuse limits.
 *
 * The client connects lazily on first use so the composition root stays sync.
 */
function lazyClient(url: string): { client: RedisClientType; ready: () => Promise<RedisClientType> } {
  const client: RedisClientType = createClient({ url });
  client.on("error", () => { /* swallow; ready() surfaces connect errors */ });
  let connecting: Promise<RedisClientType> | undefined;
  const ready = () => {
    if (client.isReady) return Promise.resolve(client);
    if (!connecting) connecting = client.connect().then(() => client);
    return connecting;
  };
  return { client, ready };
}

export class RedisCache implements Cache {
  private readonly ready: () => Promise<RedisClientType>;
  constructor(url: string) { this.ready = lazyClient(url).ready; }

  async get(key: string): Promise<string | undefined> {
    const c = await this.ready();
    return (await c.get(key)) ?? undefined;
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const c = await this.ready();
    await c.set(key, value, { EX: ttlSeconds });
  }
  async del(key: string): Promise<void> {
    const c = await this.ready();
    await c.del(key);
  }
}

export class RedisRateLimiter implements RateLimiter {
  private readonly ready: () => Promise<RedisClientType>;
  constructor(url: string) { this.ready = lazyClient(url).ready; }

  /** Sliding window via a sorted set of timestamps; trims, counts, then admits. */
  async allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const c = await this.ready();
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const rk = `rl:${key}`;
    await c.zRemRangeByScore(rk, 0, now - windowMs);
    const count = await c.zCard(rk);
    if (count >= limit) return false;
    await c.zAdd(rk, { score: now, value: `${now}-${Math.random()}` });
    await c.expire(rk, windowSeconds);
    return true;
  }
  async reset(key: string): Promise<void> {
    const c = await this.ready();
    await c.del(`rl:${key}`);
  }
}
