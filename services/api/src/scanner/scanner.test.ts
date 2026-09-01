import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { DisclosureService } from "../disclosure/service";
import { QrService } from "../qr/service";
import { ScannerService } from "./service";

describe("ScannerService (P8)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let disclosure: DisclosureService;
  let qr: QrService;
  let scanner: ScannerService;
  let alice: TestUser;
  let subjectId: string;
  let opaqueId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    disclosure = new DisclosureService(ctx);
    qr = new QrService(ctx);
    medical.onChange((id) => disclosure.buildAndCacheView(id));
    scanner = new ScannerService(ctx, qr, disclosure);
    alice = await makeUser(ctx, "alice@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao", dateOfBirth: "1990-01-01" }));
    const { itemId } = await medical.addItem(alice.principal, subjectId, {
      type: "allergy", data: { name: "penicillin", reaction: "anaphylaxis" }, isCritical: true, severity: "life_threatening",
    });
    await disclosure.setSelections(alice.principal, subjectId, [
      { fieldRef: "name", tier: "l1_critical" },
      { fieldRef: "age", tier: "l1_critical" },
      { fieldRef: `item:${itemId}`, tier: "l1_critical" },
    ]);
    ({ opaqueId } = await qr.createQr(alice.principal, subjectId, "wallet"));
  });

  it("serves the L1 page for a valid scan and logs an anonymous access", async () => {
    const r = await scanner.scan(opaqueId, { ipCoarse: "1.2" });
    expect(r.state).toBe("ok");
    expect(r.html).toContain("penicillin");
    expect(r.html).toContain("user-provided");
    const logs = await ctx.repo.listLogsBySubject(subjectId);
    expect(logs[0]!.accessType).toBe("anonymous");
    expect(logs[0]!.status).toBe("shown");
  });

  it("does NOT log location by default (G6)", async () => {
    await scanner.scan(opaqueId, { ipCoarse: "1.2", city: "Bengaluru" });
    const logs = await ctx.repo.listLogsBySubject(subjectId);
    expect(logs[0]!.city).toBeUndefined();
  });

  it("logs coarse city only when the owner opted in", async () => {
    const acc = await ctx.repo.getAccountById((await ctx.repo.getSubject(subjectId))!.accountId);
    acc!.locationLoggingOptIn = true;
    await ctx.repo.updateAccount(acc!);
    await scanner.scan(opaqueId, { ipCoarse: "1.2", city: "Bengaluru" });
    const logs = await ctx.repo.listLogsBySubject(subjectId);
    expect(logs[0]!.city).toBe("Bengaluru");
  });

  it("revoked and unknown ids render the identical neutral page (no oracle)", async () => {
    const { qrId } = { qrId: (await qr.listQr(alice.principal, subjectId))[0]!.qrId };
    await qr.revokeQr(alice.principal, qrId);
    const revoked = await scanner.scan(opaqueId, { ipCoarse: "9.9" });
    const unknown = await scanner.scan("no-such-id", { ipCoarse: "9.9" });
    expect(revoked.html).toBe(unknown.html);
    expect(revoked.state === "revoked" && unknown.state === "not_found").toBe(true);
  });

  it("rate limits repeated scans from one IP (enumeration protection)", async () => {
    let limited = false;
    for (let i = 0; i < 70; i++) {
      const r = await scanner.scan(`guess-${i}`, { ipCoarse: "7.7" });
      if (r.state === "rate_limited") { limited = true; break; }
    }
    expect(limited).toBe(true);
  });

  it("scanner responses never contain L2/L3 or non-selected fields", async () => {
    // add an L2 medication that is NOT selected into L1
    await medical.addItem(alice.principal, subjectId, { type: "medication", data: { name: "warfarin" } });
    const r = await scanner.scan(opaqueId, { ipCoarse: "1.2" });
    expect(r.html).not.toContain("warfarin");
  });
});
