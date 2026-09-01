import { describe, it, expect } from "vitest";
import {
  EnvelopeCrypto,
  LocalKeyProvider,
  KeyDestroyedError,
  encryptWithKey,
  decryptWithKey,
  randomKey,
  hmacHex,
  safeEqualHex,
  randomIdentifier,
  assertOwns,
  assertStepUp,
  AuthzError,
  redact,
  createLogger,
  project,
  type DisclosureField,
  type DisclosureLevel,
} from "./index";

describe("crypto primitives (vetted lib wrappers)", () => {
  it("AES-256-GCM round-trips and rejects tampering", () => {
    const key = randomKey();
    const ct = encryptWithKey(key, "secret payload");
    expect(decryptWithKey(key, ct)).toBe("secret payload");
    const tampered = { ...ct, data: Buffer.from("evil").toString("base64") };
    expect(() => decryptWithKey(key, tampered)).toThrow();
  });

  it("HMAC is stable and comparison is constant-time-safe", () => {
    const a = hmacHex("pepper", "id");
    expect(a).toBe(hmacHex("pepper", "id"));
    expect(hmacHex("pepper2", "id")).not.toBe(a);
    expect(safeEqualHex(a, a)).toBe(true);
    expect(safeEqualHex(a, hmacHex("pepper", "other"))).toBe(false);
  });

  it("identifiers are 128-bit and unique", () => {
    const set = new Set(Array.from({ length: 1000 }, () => randomIdentifier()));
    expect(set.size).toBe(1000);
    // 16 bytes base64url ~ 22 chars
    expect([...set][0]!.length).toBeGreaterThanOrEqual(21);
  });
});

describe("envelope encryption + crypto-shred", () => {
  it("encrypts fields and a dump reveals no plaintext", async () => {
    const kp = new LocalKeyProvider();
    const env = new EnvelopeCrypto(kp);
    const field = await env.encryptField("subject-1", "penicillin");
    const dump = JSON.stringify(field);
    expect(dump).not.toContain("penicillin");
    expect(await env.decryptField("subject-1", field)).toBe("penicillin");
  });

  it("crypto-shred makes data unrecoverable (incl. backups)", async () => {
    const kp = new LocalKeyProvider();
    const env = new EnvelopeCrypto(kp);
    const field = await env.encryptField("subject-1", "warfarin");
    await kp.destroySubjectKey("subject-1"); // simulate deletion
    await expect(env.decryptField("subject-1", field)).rejects.toBeInstanceOf(
      KeyDestroyedError,
    );
  });
});

describe("authz deny-by-default", () => {
  const principal = { accountId: "acc-1", authStrength: "primary" as const };
  it("allows owner, denies others, denies missing", () => {
    expect(() => assertOwns("acc-1", principal)).not.toThrow();
    expect(() => assertOwns("acc-2", principal)).toThrow(AuthzError);
    expect(() => assertOwns(undefined, principal)).toThrow(AuthzError);
  });
  it("step-up required for sensitive ops", () => {
    expect(() => assertStepUp(principal)).toThrow(AuthzError);
    expect(() =>
      assertStepUp({ accountId: "acc-1", authStrength: "stepped_up" }),
    ).not.toThrow();
  });
});

describe("redaction", () => {
  it("redacts sensitive keys and never leaks medical values", () => {
    const out = JSON.stringify(
      redact({ name: "Asha", allergy: "penicillin", status: "shown", token: "abc" }),
    );
    expect(out).not.toContain("Asha");
    expect(out).not.toContain("penicillin");
    expect(out).not.toContain("abc");
    expect(out).toContain("shown"); // non-sensitive kept
  });

  it("logger redacts fields", () => {
    const entries: unknown[] = [];
    const log = createLogger((e) => entries.push(e));
    log.log("info", "access", { medication: "insulin", level: "l1" });
    const s = JSON.stringify(entries);
    expect(s).not.toContain("insulin");
    expect(s).toContain("l1");
  });
});

describe("project() disclosure boundary — property tests", () => {
  const sections = ["allergy", "condition", "medication", "implant"] as const;
  const tiers = ["l1_critical", "l2_additional", "l3_sensitive"] as const;

  function randomFields(n: number): DisclosureField[] {
    return Array.from({ length: n }, (_, i) => ({
      fieldRef: `f${i}`,
      tier: tiers[Math.floor(Math.random() * tiers.length)]!,
      section: sections[Math.floor(Math.random() * sections.length)]!,
      label: `label ${i}`,
      value: `value ${i}`,
      provenance: "user_provided" as const,
    }));
  }

  it("scanner levels NEVER contain l3, over 500 random inputs", () => {
    for (let r = 0; r < 500; r++) {
      const fields = randomFields(1 + Math.floor(Math.random() * 20));
      for (const level of ["l1", "l2"] as DisclosureLevel[]) {
        const res = project(fields, level);
        expect(res.fields.some((f) => f.tier === "l3_sensitive")).toBe(false);
      }
    }
  });

  it("output only contains tiers allowed at the level", () => {
    const fields = randomFields(30);
    const l1 = project(fields, "l1");
    expect(l1.fields.every((f) => f.tier === "l1_critical")).toBe(true);
    const l2 = project(fields, "l2");
    expect(
      l2.fields.every((f) => f.tier === "l1_critical" || f.tier === "l2_additional"),
    ).toBe(true);
    const l3 = project(fields, "l3");
    expect(l3.fields.length).toBe(fields.length); // owner/professional sees all
  });

  it("is pure — does not mutate input", () => {
    const fields = randomFields(10);
    const snapshot = JSON.stringify(fields);
    project(fields, "l1");
    expect(JSON.stringify(fields)).toBe(snapshot);
  });
});
