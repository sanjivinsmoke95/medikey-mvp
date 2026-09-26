import { newId, type Principal } from "@medikey/core";
import type { AppContext } from "../app/context";
import { AuthError, NotFoundError, ValidationError } from "../app/errors";
import type { ConsentGrant, ConsentStatus, MedicalItemType } from "../domain/model";
import type { MedicalService, MedicalItemView } from "../medical/service";

export interface RequestConsentInput {
  subjectId: string;
  categories: MedicalItemType[];
  purpose: string;
  durationSeconds?: number;
}

export interface ConsentGrantView {
  id: string;
  subjectId: string;
  providerAccountId: string;
  providerName: string;
  providerOrg?: string;
  requestedCategories: MedicalItemType[];
  approvedCategories?: MedicalItemType[];
  purpose: string;
  status: ConsentStatus;
  durationSeconds: number;
  grantedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

const DEFAULT_DURATION = 1800; // 30 minutes
const MAX_DURATION = 86400; // 24 hours

export class ConsentService {
  constructor(
    private readonly ctx: AppContext,
    private readonly medical: MedicalService,
  ) {}

  async requestConsent(
    providerPrincipal: Principal,
    input: RequestConsentInput,
  ): Promise<ConsentGrantView> {
    const acc = await this.ctx.repo.getAccountById(providerPrincipal.accountId);
    if (!acc || acc.role !== "provider") throw new AuthError("provider account required");

    const subject = await this.ctx.repo.getSubject(input.subjectId);
    if (!subject) throw new NotFoundError();

    if (!input.categories.length) throw new ValidationError("at least one category required");
    if (!input.purpose?.trim()) throw new ValidationError("purpose required");

    const duration = Math.min(input.durationSeconds ?? DEFAULT_DURATION, MAX_DURATION);

    const grant: ConsentGrant = {
      id: newId(),
      subjectId: input.subjectId,
      patientAccountId: subject.accountId,
      providerAccountId: providerPrincipal.accountId,
      providerName: acc.providerName ?? acc.email,
      providerOrg: acc.providerOrg,
      requestedCategories: input.categories,
      purpose: input.purpose.trim(),
      status: "pending",
      durationSeconds: duration,
      createdAt: this.ctx.now(),
    };

    await this.ctx.repo.createConsentGrant(grant);

    await this.ctx.notifier.notifyOwner(
      subject.accountId,
      "consent_request",
      `${grant.providerName} is requesting access to your medical information.`,
    );

    await this.ctx.audit.append({
      id: newId(),
      type: "consent_requested",
      accountId: providerPrincipal.accountId,
      subjectId: input.subjectId,
      detail: { categories: input.categories, purpose: input.purpose },
      severity: "info",
      createdAt: this.ctx.now(),
    });

    return this.toView(grant);
  }

  async grantConsent(
    patientPrincipal: Principal,
    grantId: string,
    approvedCategories?: MedicalItemType[],
  ): Promise<ConsentGrantView> {
    const grant = await this.ctx.repo.getConsentGrant(grantId);
    if (!grant) throw new NotFoundError();
    if (grant.patientAccountId !== patientPrincipal.accountId) throw new NotFoundError();
    if (grant.status !== "pending") throw new ValidationError("consent is not pending");

    const now = this.ctx.now();
    grant.status = "granted";
    grant.approvedCategories = approvedCategories ?? grant.requestedCategories;
    grant.grantedAt = now;
    grant.expiresAt = new Date(Date.parse(now) + grant.durationSeconds * 1000).toISOString();

    await this.ctx.repo.updateConsentGrant(grant);

    await this.ctx.repo.addLog({
      id: newId(),
      subjectId: grant.subjectId,
      accessType: "provider_consent",
      level: "l2",
      status: "shown",
      providerName: grant.providerName,
      createdAt: now,
    });

    await this.ctx.audit.append({
      id: newId(),
      type: "consent_granted",
      accountId: patientPrincipal.accountId,
      subjectId: grant.subjectId,
      detail: { grantId, approvedCategories: grant.approvedCategories },
      severity: "info",
      createdAt: now,
    });

    return this.toView(grant);
  }

  async declineConsent(
    patientPrincipal: Principal,
    grantId: string,
  ): Promise<ConsentGrantView> {
    const grant = await this.ctx.repo.getConsentGrant(grantId);
    if (!grant) throw new NotFoundError();
    if (grant.patientAccountId !== patientPrincipal.accountId) throw new NotFoundError();
    if (grant.status !== "pending") throw new ValidationError("consent is not pending");

    grant.status = "declined";
    grant.declinedAt = this.ctx.now();
    await this.ctx.repo.updateConsentGrant(grant);

    await this.ctx.audit.append({
      id: newId(),
      type: "consent_declined",
      accountId: patientPrincipal.accountId,
      subjectId: grant.subjectId,
      detail: { grantId },
      severity: "info",
      createdAt: this.ctx.now(),
    });

    return this.toView(grant);
  }

