import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { DisclosureService } from "../disclosure/service";
import { QrService } from "../qr/service";
import { BreakGlassService } from "./service";

describe("BreakGlassService (P9)", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let disclosure: DisclosureService;
  let qr: QrService;
  let bg: BreakGlassService;
  let alice: TestUser;
  let subjectId: string;
  let opaqueId: string;
  let l3ItemId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    disclosure = new DisclosureService(ctx);
    qr = new QrService(ctx);
    medical.onChange((id) => disclosure.buildAndCacheView(id));
    bg = new BreakGlassService(ctx, qr, disclosure);
    alice = await makeUser(ctx, "alice@example.com");
    ({ subjectId } = await profile.createSubject(alice.principal, { fullName: "Alice Rao" }));
    const { itemId: allergyId } = await medical.addItem(alice.principal, subjectId, {
      type: "allergy", data: { name: "penicillin" }, isCritical: true,
    });
    const { itemId: medId } = await medical.addItem(alice.principal, subjectId, {
      type: "medication", data: { name: "warfarin" },
    });
    ({ itemId: l3ItemId } = await medical.addItem(alice.principal, subjectId, {
      type: "condition", data: { name: "sensitive-l3-note" },
    }));
    await disclosure.setSelections(alice.principal, subjectId, [
      { fieldRef: `item:${allergyId}`, tier: "l1_critical" },
      { fieldRef: `item:${medId}`, tier: "l2_additional" },
      { fieldRef: `item:${l3ItemId}`, tier: "l3_sensitive" },
    ]);
    ({ opaqueId } = await qr.createQr(alice.principal, subjectId, "wallet"));
  });

  it("grants an L2 token, shows L2, notifies owner (no medical content), and audits", async () => {
    const res = await bg.request(opaqueId, "Dr on scene, +910000000000");
    expect(res.granted).toBe(true);
    const view = await bg.viewL2(opaqueId, res.token!);
    expect(view.ok).toBe(true);
    expect(view.html).toContain("warfarin"); // L2 additional context
    // notification has no medical content
    const summaries = ctx.notifier.sent().map((n) => n.summary).join(" ");
    expect(summaries).not.toMatch(/warfarin|penicillin|sensitive-l3/i);
    const events = await ctx.audit.list({ subjectId });
    expect(events.some((e) => e.type === "break_glass")).toBe(true);
  });

  it("L2 NEVER contains L3 fields", async () => {
    const res = await bg.request(opaqueId);
    const view = await bg.viewL2(opaqueId, res.token!);
    expect(view.html).not.toContain("sensitive-l3-note");
  });

  it("token is single-use", async () => {
    const res = await bg.request(opaqueId);
    const first = await bg.viewL2(opaqueId, res.token!);
    expect(first.ok).toBe(true);
    const second = await bg.viewL2(opaqueId, res.token!);
    expect(second.ok).toBe(false);
  });

  it("token expires (non-renewable)", async () => {
    ctx.env.L2_TOKEN_TTL_SECONDS = -1 as unknown as number; // force already-expired
    const res = await bg.request(opaqueId);
    const view = await bg.viewL2(opaqueId, res.token!);
    expect(view.ok).toBe(false);
  });

  it("a token from one subject cannot read another subject", async () => {
    const res = await bg.request(opaqueId);
    // second subject + its own QR
    const { subjectId: s2 } = await profile.createSubject(alice.principal, { fullName: "Bob Rao" });
    await disclosure.setSelections(alice.principal, s2, [{ fieldRef: "name", tier: "l1_critical" }]);
    const q2 = await qr.createQr(alice.principal, s2, "card");
    const cross = await bg.viewL2(q2.opaqueId, res.token!);
    expect(cross.ok).toBe(false);
  });

  it("auto-suspends the identifier after repeated break-glass", async () => {
    let suspended = false;
    for (let i = 0; i < 8; i++) {
      const r = await bg.request(opaqueId);
      if (r.reason === "suspended") { suspended = true; break; }
    }
    expect(suspended).toBe(true);
    // after suspension the L1 scan path is also dead (compromised)
    expect((await qr.resolve(opaqueId)).status).toBe("revoked");
  });

  it("no scanner path can mint an L3 token (type system + no l3 mint path)", async () => {
    const res = await bg.request(opaqueId);
    const rec = await ctx.repo.getTokenByHash(
      // recompute hash to fetch the token record
      (await import("@medikey/core")).hmacHex(ctx.pepper, res.token!),
    );
    expect(rec!.disclosureLevel).toBe("l2");
  });
});
