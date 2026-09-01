import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { newId } from "@medikey/core";
import type { Repository } from "../adapters/ports";

/**
 * AuthProvider port (doc 06 / adjustment 3).
 *
 * The auth MECHANISM is frozen (passkeys primary + email-OTP recovery + step-up).
 * The PROVIDER is an OPEN decision resolved behind this port. This file ships a
 * clearly-labelled DEV-ONLY adapter so the app runs locally. Productionised
 * passkeys / a managed provider are DEFERRED until the provider decision is
 * approved — no production custom auth is committed here.
 */
export interface AuthProvider {
  readonly kind: string;
  /** Establish/replace the account's primary credential. */
  setCredential(accountId: string, secret: string): Promise<void>;
  /** Verify a presented secret against the stored credential. */
  verify(accountId: string, secret: string): Promise<boolean>;
}

/**
 * DEV-ONLY adapter. Uses scrypt (vetted) over a dev passphrase, persisted as a
 * salted hash in the credentials table. This stands in for a real passkey/WebAuthn
 * provider during local development. It MUST NOT be used in production.
 */
export class DevAuthProvider implements AuthProvider {
  readonly kind = "dev-only(non-production)";
  constructor(private readonly repo: Repository) {}

  async setCredential(accountId: string, secret: string): Promise<void> {
    const salt = randomBytes(16);
    const hash = scryptSync(secret, salt, 32);
    await this.repo.addCredential({
      id: newId(),
      accountId,
      type: "dev",
      secretHash: `${salt.toString("hex")}:${hash.toString("hex")}`,
      label: "dev-credential",
      createdAt: new Date().toISOString(),
    });
  }

  async verify(accountId: string, secret: string): Promise<boolean> {
    const cred = await this.repo.getCredentialByAccountAndType(accountId, "dev");
    if (!cred?.secretHash) return false;
    const [saltHex, hashHex] = cred.secretHash.split(":");
    if (!saltHex || !hashHex) return false;
    const derived = scryptSync(secret, Buffer.from(saltHex, "hex"), 32);
    const expected = Buffer.from(hashHex, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }
}
