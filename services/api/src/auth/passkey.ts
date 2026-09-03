import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { newId, type Principal } from "@medikey/core";
import type { AppContext } from "../app/context";
import { AuthError } from "../app/errors";
import type { Credential } from "../domain/model";

/**
 * Production passkey (WebAuthn) provider — the frozen "passkeys primary" auth
 * mechanism (doc 06 / ADR-6), replacing the dev-only secret adapter. Uses the
 * vetted @simplewebauthn/server for the ceremonies; MediKey stores only the
 * credential's PUBLIC key + signature counter (never a shared secret). The RP
 * (RP_ID / RP_ORIGIN) comes from config so the same code runs on localhost and
 * in production. Challenges are held in the Cache port with a short TTL.
 *
 * The managed-provider / residency decision (doc 18) stays open above this: it
 * governs WHERE the RP runs and identity verification, not the passkey protocol.
 */

interface StoredPasskey {
  id: string;            // credential id (base64url)
  publicKey: string;     // COSE public key (base64url)
  counter: number;
  transports?: string[];
}

const b64u = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64url");
// Uint8Array.from copies into a fresh ArrayBuffer-backed array (Uint8Array<ArrayBuffer>),
// which is what @simplewebauthn's WebAuthnCredential.publicKey expects.
const fromB64u = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(Buffer.from(s, "base64url"));

const CHALLENGE_TTL = 300;

export class PasskeyService {
  constructor(private readonly ctx: AppContext) {}

  private get rp() {
    return { id: this.ctx.env.RP_ID, origin: this.ctx.env.RP_ORIGIN, name: this.ctx.env.RP_NAME };
  }

  private async passkeys(accountId: string): Promise<Credential[]> {
    return this.ctx.repo.listCredentialsByAccountAndType(accountId, "passkey");
  }
  private parse(c: Credential): StoredPasskey {
    return JSON.parse(c.publicKey ?? "{}") as StoredPasskey;
  }

  /** Begin enrolment for a signed-in account. */
  async registrationOptions(principal: Principal, email: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const existing = await this.passkeys(principal.accountId);
    const options = await generateRegistrationOptions({
      rpName: this.rp.name,
      rpID: this.rp.id,
      userName: email,
      userID: new TextEncoder().encode(principal.accountId),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({ id: this.parse(c).id })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    await this.ctx.cache.set(`wa:reg:${principal.accountId}`, options.challenge, CHALLENGE_TTL);
    return options;
  }

  /** Finish enrolment: verify the attestation and store the public key. */
  async registrationVerify(principal: Principal, response: RegistrationResponseJSON): Promise<{ credentialId: string }> {
    const expectedChallenge = await this.ctx.cache.get(`wa:reg:${principal.accountId}`);
    if (!expectedChallenge) throw new AuthError("registration challenge expired");
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rp.origin,
      expectedRPID: this.rp.id,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) throw new AuthError("passkey registration failed");
    await this.ctx.cache.del(`wa:reg:${principal.accountId}`);

    const c = verification.registrationInfo.credential;
    const stored: StoredPasskey = { id: c.id, publicKey: b64u(c.publicKey), counter: c.counter, transports: c.transports };
    const cred: Credential = {
      id: newId(), accountId: principal.accountId, type: "passkey",
      publicKey: JSON.stringify(stored), label: c.id, createdAt: this.ctx.now(),
    };
    await this.ctx.repo.addCredential(cred);
    await this.ctx.audit.append({
      id: newId(), type: "passkey_registered", accountId: principal.accountId,
      detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
    return { credentialId: c.id };
  }

  /**
   * Begin a passkey assertion for an email. Options are returned whether or not
   * the account exists (no user-enumeration); the challenge is bound to the email.
   */
  async authenticationOptions(email: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const normEmail = email.trim().toLowerCase();
    const account = await this.ctx.repo.getAccountByEmail(normEmail);
    const creds = account ? await this.passkeys(account.id) : [];
    const options = await generateAuthenticationOptions({
      rpID: this.rp.id,
      userVerification: "preferred",
      allowCredentials: creds.map((c) => ({ id: this.parse(c).id })),
    });
    await this.ctx.cache.set(`wa:auth:${normEmail}`, options.challenge, CHALLENGE_TTL);
    return options;
  }

  /** Finish a passkey assertion; returns the authenticated principal id on success. */
  async authenticationVerify(email: string, response: AuthenticationResponseJSON): Promise<{ accountId: string; userVerified: boolean }> {
    const normEmail = email.trim().toLowerCase();
    const expectedChallenge = await this.ctx.cache.get(`wa:auth:${normEmail}`);
    const account = await this.ctx.repo.getAccountByEmail(normEmail);
    // Uniform failure — reveal nothing about which of email/challenge/credential was wrong.
    if (!expectedChallenge || !account || account.status !== "active") throw new AuthError();

    const creds = await this.passkeys(account.id);
    const match = creds.find((c) => this.parse(c).id === response.id);
    if (!match) throw new AuthError();
    const sp = this.parse(match);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rp.origin,
      expectedRPID: this.rp.id,
      requireUserVerification: false,
      credential: { id: sp.id, publicKey: fromB64u(sp.publicKey), counter: sp.counter, transports: sp.transports as never },
    });
    if (!verification.verified) throw new AuthError();
    await this.ctx.cache.del(`wa:auth:${normEmail}`);

    // Persist the new signature counter (clone-detection).
    sp.counter = verification.authenticationInfo.newCounter;
    match.publicKey = JSON.stringify(sp);
    await this.ctx.repo.updateCredential(match);

    return { accountId: account.id, userVerified: verification.authenticationInfo.userVerified };
  }
}
