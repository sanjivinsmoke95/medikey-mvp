import { type DisclosureLevel, type DisclosureTier } from "../disclosure/tiers";
import { tierAllowedAtLevel } from "../disclosure/project";

/**
 * Deny-by-default authorization primitives (doc 02 AUTHZ, matrix #1/#2/#15).
 * Every owner object access routes through assertOwns; fail closed.
 */
export class AuthzError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "AuthzError";
  }
}

export type AuthStrength = "primary" | "stepped_up";

export interface Principal {
  readonly accountId: string;
  readonly authStrength: AuthStrength;
}

/** Ownership check — resource must belong to the principal's account. */
export function assertOwns(
  resourceAccountId: string | null | undefined,
  principal: Principal,
): void {
  if (!resourceAccountId || resourceAccountId !== principal.accountId) {
    throw new AuthzError();
  }
}

/** Sensitive operations require stepped-up (re-)authentication. */
export function assertStepUp(principal: Principal): void {
  if (principal.authStrength !== "stepped_up") {
    throw new AuthzError("step-up required");
  }
}

/**
 * A field of `tier` may not be placed into an emergency selection at a level
 * it is not allowed to occupy (server-side ceiling; API T032). Used when the
 * owner configures disclosure so L3-class fields can't be lifted into L1/L2.
 */
export function assertTierPlacementAllowed(
  tier: DisclosureTier,
  requestedLevel: DisclosureLevel,
): void {
  if (!tierAllowedAtLevel(tier, requestedLevel)) {
    throw new AuthzError("tier not permitted at requested disclosure level");
  }
}
