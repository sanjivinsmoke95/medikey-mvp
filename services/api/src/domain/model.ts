import type {
  EncryptedField,
  DisclosureTier,
  Provenance,
} from "@medikey/core";

/** Domain entities. Sensitive values are stored ONLY as EncryptedField (🔒). */

export type AccountStatus = "active" | "suspended" | "pending_deletion" | "deleted";

export interface Account {
  id: string;
  email: string;
  emailVerifiedAt?: string;
  phoneEnc?: EncryptedField;
  phoneVerifiedAt?: string;
  status: AccountStatus;
  preferredLanguage: string;
  /** G6: access-location logging is per-owner opt-in, default false. */
  locationLoggingOptIn: boolean;
  createdAt: string;
  deletedAt?: string;
}

export type CredentialType = "dev" | "passkey" | "email_otp" | "totp";

export interface Credential {
  id: string;
  accountId: string;
  type: CredentialType;
  /** Dev adapter only: scrypt hash of a dev secret. Never a plaintext secret. */
  secretHash?: string;
  publicKey?: string;
  label?: string;
  createdAt: string;
}

export type AuthStrength = "primary" | "stepped_up";

export interface Session {
  id: string;
  accountId: string;
  tokenHash: string;
  authStrength: AuthStrength;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export type SubjectRelationship = "self" | "child" | "parent" | "dependent" | "other";

export interface SubjectProfile {
  id: string;
  accountId: string;
  relationship: SubjectRelationship;
  fullNameEnc: EncryptedField;
  dobEnc?: EncryptedField;
  ageYears?: number; // derived, non-identifying; safe for L1
  preferredLanguage?: string;
  emergencyInstructionsEnc?: EncryptedField;
  /** 🔒 encrypted JSON of extended personal details {gender, phone, address, photo}. */
  extrasEnc?: EncryptedField;
  lastReviewedAt?: string;
  lastConfirmedAt?: string;
  createdAt: string;
}

export type MedicalItemType =
  | "blood_group"
  | "allergy"
  | "condition"
  | "medication"
  | "medication_avoidance"
  | "implant"
  | "surgery"
  | "injury"
  | "emergency_contact"
  | "document"; // X-rays / reports — image stored inside the encrypted data payload (L3-class)

export interface MedicalItem {
  id: string;
  subjectId: string;
  type: MedicalItemType;
  /** Encrypted JSON blob of the item's sensitive fields. */
  dataEnc: EncryptedField;
  provenance: Provenance;
  isCritical: boolean;
  severity?: string;
  /** Stated-negative: an explicit "none known" positive assertion. */
  noneKnown?: boolean;
  noneKnownConfirmedAt?: string;
  createdAt: string;
  lastConfirmedAt?: string;
}

export interface EmergencySelection {
  id: string;
  subjectId: string;
  fieldRef: string;
  tier: DisclosureTier;
}

export interface EmergencyView {
  subjectId: string;
  /** Encrypted L1-only payload (built via project(l1)). */
  payloadEnc: EncryptedField;
  builtAt: string;
}

export type QrStatus = "active" | "revoked" | "compromised";
export type QrActivationState = "preprovisioned" | "active" | "superseded";

export interface QrIdentifier {
  id: string;
  subjectId: string;
  identifierHash: string; // HMAC(pepper, opaque-id); plaintext never stored
  label: string;
  status: QrStatus;
  activationState: QrActivationState;
  replacedBy?: string;
  createdAt: string;
  revokedAt?: string;
}

export type GrantType = "owner_approval" | "one_time_code" | "preissued" | "break_glass";

export interface AccessToken {
  id: string;
  subjectId: string;
  tokenHash: string;
  grantType: GrantType;
  /** Break-glass / scanner tokens are L2-ONLY. There is no l3 mint path. */
  disclosureLevel: "l2";
  scope?: string;
  attestationEnc?: EncryptedField;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export type AccessType = "anonymous" | "break_glass" | "contact_approved" | "professional" | "owner";
export type AccessLevel = "l1" | "l2";
export type AccessStatus = "shown" | "revoked" | "not_found" | "rate_limited" | "denied";

export interface AccessLog {
  id: string;
  subjectId?: string;
  qrIdentifierId?: string;
  accessType: AccessType;
  level: AccessLevel;
  status: AccessStatus;
  uaFamily?: string;
  /** Only present if the owner opted in (G6). Coarse, IP-truncated. */
  city?: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  accountId?: string;
  subjectId?: string;
  type: string;
  detail: Record<string, unknown>; // redacted; never medical content
  severity: "info" | "warn" | "critical";
  createdAt: string;
}

export interface Consent {
  id: string;
  accountId: string;
  subjectId?: string;
  purpose: string;
  noticeVersion: string;
  grantedAt: string;
  withdrawnAt?: string;
}
