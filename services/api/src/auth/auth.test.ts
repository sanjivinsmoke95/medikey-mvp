import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext, type AppContext } from "../app/context";
import { AuthService } from "./service";
import { AuthError } from "../app/errors";

describe("AuthService (P2)", () => {
  let ctx: AppContext;
  let auth: AuthService;
  beforeEach(() => {
    ctx = createTestContext();
    auth = new AuthService(ctx);
  });

  const reg = { email: "asha@example.com", secret: "correct horse battery" };

  it("registers, logs in, and issues a primary session", async () => {
    await auth.register(reg);
    const s = await auth.login(reg.email, reg.secret);
    expect(s.authStrength).toBe("primary");
    const p = await auth.verifySession(s.token);
    expect(p?.accountId).toBeTruthy();
  });

  it("rejects duplicate email and an empty passphrase (short is allowed)", async () => {
    await auth.register(reg);
    await expect(auth.register(reg)).rejects.toThrow();
    await expect(auth.register({ email: "x@y.com", secret: "" })).rejects.toThrow(); // empty rejected
    await expect(auth.register({ email: "z@y.com", secret: "1234" })).resolves.toBeTruthy(); // short is fine
  });

  it("login fails uniformly for wrong secret and unknown email", async () => {
    await auth.register(reg);
    await expect(auth.login(reg.email, "wrong")).rejects.toBeInstanceOf(AuthError);
    await expect(auth.login("nobody@x.com", "whatever")).rejects.toBeInstanceOf(AuthError);
  });

  it("step-up requires the primary credential and yields stepped_up", async () => {
    await auth.register(reg);
    const s = await auth.login(reg.email, reg.secret);
    await expect(auth.stepUp(s.token, "wrong")).rejects.toBeInstanceOf(AuthError);
    const up = await auth.stepUp(s.token, reg.secret);
    expect(up.authStrength).toBe("stepped_up");
  });

  it("OTP is recovery-only: yields primary, and CANNOT reach stepped_up without the credential", async () => {
    await auth.register(reg);
    const { devCode } = await auth.requestOtp(reg.email);
    expect(devCode).toBeTruthy();
    const s = await auth.verifyOtp(reg.email, devCode!);
    expect(s.authStrength).toBe("primary");
    // An OTP session holder without the credential cannot step up.
    await expect(auth.stepUp(s.token, "guessing")).rejects.toBeInstanceOf(AuthError);
  });

  it("revokes all sessions (device-theft response)", async () => {
    await auth.register(reg);
    const s = await auth.login(reg.email, reg.secret);
    const p = await auth.requirePrincipal(s.token);
    await auth.revokeAllSessions(p);
    expect(await auth.verifySession(s.token)).toBeUndefined();
  });

  it("login notification carries no medical content", async () => {
    await auth.register(reg);
    await auth.login(reg.email, reg.secret);
    const summaries = ctx.notifier.sent().map((n) => n.summary).join(" ");
    expect(summaries).not.toMatch(/allerg|medic|condition|blood/i);
  });
});
