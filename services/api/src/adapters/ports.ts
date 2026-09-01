import type {
  Account,
  Credential,
  Session,
  SubjectProfile,
  MedicalItem,
  EmergencySelection,
  EmergencyView,
  QrIdentifier,
  AccessToken,
  AccessLog,
  SecurityEvent,
  Consent,
} from "../domain/model";

/**
 * Persistence port. The MVP ships an in-memory adapter (tests + zero-config
 * local run); a Postgres adapter backs staging/production (migrations in db/).
 * The service layer encrypts sensitive fields BEFORE calling the repository,
 * so the adapter only ever sees ciphertext for 🔒 fields.
 */
export interface Repository {
  // accounts
  createAccount(a: Account): Promise<void>;
  getAccountById(id: string): Promise<Account | undefined>;
  getAccountByEmail(email: string): Promise<Account | undefined>;
  updateAccount(a: Account): Promise<void>;

  // credentials
  addCredential(c: Credential): Promise<void>;
  getCredentialByAccountAndType(accountId: string, type: Credential["type"]): Promise<Credential | undefined>;

  // sessions
  createSession(s: Session): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | undefined>;
  updateSession(s: Session): Promise<void>;
  revokeAllSessionsForAccount(accountId: string): Promise<void>;

  // subjects
  createSubject(s: SubjectProfile): Promise<void>;
  getSubject(id: string): Promise<SubjectProfile | undefined>;
  listSubjectsByAccount(accountId: string): Promise<SubjectProfile[]>;
  updateSubject(s: SubjectProfile): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  // medical items
  addItem(i: MedicalItem): Promise<void>;
  getItem(id: string): Promise<MedicalItem | undefined>;
  listItemsBySubject(subjectId: string): Promise<MedicalItem[]>;
  updateItem(i: MedicalItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  deleteItemsBySubject(subjectId: string): Promise<void>;

  // emergency selection
  setSelections(subjectId: string, selections: EmergencySelection[]): Promise<void>;
  listSelectionsBySubject(subjectId: string): Promise<EmergencySelection[]>;
  deleteSelectionsBySubject(subjectId: string): Promise<void>;

  // emergency view cache
  upsertView(v: EmergencyView): Promise<void>;
  getView(subjectId: string): Promise<EmergencyView | undefined>;
  deleteView(subjectId: string): Promise<void>;

  // qr
  createQr(q: QrIdentifier): Promise<void>;
  getQrByHash(identifierHash: string): Promise<QrIdentifier | undefined>;
  getQrById(id: string): Promise<QrIdentifier | undefined>;
  listQrBySubject(subjectId: string): Promise<QrIdentifier[]>;
  updateQr(q: QrIdentifier): Promise<void>;
  deleteQrBySubject(subjectId: string): Promise<void>;

  // access tokens
  createToken(t: AccessToken): Promise<void>;
  getTokenByHash(tokenHash: string): Promise<AccessToken | undefined>;
  updateToken(t: AccessToken): Promise<void>;
  deleteTokensBySubject(subjectId: string): Promise<void>;

  // access logs
  addLog(l: AccessLog): Promise<void>;
  listLogsBySubject(subjectId: string): Promise<AccessLog[]>;
  deleteLogsBySubject(subjectId: string): Promise<void>;

  // consents
  addConsent(c: Consent): Promise<void>;
  listConsentsByAccount(accountId: string): Promise<Consent[]>;
}

/**
 * Append-only audit sink (doc 02 AUDIT / matrix #7). The application role can
 * WRITE but never mutate/delete. A real deployment ships to an isolated sink.
 */
export interface AuditSink {
  append(event: SecurityEvent): Promise<void>;
  list(filter?: { accountId?: string; subjectId?: string }): Promise<SecurityEvent[]>;
}

/** Cache with TTL — backs the emergency_view + revocation SLO (purge on revoke). */
export interface Cache {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Sliding-window rate limiter (doc 02, matrix #3/#12). Fail-safe. */
export interface RateLimiter {
  /** Returns true if allowed, false if the limit is exceeded. */
  allow(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  reset(key: string): Promise<void>;
}

/** Notifier — NEVER carries medical content (doc 02 NOTIFICATIONS / matrix). */
export interface Notifier {
  notifyOwner(accountId: string, kind: string, summary: string): Promise<void>;
  sent(): ReadonlyArray<{ accountId: string; kind: string; summary: string }>;
}
