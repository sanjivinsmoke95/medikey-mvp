import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHttpServer } from "./server";
import { createTestApp } from "../app/assemble";

/**
 * HTTP layer tests (P11). Boots the real server over a live socket and drives it
 * with fetch — proving the wiring preserves the frozen invariants at the HTTP
 * boundary: bearer auth, step-up gate, IDOR (404 not 403), L1-only scan,
 * break-glass L2 (never L3) + single-use, uniform neutral revoked page.
 */

let server: Server;
let base: string;

beforeAll(async () => {
  server = createHttpServer(createTestApp());
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

interface Res { status: number; json: any; text: string }

async function req(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { /* html/text response */ }
  return { status: res.status, json, text };
}

/** Register + login + step-up; returns { primary, stepped } tokens for an account. */
async function account(email: string, secret = "correct horse battery staple") {
  await req("POST", "/api/auth/register", { body: { email, secret } });
  const login = await req("POST", "/api/auth/login", { body: { email, secret } });
  const stepped = await req("POST", "/api/auth/stepup", { token: login.json.token, body: { secret } });
  return { primary: login.json.token as string, stepped: stepped.json.token as string };
}

describe("HTTP: auth + access control", () => {
  it("owner routes require a bearer token (401)", async () => {
    const r = await req("GET", "/api/subjects");
    expect(r.status).toBe(401);
  });

  it("register → login → me", async () => {
    const { primary } = await account("alice@example.com");
    const me = await req("GET", "/api/auth/me", { token: primary });
    expect(me.status).toBe(200);
    expect(me.json.authStrength).toBe("primary");
  });

  it("uniform login failure — wrong secret is 401, no user-enumeration", async () => {
    await account("carol@example.com");
    const bad = await req("POST", "/api/auth/login", { body: { email: "carol@example.com", secret: "wrong-secret-x" } });
    const missing = await req("POST", "/api/auth/login", { body: { email: "nobody@example.com", secret: "wrong-secret-x" } });
    expect(bad.status).toBe(401);
    expect(missing.status).toBe(401);
  });

  it("IDOR — a second account cannot read another's subject (404, not 403)", async () => {
    const alice = await account("alice2@example.com");
    const bob = await account("bob@example.com");
    const sub = await req("POST", "/api/subjects", { token: alice.primary, body: { fullName: "Alice" } });
    const asBob = await req("GET", `/api/subjects/${sub.json.subjectId}`, { token: bob.primary });
    expect(asBob.status).toBe(404);
  });

  it("step-up gate — selections need stepped-up (403 with primary, ok when stepped)", async () => {
    const a = await account("dora@example.com");
    const sub = await req("POST", "/api/subjects", { token: a.primary, body: { fullName: "Dora" } });
    const id = sub.json.subjectId;
    const denied = await req("PUT", `/api/subjects/${id}/selections`, {
      token: a.primary,
      body: { entries: [{ fieldRef: "name", tier: "l1_critical" }] },
    });
    expect(denied.status).toBe(403);
    const ok = await req("PUT", `/api/subjects/${id}/selections`, {
      token: a.stepped,
      body: { entries: [{ fieldRef: "name", tier: "l1_critical" }] },
    });
    expect(ok.status).toBe(200);
  });
});

describe("HTTP: full scan / break-glass loop", () => {
  it("scan serves L1 only; break-glass serves L2 (never L3) and is single-use; revoke → neutral", async () => {
    const a = await account("asha@example.com");
    const sub = await req("POST", "/api/subjects", {
      token: a.primary,
      body: { fullName: "Asha Rao", dateOfBirth: "1988-03-03" },
    });
    const id = sub.json.subjectId;

    const allergy = await req("POST", `/api/subjects/${id}/items`, {
      token: a.primary,
      body: { type: "allergy", data: { name: "penicillin", reaction: "anaphylaxis" }, isCritical: true, severity: "life_threatening" },
    });
    const med = await req("POST", `/api/subjects/${id}/items`, {
      token: a.primary, body: { type: "medication", data: { name: "warfarin", dose: "5mg" } },
    });
    const sensitive = await req("POST", `/api/subjects/${id}/items`, {
      token: a.primary, body: { type: "condition", data: { name: "private-l3-note" } },
    });

    await req("PUT", `/api/subjects/${id}/selections`, {
      token: a.stepped,
      body: {
        entries: [
          { fieldRef: "name", tier: "l1_critical" },
          { fieldRef: "age", tier: "l1_critical" },
          { fieldRef: `item:${allergy.json.itemId}`, tier: "l1_critical" },
          { fieldRef: `item:${med.json.itemId}`, tier: "l2_additional" },
          { fieldRef: `item:${sensitive.json.itemId}`, tier: "l3_sensitive" },
        ],
      },
    });

    const qr = await req("POST", `/api/subjects/${id}/qr`, { token: a.stepped, body: { label: "wallet" } });
    const opaque = qr.json.opaqueId as string;

    // Scan → L1 only.
    const scan = await req("GET", `/e/${opaque}`);
    expect(scan.status).toBe(200);
    expect(scan.text).toContain("penicillin");
    expect(scan.text).not.toContain("warfarin");
    expect(scan.text).not.toContain("private-l3-note");

    // Owner preview.html matches the scan (L1 only) and needs auth.
    const previewNoAuth = await req("GET", `/api/subjects/${id}/preview.html`);
    expect(previewNoAuth.status).toBe(401);
    const preview = await req("GET", `/api/subjects/${id}/preview.html`, { token: a.primary });
    expect(preview.text).toContain("penicillin");
    expect(preview.text).not.toContain("warfarin");

    // Break-glass → L2 (warfarin) but never L3; token single-use.
    const bg = await req("POST", `/api/breakglass/${opaque}/request`, { body: { attestation: "paramedic" } });
    expect(bg.json.granted).toBe(true);
    const l2 = await req("GET", `/e/${opaque}/l2?token=${bg.json.token}`);
    expect(l2.status).toBe(200);
    expect(l2.text).toContain("warfarin");
    expect(l2.text).not.toContain("private-l3-note");
    const l2again = await req("GET", `/e/${opaque}/l2?token=${bg.json.token}`);
    expect(l2again.status).toBe(404); // single-use

    // History logged; anonymous scan recorded.
    const history = await req("GET", `/api/subjects/${id}/history`, { token: a.primary });
    expect(history.json.some((h: any) => h.accessType === "anonymous" && h.status === "shown")).toBe(true);

    // Revoke → uniform neutral page (no oracle) + 404.
    const list = await req("GET", `/api/subjects/${id}/qr`, { token: a.primary });
    await req("POST", `/api/qr/${list.json[0].qrId}/revoke`, { token: a.stepped });
    const afterRevoke = await req("GET", `/e/${opaque}`);
    expect(afterRevoke.status).toBe(404);
    expect(afterRevoke.text).toContain("no longer active");
  });
});
