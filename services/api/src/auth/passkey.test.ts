import { describe, it, expect } from "vitest";
import { createTestApp } from "@medikey/api";

/**
 * Passkey (WebAuthn) server-side tests. The cryptographic ceremony
 * (create/get with a platform authenticator) can't run headlessly, so these
 * cover the deterministic surface: options generation, challenge binding,
 * no user-enumeration, and rejection of bad/expired assertions.
 */
async function signedIn() {
  const app = createTestApp();
  const email = "pk@example.com";
  const secret = "correct horse battery staple";
  await app.auth.register({ email, secret });
  const login = await app.auth.login(email, secret);
  return { app, email, token: login.token };
}

describe("passkeys (WebAuthn)", () => {
  it("registration options are well-formed and challenge-bound", async () => {
    const { app, token } = await signedIn();
    const opts = await app.auth.passkeyRegisterOptions(token);
    expect(opts.rp.id).toBe("localhost");
    expect(opts.challenge).toBeTruthy();
    expect(opts.user.name).toBe("pk@example.com");
    expect(Array.isArray(opts.excludeCredentials)).toBe(true);
  });

  it("registration options require a valid session", async () => {
    const { app } = await signedIn();
    await expect(app.auth.passkeyRegisterOptions("not-a-token")).rejects.toThrow();
  });

  it("login options are returned even for an unknown email (no enumeration)", async () => {
    const { app } = await signedIn();
    const known = await app.auth.passkeyLoginOptions("pk@example.com");
    const unknown = await app.auth.passkeyLoginOptions("nobody@example.com");
    // Both return usable options with a challenge; unknown simply has no allow-list.
    expect(known.challenge).toBeTruthy();
    expect(unknown.challenge).toBeTruthy();
    expect(unknown.allowCredentials ?? []).toHaveLength(0);
  });

  it("login verify rejects a bogus assertion", async () => {
    const { app } = await signedIn();
    await app.auth.passkeyLoginOptions("pk@example.com"); // arm the challenge
    await expect(
      app.auth.passkeyLoginVerify("pk@example.com", { id: "x", rawId: "x", type: "public-key", response: {} } as never),
    ).rejects.toThrow();
  });

  it("registration verify rejects a bogus attestation", async () => {
    const { app, token } = await signedIn();
    await app.auth.passkeyRegisterOptions(token); // arm the challenge
    await expect(
      app.auth.passkeyRegisterVerify(token, { id: "x", rawId: "x", type: "public-key", response: {} } as never),
    ).rejects.toThrow();
  });

  it("verify without an armed challenge is rejected", async () => {
    const { app } = await signedIn();
    await expect(
      app.auth.passkeyLoginVerify("pk@example.com", { id: "x", rawId: "x", type: "public-key", response: {} } as never),
    ).rejects.toThrow();
  });
});
