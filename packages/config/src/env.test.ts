import { describe, it, expect } from "vitest";
import { loadServerEnv, allowsEphemeralKeys } from "./env";

describe("loadServerEnv", () => {
  it("defaults NODE_ENV to development", () => {
    expect(loadServerEnv({}).NODE_ENV).toBe("development");
  });

  it("parses a valid environment", () => {
    const env = loadServerEnv({ NODE_ENV: "staging", SESSION_TTL_SECONDS: "1800" });
    expect(env.NODE_ENV).toBe("staging");
    expect(env.SESSION_TTL_SECONDS).toBe(1800);
  });

  it("location logging is OFF by default (G6)", () => {
    expect(loadServerEnv({}).LOCATION_LOGGING_ENABLED).toBe(false);
  });

  it("does NOT default the legal-set deletion window (doc 18)", () => {
    expect(loadServerEnv({}).DELETION_RECONCILIATION_DAYS).toBeUndefined();
  });

  it("requires crypto material in production and reports only KEYS on failure", () => {
    try {
      loadServerEnv({ NODE_ENV: "production" });
      throw new Error("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("MASTER_KEY");
      expect(msg).toContain("IDENTIFIER_PEPPER");
      // never leaks values
      expect(msg).not.toMatch(/=.*[A-Za-z0-9]{16,}/);
    }
  });

  it("rejects invalid input reporting only the key name", () => {
    try {
      loadServerEnv({ NODE_ENV: "nonsense" });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("NODE_ENV");
      expect((e as Error).message).not.toContain("nonsense");
    }
  });

  it("allows ephemeral keys only in dev/test", () => {
    expect(allowsEphemeralKeys(loadServerEnv({ NODE_ENV: "development" }))).toBe(true);
    expect(allowsEphemeralKeys(loadServerEnv({ NODE_ENV: "test" }))).toBe(true);
    expect(allowsEphemeralKeys(loadServerEnv({ NODE_ENV: "staging" }))).toBe(false);
  });
});
