import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { QrService } from "./service";

describe("QrService (P7)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let qr: QrService;
  let alice: TestUser;
  let bob: TestUser;
  let subjectId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    qr = new QrService(ctx);
    alice = await makeUser(ctx, "alice@example.com");
    bob = await makeUser(ctx, "bob@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" }));
  });

  it("creates an opaque 128-bit id, stores only the hash (never plaintext)", async () => {
    const created = await qr.createQr(alice.principal, subjectId, "wallet");
    expect(created.opaqueId.length).toBeGreaterThanOrEqual(21);
    const stored = await ctx.repo.getQrById(created.qrId);
    // plaintext identifier must not be stored anywhere
    expect(JSON.stringify(stored)).not.toContain(created.opaqueId);
    // resolves via the hash
    const r = await qr.resolve(created.opaqueId);
    expect(r.status).toBe("active");
  });

  it("revoke makes the code inaccessible; unknown id is not_found (uniform)", async () => {
    const created = await qr.createQr(alice.principal, subjectId, "wallet");
    await qr.revokeQr(alice.principal, created.qrId);
    expect((await qr.resolve(created.opaqueId)).status).toBe("revoked");
    expect((await qr.resolve("totally-unknown-id")).status).toBe("not_found");
  });

  it("per-object independence: revoking one leaves siblings + profile intact", async () => {
    const a = await qr.createQr(alice.principal, subjectId, "wallet");
    const b = await qr.createQr(alice.principal, subjectId, "helmet");
    await qr.revokeQr(alice.principal, a.qrId);
    expect((await qr.resolve(a.opaqueId)).status).toBe("revoked");
    expect((await qr.resolve(b.opaqueId)).status).toBe("active");
    expect(await profile.getSubject(alice.principal, subjectId)).toBeTruthy();
  });

  it("regenerate issues a new id and revokes the old", async () => {
    const a = await qr.createQr(alice.principal, subjectId, "wallet");
    const b = await qr.regenerateQr(alice.principal, a.qrId);
    expect((await qr.resolve(a.opaqueId)).status).toBe("revoked");
    expect((await qr.resolve(b.opaqueId)).status).toBe("active");
  });

  it("create/revoke require step-up and ownership (IDOR)", async () => {
    await expectDenied(() => qr.createQr(alice.primary, subjectId, "wallet")); // no step-up
    const created = await qr.createQr(alice.principal, subjectId, "wallet");
    await expectDenied(() => qr.revokeQr(bob.principal, created.qrId)); // not owner
    await expectDenied(() => qr.createQr(bob.principal, subjectId, "x")); // not owner
  });

  it("identifiers do not appear in the audit log", async () => {
    const created = await qr.createQr(alice.principal, subjectId, "wallet");
    const events = await ctx.audit.list({ subjectId });
    expect(JSON.stringify(events)).not.toContain(created.opaqueId);
  });
});
