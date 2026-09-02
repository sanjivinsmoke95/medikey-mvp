import { z } from "zod";

/**
 * Server-only environment + secrets loader (T004).
 *
 * Rules (frozen invariants):
 *   - SERVER-ONLY. Never import into a client bundle.
 *   - Secrets come from the environment / secret manager. Their VALUES are never
 *     logged; on error we report only the offending KEY names.
 *   - Open decisions (doc 18) surface as config, never hard-coded constants
 *     (e.g. DELETION_RECONCILIATION_DAYS is intentionally OPTIONAL and unset by
 *     default — it is legal-set, not an engineering default).
 *   - Local-first (adjustment 1): in development/test, cryptographic material may
 *     be ephemerally derived so the app runs with zero config. In PRODUCTION the
 *     real secrets are REQUIRED and the loader fails fast if absent.
 */
export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),

    // Persistence (optional in dev/test — in-memory adapters are used when absent)
    DATABASE_URL: z.string().url().optional(),
    REDIS_URL: z.string().url().optional(),

    // Cryptographic material (see local-first note above)
    // 32-byte base64 master key for the local key provider; cloud KMS in prod.
    MASTER_KEY: z.string().optional(),
    // Pepper for HMAC identifier hashing.
    IDENTIFIER_PEPPER: z.string().optional(),

    // WebAuthn / passkeys (production auth). RP_ID is the registrable domain
    // (e.g. "medikey.in"); RP_ORIGIN is the full https origin the ceremony runs
    // on. Defaults are dev-only (localhost) so passkeys work out of the box.
    RP_ID: z.string().default("localhost"),
    RP_ORIGIN: z.string().default("http://localhost:8788"),
    RP_NAME: z.string().default("MediKey"),

    // Tunables (config, not constants)
    SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    STEPUP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    L2_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    EMERGENCY_VIEW_MAX_TTL_SECONDS: z.coerce.number().int().positive().default(300),

    // OPEN decision (doc 18): legal-set. Unset until legal review — NOT defaulted.
    DELETION_RECONCILIATION_DAYS: z.coerce.number().int().positive().optional(),

    // Access-location logging is OFF by default (approval G6); this only sets the
    // system-wide capability. Per-owner opt-in is stored per account.
    LOCATION_LOGGING_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((env, ctx) => {
    // In production, cryptographic material must be explicitly provided.
    if (env.NODE_ENV === "production") {
      if (!env.MASTER_KEY) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MASTER_KEY"], message: "required in production" });
      }
      if (!env.IDENTIFIER_PEPPER) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["IDENTIFIER_PEPPER"], message: "required in production" });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter((key) => key.length > 0)
      .join(", ");
    // Never print values — only keys.
    throw new Error(
      `Invalid server environment configuration. Offending keys: ${invalidKeys || "(root)"}`,
    );
  }
  return result.data;
}

/**
 * Whether cryptographic material may be ephemerally derived (local-first).
 * True only in development/test; production always requires real secrets.
 */
export function allowsEphemeralKeys(env: ServerEnv): boolean {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}
