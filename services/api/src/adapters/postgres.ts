import pg from "pg";
import { scryptSync } from "node:crypto";
import {
  type KeyProvider,
  KeyDestroyedError,
  type Ciphertext,
  type EncryptedField,
  encryptWithKey,
  decryptWithKey,
  randomKey,
} from "@medikey/core";
import type {
  Account, Credential, Session, SubjectProfile, MedicalItem, EmergencySelection,
  EmergencyView, QrIdentifier, AccessToken, AccessLog, SecurityEvent, Consent,
  MedicalItemType, Provenance, AccountStatus, AuthStrength, SubjectRelationship,
  QrStatus, QrActivationState, GrantType, AccessType, AccessLevel, AccessStatus,
} from "../domain/model";
import type { Repository, AuditSink } from "./ports";

/**
 * Postgres adapters (staging/production) behind the frozen ports. The service
 * layer encrypts 🔒 fields BEFORE these are called, so the DB only ever holds
 * ciphertext for sensitive columns (bytea). Enums are enforced in code + CHECK
 * constraints (see db/migrations). No bulk-decrypt/export surface exists.
 *
 * Encoding conventions:
 *   - EncryptedField (🔒) → bytea of its JSON (all base64 strings; round-trips).
 *   - HMAC hashes (hex) → bytea of the raw bytes; mapped back to hex on read.
 *   - timestamps → ISO strings in the domain; timestamptz in the DB.
 */

type Row = Record<string, any>;

const encField = (f: EncryptedField | undefined): Buffer | null =>
  f === undefined ? null : Buffer.from(JSON.stringify(f), "utf8");
const decField = (b: Buffer | null): EncryptedField | undefined =>
  b == null ? undefined : (JSON.parse(b.toString("utf8")) as EncryptedField);
const encHash = (hex: string): Buffer => Buffer.from(hex, "hex");
const decHash = (b: Buffer): string => b.toString("hex");
const iso = (d: Date | string | null): string | undefined =>
  d == null ? undefined : (d instanceof Date ? d.toISOString() : d);
const isoReq = (d: Date | string): string => iso(d)!;

export class PostgresRepository implements Repository {
  constructor(private readonly pool: pg.Pool) {}

  private async q(text: string, params: unknown[] = []): Promise<Row[]> {
    const r = await this.pool.query(text, params);
    return r.rows;
  }
  private async one(text: string, params: unknown[] = []): Promise<Row | undefined> {
    return (await this.q(text, params))[0];
  }

