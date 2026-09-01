import { newId, assertOwns, type Principal, type Provenance } from "@medikey/core";
import type { AppContext } from "../app/context";
import { NotFoundError, ValidationError } from "../app/errors";
import type { MedicalItem, MedicalItemType, SubjectProfile } from "../domain/model";

export interface AddItemInput {
  type: MedicalItemType;
  /** The item's sensitive fields (e.g. {name, reaction, notes}). Encrypted at rest. */
  data: Record<string, unknown>;
  provenance?: Provenance;
  isCritical?: boolean;
  severity?: string;
}

export interface MedicalItemView {
  id: string;
  type: MedicalItemType;
  data: Record<string, unknown>;
  provenance: Provenance;
  isCritical: boolean;
  severity?: string;
  noneKnown: boolean;
  noneKnownConfirmedAt?: string;
}

const ITEM_TYPES = new Set<MedicalItemType>([
  "blood_group", "allergy", "condition", "medication", "medication_avoidance",
  "implant", "surgery", "injury", "emergency_contact",
]);

/**
 * Hook other services register to rebuild the emergency_view when medical data
 * changes (wired in P5). Keeps MedicalService free of disclosure logic.
 */
export type RebuildHook = (subjectId: string) => Promise<void>;

export class MedicalService {
  private rebuild: RebuildHook = async () => {};
  constructor(private readonly ctx: AppContext) {}

  onChange(hook: RebuildHook): void {
    this.rebuild = hook;
  }

  private async loadOwnedSubject(principal: Principal, subjectId: string): Promise<SubjectProfile> {
    const s = await this.ctx.repo.getSubject(subjectId);
    if (!s) throw new NotFoundError();
    assertOwns(s.accountId, principal);
    return s;
  }

  private async loadOwnedItem(principal: Principal, itemId: string): Promise<MedicalItem> {
    const item = await this.ctx.repo.getItem(itemId);
    if (!item) throw new NotFoundError();
    // Verify ownership via the item's subject.
    await this.loadOwnedSubject(principal, item.subjectId);
    return item;
  }

  async addItem(principal: Principal, subjectId: string, input: AddItemInput): Promise<{ itemId: string }> {
    await this.loadOwnedSubject(principal, subjectId);
    if (!ITEM_TYPES.has(input.type)) throw new ValidationError("unknown item type");
    if (!input.data || typeof input.data !== "object") throw new ValidationError("data required");
    const id = newId();
    const item: MedicalItem = {
      id,
      subjectId,
      type: input.type,
      dataEnc: await this.ctx.envelope.encryptField(subjectId, JSON.stringify(input.data)),
      provenance: input.provenance ?? "user_provided", // provenance-or-fail: always set
      isCritical: input.isCritical ?? false,
      severity: input.severity,
      noneKnown: false,
      createdAt: this.ctx.now(),
      lastConfirmedAt: this.ctx.now(),
    };
    await this.ctx.repo.addItem(item);
    await this.ctx.audit.append({
      id: newId(), type: "medical_item_added", accountId: principal.accountId, subjectId,
      detail: { itemType: input.type }, severity: "info", createdAt: this.ctx.now(),
    });
    await this.rebuild(subjectId);
    return { itemId: id };
  }

  /** Stated-negative: an explicit "no known X" positive assertion. Absence ≠ negation. */
  async assertNoneKnown(principal: Principal, subjectId: string, type: MedicalItemType): Promise<void> {
    await this.loadOwnedSubject(principal, subjectId);
    const item: MedicalItem = {
      id: newId(),
      subjectId,
      type,
      dataEnc: await this.ctx.envelope.encryptField(subjectId, JSON.stringify({ noneKnown: true })),
      provenance: "user_confirmed",
      isCritical: false,
      noneKnown: true,
      noneKnownConfirmedAt: this.ctx.now(),
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.addItem(item);
    await this.rebuild(subjectId);
  }

  async listItems(principal: Principal, subjectId: string): Promise<MedicalItemView[]> {
    await this.loadOwnedSubject(principal, subjectId);
    const items = await this.ctx.repo.listItemsBySubject(subjectId);
    return Promise.all(items.map((i) => this.toView(i)));
  }

  async updateItem(
    principal: Principal,
    itemId: string,
    patch: { data?: Record<string, unknown>; isCritical?: boolean; severity?: string; confirm?: boolean },
  ): Promise<void> {
    const item = await this.loadOwnedItem(principal, itemId);
    if (patch.data) item.dataEnc = await this.ctx.envelope.encryptField(item.subjectId, JSON.stringify(patch.data));
    if (patch.isCritical !== undefined) item.isCritical = patch.isCritical;
    if (patch.severity !== undefined) item.severity = patch.severity;
    if (patch.confirm) item.lastConfirmedAt = this.ctx.now();
    await this.ctx.repo.updateItem(item);
    await this.rebuild(item.subjectId);
  }

  async deleteItem(principal: Principal, itemId: string): Promise<void> {
    const item = await this.loadOwnedItem(principal, itemId);
    await this.ctx.repo.deleteItem(itemId);
    await this.rebuild(item.subjectId);
  }

  private async toView(i: MedicalItem): Promise<MedicalItemView> {
    return {
      id: i.id,
      type: i.type,
      data: JSON.parse(await this.ctx.envelope.decryptField(i.subjectId, i.dataEnc)),
      provenance: i.provenance,
      isCritical: i.isCritical,
      severity: i.severity,
      noneKnown: i.noneKnown ?? false,
      noneKnownConfirmedAt: i.noneKnownConfirmedAt,
    };
  }
}
