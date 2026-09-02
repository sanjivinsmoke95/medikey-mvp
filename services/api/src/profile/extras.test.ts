import { describe, it, expect } from "vitest";
import { createTestApp } from "@medikey/api";

/**
 * Owner-UX backend additions: extended personal details (extras) on the subject
 * and the 'document' medical type (X-rays/reports). Same encryption/authz path.
 */
async function owner() {
  const app = createTestApp();
  await app.auth.register({ email: "asha@example.com", secret: "correct horse battery staple" });
  const login = await app.auth.login("asha@example.com", "correct horse battery staple");
  const stepped = await app.auth.stepUp(login.token, "correct horse battery staple");
  const principal = await app.auth.requirePrincipal(login.token);
  const steppedP = await app.auth.requirePrincipal(stepped.token);
  return { app, principal, steppedP };
}

describe("owner UX backend", () => {
  it("stores and returns extended personal details + DOB", async () => {
    const { app, principal } = await owner();
    const { subjectId } = await app.profile.createSubject(principal, {
      fullName: "Asha Rao",
      dateOfBirth: "1990-06-12",
      extras: { gender: "Female", phone: "+91 90000 00000", address: "Hyderabad" },
    });
    const view = await app.profile.getSubject(principal, subjectId);
    expect(view.dateOfBirth).toBe("1990-06-12");
    expect(view.extras?.gender).toBe("Female");
    expect(view.extras?.phone).toBe("+91 90000 00000");
    expect(view.ageYears).toBeGreaterThan(30);
  });

  it("merges extras on partial update (doesn't drop existing fields)", async () => {
    const { app, principal, steppedP } = await owner();
    const { subjectId } = await app.profile.createSubject(principal, {
      fullName: "Asha", extras: { gender: "Female", phone: "111" },
    });
    await app.profile.updateIdentity(steppedP, subjectId, { extras: { address: "Hyderabad" } });
    const view = await app.profile.getSubject(principal, subjectId);
    expect(view.extras?.gender).toBe("Female");   // preserved
    expect(view.extras?.phone).toBe("111");        // preserved
    expect(view.extras?.address).toBe("Hyderabad"); // added
  });

  it("accepts a 'document' medical item (X-ray) and rejects unknown types", async () => {
    const { app, principal } = await owner();
    const { subjectId } = await app.profile.createSubject(principal, { fullName: "Asha" });
    const doc = await app.medical.addItem(principal, subjectId, {
      type: "document",
      data: { title: "Chest X-ray", kind: "X-ray", image: "data:image/png;base64,iVBORw0KGgo=" },
    });
    const items = await app.medical.listItems(principal, subjectId);
    expect(items.find((i) => i.id === doc.itemId)?.type).toBe("document");
    await expect(
      app.medical.addItem(principal, subjectId, { type: "nonsense" as never, data: {} }),
    ).rejects.toThrow();
  });

  it("extras are encrypted at rest (no plaintext in the raw record)", async () => {
    const { app, principal } = await owner();
    const { subjectId } = await app.profile.createSubject(principal, {
      fullName: "Asha", extras: { address: "SecretStreet 42" },
    });
    const raw = await app.ctx.repo.getSubject(subjectId);
    expect(JSON.stringify(raw)).not.toContain("SecretStreet");
  });
});
