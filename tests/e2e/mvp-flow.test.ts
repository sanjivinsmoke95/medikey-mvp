import { describe, it, expect } from "vitest";
import { createTestApp } from "@medikey/api";

/**
 * End-to-end MVP Definition-of-Done flow (single test walking the whole loop).
 */
describe("MVP end-to-end flow (DoD)", () => {
  it("account → profile → medical → disclosure → preview → QR → scan → L1 → log → revoke → break-glass → L3 unreachable → deletion", async () => {
    const app = createTestApp();
    const { auth, profile, medical, disclosure, qr, scanner, breakGlass, rights } = app;

    // 1. creates account
    const email = "asha@example.com";
    const secret = "correct horse battery staple";
    await auth.register({ email, secret });
    const login = await auth.login(email, secret);
    const stepped = await auth.stepUp(login.token, secret);
    const principal = await auth.requirePrincipal(stepped.token);
    const primary = await auth.requirePrincipal(login.token);

    // 2. creates emergency profile
    const { subjectId } = await profile.createSubject(principal, {
      fullName: "Asha Rao",
      dateOfBirth: "1988-03-03",
    });

    // 3. enters medical information
    const allergy = await medical.addItem(principal, subjectId, {
      type: "allergy", data: { name: "penicillin", reaction: "anaphylaxis" }, isCritical: true, severity: "life_threatening",
    });
    const med = await medical.addItem(principal, subjectId, { type: "medication", data: { name: "warfarin", dose: "5mg" } });
    const sensitive = await medical.addItem(principal, subjectId, { type: "condition", data: { name: "private-l3-note" } });
    const contact = await medical.addItem(principal, subjectId, {
      type: "emergency_contact", data: { name: "Ravi", relationship: "brother", phone: "+910000000000" }, isCritical: true,
    });

    // 4. assigns disclosure levels
    await disclosure.setSelections(principal, subjectId, [
      { fieldRef: "name", tier: "l1_critical" },
      { fieldRef: "age", tier: "l1_critical" },
      { fieldRef: `item:${allergy.itemId}`, tier: "l1_critical" },
      { fieldRef: `item:${contact.itemId}`, tier: "l1_critical" },
      { fieldRef: `item:${med.itemId}`, tier: "l2_additional" },
      { fieldRef: `item:${sensitive.itemId}`, tier: "l3_sensitive" },
    ]);

    // 5. previews exactly what a scanner will see
    const preview = await disclosure.preview(principal, subjectId, "l1");
    expect(preview.fields.some((f) => f.value.includes("penicillin"))).toBe(true);
    expect(preview.fields.some((f) => f.tier !== "l1_critical")).toBe(false);

    // 6. activates MediKey object → generates QR
    const wallet = await qr.createQr(principal, subjectId, "wallet");

    // 7. scanner scans QR → L1 loads with provenance
    const scan = await scanner.scan(wallet.opaqueId, { ipCoarse: "1.2" });
    expect(scan.state).toBe("ok");
    expect(scan.html).toContain("penicillin");
    expect(scan.html).toContain("user-provided");
    expect(scan.html).not.toContain("warfarin"); // L2 not on L1
    expect(scan.html).not.toContain("private-l3-note"); // L3 not on L1

    // 8. access is logged; user sees history
    const history = await rights.accessHistory(principal, subjectId);
    expect(history.some((h) => h.accessType === "anonymous" && h.status === "shown")).toBe(true);

    // 9. break-glass → bounded L2 (temporary, scoped, audited); L3 unreachable
    const bg = await breakGlass.request(wallet.opaqueId, "paramedic on scene");
    expect(bg.granted).toBe(true);
    const l2 = await breakGlass.viewL2(wallet.opaqueId, bg.token!);
    expect(l2.html).toContain("warfarin"); // L2 additional context
    expect(l2.html).not.toContain("private-l3-note"); // L3 never via scanner
    // single-use
    expect((await breakGlass.viewL2(wallet.opaqueId, bg.token!)).ok).toBe(false);

    // 10. user can revoke QR → revoked QR becomes inaccessible
    const list = await qr.listQr(principal, subjectId);
    await qr.revokeQr(principal, list[0]!.qrId);
    const afterRevoke = await scanner.scan(wallet.opaqueId, { ipCoarse: "1.2" });
    expect(afterRevoke.state).toBe("revoked");
    expect(afterRevoke.html).toContain("no longer active");

    // 11. deletion is tested (crypto-shred + revoke-all)
    await rights.deleteAccount(principal);
    expect(await app.ctx.repo.getSubject(subjectId)).toBeUndefined();

    // notifications throughout carried no medical content
    const summaries = app.ctx.notifier.sent().map((n) => n.summary).join(" ");
    expect(summaries).not.toMatch(/penicillin|warfarin|private-l3|anaphylaxis/i);
    void primary;
  });
});