  // ---- accounts ----
  async createAccount(a: Account): Promise<void> {
    await this.q(
      `INSERT INTO accounts (id,email,email_verified_at,phone_enc,phone_verified_at,status,preferred_language,location_logging_opt_in,created_at,deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [a.id, a.email, a.emailVerifiedAt ?? null, encField(a.phoneEnc), a.phoneVerifiedAt ?? null,
       a.status, a.preferredLanguage, a.locationLoggingOptIn, a.createdAt, a.deletedAt ?? null],
    );
  }
  async getAccountById(id: string) { return mapAccount(await this.one(`SELECT * FROM accounts WHERE id=$1`, [id])); }
  async getAccountByEmail(email: string) { return mapAccount(await this.one(`SELECT * FROM accounts WHERE email=$1`, [email])); }
  async updateAccount(a: Account): Promise<void> {
    await this.q(
      `UPDATE accounts SET email=$2,email_verified_at=$3,phone_enc=$4,phone_verified_at=$5,status=$6,
        preferred_language=$7,location_logging_opt_in=$8,deleted_at=$9,updated_at=now() WHERE id=$1`,
      [a.id, a.email, a.emailVerifiedAt ?? null, encField(a.phoneEnc), a.phoneVerifiedAt ?? null,
       a.status, a.preferredLanguage, a.locationLoggingOptIn, a.deletedAt ?? null],
    );
  }

  // ---- credentials ----
  async addCredential(c: Credential): Promise<void> {
    await this.q(
      `INSERT INTO credentials (id,account_id,type,secret_hash,public_key,label,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [c.id, c.accountId, c.type, c.secretHash ?? null, c.publicKey ?? null, c.label ?? null, c.createdAt],
    );
  }
  async getCredentialByAccountAndType(accountId: string, type: Credential["type"]) {
    return mapCredential(await this.one(
      `SELECT * FROM credentials WHERE account_id=$1 AND type=$2 ORDER BY created_at DESC LIMIT 1`, [accountId, type]));
  }
  async listCredentialsByAccountAndType(accountId: string, type: Credential["type"]) {
    return (await this.q(`SELECT * FROM credentials WHERE account_id=$1 AND type=$2 ORDER BY created_at`, [accountId, type]))
      .map((r) => mapCredential(r)!);
  }
  async updateCredential(c: Credential): Promise<void> {
    await this.q(`UPDATE credentials SET secret_hash=$2,public_key=$3,label=$4 WHERE id=$1`,
      [c.id, c.secretHash ?? null, c.publicKey ?? null, c.label ?? null]);
  }

  // ---- sessions ----
  async createSession(s: Session): Promise<void> {
    await this.q(
      `INSERT INTO sessions (id,account_id,token_hash,auth_strength,expires_at,revoked_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [s.id, s.accountId, encHash(s.tokenHash), s.authStrength, s.expiresAt, s.revokedAt ?? null, s.createdAt],
    );
  }
  async getSessionByTokenHash(tokenHash: string) {
    return mapSession(await this.one(`SELECT * FROM sessions WHERE token_hash=$1`, [encHash(tokenHash)]));
  }
  async updateSession(s: Session): Promise<void> {
    await this.q(`UPDATE sessions SET auth_strength=$2,expires_at=$3,revoked_at=$4 WHERE id=$1`,
      [s.id, s.authStrength, s.expiresAt, s.revokedAt ?? null]);
  }
  async revokeAllSessionsForAccount(accountId: string): Promise<void> {
    await this.q(`UPDATE sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL`, [accountId]);
  }

  // ---- subjects ----
  async createSubject(s: SubjectProfile): Promise<void> {
    await this.q(
      `INSERT INTO subject_profiles (id,account_id,relationship,full_name_enc,dob_enc,age_years,preferred_language,
         emergency_instructions_enc,last_reviewed_at,last_confirmed_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [s.id, s.accountId, s.relationship, encField(s.fullNameEnc), encField(s.dobEnc), s.ageYears ?? null,
       s.preferredLanguage ?? null, encField(s.emergencyInstructionsEnc), s.lastReviewedAt ?? null,
       s.lastConfirmedAt ?? null, s.createdAt],
    );
  }
  async getSubject(id: string) { return mapSubject(await this.one(`SELECT * FROM subject_profiles WHERE id=$1`, [id])); }
  async listSubjectsByAccount(accountId: string) {
    return (await this.q(`SELECT * FROM subject_profiles WHERE account_id=$1 ORDER BY created_at`, [accountId])).map(mapSubjectReq);
  }
  async updateSubject(s: SubjectProfile): Promise<void> {
    await this.q(
      `UPDATE subject_profiles SET relationship=$2,full_name_enc=$3,dob_enc=$4,age_years=$5,preferred_language=$6,
        emergency_instructions_enc=$7,last_reviewed_at=$8,last_confirmed_at=$9,updated_at=now() WHERE id=$1`,
      [s.id, s.relationship, encField(s.fullNameEnc), encField(s.dobEnc), s.ageYears ?? null,
       s.preferredLanguage ?? null, encField(s.emergencyInstructionsEnc), s.lastReviewedAt ?? null, s.lastConfirmedAt ?? null],
    );
  }
  async deleteSubject(id: string): Promise<void> { await this.q(`DELETE FROM subject_profiles WHERE id=$1`, [id]); }

  // ---- medical items ----
  async addItem(i: MedicalItem): Promise<void> {
    await this.q(
      `INSERT INTO medical_items (id,subject_id,type,data_enc,provenance,is_critical,severity,none_known,none_known_confirmed_at,created_at,last_confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [i.id, i.subjectId, i.type, encField(i.dataEnc), i.provenance, i.isCritical, i.severity ?? null,
       i.noneKnown ?? false, i.noneKnownConfirmedAt ?? null, i.createdAt, i.lastConfirmedAt ?? null],
    );
  }
  async getItem(id: string) { return mapItem(await this.one(`SELECT * FROM medical_items WHERE id=$1`, [id])); }
  async listItemsBySubject(subjectId: string) {
    return (await this.q(`SELECT * FROM medical_items WHERE subject_id=$1 ORDER BY created_at`, [subjectId])).map(mapItemReq);
  }
  async updateItem(i: MedicalItem): Promise<void> {
    await this.q(
      `UPDATE medical_items SET data_enc=$2,provenance=$3,is_critical=$4,severity=$5,none_known=$6,none_known_confirmed_at=$7,last_confirmed_at=$8 WHERE id=$1`,
      [i.id, encField(i.dataEnc), i.provenance, i.isCritical, i.severity ?? null, i.noneKnown ?? false,
       i.noneKnownConfirmedAt ?? null, i.lastConfirmedAt ?? null],
    );
  }
  async deleteItem(id: string): Promise<void> { await this.q(`DELETE FROM medical_items WHERE id=$1`, [id]); }
  async deleteItemsBySubject(subjectId: string): Promise<void> { await this.q(`DELETE FROM medical_items WHERE subject_id=$1`, [subjectId]); }

  // ---- selections ----
  async setSelections(subjectId: string, selections: EmergencySelection[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM emergency_selections WHERE subject_id=$1`, [subjectId]);
      for (const s of selections) {
        await client.query(
          `INSERT INTO emergency_selections (id,subject_id,field_ref,tier) VALUES ($1,$2,$3,$4)`,
          [s.id, s.subjectId, s.fieldRef, s.tier],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async listSelectionsBySubject(subjectId: string) {
    return (await this.q(`SELECT * FROM emergency_selections WHERE subject_id=$1`, [subjectId])).map(mapSelection);
  }
  async deleteSelectionsBySubject(subjectId: string): Promise<void> { await this.q(`DELETE FROM emergency_selections WHERE subject_id=$1`, [subjectId]); }

  // ---- emergency view ----
  async upsertView(v: EmergencyView): Promise<void> {
    await this.q(
      `INSERT INTO emergency_view (subject_id,payload_enc,built_at) VALUES ($1,$2,$3)
       ON CONFLICT (subject_id) DO UPDATE SET payload_enc=EXCLUDED.payload_enc, built_at=EXCLUDED.built_at`,
      [v.subjectId, encField(v.payloadEnc), v.builtAt],
    );
  }
  async getView(subjectId: string) {
    const r = await this.one(`SELECT * FROM emergency_view WHERE subject_id=$1`, [subjectId]);
    return r ? { subjectId: r.subject_id, payloadEnc: decField(r.payload_enc)!, builtAt: isoReq(r.built_at) } : undefined;
  }
  async deleteView(subjectId: string): Promise<void> { await this.q(`DELETE FROM emergency_view WHERE subject_id=$1`, [subjectId]); }

  // ---- qr ----
  async createQr(q: QrIdentifier): Promise<void> {
    await this.q(
      `INSERT INTO qr_identifiers (id,subject_id,identifier_hash,label,status,activation_state,replaced_by,created_at,revoked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [q.id, q.subjectId, encHash(q.identifierHash), q.label, q.status, q.activationState, q.replacedBy ?? null, q.createdAt, q.revokedAt ?? null],
    );
  }
  async getQrByHash(identifierHash: string) {
    return mapQr(await this.one(`SELECT * FROM qr_identifiers WHERE identifier_hash=$1`, [encHash(identifierHash)]));
  }
  async getQrById(id: string) { return mapQr(await this.one(`SELECT * FROM qr_identifiers WHERE id=$1`, [id])); }
  async listQrBySubject(subjectId: string) {
    return (await this.q(`SELECT * FROM qr_identifiers WHERE subject_id=$1 ORDER BY created_at`, [subjectId])).map(mapQrReq);
  }
  async updateQr(q: QrIdentifier): Promise<void> {
    await this.q(`UPDATE qr_identifiers SET label=$2,status=$3,activation_state=$4,replaced_by=$5,revoked_at=$6 WHERE id=$1`,
      [q.id, q.label, q.status, q.activationState, q.replacedBy ?? null, q.revokedAt ?? null]);
  }
  async deleteQrBySubject(subjectId: string): Promise<void> { await this.q(`DELETE FROM qr_identifiers WHERE subject_id=$1`, [subjectId]); }

  // ---- access tokens ----
  async createToken(t: AccessToken): Promise<void> {
    await this.q(
      `INSERT INTO access_tokens (id,subject_id,token_hash,grant_type,disclosure_level,scope,attestation_enc,expires_at,used_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [t.id, t.subjectId, encHash(t.tokenHash), t.grantType, t.disclosureLevel, t.scope ?? null,
       encField(t.attestationEnc), t.expiresAt, t.usedAt ?? null, t.createdAt],
    );
  }
  async getTokenByHash(tokenHash: string) {
    return mapToken(await this.one(`SELECT * FROM access_tokens WHERE token_hash=$1`, [encHash(tokenHash)]));
  }
  async updateToken(t: AccessToken): Promise<void> {
    await this.q(`UPDATE access_tokens SET used_at=$2,scope=$3 WHERE id=$1`, [t.id, t.usedAt ?? null, t.scope ?? null]);
  }
  async deleteTokensBySubject(subjectId: string): Promise<void> { await this.q(`DELETE FROM access_tokens WHERE subject_id=$1`, [subjectId]); }

  // ---- access logs ----
  async addLog(l: AccessLog): Promise<void> {
    await this.q(
      `INSERT INTO access_logs (id,subject_id,qr_identifier_id,access_type,level,status,ua_family,city,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [l.id, l.subjectId ?? null, l.qrIdentifierId ?? null, l.accessType, l.level, l.status, l.uaFamily ?? null, l.city ?? null, l.createdAt],
    );
  }
  async listLogsBySubject(subjectId: string) {
    return (await this.q(`SELECT * FROM access_logs WHERE subject_id=$1 ORDER BY created_at DESC`, [subjectId])).map(mapLog);
  }
  async deleteLogsBySubject(subjectId: string): Promise<void> { await this.q(`DELETE FROM access_logs WHERE subject_id=$1`, [subjectId]); }

  // ---- consents ----
  async addConsent(c: Consent): Promise<void> {
    await this.q(
      `INSERT INTO consents (id,account_id,subject_id,purpose,notice_version,granted_at,withdrawn_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [c.id, c.accountId, c.subjectId ?? null, c.purpose, c.noticeVersion, c.grantedAt, c.withdrawnAt ?? null],
    );
  }
  async listConsentsByAccount(accountId: string) {
    return (await this.q(`SELECT * FROM consents WHERE account_id=$1 ORDER BY granted_at`, [accountId])).map(mapConsent);
  }
}

/** Append-only audit sink → security_events. INSERT + SELECT only (no update/delete). */
export class PgAuditSink implements AuditSink {
  constructor(private readonly pool: pg.Pool) {}
  async append(e: SecurityEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO security_events (id,account_id,subject_id,type,detail,severity,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [e.id, e.accountId ?? null, e.subjectId ?? null, e.type, JSON.stringify(e.detail ?? {}), e.severity, e.createdAt],
    );
  }
  async list(filter?: { accountId?: string; subjectId?: string }): Promise<SecurityEvent[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.accountId) { params.push(filter.accountId); where.push(`account_id=$${params.length}`); }
    if (filter?.subjectId) { params.push(filter.subjectId); where.push(`subject_id=$${params.length}`); }
    const sql = `SELECT * FROM security_events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at`;
    const rows = (await this.pool.query(sql, params)).rows;
    return rows.map((r) => ({
      id: r.id, accountId: r.account_id ?? undefined, subjectId: r.subject_id ?? undefined,
      type: r.type, detail: r.detail ?? {}, severity: r.severity, createdAt: isoReq(r.created_at),
    }));
  }
}

/**
 * Persistent KeyProvider backed by the subject_keys table. Each subject key is
 * stored WRAPPED under a master KEK (env MASTER_KEY); the DB alone cannot use it.
 * Crypto-shred sets a tombstone (wrapped_key NULL, destroyed_at set) so the key
 * can never be re-created — restore-no-resurrect. In production this is a managed
 * KMS/HSM; this adapter is the self-contained Postgres stand-in.
 */
export class PgKeyProvider implements KeyProvider {
  private readonly kek: Buffer;
  private readonly liveCache = new Set<string>(); // best-effort; hasSubjectKey is test-only

  constructor(private readonly pool: pg.Pool, masterKey: string) {
    this.kek = deriveKek(masterKey);
  }

  async ensureSubjectKey(subjectId: string): Promise<void> {
    const row = (await this.pool.query(
      `SELECT wrapped_key, destroyed_at FROM subject_keys WHERE subject_id=$1`, [subjectId])).rows[0];
    if (row?.destroyed_at) throw new KeyDestroyedError(subjectId);
    if (row) { this.liveCache.add(subjectId); return; }
    const key = randomKey();
    const wrapped = Buffer.from(JSON.stringify(encryptWithKey(this.kek, key.toString("base64"))), "utf8");
    // Tombstone rows are kept; a fresh subject can only INSERT if none exists.
    await this.pool.query(
      `INSERT INTO subject_keys (subject_id,wrapped_key) VALUES ($1,$2) ON CONFLICT (subject_id) DO NOTHING`,
      [subjectId, wrapped]);
    this.liveCache.add(subjectId);
  }

  hasSubjectKey(subjectId: string): boolean { return this.liveCache.has(subjectId); }

  private async loadKey(subjectId: string): Promise<Buffer> {
    const row = (await this.pool.query(
      `SELECT wrapped_key, destroyed_at FROM subject_keys WHERE subject_id=$1`, [subjectId])).rows[0];
    if (!row || row.destroyed_at || !row.wrapped_key) throw new KeyDestroyedError(subjectId);
    const ct = JSON.parse((row.wrapped_key as Buffer).toString("utf8")) as Ciphertext;
    return Buffer.from(decryptWithKey(this.kek, ct), "base64");
  }

  async wrapDek(subjectId: string, dek: Buffer): Promise<Ciphertext> {
    return encryptWithKey(await this.loadKey(subjectId), dek.toString("base64"));
  }
  async unwrapDek(subjectId: string, wrapped: Ciphertext): Promise<Buffer> {
    return Buffer.from(decryptWithKey(await this.loadKey(subjectId), wrapped), "base64");
  }
  async destroySubjectKey(subjectId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO subject_keys (subject_id,wrapped_key,destroyed_at) VALUES ($1,NULL,now())
       ON CONFLICT (subject_id) DO UPDATE SET wrapped_key=NULL, destroyed_at=now()`, [subjectId]);
    this.liveCache.delete(subjectId);
  }
}

/** Derive a stable 32-byte KEK from the configured master key (base64/hex/passphrase). */
function deriveKek(masterKey: string): Buffer {
  for (const enc of ["base64", "hex"] as const) {
    try { const b = Buffer.from(masterKey, enc); if (b.length === 32) return b; } catch { /* fall through */ }
  }
  return scryptSync(masterKey, "medikey-kek-v1", 32); // deterministic salt → stable across restarts
}

// ---- row mappers ----
function mapAccount(r?: Row): Account | undefined {
  if (!r) return undefined;
  return {
    id: r.id, email: r.email, emailVerifiedAt: iso(r.email_verified_at), phoneEnc: decField(r.phone_enc),
    phoneVerifiedAt: iso(r.phone_verified_at), status: r.status as AccountStatus,
    preferredLanguage: r.preferred_language, locationLoggingOptIn: r.location_logging_opt_in,
    createdAt: isoReq(r.created_at), deletedAt: iso(r.deleted_at),
  };
}
function mapCredential(r?: Row): Credential | undefined {
  if (!r) return undefined;
  return { id: r.id, accountId: r.account_id, type: r.type, secretHash: r.secret_hash ?? undefined,
    publicKey: r.public_key ?? undefined, label: r.label ?? undefined, createdAt: isoReq(r.created_at) };
}
function mapSession(r?: Row): Session | undefined {
  if (!r) return undefined;
  return { id: r.id, accountId: r.account_id, tokenHash: decHash(r.token_hash), authStrength: r.auth_strength as AuthStrength,
    expiresAt: isoReq(r.expires_at), revokedAt: iso(r.revoked_at), createdAt: isoReq(r.created_at) };
}
function mapSubject(r?: Row): SubjectProfile | undefined {
  if (!r) return undefined;
  return {
    id: r.id, accountId: r.account_id, relationship: r.relationship as SubjectRelationship,
    fullNameEnc: decField(r.full_name_enc)!, dobEnc: decField(r.dob_enc), ageYears: r.age_years ?? undefined,
    preferredLanguage: r.preferred_language ?? undefined, emergencyInstructionsEnc: decField(r.emergency_instructions_enc),
    lastReviewedAt: iso(r.last_reviewed_at), lastConfirmedAt: iso(r.last_confirmed_at), createdAt: isoReq(r.created_at),
  };
}
const mapSubjectReq = (r: Row) => mapSubject(r)!;
function mapItem(r?: Row): MedicalItem | undefined {
  if (!r) return undefined;
  return {
    id: r.id, subjectId: r.subject_id, type: r.type as MedicalItemType, dataEnc: decField(r.data_enc)!,
    provenance: r.provenance as Provenance, isCritical: r.is_critical, severity: r.severity ?? undefined,
    noneKnown: r.none_known, noneKnownConfirmedAt: iso(r.none_known_confirmed_at),
    createdAt: isoReq(r.created_at), lastConfirmedAt: iso(r.last_confirmed_at),
  };
}
const mapItemReq = (r: Row) => mapItem(r)!;
const mapSelection = (r: Row): EmergencySelection => ({ id: r.id, subjectId: r.subject_id, fieldRef: r.field_ref, tier: r.tier });
function mapQr(r?: Row): QrIdentifier | undefined {
  if (!r) return undefined;
  return { id: r.id, subjectId: r.subject_id, identifierHash: decHash(r.identifier_hash), label: r.label,
    status: r.status as QrStatus, activationState: r.activation_state as QrActivationState,
    replacedBy: r.replaced_by ?? undefined, createdAt: isoReq(r.created_at), revokedAt: iso(r.revoked_at) };
}
const mapQrReq = (r: Row) => mapQr(r)!;
function mapToken(r?: Row): AccessToken | undefined {
  if (!r) return undefined;
  return { id: r.id, subjectId: r.subject_id, tokenHash: decHash(r.token_hash), grantType: r.grant_type as GrantType,
    disclosureLevel: r.disclosure_level as "l2", scope: r.scope ?? undefined, attestationEnc: decField(r.attestation_enc),
    expiresAt: isoReq(r.expires_at), usedAt: iso(r.used_at), createdAt: isoReq(r.created_at) };
}
const mapLog = (r: Row): AccessLog => ({
  id: r.id, subjectId: r.subject_id ?? undefined, qrIdentifierId: r.qr_identifier_id ?? undefined,
  accessType: r.access_type as AccessType, level: r.level as AccessLevel, status: r.status as AccessStatus,
  uaFamily: r.ua_family ?? undefined, city: r.city ?? undefined, createdAt: isoReq(r.created_at),
});
const mapConsent = (r: Row): Consent => ({
  id: r.id, accountId: r.account_id, subjectId: r.subject_id ?? undefined, purpose: r.purpose,
  noticeVersion: r.notice_version, grantedAt: isoReq(r.granted_at), withdrawnAt: iso(r.withdrawn_at),
});
