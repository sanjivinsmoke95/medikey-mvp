import {
  EnvelopeCrypto,
  LocalKeyProvider,
  createLogger,
  randomToken,
  type KeyProvider,
  type Logger,
} from "@medikey/core";
import { loadServerEnv, allowsEphemeralKeys, type ServerEnv } from "@medikey/config";
import type { Repository, AuditSink, Cache, RateLimiter, Notifier } from "../adapters/ports";
import {
  MemoryRepository,
  MemoryAuditSink,
  MemoryCache,
  MemoryRateLimiter,
  MemoryNotifier,
} from "../adapters/memory";
import { DevAuthProvider, type AuthProvider } from "../auth/provider";

/** Wired application dependencies passed to every service. */
export interface AppContext {
  env: ServerEnv;
  repo: Repository;
  audit: AuditSink;
  cache: Cache;
  rateLimiter: RateLimiter;
  notifier: Notifier;
  keys: KeyProvider;
  envelope: EnvelopeCrypto;
  auth: AuthProvider;
  logger: Logger;
  /** Server-side pepper for HMAC identifier/token hashing. */
  pepper: string;
  now(): string;
}

/**
 * Build a context from in-memory/local adapters (local-first). Production wiring
 * swaps these for Postgres/Redis/KMS adapters behind the same ports.
 */
export function createContext(
  source: Record<string, string | undefined> = process.env,
): AppContext {
  const env = loadServerEnv(source);
  const keys = new LocalKeyProvider();

  // Local-first: derive ephemeral pepper in dev/test; require it in production.
  let pepper = env.IDENTIFIER_PEPPER;
  if (!pepper) {
    if (!allowsEphemeralKeys(env)) throw new Error("IDENTIFIER_PEPPER required");
    pepper = randomToken(32);
  }

  const repo = new MemoryRepository();
  return {
    env,
    repo,
    audit: new MemoryAuditSink(),
    cache: new MemoryCache(),
    rateLimiter: new MemoryRateLimiter(),
    notifier: new MemoryNotifier(),
    keys,
    envelope: new EnvelopeCrypto(keys),
    auth: new DevAuthProvider(repo),
    logger: createLogger(),
    pepper,
    now: () => new Date().toISOString(),
  };
}

/** Convenience for tests: a context pinned to NODE_ENV=test. */
export function createTestContext(): AppContext {
  return createContext({ NODE_ENV: "test" });
}

/**
 * Async context builder that selects real adapters from the environment:
 *   - DATABASE_URL → Postgres repository + append-only audit sink + persistent
 *     KeyProvider (subject keys wrapped under MASTER_KEY).
 *   - REDIS_URL    → Redis cache + rate limiter.
 *   - neither      → the in-memory adapters (identical to createContext).
 *
 * pg/redis are imported dynamically so the zero-config in-memory path never
 * needs them installed. Adapters can be mixed (e.g. Postgres + in-memory cache).
 */
export async function createServerContext(
  source: Record<string, string | undefined> = process.env,
): Promise<AppContext> {
  const env = loadServerEnv(source);
  if (!env.DATABASE_URL && !env.REDIS_URL) return createContext(source);

  let pepper = env.IDENTIFIER_PEPPER;
  if (!pepper) {
    if (!allowsEphemeralKeys(env)) throw new Error("IDENTIFIER_PEPPER required");
    pepper = randomToken(32);
  }

  // Persistence + KMS: Postgres, or in-memory when DATABASE_URL is absent.
  let repo: Repository;
  let audit: AuditSink;
  let keys: KeyProvider;
  if (env.DATABASE_URL) {
    const pgMod = await import("pg");
    const Pool = pgMod.default.Pool;
    const { PostgresRepository, PgAuditSink, PgKeyProvider } = await import("../adapters/postgres");
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    let masterKey = env.MASTER_KEY;
    if (!masterKey) {
      if (!allowsEphemeralKeys(env)) throw new Error("MASTER_KEY required");
      masterKey = randomToken(32); // dev-only ephemeral KEK (data won't survive restart)
    }
    repo = new PostgresRepository(pool);
    audit = new PgAuditSink(pool);
    keys = new PgKeyProvider(pool, masterKey);
  } else {
    repo = new MemoryRepository();
    audit = new MemoryAuditSink();
    keys = new LocalKeyProvider();
  }

  // Cache + rate limiting: Redis, or in-memory when REDIS_URL is absent.
  let cache: Cache;
  let rateLimiter: RateLimiter;
  if (env.REDIS_URL) {
    const { RedisCache, RedisRateLimiter } = await import("../adapters/redis");
    cache = new RedisCache(env.REDIS_URL);
    rateLimiter = new RedisRateLimiter(env.REDIS_URL);
  } else {
    cache = new MemoryCache();
    rateLimiter = new MemoryRateLimiter();
  }

  return {
    env, repo, audit, cache, rateLimiter,
    notifier: new MemoryNotifier(),
    keys,
    envelope: new EnvelopeCrypto(keys),
    auth: new DevAuthProvider(repo),
    logger: createLogger(),
    pepper,
    now: () => new Date().toISOString(),
  };
}
