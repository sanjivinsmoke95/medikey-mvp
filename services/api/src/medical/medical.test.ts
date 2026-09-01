import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { MedicalService } from "./service";

describe("MedicalService (P4)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let alice: TestUser;
  let bob: TestUser;
  let subjectId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    alice = await makeUser(ctx, "alice@example.com");
    bob = await makeUser(ctx, "bob@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" }));
  });

  it("adds an encrypted allergy with default provenance user_provided", async () => {
    const { itemId } = await medical.addItem(alice.principal, subjectId, {
      type: "allergy",
      data: { name: "penicillin", reaction: "anaphylaxis" },
      isCritical: true,
      severity: "life_threatening",
    });
    const items = await medical.listItems(alice.principal, subjectId);
    expect(items[0]!.provenance).toBe("user_provided");
    expect(items[0]!.data.name).toBe("penicillin");
    // ciphertext at rest
    const raw = await ctx.repo.getItem(itemId);
    expect(JSON.stringify(raw)).not.toContain("penicillin");
  });

  it("stated-negative is a positive assertion (absence != negation)", async () => {
    await medical.assertNoneKnown(alice.principal, subjectId, "allergy");
    const items = await medical.listItems(alice.principal, subjectId);
    expect(items[0]!.noneKnown).toBe(true);
    expect(items[0]!.noneKnownConfirmedAt).toBeTruthy();
  });

  it("IDOR: Bob cannot add/list/delete on Alice's subject", async () => {
    const { itemId } = await medical.addItem(alice.principal, subjectId, {
      type: "medication", data: { name: "warfarin" },
    });
    await expectDenied(() => medical.addItem(bob.principal, subjectId, { type: "allergy", data: {} }));
    await expectDenied(() => medical.listItems(bob.principal, subjectId));
    await expectDenied(() => medical.deleteItem(bob.principal, itemId));
  });

  it("rejects unknown item types", async () => {
    await expect(
      medical.addItem(alice.principal, subjectId, { type: "nonsense" as never, data: {} }),
    ).rejects.toThrow();
  });

  it("update and delete work for the owner", async () => {
    const { itemId } = await medical.addItem(alice.principal, subjectId, { type: "implant", data: { name: "pacemaker" } });
    await medical.updateItem(alice.principal, itemId, { isCritical: true });
    expect((await medical.listItems(alice.principal, subjectId))[0]!.isCritical).toBe(true);
    await medical.deleteItem(alice.principal, itemId);
    expect(await medical.listItems(alice.principal, subjectId)).toHaveLength(0);
  });
});
