import { describe, it, expect } from "vitest";
import { renderEmergencyPage, escapeHtml } from "./render";
import type { ProjectionResult } from "@medikey/core";

const l1: ProjectionResult = {
  level: "l1",
  fields: [
    { fieldRef: "name", tier: "l1_critical", section: "name", label: "Name", value: "Alice Rao", provenance: "user_provided" },
    { fieldRef: "a1", tier: "l1_critical", section: "allergy", label: "Allergy", value: "penicillin — anaphylaxis", provenance: "user_provided", critical: true, severity: "life_threatening" },
    { fieldRef: "b1", tier: "l1_critical", section: "blood_group", label: "Blood group", value: "O+", provenance: "user_provided" },
    { fieldRef: "c1", tier: "l1_critical", section: "contact", label: "Emergency contact", value: "Ravi — brother", provenance: "user_provided", tel: "+910000000000" },
  ],
};

describe("emergency page render (P6)", () => {
  it("shows provenance on every field and the blood-group caveat (display-not-instruct)", () => {
    const html = renderEmergencyPage({ state: "ok", projection: l1, lastConfirmed: "31/08/2026" });
    expect(html).toContain("user-provided");
    expect(html).toContain("confirm before transfusion");
    expect(html).toContain("Last confirmed: 31/08/2026");
  });

  it("does NOT contain directive language", () => {
    const html = renderEmergencyPage({ state: "ok", projection: l1 }).toLowerCase();
    expect(html).not.toContain("do not administer penicillin");
    expect(html).not.toContain("give o+");
    expect(html).not.toContain("withhold");
  });

  it("emergency contact renders tap-to-call", () => {
    const html = renderEmergencyPage({ state: "ok", projection: l1 });
    expect(html).toContain('href="tel:+910000000000"');
  });

  it("revoked and not_found are IDENTICAL neutral pages (no oracle)", () => {
    const revoked = renderEmergencyPage({ state: "revoked" });
    const notFound = renderEmergencyPage({ state: "not_found" });
    expect(revoked).toBe(notFound);
    expect(revoked).toContain("no longer active");
  });

  it("degraded state never blanks — points to emergency services + printed card", () => {
    const html = renderEmergencyPage({ state: "unavailable" });
    expect(html).toContain("emergency services");
    expect(html).toContain("printed MediKey card");
  });

  it("stale banner shown without hiding data", () => {
    const html = renderEmergencyPage({ state: "ok", projection: l1, stale: true, lastConfirmed: "01/01/2024" });
    expect(html).toContain("may be out of date");
    expect(html).toContain("penicillin");
  });

  it("has lang + noindex and no external requests", () => {
    const html = renderEmergencyPage({ state: "ok", projection: l1, lang: "hi" });
    expect(html).toContain('lang="hi"');
    expect(html).toContain("noindex");
    expect(html).not.toMatch(/https?:\/\//); // no external URLs/trackers
  });

  it("escapes HTML in values (XSS)", () => {
    const evil: ProjectionResult = {
      level: "l1",
      fields: [{ fieldRef: "x", tier: "l1_critical", section: "condition", label: "Condition", value: "<script>alert(1)</script>", provenance: "user_provided" }],
    };
    const html = renderEmergencyPage({ state: "ok", projection: evil });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapeHtml helper", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});
