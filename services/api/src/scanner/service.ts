import { newId } from "@medikey/core";
import type { AppContext } from "../app/context";
import type { QrService } from "../qr/service";
import type { DisclosureService } from "../disclosure/service";
import { renderEmergencyPage, type PageState } from "../emergency/render";
import type { AccessLog, AccessStatus } from "../domain/model";

export interface ScanMeta {
  ipCoarse?: string; // coarse network region; NEVER a precise IP/GPS
  uaFamily?: string;
  city?: string; // used ONLY if the owner opted in (G6)
  lang?: string;
}

export interface ScanResult {
  state: PageState;
  html: string;
}

// Indicative limits (Redis in prod). L1 stays reachable for a real bystander.
const PER_IP_LIMIT = 60;
const PER_ID_LIMIT = 30;
const WINDOW = 60;
const STALE_DAYS = 365;

export class ScannerService {
  constructor(
    private readonly ctx: AppContext,
    private readonly qr: QrService,
    private readonly disclosure: DisclosureService,
  ) {}

  private async log(
    subjectId: string | undefined,
    qrId: string | undefined,
    status: AccessStatus,
    city: string | undefined,
  ): Promise<void> {
    const entry: AccessLog = {
      id: newId(),
      subjectId,
      qrIdentifierId: qrId,
      accessType: "anonymous", // we NEVER claim a scanner's identity
      level: "l1",
      status,
      city, // already gated on opt-in by the caller
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.addLog(entry);
  }

  async scan(opaqueId: string, meta: ScanMeta = {}): Promise<ScanResult> {
    const lang = meta.lang ?? "en";

    // Layered rate limiting (per-IP + per-identifier). Fail-safe.
    const ipKey = `scan:ip:${meta.ipCoarse ?? "unknown"}`;
    const idKey = `scan:id:${opaqueId}`;
    const ipOk = await this.ctx.rateLimiter.allow(ipKey, PER_IP_LIMIT, WINDOW);
    const idOk = await this.ctx.rateLimiter.allow(idKey, PER_ID_LIMIT, WINDOW);
    if (!ipOk || !idOk) {
      await this.log(undefined, undefined, "rate_limited", undefined);
      return { state: "rate_limited", html: renderEmergencyPage({ state: "rate_limited", lang }) };
    }

    const resolved = await this.qr.resolve(opaqueId);
    if (resolved.status !== "active") {
      // Uniform neutral page for revoked AND not_found (no oracle).
      const state: PageState = resolved.status === "revoked" ? "revoked" : "not_found";
      await this.log(undefined, undefined, resolved.status === "revoked" ? "revoked" : "not_found", undefined);
      return { state, html: renderEmergencyPage({ state, lang }) };
    }

    const subject = await this.ctx.repo.getSubject(resolved.subjectId);
    const account = subject ? await this.ctx.repo.getAccountById(subject.accountId) : undefined;
    // Location logged ONLY if the owner opted in (default OFF, G6).
    const city = account?.locationLoggingOptIn ? meta.city : undefined;

    const l1 = await this.disclosure.getCachedL1(resolved.subjectId);
    if (!l1 || l1.fields.length === 0) {
      await this.log(resolved.subjectId, resolved.qrId, "shown", city);
      return { state: "incomplete", html: renderEmergencyPage({ state: "incomplete", lang }) };
    }

    const lastConfirmed = subject?.lastConfirmedAt ? fmtDate(subject.lastConfirmedAt) : undefined;
    const stale = subject?.lastConfirmedAt
      ? Date.now() - Date.parse(subject.lastConfirmedAt) > STALE_DAYS * 86400_000
      : false;

    await this.log(resolved.subjectId, resolved.qrId, "shown", city);
    return {
      state: "ok",
      html: renderEmergencyPage({ state: "ok", projection: l1, lang, stale, lastConfirmed }),
    };
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
