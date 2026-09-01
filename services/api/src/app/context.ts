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
