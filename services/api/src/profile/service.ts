import { newId, assertOwns, assertStepUp, type Principal } from "@medikey/core";
import type { AppContext } from "../app/context";
import { NotFoundError, ValidationError } from "../app/errors";
import type { SubjectProfile, SubjectRelationship } from "../domain/model";

/** Extended, non-clinical personal details (identity, not medical). */
export interface PersonalExtras {
  gender?: string;
  phone?: string;
  address?: string;
  photo?: string; // small avatar as a data URL
}

export interface CreateSubjectInput {
  fullName: string;
  dateOfBirth?: string; // ISO date; age is derived, DOB stays L2
  preferredLanguage?: string;
  relationship?: SubjectRelationship;
  extras?: PersonalExtras;
}

function ageFromDob(dob: string, now: Date): number | undefined {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : undefined;
}

/** Owner-facing profile view (never exposes ciphertext). */
export interface SubjectView {
  id: string;
  relationship: SubjectRelationship;
  fullName: string;
  dateOfBirth?: string;
  ageYears?: number;
  preferredLanguage?: string;
  emergencyInstructions?: string;
  extras?: PersonalExtras;
  lastConfirmedAt?: string;
}

export class ProfileService {
  constructor(private readonly ctx: AppContext) {}

  private async loadOwned(principal: Principal, subjectId: string): Promise<SubjectProfile> {
    const s = await this.ctx.repo.getSubject(subjectId);
    // 404 (not 403) when not owned/absent — avoids existence oracle (matrix #1).
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    return s;
  }

  async createSubject(principal: Principal, input: CreateSubjectInput): Promise<{ subjectId: string }> {
    if (!input.fullName?.trim()) throw new ValidationError("fullName required");
    const id = newId();
    const now = new Date(this.ctx.now());
    const subject: SubjectProfile = {
      id,
      accountId: principal.accountId,
      relationship: input.relationship ?? "self",
      fullNameEnc: await this.ctx.envelope.encryptField(id, input.fullName.trim()),
      dobEnc: input.dateOfBirth
        ? await this.ctx.envelope.encryptField(id, input.dateOfBirth)
        : undefined,
      ageYears: input.dateOfBirth ? ageFromDob(input.dateOfBirth, now) : undefined,
      preferredLanguage: input.preferredLanguage,
      extrasEnc: input.extras
        ? await this.ctx.envelope.encryptField(id, JSON.stringify(input.extras))
        : undefined,
      lastConfirmedAt: this.ctx.now(),
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.createSubject(subject);
    await this.ctx.audit.append({
      id: newId(), type: "subject_created", accountId: principal.accountId, subjectId: id,
      detail: { relationship: subject.relationship }, severity: "info", createdAt: this.ctx.now(),
    });
    return { subjectId: id };
  }

  async listSubjects(principal: Principal): Promise<SubjectView[]> {
    const subs = await this.ctx.repo.listSubjectsByAccount(principal.accountId);
    return Promise.all(subs.map((s) => this.toView(s)));
  }

  async getSubject(principal: Principal, subjectId: string): Promise<SubjectView> {
    return this.toView(await this.loadOwned(principal, subjectId));
  }

  /** Identity changes require step-up (sensitive). */
  async updateIdentity(
    principal: Principal,
    subjectId: string,
    patch: {
      fullName?: string;
      dateOfBirth?: string;
      emergencyInstructions?: string;
      extras?: PersonalExtras;
      confirm?: boolean;
    },
  ): Promise<void> {
    assertStepUp(principal);
    const s = await this.loadOwned(principal, subjectId);
    if (patch.fullName?.trim()) {
      s.fullNameEnc = await this.ctx.envelope.encryptField(s.id, patch.fullName.trim());
    }
    if (patch.dateOfBirth !== undefined) {
      s.dobEnc = patch.dateOfBirth
        ? await this.ctx.envelope.encryptField(s.id, patch.dateOfBirth)
        : undefined;
      s.ageYears = patch.dateOfBirth ? ageFromDob(patch.dateOfBirth, new Date(this.ctx.now())) : undefined;
    }
    if (patch.emergencyInstructions !== undefined) {
      s.emergencyInstructionsEnc = await this.ctx.envelope.encryptField(
        s.id,
        patch.emergencyInstructions,
      );
    }
    if (patch.extras !== undefined) {
      // merge with existing extras so partial updates don't drop fields
      const current = s.extrasEnc ? JSON.parse(await this.ctx.envelope.decryptField(s.id, s.extrasEnc)) : {};
      const merged = { ...current, ...patch.extras };
      s.extrasEnc = await this.ctx.envelope.encryptField(s.id, JSON.stringify(merged));
    }
    if (patch.confirm) s.lastConfirmedAt = this.ctx.now();
    await this.ctx.repo.updateSubject(s);
    await this.ctx.audit.append({
      id: newId(), type: "subject_updated", accountId: principal.accountId, subjectId,
      detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
  }

  private async toView(s: SubjectProfile): Promise<SubjectView> {
    return {
      id: s.id,
      relationship: s.relationship,
      fullName: await this.ctx.envelope.decryptField(s.id, s.fullNameEnc),
      dateOfBirth: s.dobEnc ? await this.ctx.envelope.decryptField(s.id, s.dobEnc) : undefined,
      ageYears: s.ageYears,
      preferredLanguage: s.preferredLanguage,
      emergencyInstructions: s.emergencyInstructionsEnc
        ? await this.ctx.envelope.decryptField(s.id, s.emergencyInstructionsEnc)
        : undefined,
      extras: s.extrasEnc
        ? (JSON.parse(await this.ctx.envelope.decryptField(s.id, s.extrasEnc)) as PersonalExtras)
        : undefined,
      lastConfirmedAt: s.lastConfirmedAt,
    };
  }
}
