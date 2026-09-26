import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, makeUser, expectDenied, type TestUser } from "../testing/harness";
import type { AppContext } from "../app/context";
import { AuthService } from "../auth/service";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { ConsentService } from "./service";

async function makeProviderUser(ctx: AppContext, email: string, providerName: string, providerOrg?: string): Promise<TestUser> {
  const auth = new AuthService(ctx);
  const secret = "correct horse battery staple";
  await auth.register({ email, secret, role: "provider", providerName, providerOrg });
  const s = await auth.login(email, secret);
  const up = await auth.stepUp(s.token, secret);
  const principal = await auth.requirePrincipal(up.token);
  const primary = await auth.requirePrincipal(s.token);
  return { principal, primary, email, secret };
}

describe("ConsentService", () => {
  let ctx: AppContext;
  let profile: ProfileService;
  let medical: MedicalService;
  let consent: ConsentService;
  let patient: TestUser;
  let provider: TestUser;
  let subjectId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    profile = new ProfileService(ctx);
    medical = new MedicalService(ctx);
    consent = new ConsentService(ctx, medical);
    patient = await makeUser(ctx, "patient@example.com");
    provider = await makeProviderUser(ctx, "dr@example.com", "Dr. Sharma", "City Hospital");
    ({ subjectId } = await profile.createSubject(patient.principal, { fullName: "Test Patient" }));
    await medical.addItem(patient.principal, subjectId, { type: "allergy", data: { name: "Penicillin" }, isCritical: true });
    await medical.addItem(patient.principal, subjectId, { type: "medication", data: { name: "Metformin", dose: "500mg" } });
    await medical.addItem(patient.principal, subjectId, { type: "condition", data: { name: "Type-2 Diabetes" } });
    await medical.addItem(patient.principal, subjectId, { type: "prescription", data: { drug: "Insulin", dose: "10 units" } });
  });

  it("provider can request consent", async () => {
    const grant = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy", "medication"],
      purpose: "General consultation",
    });
    expect(grant.status).toBe("pending");
    expect(grant.providerName).toBe("Dr. Sharma");
    expect(grant.providerOrg).toBe("City Hospital");
    expect(grant.requestedCategories).toEqual(["allergy", "medication"]);
  });

  it("patient can grant consent", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy", "medication"],
      purpose: "General consultation",
    });
    const granted = await consent.grantConsent(patient.principal, req.id);
    expect(granted.status).toBe("granted");
    expect(granted.approvedCategories).toEqual(["allergy", "medication"]);
    expect(granted.grantedAt).toBeTruthy();
    expect(granted.expiresAt).toBeTruthy();
  });

  it("patient can decline consent", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Consultation",
    });
    const declined = await consent.declineConsent(patient.principal, req.id);
    expect(declined.status).toBe("declined");
  });

  it("patient can revoke active consent", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Consultation",
    });
    await consent.grantConsent(patient.principal, req.id);
    const revoked = await consent.revokeConsent(patient.principal, req.id);
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toBeTruthy();
  });

  it("provider reads ONLY approved categories — server-side enforcement", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy", "medication", "condition", "prescription"],
      purpose: "Full review",
    });
    // Patient grants only allergy + medication
    await consent.grantConsent(patient.principal, req.id, ["allergy", "medication"]);
    const result = await consent.readConsentedData(provider.principal, req.id);
    const types = result.items.map(i => i.type);
    expect(types).toContain("allergy");
    expect(types).toContain("medication");
    expect(types).not.toContain("condition");
    expect(types).not.toContain("prescription");
  });

  it("revocation immediately blocks data access", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Quick check",
    });
    await consent.grantConsent(patient.principal, req.id);
    // Read before revoke — should work
    const before = await consent.readConsentedData(provider.principal, req.id);
    expect(before.items.length).toBeGreaterThan(0);
    // Revoke
    await consent.revokeConsent(patient.principal, req.id);
    // Read after revoke — should fail
    await expect(consent.readConsentedData(provider.principal, req.id)).rejects.toThrow();
  });

  it("patient accounts cannot request consent", async () => {
    await expect(
      consent.requestConsent(patient.principal, {
        subjectId,
        categories: ["allergy"],
        purpose: "test",
      }),
    ).rejects.toThrow("provider account required");
  });

  it("another patient cannot grant/decline someone else's consent request", async () => {
    const other = await makeUser(ctx, "other@example.com");
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Consultation",
    });
    // Other patient tries to grant — should be denied (not their consent request)
    await expectDenied(() => consent.grantConsent(other.principal, req.id));
    await expectDenied(() => consent.declineConsent(other.principal, req.id));
  });

  it("provider can add record under active grant", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy", "prescription"],
      purpose: "Treatment",
    });
    await consent.grantConsent(patient.principal, req.id);
    const { itemId } = await medical.addProviderItem(
      subjectId,
      provider.principal.accountId,
      "Dr. Sharma",
      { type: "prescription", data: { drug: "Amoxicillin", dose: "250mg" } },
    );
    expect(itemId).toBeTruthy();
    // Verify it's marked as provider_verified
    const items = await medical.listItems(patient.principal, subjectId);
    const added = items.find(i => i.id === itemId);
    expect(added?.verificationStatus).toBe("provider_verified");
    expect(added?.providerNameSnapshot).toBe("Dr. Sharma");
    expect(added?.provenance).toBe("provider_verified");
  });

  it("lists patient grants correctly", async () => {
    await consent.requestConsent(provider.principal, { subjectId, categories: ["allergy"], purpose: "A" });
    await consent.requestConsent(provider.principal, { subjectId, categories: ["medication"], purpose: "B" });
    const grants = await consent.listPatientGrants(patient.principal, subjectId);
    expect(grants.length).toBe(2);
  });

  it("lists provider grants correctly", async () => {
    await consent.requestConsent(provider.principal, { subjectId, categories: ["allergy"], purpose: "A" });
    const grants = await consent.listProviderGrants(provider.principal);
    expect(grants.length).toBe(1);
    expect(grants[0]!.providerName).toBe("Dr. Sharma");
  });

  it("IDOR: provider B cannot read data from provider A's grant", async () => {
    const providerB = await makeProviderUser(ctx, "drb@example.com", "Dr. B");
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Consultation",
    });
    await consent.grantConsent(patient.principal, req.id);
    await expectDenied(() => consent.readConsentedData(providerB.principal, req.id));
  });

  it("consent request requires at least one category", async () => {
    await expect(
      consent.requestConsent(provider.principal, {
        subjectId,
        categories: [],
        purpose: "Test",
      }),
    ).rejects.toThrow("at least one category");
  });

  it("consent request requires purpose", async () => {
    await expect(
      consent.requestConsent(provider.principal, {
        subjectId,
        categories: ["allergy"],
        purpose: "",
      }),
    ).rejects.toThrow("purpose required");
  });

  it("double grant fails", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Test",
    });
    await consent.grantConsent(patient.principal, req.id);
    await expect(consent.grantConsent(patient.principal, req.id)).rejects.toThrow("not pending");
  });

  it("double revoke fails", async () => {
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Test",
    });
    await consent.grantConsent(patient.principal, req.id);
    await consent.revokeConsent(patient.principal, req.id);
    await expect(consent.revokeConsent(patient.principal, req.id)).rejects.toThrow("not active");
  });

  it("cross-patient isolation: provider cannot use consent to read another patient's data", async () => {
    const patient2 = await makeUser(ctx, "patient2@example.com");
    const { subjectId: subjectId2 } = await profile.createSubject(patient2.principal, { fullName: "Patient Two" });
    await medical.addItem(patient2.principal, subjectId2, { type: "allergy", data: { name: "Latex" } });

    // Provider has consent on patient1
    const req = await consent.requestConsent(provider.principal, {
      subjectId,
      categories: ["allergy"],
      purpose: "Check",
    });
    await consent.grantConsent(patient.principal, req.id);

    // Read patient1's data — should work
    const data = await consent.readConsentedData(provider.principal, req.id);
    expect(data.items.some(i => i.data.name === "Penicillin")).toBe(true);
    expect(data.items.some(i => i.data.name === "Latex")).toBe(false);
  });
});
