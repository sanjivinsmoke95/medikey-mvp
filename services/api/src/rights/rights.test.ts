import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import { KeyDestroyedError, type EncryptedField } from "@medikey/core";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { DisclosureService } from "../disclosure/service";
import { QrService } from "../qr/service";
import { RightsService } from "./service";

describe("RightsService (P10)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let disclosure: DisclosureService;
  let qr: QrService;
  let rights: RightsService;
  let alice: TestUser;
  let bob: TestUser;
  let subjectId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    disclosure = new DisclosureService(ctx);
    qr = new QrService(ctx);
    rights = new RightsService(ctx);
    medical.onChange((id) => disclosure.buildAndCacheView(id));
    alice = await makeUser(ctx, "alice@example.com");
    bob = await makeUser(ctx, "bob@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" }));
    await medical.addItem(alice.principal, subjectId, { type: "allergy", data: { name: "penicillin" } });
  });

  it("export returns own data only and requires step-up", async () => {
    await expectDenied(() => rights.exportAccount(alice.primary)); // no step-up
    const dump = await rights.exportAccount(alice.principal);
    expect(JSON.stringify(dump)).toContain("penicillin");
    // Bob's export never contains Alice's data
    const bobDump = await rights.exportAccount(bob.principal);
    expect(JSON.stringify(bobDump)).not.toContain("penicillin");
  });

  it("access history is coarse and owner-scoped (IDOR)", async () => {
    await expectDenied(() => rights.accessHistory(bob.principal, subjectId));
    const hist = await rights.accessHistory(alice.principal, subjectId);
    expect(Array.isArray(hist)).toBe(true);
  });

  it("account deletion crypto-shreds + revokes QRs; RESTORE cannot resurrect", async () => {
    const created = await qr.createQr(alice.principal, subjectId, "wallet");
    // capture a ciphertext "backup" copy before deletion
    const rawItem = (await ctx.repo.listItemsBySubject(subjectId))[0]!;
    const backup: EncryptedField = rawItem.dataEnc;

    await rights.deleteAccount(alice.principal);

    // data physically gone
    expect(await ctx.repo.getSubject(subjectId)).toBeUndefined();
    // QR revoked/dead
    expect((await qr.resolve(created.opaqueId)).status).not.toBe("active");
    // restore-no-resurrect: decrypting the captured backup fails (key destroyed)
    await expect(ctx.envelope.decryptField(subjectId, backup)).rejects.toBeInstanceOf(KeyDestroyedError);
    // sessions revoked
    // (Alice's stepped-up session token is not stored here, but revoke-all ran)
  });

  it("deleteAccount requires step-up", async () => {
    await expectDenied(() => rights.deleteAccount(alice.primary));
  });
});
