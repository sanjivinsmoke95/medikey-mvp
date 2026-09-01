import { describe, it, expect } from "vitest";
import { createTestApp, type App } from "@medikey/api";
import { createLogger } from "@medikey/core";

/**
 * Consolidated security gate (merge-blocking). Covers the required list:
 * IDOR, broken access control, QR enumeration, token replay, revoked QR,
 * expired token, L2→L3 escalation, auth abuse, rate-limit bypass, log leakage,
 * secret leakage, cross-account, unauthorized medical-field disclosure.
 */

async function setup(): Promise<{
  app: App;
  alice: { principal: import("@medikey/core").Principal; primary: import("@medikey/core").Principal };
  subjectId: string;
  wallet: { qrId: string; opaqueId: string };
  ids: { allergy: string; med: string; l3: string };
}> {
  const app = createTestApp();
  const secret = "correct horse battery staple";
  await app.auth.register({ email: "alice@example.com", secret });
  const login = await app.auth.login("alice@example.com", secret);
  const up = await app.auth.stepUp(login.token, secret);
  const principal = await app.auth.requirePrincipal(up.token);
  const primary = await app.auth.requirePrincipal(login.token);
  const { subjectId } = await app.profile.createSubject(principal, { fullName: "Alice", dateOfBirth: "1990-01-01" });
  const allergy = await app.medical.addItem(principal, subjectId, { type: "allergy", data: { name: "penicillin" }, isCritical: true });
  const med = await app.medical.addItem(principal, subjectId, { type: "medication", data: { name: "warfarin" } });
  const l3 = await app.medical.addItem(principal, subjectId, { type: "condition", data: { name: "l3-secret" } });
  await app.disclosure.setSelections(principal, subjectId, [
    { fieldRef: "name", tier: "l1_critical" },
    { fieldRef: `item:${allergy.itemId}`, tier: "l1_critical" },
    { fieldRef: `item:${med.itemId}`, tier: "l2_additional" },
    { fieldRef: `item:${l3.itemId}`, tier: "l3_sensitive" },
  ]);
  const wallet = await app.qr.createQr(principal, subjectId, "wallet");
  return { app, alice: { principal, primary }, subjectId, wallet, ids: { allergy: allergy.itemId, med: med.itemId, l3: l3.itemId } };
}

