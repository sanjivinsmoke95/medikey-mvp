import { expect } from "vitest";
import { AuthzError, type Principal } from "@medikey/core";
import { AppError } from "../app/errors";
import { createTestContext, type AppContext } from "../app/context";
import { AuthService } from "../auth/service";

/**
 * Reusable IDOR / access-control harness (T015). Asserts that an operation is
 * denied by ownership/authorization — either AuthzError (403) or NotFound (404,
 * used deliberately to avoid an existence oracle).
 */
export async function expectDenied(fn: () => Promise<unknown>): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch (e) {
    threw = true;
    const ok = e instanceof AuthzError || (e instanceof AppError && (e.status === 403 || e.status === 404));
    expect(ok, `expected an authorization/not-found denial, got: ${(e as Error).name}`).toBe(true);
  }
  expect(threw, "expected the operation to be denied").toBe(true);
}

export interface TestUser {
  principal: Principal; // stepped_up
  primary: Principal; // primary strength
  email: string;
  secret: string;
}

/** Create a registered, logged-in, stepped-up user for cross-account tests. */
export async function makeUser(ctx: AppContext, email: string): Promise<TestUser> {
  const auth = new AuthService(ctx);
  const secret = "correct horse battery staple";
  await auth.register({ email, secret });
  const s = await auth.login(email, secret);
  const up = await auth.stepUp(s.token, secret);
  const principal = await auth.requirePrincipal(up.token);
  const primary = await auth.requirePrincipal(s.token);
  return { principal, primary, email, secret };
}

export { createTestContext };
