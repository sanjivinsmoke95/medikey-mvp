import { newId, hmacHex, randomToken, type Principal } from "@medikey/core";
import type { AppContext } from "../app/context";
import { AuthError, ConflictError, RateLimitError, ValidationError } from "../app/errors";
import type { Account, Session } from "../domain/model";

const NOTICE_VERSION = "2026-08-31";

export interface RegisterInput {
  email: string;
  secret: string; // dev credential (stands in for passkey enrolment)
  preferredLanguage?: string;
}

export interface SessionResult {
  token: string; // returned once; only the hash is stored
  accountId: string;
  authStrength: Session["authStrength"];
  expiresAt: string;
}

export class AuthService {
  constructor(private readonly ctx: AppContext) {}

  private hashToken(token: string): string {
    return hmacHex(this.ctx.pepper, token);
  }

  private async issueSession(
    accountId: string,
    strength: Session["authStrength"],
    ttlSeconds: number,
  ): Promise<SessionResult> {
    const token = randomToken(32);
    const now = Date.now();
    const session: Session = {
      id: newId(),
      accountId,
      tokenHash: this.hashToken(token),
      authStrength: strength,
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.createSession(session);
    return { token, accountId, authStrength: strength, expiresAt: session.expiresAt };
  }

  async register(input: RegisterInput): Promise<{ accountId: string }> {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new ValidationError("invalid email");
    if (input.secret.length < 8) throw new ValidationError("secret too short");
    if (await this.ctx.repo.getAccountByEmail(email)) throw new ConflictError("email in use");

    const account: Account = {
      id: newId(),
      email,
      status: "active",
      preferredLanguage: input.preferredLanguage ?? "en",
      locationLoggingOptIn: false, // G6 default OFF
      createdAt: this.ctx.now(),
    };
    await this.ctx.repo.createAccount(account);
    await this.ctx.auth.setCredential(account.id, input.secret);
    await this.ctx.repo.addConsent({
      id: newId(),
      accountId: account.id,
      purpose: "account",
      noticeVersion: NOTICE_VERSION,
      grantedAt: this.ctx.now(),
    });
    await this.ctx.audit.append({
      id: newId(), type: "account_register", accountId: account.id,
      detail: { provider: this.ctx.auth.kind }, severity: "info", createdAt: this.ctx.now(),
    });
    return { accountId: account.id };
  }

  async login(email: string, secret: string): Promise<SessionResult> {
    const acc = await this.ctx.repo.getAccountByEmail(email.trim().toLowerCase());
    // Uniform failure — do not reveal whether the email exists.
    if (!acc || acc.status !== "active" || !(await this.ctx.auth.verify(acc.id, secret))) {
      await this.ctx.audit.append({
        id: newId(), type: "login_failed", detail: {}, severity: "warn", createdAt: this.ctx.now(),
      });
      throw new AuthError();
    }
    const result = await this.issueSession(acc.id, "primary", this.ctx.env.SESSION_TTL_SECONDS);
    // New-device notification (no medical content).
    await this.ctx.notifier.notifyOwner(acc.id, "new_login", "New sign-in to your MediKey account");
    await this.ctx.audit.append({
      id: newId(), type: "login", accountId: acc.id, detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
    return result;
  }

  /** Step-up requires re-presenting the primary credential (not OTP). */
  async stepUp(sessionToken: string, secret: string): Promise<SessionResult> {
    const principal = await this.requirePrincipal(sessionToken);
    if (!(await this.ctx.auth.verify(principal.accountId, secret))) throw new AuthError();
    await this.ctx.audit.append({
      id: newId(), type: "stepup", accountId: principal.accountId, detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
    return this.issueSession(principal.accountId, "stepped_up", this.ctx.env.STEPUP_TTL_SECONDS);
  }

  async verifySession(token: string): Promise<Principal | undefined> {
    const s = await this.ctx.repo.getSessionByTokenHash(this.hashToken(token));
    if (!s || s.revokedAt || Date.parse(s.expiresAt) < Date.now()) return undefined;
    return { accountId: s.accountId, authStrength: s.authStrength };
  }

  async requirePrincipal(token: string): Promise<Principal> {
    const p = await this.verifySession(token);
    if (!p) throw new AuthError();
    return p;
  }

  async revokeAllSessions(principal: Principal): Promise<void> {
    await this.ctx.repo.revokeAllSessionsForAccount(principal.accountId);
    await this.ctx.audit.append({
      id: newId(), type: "sessions_revoked", accountId: principal.accountId, detail: {}, severity: "info", createdAt: this.ctx.now(),
    });
  }

  // --- Email OTP: RECOVERY ONLY (issues a PRIMARY session; sensitive ops still
  //     need step-up, which requires the primary credential — so OTP alone can
  //     never reach stepped_up). ---
  async requestOtp(email: string): Promise<{ devCode?: string }> {
    const key = `otp:${email.trim().toLowerCase()}`;
    if (!(await this.ctx.rateLimiter.allow(key, 5, 3600))) throw new RateLimitError();
    const acc = await this.ctx.repo.getAccountByEmail(email.trim().toLowerCase());
    if (!acc) return {}; // do not reveal existence
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.ctx.cache.set(`otpcode:${acc.id}`, this.hashToken(code), 600);
    // In production the code is delivered via the email provider, never returned.
    return this.ctx.env.NODE_ENV === "production" ? {} : { devCode: code };
  }

  async verifyOtp(email: string, code: string): Promise<SessionResult> {
    const acc = await this.ctx.repo.getAccountByEmail(email.trim().toLowerCase());
    if (!acc) throw new AuthError();
    const stored = await this.ctx.cache.get(`otpcode:${acc.id}`);
    if (!stored || stored !== this.hashToken(code)) throw new AuthError();
    await this.ctx.cache.del(`otpcode:${acc.id}`); // single-use
    return this.issueSession(acc.id, "primary", this.ctx.env.SESSION_TTL_SECONDS);
  }
}
