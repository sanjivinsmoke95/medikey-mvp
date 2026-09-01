import { newId, randomToken, hmacHex } from "@medikey/core";
import type { AppContext } from "../app/context";
import type { QrService } from "../qr/service";
import type { DisclosureService } from "../disclosure/service";
import { renderEmergencyPage } from "../emergency/render";
import type { AccessToken } from "../domain/model";

/**
 * Break-glass (doc 07 / trust model §15.4). Works when the patient/owner is
 * unreachable. Guarantees: L2-ONLY token, single-use, short-TTL, non-renewable;
 * every use logged + owner notified (no medical content) + rate-limited +
 * auto-suspend on abuse. L2 can NEVER reach L3 (three enforcement layers:
 * token level, projection filter, and there is no l3 mint path).
 */
const BG_ABUSE_LIMIT = 5;
const BG_ABUSE_WINDOW = 3600;

export interface BreakGlassRequestResult {
  granted: boolean;
  /** L2 access token — single-use, returned once. Absent if denied/suspended. */
  token?: string;
  reason?: string;
}

export interface L2ViewResult {
  ok: boolean;
  html: string;
}

export class BreakGlassService {
  constructor(
    private readonly ctx: AppContext,
    private readonly qr: QrService,
    private readonly disclosure: DisclosureService,
  ) {}

  private tokenHash(t: string): string {
    return hmacHex(this.ctx.pepper, t);
  }

  async request(opaqueId: string, attestation?: string): Promise<BreakGlassRequestResult> {
    const resolved = await this.qr.resolve(opaqueId);
    if (resolved.status !== "active") return { granted: false, reason: "unavailable" };

    // Abuse detection → auto-suspend the identifier (frozen §15.4).
    const withinLimit = await this.ctx.rateLimiter.allow(`bg:${resolved.qrId}`, BG_ABUSE_LIMIT, BG_ABUSE_WINDOW);
    if (!withinLimit) {
      const q = await this.ctx.repo.getQrById(resolved.qrId);
      if (q) {
        q.status = "compromised";
        q.revokedAt = this.ctx.now();
        await this.ctx.repo.updateQr(q);
        await this.ctx.cache.del(`view:${resolved.subjectId}`);
      }
      const subj = await this.ctx.repo.getSubject(resolved.subjectId);
      if (subj) {
        await this.ctx.notifier.notifyOwner(subj.accountId, "break_glass_suspended",
          "Repeated additional-info requests on your MediKey — the code was auto-suspended.");
      }
      await this.logBreakGlass(resolved.subjectId, "denied");
      return { granted: false, reason: "suspended" };
    }

    const token = randomToken(32);
    const subject = await this.ctx.repo.getSubject(resolved.subjectId);
    const rec: AccessToken = {
      id: newId(),
      subjectId: resolved.subjectId,
      tokenHash: this.tokenHash(token),
      grantType: "break_glass",
      disclosureLevel: "l2", // L2 ONLY — there is no l3 mint path
      attestationEnc: attestation
        ? await this.ctx.envelope.encryptField(resolved.subjectId, attestation)
        : undefined,
      expiresAt: new Date(Date.now() + this.ctx.env.L2_TOKEN_TTL_SECONDS * 1000).toISOString(),
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.createToken(rec);

    // Audit + owner notification (NO medical content).
    await this.ctx.audit.append({
      id: newId(), type: "break_glass", subjectId: resolved.subjectId,
      detail: { qrId: resolved.qrId, hasAttestation: Boolean(attestation) }, severity: "warn", createdAt: this.ctx.now(),
    });
    if (subject) {
      await this.ctx.notifier.notifyOwner(subject.accountId, "break_glass",
        "Someone requested additional medical information from your MediKey.");
    }
    await this.logBreakGlass(resolved.subjectId, "shown");
    return { granted: true, token };
  }

  async viewL2(opaqueId: string, token: string, lang = "en"): Promise<L2ViewResult> {
    const resolved = await this.qr.resolve(opaqueId);
    if (resolved.status !== "active") {
      return { ok: false, html: renderEmergencyPage({ state: resolved.status === "revoked" ? "revoked" : "not_found", lang }) };
    }
    const rec = await this.ctx.repo.getTokenByHash(this.tokenHash(token));
    const now = Date.now();
    const valid =
      rec &&
      rec.subjectId === resolved.subjectId &&
      rec.disclosureLevel === "l2" &&
      !rec.usedAt &&
      Date.parse(rec.expiresAt) > now;
    if (!valid || !rec) {
      return { ok: false, html: renderEmergencyPage({ state: "not_found", lang }) };
    }
    // single-use
    rec.usedAt = this.ctx.now();
    await this.ctx.repo.updateToken(rec);

    // L2 projection via the SAME engine — never L3.
    const l2 = await this.disclosure.projectFor(resolved.subjectId, "l2");
    await this.logBreakGlassLevel(resolved.subjectId, "l2");
    return { ok: true, html: renderEmergencyPage({ state: "ok", projection: l2, lang }) };
  }

  private async logBreakGlass(subjectId: string, status: "shown" | "denied") {
    await this.ctx.repo.addLog({
      id: newId(), subjectId, accessType: "break_glass", level: "l2", status, createdAt: this.ctx.now(),
    });
  }
  private async logBreakGlassLevel(subjectId: string, _level: "l2") {
    await this.ctx.repo.addLog({
      id: newId(), subjectId, accessType: "break_glass", level: "l2", status: "shown", createdAt: this.ctx.now(),
    });
  }
}
