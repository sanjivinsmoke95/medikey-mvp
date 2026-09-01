/**
 * @medikey/core — pure domain layer.
 * Modules: ids, disclosure (tiers + the project() boundary), crypto primitives
 * (vetted-lib wrappers), kms (KeyProvider + envelope), authz, observability.
 * No network/DB I/O lives here.
 */
export { newId } from "./ids";

export {
  PROVENANCE,
  DISCLOSURE_TIER,
  DISCLOSURE_LEVEL,
  TIER_RANK,
  LEVEL_RANK,
  isScannerLevel,
  type Provenance,
  type DisclosureTier,
  type DisclosureLevel,
} from "./disclosure/tiers";

export {
  project,
  tierAllowedAtLevel,
  type DisclosureField,
  type ProjectionResult,
  type EmergencySection,
} from "./disclosure/project";

export {
  randomIdentifier,
  randomToken,
  randomKey,
  hmacHex,
  safeEqualHex,
  encryptWithKey,
  decryptWithKey,
  type Ciphertext,
} from "./crypto/primitives";

export {
  type KeyProvider,
  LocalKeyProvider,
  KeyDestroyedError,
} from "./kms/key-provider";

export { EnvelopeCrypto, type EncryptedField } from "./kms/envelope";

export {
  AuthzError,
  assertOwns,
  assertStepUp,
  assertTierPlacementAllowed,
  type Principal,
  type AuthStrength,
} from "./authz/authz";

export {
  redact,
  createLogger,
  type Logger,
  type LogLevel,
  type LogEntry,
} from "./observability/redaction";