  async revokeConsent(
    patientPrincipal: Principal,
    grantId: string,
  ): Promise<ConsentGrantView> {
    const grant = await this.ctx.repo.getConsentGrant(grantId);
    if (!grant) throw new NotFoundError();
    if (grant.patientAccountId !== patientPrincipal.accountId) throw new NotFoundError();
    if (grant.status !== "granted") throw new ValidationError("consent is not active");

    grant.status = "revoked";
    grant.revokedAt = this.ctx.now();
    await this.ctx.repo.updateConsentGrant(grant);

    await this.ctx.repo.addLog({
      id: newId(),
      subjectId: grant.subjectId,
      accessType: "provider_consent",
      level: "l2",
      status: "revoked",
      providerName: grant.providerName,
      createdAt: this.ctx.now(),
    });

    await this.ctx.audit.append({
      id: newId(),
      type: "consent_revoked",
      accountId: patientPrincipal.accountId,
      subjectId: grant.subjectId,
      detail: { grantId },
      severity: "warn",
      createdAt: this.ctx.now(),
    });

    return this.toView(grant);
  }

  async listPatientGrants(
    patientPrincipal: Principal,
    subjectId: string,
  ): Promise<ConsentGrantView[]> {
    const subject = await this.ctx.repo.getSubject(subjectId);
    if (!subject || subject.accountId !== patientPrincipal.accountId) throw new NotFoundError();
    const grants = await this.ctx.repo.listConsentGrantsBySubject(subjectId);
    return grants.map((g) => this.expireIfNeeded(g)).map((g) => this.toView(g));
  }

  async listProviderGrants(
    providerPrincipal: Principal,
  ): Promise<ConsentGrantView[]> {
    const grants = await this.ctx.repo.listConsentGrantsByProvider(providerPrincipal.accountId);
    return grants.map((g) => this.expireIfNeeded(g)).map((g) => this.toView(g));
  }

  /**
   * Provider reads patient data under an active consent grant.
   * Returns ONLY the approved categories. Enforced server-side.
   */
  async readConsentedData(
    providerPrincipal: Principal,
    grantId: string,
  ): Promise<{ grant: ConsentGrantView; items: MedicalItemView[] }> {
    const grant = await this.ctx.repo.getConsentGrant(grantId);
    if (!grant) throw new NotFoundError();

    this.expireIfNeeded(grant);
    if (grant.providerAccountId !== providerPrincipal.accountId) throw new NotFoundError();
    if (grant.status !== "granted") throw new AuthError("consent not active");

    if (grant.expiresAt && Date.parse(grant.expiresAt) < Date.now()) {
      grant.status = "expired";
      await this.ctx.repo.updateConsentGrant(grant);
      throw new AuthError("consent expired");
    }

    const approvedTypes = new Set(grant.approvedCategories ?? []);
    const items = await this.medical.listItemsBySubjectAndTypes(grant.subjectId, approvedTypes);

    await this.ctx.audit.append({
      id: newId(),
      type: "consent_data_read",
      accountId: providerPrincipal.accountId,
      subjectId: grant.subjectId,
      detail: { grantId, categories: [...approvedTypes] },
      severity: "info",
      createdAt: this.ctx.now(),
    });

    return { grant: this.toView(grant), items };
  }

  /** Resolve a subject from an opaque QR id (for provider scan). */
  async resolveSubjectForProvider(opaqueId: string): Promise<{ subjectId: string; patientName: string } | undefined> {
    const qrHash = (await import("@medikey/core")).hmacHex(this.ctx.pepper, opaqueId);
    const qr = await this.ctx.repo.getQrByHash(qrHash);
    if (!qr || qr.status !== "active") return undefined;

    const subject = await this.ctx.repo.getSubject(qr.subjectId);
    if (!subject) return undefined;

    const name = await this.ctx.envelope.decryptField(subject.id, subject.fullNameEnc);
    return { subjectId: qr.subjectId, patientName: name };
  }

  private expireIfNeeded(grant: ConsentGrant): ConsentGrant {
    if (grant.status === "granted" && grant.expiresAt && Date.parse(grant.expiresAt) < Date.now()) {
      grant.status = "expired";
      this.ctx.repo.updateConsentGrant(grant).catch(() => {});
    }
    return grant;
  }

  private toView(g: ConsentGrant): ConsentGrantView {
    return {
      id: g.id,
      subjectId: g.subjectId,
      providerAccountId: g.providerAccountId,
      providerName: g.providerName,
      providerOrg: g.providerOrg,
      requestedCategories: g.requestedCategories,
      approvedCategories: g.approvedCategories,
      purpose: g.purpose,
      status: g.status,
      durationSeconds: g.durationSeconds,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      revokedAt: g.revokedAt,
      createdAt: g.createdAt,
    };
  }
}