describe("SECURITY SUITE", () => {
  it("IDOR + cross-account: another account cannot read/modify", async () => {
    const s = await setup();
    const bobApp = s.app; // same app instance, different account
    const secret = "another correct horse battery";
    await bobApp.auth.register({ email: "bob@example.com", secret });
    const bl = await bobApp.auth.login("bob@example.com", secret);
    const bup = await bobApp.auth.stepUp(bl.token, secret);
    const bob = await bobApp.auth.requirePrincipal(bup.token);
    await expect(bobApp.profile.getSubject(bob, s.subjectId)).rejects.toThrow();
    await expect(bobApp.medical.listItems(bob, s.subjectId)).rejects.toThrow();
    await expect(bobApp.qr.createQr(bob, s.subjectId, "x")).rejects.toThrow();
  });

  it("broken access control: sensitive ops require step-up", async () => {
    const s = await setup();
    await expect(s.app.qr.createQr(s.alice.primary, s.subjectId, "x")).rejects.toThrow();
    await expect(s.app.rights.deleteAccount(s.alice.primary)).rejects.toThrow();
    await expect(s.app.rights.exportAccount(s.alice.primary)).rejects.toThrow();
  });

  it("QR enumeration is infeasible + rate-limited", async () => {
    const s = await setup();
    let limited = false;
    for (let i = 0; i < 70; i++) {
      const r = await s.app.scanner.scan(`guess-${i}`, { ipCoarse: "5.5" });
      expect(r.state === "not_found" || r.state === "rate_limited").toBe(true);
      if (r.state === "rate_limited") { limited = true; break; }
    }
    expect(limited).toBe(true);
  });

  it("token replay: L2 token is single-use", async () => {
    const s = await setup();
    const bg = await s.app.breakGlass.request(s.wallet.opaqueId);
    expect((await s.app.breakGlass.viewL2(s.wallet.opaqueId, bg.token!)).ok).toBe(true);
    expect((await s.app.breakGlass.viewL2(s.wallet.opaqueId, bg.token!)).ok).toBe(false);
  });

  it("revoked QR is inaccessible", async () => {
    const s = await setup();
    const list = await s.app.qr.listQr(s.alice.principal, s.subjectId);
    await s.app.qr.revokeQr(s.alice.principal, list[0]!.qrId);
    expect((await s.app.scanner.scan(s.wallet.opaqueId, { ipCoarse: "1.1" })).state).toBe("revoked");
  });

  it("expired token is rejected", async () => {
    const s = await setup();
    s.app.ctx.env.L2_TOKEN_TTL_SECONDS = -1 as unknown as number;
    const bg = await s.app.breakGlass.request(s.wallet.opaqueId);
    expect((await s.app.breakGlass.viewL2(s.wallet.opaqueId, bg.token!)).ok).toBe(false);
  });

  it("L2 → L3 escalation is impossible", async () => {
    const s = await setup();
    const bg = await s.app.breakGlass.request(s.wallet.opaqueId);
    const l2 = await s.app.breakGlass.viewL2(s.wallet.opaqueId, bg.token!);
    expect(l2.html).not.toContain("l3-secret");
    // the minted token is L2-level; there is no l3 mint path
    const { hmacHex } = await import("@medikey/core");
    const rec = await s.app.ctx.repo.getTokenByHash(hmacHex(s.app.ctx.pepper, bg.token!));
    expect(rec!.disclosureLevel).toBe("l2");
  });

  it("auth abuse: uniform failure + OTP throttle", async () => {
    const app = createTestApp();
    await app.auth.register({ email: "z@z.com", secret: "correct horse battery staple" });
    await expect(app.auth.login("z@z.com", "wrong")).rejects.toThrow();
    await expect(app.auth.login("nobody@z.com", "wrong")).rejects.toThrow();
    for (let i = 0; i < 5; i++) await app.auth.requestOtp("z@z.com");
    await expect(app.auth.requestOtp("z@z.com")).rejects.toThrow(); // throttled
  });

  it("rate-limit bypass: per-identifier limit also trips (not just per-IP)", async () => {
    const s = await setup();
    let limited = false;
    for (let i = 0; i < 40; i++) {
      // same identifier, rotating IPs — per-id limit must still trip
      const r = await s.app.scanner.scan(s.wallet.opaqueId, { ipCoarse: `ip-${i}` });
      if (r.state === "rate_limited") { limited = true; break; }
    }
    expect(limited).toBe(true);
  });

  it("log leakage: redacting logger never emits medical values", async () => {
    const lines: string[] = [];
    const log = createLogger((e) => lines.push(JSON.stringify(e)));
    log.log("info", "scan", { allergy: "penicillin", medication: "warfarin", name: "Alice", status: "shown" });
    const s = lines.join("\n");
    expect(s).not.toContain("penicillin");
    expect(s).not.toContain("warfarin");
    expect(s).not.toContain("Alice");
    expect(s).toContain("shown");
  });

  it("secret leakage: pepper never appears in rendered pages or access logs", async () => {
    const s = await setup();
    const scan = await s.app.scanner.scan(s.wallet.opaqueId, { ipCoarse: "1.2" });
    expect(scan.html).not.toContain(s.app.ctx.pepper);
    const logs = await s.app.ctx.repo.listLogsBySubject(s.subjectId);
    expect(JSON.stringify(logs)).not.toContain(s.app.ctx.pepper);
  });

  it("unauthorized medical-field disclosure: scanner L1 shows only selected L1 fields", async () => {
    const s = await setup();
    const scan = await s.app.scanner.scan(s.wallet.opaqueId, { ipCoarse: "1.2" });
    expect(scan.html).toContain("penicillin"); // selected L1
    expect(scan.html).not.toContain("warfarin"); // L2
    expect(scan.html).not.toContain("l3-secret"); // L3
  });
});
