import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { DisclosureService } from "./service";

describe("DisclosureService (P5) — the critical boundary", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let disclosure: DisclosureService;
  let alice: TestUser;
  let subjectId: string;
  let allergyId: string;
  let insuranceLikeId: string; // a field we will try to keep at L3

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    disclosure = new DisclosureService(ctx);
    medical.onChange((id) => disclosure.buildAndCacheView(id));
    alice = await makeUser(ctx, "alice@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, {
      fullName: "Alice Rao",
      dateOfBirth: "1990-05-05",
    }));
    ({ itemId: allergyId } = await medical.addItem(alice.principal, subjectId, {
      type: "allergy", data: { name: "penicillin", reaction: "anaphylaxis" }, isCritical: true, severity: "life_threatening",
    }));
    // a medication we'll place at L2 (additional context)
    await medical.addItem(alice.principal, subjectId, { type: "medication", data: { name: "warfarin", dose: "5mg" } });
    ({ itemId: insuranceLikeId } = await medical.addItem(alice.principal, subjectId, {
      type: "condition", data: { name: "sensitive-note" },
    }));
  });

  async function selectDefault() {
    await disclosure.setSelections(alice.principal, subjectId, [
      { fieldRef: "name", tier: "l1_critical" },
      { fieldRef: "age", tier: "l1_critical" },
      { fieldRef: `item:${allergyId}`, tier: "l1_critical" },
      { fieldRef: "dob", tier: "l2_additional" },
      { fieldRef: `item:${insuranceLikeId}`, tier: "l3_sensitive" },
    ]);
  }

  it("cached L1 view contains ONLY l1 fields (never l2/l3)", async () => {
    await selectDefault();
    const l1 = await disclosure.getCachedL1(subjectId);
    expect(l1!.fields.every((f) => f.tier === "l1_critical")).toBe(true);
    // the l3 note and l2 dob must be absent from L1
    expect(l1!.fields.some((f) => f.section === "dob")).toBe(false);
    expect(l1!.fields.map((f) => f.value)).toContain("penicillin — anaphylaxis");
  });

  it("break-glass level L2 includes l1+l2 but NEVER l3", async () => {
    await selectDefault();
    const l2 = await disclosure.projectFor(subjectId, "l2");
    expect(l2.fields.some((f) => f.section === "dob")).toBe(true); // l2 field present
    expect(l2.fields.some((f) => f.tier === "l3_sensitive")).toBe(false); // l3 excluded
  });

  it("owner preview uses the same projection as scanner/break-glass", async () => {
    await selectDefault();
    const previewL1 = await disclosure.preview(alice.principal, subjectId, "l1");
    const cached = await disclosure.getCachedL1(subjectId);
    expect(JSON.stringify(previewL1)).toBe(JSON.stringify(cached));
  });

  it("tier ceiling: DOB cannot be placed at L1", async () => {
    await expectDenied(() =>
      disclosure.setSelections(alice.principal, subjectId, [{ fieldRef: "dob", tier: "l1_critical" }]),
    );
  });

  it("setSelections requires step-up", async () => {
    await expectDenied(() =>
      disclosure.setSelections(alice.primary, subjectId, [{ fieldRef: "name", tier: "l1_critical" }]),
    );
  });

  it("rebuild on medical change keeps the L1 view current", async () => {
    await selectDefault();
    const before = (await disclosure.getCachedL1(subjectId))!.fields.length;
    await medical.addItem(alice.principal, subjectId, { type: "implant", data: { name: "pacemaker" } });
    // new item not yet selected → L1 unchanged
    expect((await disclosure.getCachedL1(subjectId))!.fields.length).toBe(before);
  });
});
