import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "./service";

describe("ProfileService (P3)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let alice: TestUser;
  let bob: TestUser;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    alice = await makeUser(ctx, "alice@example.com");
    bob = await makeUser(ctx, "bob@example.com");
  });

  it("creates a subject with encrypted identity and derived age", async () => {
    const { subjectId } = await profile.createSubject(alice.principal, {
      fullName: "Alice Rao",
      dateOfBirth: "1990-01-01",
    });
    const view = await profile.getSubject(alice.principal, subjectId);
    expect(view.fullName).toBe("Alice Rao");
    expect(view.ageYears).toBeGreaterThan(30);
  });

  it("stores name only as ciphertext (dump has no plaintext)", async () => {
    const { subjectId } = await profile.createSubject(alice.principal, { fullName: "SecretName Xyz" });
    const raw = await ctx.repo.getSubject(subjectId);
    expect(JSON.stringify(raw)).not.toContain("SecretName");
  });

  it("IDOR: Bob cannot read or update Alice's subject", async () => {
    const { subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" });
    await expectDenied(() => profile.getSubject(bob.principal, subjectId));
    await expectDenied(() =>
      profile.updateIdentity(bob.principal, subjectId, { fullName: "hacked" }),
    );
  });

  it("identity update requires step-up", async () => {
    const { subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" });
    await expectDenied(() =>
      profile.updateIdentity(alice.primary, subjectId, { fullName: "New Name" }),
    );
    await profile.updateIdentity(alice.principal, subjectId, { fullName: "New Name" });
    expect((await profile.getSubject(alice.principal, subjectId)).fullName).toBe("New Name");
  });

  it("dependents are modelled and isolated per account", async () => {
    await profile.createSubject(alice.principal, { fullName: "Child A", relationship: "child" });
    const list = await profile.listSubjects(alice.principal);
    expect(list.length).toBe(1);
    expect(await profile.listSubjects(bob.principal)).toHaveLength(0);
  });
});
