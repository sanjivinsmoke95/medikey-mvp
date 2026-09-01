/**
 * @medikey/config — shared configuration primitives.
 *
 * Server-side, fail-fast, secret-safe environment loader + shared tunables.
 * Do not expand beyond the scoped task (see docs/impl/17-claude-code-workflow.md).
 */
export {
  serverEnvSchema,
  loadServerEnv,
  allowsEphemeralKeys,
} from "./env";
export type { ServerEnv } from "./env";
