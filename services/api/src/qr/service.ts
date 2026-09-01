import {
  newId,
  assertOwns,
  assertStepUp,
  randomIdentifier,
  hmacHex,
  type Principal,
} from "@medikey/core";
import type { AppContext } from "../app/context";
import { NotFoundError } from "../app/errors";
import type { QrIdentifier, SubjectProfile } from "../domain/model";

export interface CreatedQr {
  qrId: string;
  /** Opaque identifier — returned ONCE for the printable asset; never stored/logged. */
  opaqueId: string;
  url: string;
}

export type ResolveResult =
  | { status: "active"; subjectId: string; qrId: string }
  | { status: "revoked" }
  | { status: "not_found" };

const BASE_URL = "https://mk.link/e";

export class QrService {
  constructor(private readonly ctx: AppContext) {}

  private hash(opaqueId: string): string {
    return hmacHex(this.ctx.pepper, opaqueId);
  }

  private async loadOwnedSubject(principal: Principal, subjectId: string): Promise<SubjectProfile> {
    const s = await this.ctx.repo.getSubject(subjectId);
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    return s;
  }

  private async loadOwnedQr(principal: Principal, qrId: string): Promise<QrIdentifier> {
    const q = await this.ctx.repo.getQrById(qrId);
    if (!q) throw new NotFoundError();
    await this.loadOwnedSubject(principal, q.subjectId);
    return q;
  }

  async createQr(principal: Principal, subjectId: string, label: string): Promise<CreatedQr> {
    assertStepUp(principal);
    await this.loadOwnedSubject(principal, subjectId);
    const opaqueId = randomIdentifier(); // 128-bit CSPRNG
    const qr: QrIdentifier = {
      id: newId(),
      subjectId,
      identifierHash: this.hash(opaqueId), // store hash only
      label,
      status: "active",
      activationState: "active",
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.createQr(qr);
    await this.ctx.audit.append({
      id: newId(), type: "qr_created", accountId: principal.accountId, subjectId,
      detail: { label }, severity: "info", createdAt: this.ctx.now(),
    });
    return { qrId: qr.id, opaqueId, url: `${BASE_URL}/${opaqueId}` };
  }

  async listQr(principal: Principal, subjectId: string) {
    await this.loadOwnedSubject(principal, subjectId);
    const qrs = await this.ctx.repo.listQrBySubject(subjectId);
    return qrs.map((q) => ({ qrId: q.id, label: q.label, status: q.status, createdAt: q.createdAt }));
  }

  async revokeQr(principal: Principal, qrId: string, compromised = false): Promise<void> {
    assertStepUp(principal);
    const q = await this.loadOwnedQr(principal, qrId);
    q.status = compromised ? "compromised" : "revoked";
    q.revokedAt = this.ctx.now();
    await this.ctx.repo.updateQr(q);
    // Active edge-cache purge (revocation SLO ≤60s target / ≤300s max).
    await this.ctx.cache.del(`view:${q.subjectId}`);
    await this.ctx.audit.append({
      id: newId(), type: "qr_revoked", accountId: principal.accountId, subjectId: q.subjectId,
      detail: { qrId, compromised }, severity: "warn", createdAt: this.ctx.now(),
    });
  }

  /** New identifier for a replacement object; old one revoked. Profile untouched. */
  async regenerateQr(principal: Principal, qrId: string): Promise<CreatedQr> {
    assertStepUp(principal);
    const old = await this.loadOwnedQr(principal, qrId);
    const created = await this.createQr(principal, old.subjectId, old.label);
    old.status = "revoked";
    old.revokedAt = this.ctx.now();
    old.replacedBy = created.qrId;
    await this.ctx.repo.updateQr(old);
    await this.ctx.cache.del(`view:${old.subjectId}`);
    return created;
  }

  /** Resolve an opaque id (scanner path). Constant-time via hashed point lookup. */
  async resolve(opaqueId: string): Promise<ResolveResult> {
    const q = await this.ctx.repo.getQrByHash(this.hash(opaqueId));
    if (!q) return { status: "not_found" };
    if (q.status !== "active") return { status: "revoked" };
    return { status: "active", subjectId: q.subjectId, qrId: q.id };
  }
}
