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
import type { Repository, AuditSink, Cache, RateLimiter, Notifier } from "./ports";

const clone = <T>(v: T): T => structuredClone(v);

/** In-memory Repository for tests + zero-config local runs (no cloud). */
export class MemoryRepository implements Repository {
  private accounts = new Map<string, Account>();
  private credentials = new Map<string, Credential>();
  private sessions = new Map<string, Session>();
  private subjects = new Map<string, SubjectProfile>();
  private items = new Map<string, MedicalItem>();
  private selections = new Map<string, EmergencySelection[]>();
  private views = new Map<string, EmergencyView>();
  private qrs = new Map<string, QrIdentifier>();
  private tokens = new Map<string, AccessToken>();
  private logs: AccessLog[] = [];
  private consents: Consent[] = [];

  async createAccount(a: Account) { this.accounts.set(a.id, clone(a)); }
  async getAccountById(id: string) { const a = this.accounts.get(id); return a && clone(a); }
  async getAccountByEmail(email: string) {
    for (const a of this.accounts.values()) if (a.email === email) return clone(a);
    return undefined;
  }
  async updateAccount(a: Account) { this.accounts.set(a.id, clone(a)); }

  async addCredential(c: Credential) { this.credentials.set(c.id, clone(c)); }
  async getCredentialByAccountAndType(accountId: string, type: Credential["type"]) {
    for (const c of this.credentials.values())
      if (c.accountId === accountId && c.type === type) return clone(c);
    return undefined;
  }

  async createSession(s: Session) { this.sessions.set(s.id, clone(s)); }
  async getSessionByTokenHash(tokenHash: string) {
    for (const s of this.sessions.values()) if (s.tokenHash === tokenHash) return clone(s);
    return undefined;
  }
  async updateSession(s: Session) { this.sessions.set(s.id, clone(s)); }
  async revokeAllSessionsForAccount(accountId: string) {
    for (const s of this.sessions.values())
      if (s.accountId === accountId && !s.revokedAt) { s.revokedAt = new Date().toISOString(); }
  }

  async createSubject(s: SubjectProfile) { this.subjects.set(s.id, clone(s)); }
  async getSubject(id: string) { const s = this.subjects.get(id); return s && clone(s); }
  async listSubjectsByAccount(accountId: string) {
    return [...this.subjects.values()].filter((s) => s.accountId === accountId).map(clone);
  }
  async updateSubject(s: SubjectProfile) { this.subjects.set(s.id, clone(s)); }
  async deleteSubject(id: string) { this.subjects.delete(id); }

  async addItem(i: MedicalItem) { this.items.set(i.id, clone(i)); }
  async getItem(id: string) { const i = this.items.get(id); return i && clone(i); }
  async listItemsBySubject(subjectId: string) {
    return [...this.items.values()].filter((i) => i.subjectId === subjectId).map(clone);
  }
  async updateItem(i: MedicalItem) { this.items.set(i.id, clone(i)); }
  async deleteItem(id: string) { this.items.delete(id); }
  async deleteItemsBySubject(subjectId: string) {
    for (const [id, i] of this.items) if (i.subjectId === subjectId) this.items.delete(id);
  }

  async setSelections(subjectId: string, selections: EmergencySelection[]) {
    this.selections.set(subjectId, selections.map(clone));
  }
  async listSelectionsBySubject(subjectId: string) {
    return (this.selections.get(subjectId) ?? []).map(clone);
  }
  async deleteSelectionsBySubject(subjectId: string) { this.selections.delete(subjectId); }

  async upsertView(v: EmergencyView) { this.views.set(v.subjectId, clone(v)); }
  async getView(subjectId: string) { const v = this.views.get(subjectId); return v && clone(v); }
  async deleteView(subjectId: string) { this.views.delete(subjectId); }

  async createQr(q: QrIdentifier) { this.qrs.set(q.id, clone(q)); }
  async getQrByHash(identifierHash: string) {
    for (const q of this.qrs.values()) if (q.identifierHash === identifierHash) return clone(q);
    return undefined;
  }
  async getQrById(id: string) { const q = this.qrs.get(id); return q && clone(q); }
  async listQrBySubject(subjectId: string) {
    return [...this.qrs.values()].filter((q) => q.subjectId === subjectId).map(clone);
  }
  async updateQr(q: QrIdentifier) { this.qrs.set(q.id, clone(q)); }
  async deleteQrBySubject(subjectId: string) {
    for (const [id, q] of this.qrs) if (q.subjectId === subjectId) this.qrs.delete(id);
  }

  async createToken(t: AccessToken) { this.tokens.set(t.id, clone(t)); }
  async getTokenByHash(tokenHash: string) {
    for (const t of this.tokens.values()) if (t.tokenHash === tokenHash) return clone(t);
    return undefined;
  }
  async updateToken(t: AccessToken) { this.tokens.set(t.id, clone(t)); }
  async deleteTokensBySubject(subjectId: string) {
    for (const [id, t] of this.tokens) if (t.subjectId === subjectId) this.tokens.delete(id);
  }

  async addLog(l: AccessLog) { this.logs.push(clone(l)); }
  async listLogsBySubject(subjectId: string) {
    return this.logs.filter((l) => l.subjectId === subjectId).map(clone);
  }
  async deleteLogsBySubject(subjectId: string) {
    this.logs = this.logs.filter((l) => l.subjectId !== subjectId);
  }

  async addConsent(c: Consent) { this.consents.push(clone(c)); }
  async listConsentsByAccount(accountId: string) {
    return this.consents.filter((c) => c.accountId === accountId).map(clone);
  }
}

/** Append-only in-memory audit sink. No update/delete surface exists. */
export class MemoryAuditSink implements AuditSink {
  private events: SecurityEvent[] = [];
  async append(event: SecurityEvent) { this.events.push(clone(event)); }
  async list(filter?: { accountId?: string; subjectId?: string }) {
    return this.events
      .filter((e) =>
        (!filter?.accountId || e.accountId === filter.accountId) &&
        (!filter?.subjectId || e.subjectId === filter.subjectId))
      .map(clone);
  }
}

/** In-memory TTL cache. `del` implements the active revocation purge. */
export class MemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>();
  async get(key: string) {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return undefined; }
    return e.value;
  }
  async set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  async del(key: string) { this.store.delete(key); }
}

/** In-memory sliding-window rate limiter. */
export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  async allow(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) { this.hits.set(key, arr); return false; }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
  async reset(key: string) { this.hits.delete(key); }
}

/** In-memory notifier — records notifications; asserts no medical content in tests. */
export class MemoryNotifier implements Notifier {
  private outbox: { accountId: string; kind: string; summary: string }[] = [];
  async notifyOwner(accountId: string, kind: string, summary: string) {
    this.outbox.push({ accountId, kind, summary });
  }
  sent() { return this.outbox.map(clone); }
}
