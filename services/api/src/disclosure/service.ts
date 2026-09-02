import {
  newId,
  assertOwns,
  assertStepUp,
  AuthzError,
  project,
  TIER_RANK,
  type Principal,
  type DisclosureField,
  type DisclosureLevel,
  type DisclosureTier,
  type EmergencySection,
  type ProjectionResult,
} from "@medikey/core";
import type { AppContext } from "../app/context";
import { NotFoundError, ValidationError } from "../app/errors";
import type { MedicalItem, MedicalItemType, SubjectProfile } from "../domain/model";

export interface SelectionEntry {
  fieldRef: string;
  tier: DisclosureTier;
}

const SECTION_BY_TYPE: Record<MedicalItemType, EmergencySection> = {
  blood_group: "blood_group",
  allergy: "allergy",
  condition: "condition",
  medication: "medication",
  medication_avoidance: "medication_avoidance",
  implant: "implant",
  surgery: "surgery",
  injury: "injury",
  emergency_contact: "contact",
  document: "document", // L3-class (never scanner-reachable)
};

const LABEL: Record<EmergencySection, string> = {
  name: "Name",
  age: "Age",
  dob: "Date of birth",
  blood_group: "Blood group",
  allergy: "Allergy",
  condition: "Condition",
  medication: "Medication",
  medication_avoidance: "Do NOT administer",
  implant: "Implant / device",
  surgery: "Surgery",
  injury: "Injury",
  contact: "Emergency contact",
  instruction: "Emergency instructions",
  document: "Document",
  insurance: "Insurance",
  address: "Address",
};

/**
 * Minimum privacy rank a section may occupy. Lower rank = MORE exposed (l1).
 * Enforces the ceiling: DOB cannot be placed at l1 (must be l2+); document/
 * insurance/address are l3-only (never scanner-reachable). Prevents lifting an
 * l3-class field into L1/L2 (API T032 / matrix #2/#15).
 */
const MIN_TIER_RANK: Partial<Record<EmergencySection, number>> = {
  dob: 2, // l2 minimum
  document: 3,
  insurance: 3,
  address: 3,
};

export class DisclosureService {
  constructor(private readonly ctx: AppContext) {}

  private async loadOwnedSubject(principal: Principal, subjectId: string): Promise<SubjectProfile> {
    const s = await this.ctx.repo.getSubject(subjectId);
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    return s;
  }

  /** Set the disclosure allow-list. Step-up required; ceilings enforced. */
  async setSelections(principal: Principal, subjectId: string, entries: SelectionEntry[]): Promise<void> {
    assertStepUp(principal);
    await this.loadOwnedSubject(principal, subjectId);
    const items = await this.ctx.repo.listItemsBySubject(subjectId);
    const itemById = new Map(items.map((i) => [i.id, i]));

    for (const e of entries) {
      const section = await this.sectionForRef(e.fieldRef, itemById);
      if (!section) throw new ValidationError(`unknown field ref: ${e.fieldRef}`);
      const minRank = MIN_TIER_RANK[section] ?? 1;
      if (TIER_RANK[e.tier] < minRank) {
        throw new AuthzError(`field '${section}' cannot be exposed at ${e.tier}`);
      }
    }

    await this.ctx.repo.setSelections(
      subjectId,
      entries.map((e) => ({ id: newId(), subjectId, fieldRef: e.fieldRef, tier: e.tier })),
    );
    await this.buildAndCacheView(subjectId);
    await this.ctx.audit.append({
      id: newId(), type: "selections_updated", accountId: principal.accountId, subjectId,
      detail: { count: entries.length }, severity: "info", createdAt: this.ctx.now(),
    });
  }

  private async sectionForRef(
    fieldRef: string,
    itemById: Map<string, MedicalItem>,
  ): Promise<EmergencySection | undefined> {
    if (fieldRef === "name") return "name";
    if (fieldRef === "age") return "age";
    if (fieldRef === "dob") return "dob";
    if (fieldRef === "instructions") return "instruction";
    if (fieldRef.startsWith("item:")) {
      const item = itemById.get(fieldRef.slice(5));
      return item ? SECTION_BY_TYPE[item.type] : undefined;
    }
    return undefined;
  }

  /**
   * Assemble ALL selected fields (decrypted) with their chosen tier. This is the
   * ONLY place medical fields are gathered for disclosure; both preview and
   * break-glass call project() over this output.
   */
  private async assembleFields(subjectId: string): Promise<DisclosureField[]> {
    const subject = await this.ctx.repo.getSubject(subjectId);
    if (!subject) return [];
    const selections = await this.ctx.repo.listSelectionsBySubject(subjectId);
    const items = await this.ctx.repo.listItemsBySubject(subjectId);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const fields: DisclosureField[] = [];

    for (const sel of selections) {
      const f = await this.resolveField(subject, sel.fieldRef, sel.tier, itemById);
      if (f) fields.push(f);
    }
    return fields;
  }

