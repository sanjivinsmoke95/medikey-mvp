import { newId, assertOwns, assertStepUp, type Principal } from "@medikey/core";
import type { AppContext } from "../app/context";
import { NotFoundError } from "../app/errors";
import type { AccessLog } from "../domain/model";

export interface AccessHistoryRow {
  accessType: AccessLog["accessType"];
  level: AccessLog["level"];
  status: AccessLog["status"];
  city?: string;
  createdAt: string;
}

export class RightsService {
  constructor(private readonly ctx: AppContext) {}

  /** Owner-facing access history (coarse; no medical content, anonymous stays anonymous). */
  async accessHistory(principal: Principal, subjectId: string): Promise<AccessHistoryRow[]> {
    const s = await this.ctx.repo.getSubject(subjectId);
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    return (await this.ctx.repo.listLogsBySubject(subjectId)).map((l) => ({
      accessType: l.accessType,
      level: l.level,
      status: l.status,
      city: l.city,
      createdAt: l.createdAt,
    }));
  }

  /** Data export — OWN data only, step-up required. No bulk/admin path exists. */
  async exportAccount(principal: Principal): Promise<Record<string, unknown>> {
    assertStepUp(principal);
    const subjects = await this.ctx.repo.listSubjectsByAccount(principal.accountId);
    const out: Record<string, unknown> = { exportedAt: this.ctx.now(), subjects: [] };
    for (const s of subjects) {
      const items = await this.ctx.repo.listItemsBySubject(s.id);
      (out.subjects as unknown[]).push({
        id: s.id,
        relationship: s.relationship,
        fullName: await this.ctx.envelope.decryptField(s.id, s.fullNameEnc),
        items: await Promise.all(
          items.map(async (i) => ({
            type: i.type,
            provenance: i.provenance,
            data: JSON.parse(await this.ctx.envelope.decryptField(i.subjectId, i.dataEnc)),
          })),
        ),
      });
    }
    await this.ctx.audit.append({
      id: newId(), type: "data_export", accountId: principal.accountId, detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
    return out;
  }

  /** Delete one subject: purge + crypto-shred + revoke all its QRs/tokens. */
  async deleteSubject(principal: Principal, subjectId: string): Promise<void> {
    assertStepUp(principal);
    const s = await this.ctx.repo.getSubject(subjectId);
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    await this.purgeSubject(subjectId);
    await this.ctx.audit.append({
      id: newId(), type: "subject_deleted", accountId: principal.accountId, subjectId, detail: {}, severity: "warn", createdAt: this.ctx.now(),
    });
  }

  /** Full account deletion: purge every subject, crypto-shred, revoke sessions. */
  async deleteAccount(principal: Principal): Promise<void> {
    assertStepUp(principal);
    const subjects = await this.ctx.repo.listSubjectsByAccount(principal.accountId);
    for (const s of subjects) await this.purgeSubject(s.id);

    const acc = await this.ctx.repo.getAccountById(principal.accountId);
    if (acc) {
      acc.status = "deleted";
      acc.deletedAt = this.ctx.now();
      acc.email = `deleted+${acc.id}@invalid`; // remove PII, keep uniqueness
      acc.phoneEnc = undefined;
      await this.ctx.repo.updateAccount(acc);
    }
    await this.ctx.repo.revokeAllSessionsForAccount(principal.accountId);
    await this.ctx.audit.append({
      id: newId(), type: "account_deleted", accountId: principal.accountId, detail: {}, severity: "warn", createdAt: this.ctx.now(),
    });
  }

  private async purgeSubject(subjectId: string): Promise<void> {
    // order per deletion-restore-spec.md
    await this.ctx.repo.deleteItemsBySubject(subjectId);
    await this.ctx.repo.deleteSelectionsBySubject(subjectId);
    await this.ctx.repo.deleteView(subjectId);
    await this.ctx.repo.deleteQrBySubject(subjectId);
    await this.ctx.repo.deleteTokensBySubject(subjectId);
    await this.ctx.repo.deleteLogsBySubject(subjectId);
    await this.ctx.cache.del(`view:${subjectId}`);
    // Crypto-shred: destroying the subject key makes ciphertext (incl. backups) inert.
    await this.ctx.keys.destroySubjectKey(subjectId);
    await this.ctx.repo.deleteSubject(subjectId);
  }
}