  private async resolveField(
    subject: SubjectProfile,
    fieldRef: string,
    tier: DisclosureTier,
    itemById: Map<string, MedicalItem>,
  ): Promise<DisclosureField | undefined> {
    const dec = (enc: NonNullable<SubjectProfile["dobEnc"]>) =>
      this.ctx.envelope.decryptField(subject.id, enc);

    if (fieldRef === "name") {
      return this.field(fieldRef, tier, "name", await dec(subject.fullNameEnc), "user_provided");
    }
    if (fieldRef === "age") {
      if (subject.ageYears === undefined) return undefined;
      return this.field(fieldRef, tier, "age", String(subject.ageYears), "user_provided");
    }
    if (fieldRef === "dob") {
      if (!subject.dobEnc) return undefined;
      return this.field(fieldRef, tier, "dob", await dec(subject.dobEnc), "user_provided");
    }
    if (fieldRef === "instructions") {
      if (!subject.emergencyInstructionsEnc) return undefined;
      return this.field(fieldRef, tier, "instruction", await dec(subject.emergencyInstructionsEnc), "user_provided");
    }
    if (fieldRef.startsWith("item:")) {
      const item = itemById.get(fieldRef.slice(5));
      if (!item) return undefined;
      const data = JSON.parse(await this.ctx.envelope.decryptField(subject.id, item.dataEnc));
      const section = SECTION_BY_TYPE[item.type];
      const value = this.displayValue(item.type, data, item.noneKnown ?? false);
      return {
        fieldRef,
        tier,
        section,
        label: LABEL[section],
        value,
        provenance: item.provenance,
        critical: item.isCritical,
        severity: item.severity,
        tel: item.type === "emergency_contact" ? String(data.phone ?? "") || undefined : undefined,
        noneKnown: item.noneKnown ?? false,
      };
    }
    return undefined;
  }

  private field(
    fieldRef: string,
    tier: DisclosureTier,
    section: EmergencySection,
    value: string,
    provenance: DisclosureField["provenance"],
  ): DisclosureField {
    return { fieldRef, tier, section, label: LABEL[section], value, provenance };
  }

  private displayValue(type: MedicalItemType, data: Record<string, unknown>, noneKnown: boolean): string {
    if (noneKnown) return `No known ${type.replace("_", " ")}`;
    const name = (data.name as string) ?? "";
    switch (type) {
      case "blood_group":
        return String(data.group ?? data.name ?? "");
      case "emergency_contact":
        return data.relationship ? `${name} — ${data.relationship as string}` : name;
      case "medication":
        return data.dose ? `${name} (${data.dose as string})` : name;
      case "allergy":
        return data.reaction ? `${name} — ${data.reaction as string}` : name;
      case "document":
        return String(data.title ?? data.name ?? "Document");
      default:
        return name;
    }
  }

  /** Build and cache the L1-only view (rebuild hook target). */
  async buildAndCacheView(subjectId: string): Promise<void> {
    const all = await this.assembleFields(subjectId);
    const l1 = project(all, "l1");
    const payloadEnc = await this.ctx.envelope.encryptField(subjectId, JSON.stringify(l1));
    await this.ctx.repo.upsertView({ subjectId, payloadEnc, builtAt: this.ctx.now() });
    // Active cache purge so a rebuild never serves stale content (revocation SLO peer).
    await this.ctx.cache.del(`view:${subjectId}`);
  }

  /** Read the cached L1 projection (scanner path). */
  async getCachedL1(subjectId: string): Promise<ProjectionResult | undefined> {
    const v = await this.ctx.repo.getView(subjectId);
    if (!v) return undefined;
    return JSON.parse(await this.ctx.envelope.decryptField(subjectId, v.payloadEnc)) as ProjectionResult;
  }

  /** On-demand projection for preview + break-glass. Always via project(). */
  async projectFor(subjectId: string, level: DisclosureLevel): Promise<ProjectionResult> {
    const all = await this.assembleFields(subjectId);
    return project(all, level);
  }

  /** Owner preview — uses the SAME code path as the scanner/break-glass. */
  async preview(principal: Principal, subjectId: string, level: DisclosureLevel): Promise<ProjectionResult> {
    await this.loadOwnedSubject(principal, subjectId);
    if (level === "l1") {
      return (await this.getCachedL1(subjectId)) ?? { level: "l1", fields: [] };
    }
    return this.projectFor(subjectId, level);
  }
}
