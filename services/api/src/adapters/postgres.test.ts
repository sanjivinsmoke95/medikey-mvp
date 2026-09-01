import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { assembleApp } from "../app/assemble";
import { createServerContext } from "../app/context";
import type { AppContext } from "../app/context";

/**
 * Postgres + Redis adapter integration (P12). Runs the full DoD flow through the
 * real adapters against a live Postgres/Redis, then proves two things the
 * in-memory adapters can't: (1) data survives a fresh connection (persistence),
 * and (2) crypto-shred is a tombstone — after account deletion the subject key
 * is gone and its ciphertext is unrecoverable, with no resurrection.
 *
 * Skips unless DATABASE_URL is set, so the default suite stays DB-free. Point it
 * at the docker-compose Postgres (see docker-compose.dev.yml / README):
 *   DATABASE_URL=postgres://medikey:medikey_local_dev@127.0.0.1:5433/medikey_test \
 *   REDIS_URL=redis://127.0.0.1:6379 \
 *   pnpm vitest run services/api/src/adapters/postgres.test.ts
 */
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const MASTER_KEY = process.env.MASTER_KEY ?? "dGVzdC1tYXN0ZXIta2V5LTMyLWJ5dGVzLXh4eHh4eHg="; // stable across contexts
const run = DATABASE_URL ? describe : describe.skip;

function env(): Record<string, string | undefined> {
  return { NODE_ENV: "test", DATABASE_URL, REDIS_URL, MASTER_KEY, IDENTIFIER_PEPPER: "test-pepper-stable" };
}

run("Postgres/Redis adapters — full flow, persistence, crypto-shred", () => {
  beforeAll(() => {
    // Fresh schema + migrations for a clean run.
    execFileSync("node", [resolve(__dirname, "../../../../scripts/migrate.mjs"), "--reset"], {
      env: { ...process.env, DATABASE_URL }, stdio: "ignore",
    });
  });

  let subjectId = "";
  let opaque = "";
  let accountId = "";

  it("runs the DoD flow against Postgres + Redis", async () => {
    const app = assembleApp((await createServerContext(env())) as AppContext);
    const { auth, profile, medical, disclosure, qr, scanner, breakGlass } = app;

    await auth.register({ email: "pg@example.com", secret: "correct horse battery staple" });
    const login = await auth.login("pg@example.com", "correct horse battery staple");
    const stepped = await auth.stepUp(login.token, "correct horse battery staple");
    const principal = await auth.requirePrincipal(stepped.token);
    accountId = principal.accountId;

    const sub = await profile.createSubject(principal, { fullName: "Asha Rao", dateOfBirth: "1988-03-03" });
    subjectId = sub.subjectId;

    const allergy = await medical.addItem(principal, subjectId, {
      type: "allergy", data: { name: "penicillin", reaction: "anaphylaxis" }, isCritical: true, severity: "life_threatening",
    });
    const med = await medical.addItem(principal, subjectId, { type: "medication", data: { name: "warfarin", dose: "5mg" } });
    const sensitive = await medical.addItem(principal, subjectId, { type: "condition", data: { name: "private-l3-note" } });

    await disclosure.setSelections(principal, subjectId, [
      { fieldRef: "name", tier: "l1_critical" },
      { fieldRef: "age", tier: "l1_critical" },
      { fieldRef: `item:${allergy.itemId}`, tier: "l1_critical" },
      { fieldRef: `item:${med.itemId}`, tier: "l2_additional" },
      { fieldRef: `item:${sensitive.itemId}`, tier: "l3_sensitive" },
    ]);

    const created = await qr.createQr(principal, subjectId, "wallet");
    opaque = created.opaqueId;

    const scan = await scanner.scan(opaque, { ipCoarse: "1.2" });
    expect(scan.state).toBe("ok");
    expect(scan.html).toContain("penicillin");
    expect(scan.html).not.toContain("warfarin");     // L2 not on L1
    expect(scan.html).not.toContain("private-l3-note"); // L3 never via scan

    const bg = await breakGlass.request(opaque, "paramedic");
    const l2 = await breakGlass.viewL2(opaque, bg.token!);
    expect(l2.html).toContain("warfarin");
    expect(l2.html).not.toContain("private-l3-note");
  });

  it("data persists across a fresh connection (new context, same DB)", async () => {
    // A brand-new context (new pool, new key provider) must read the same data.
    const app2 = assembleApp((await createServerContext(env())) as AppContext);
    const login = await app2.auth.login("pg@example.com", "correct horse battery staple");
    const principal = await app2.auth.requirePrincipal(login.token);
    const subjects = await app2.profile.listSubjects(principal);
    expect(subjects.some((s) => s.fullName === "Asha Rao")).toBe(true);

    // Ciphertext at rest: raw rows carry no plaintext.
    const ctx = (await createServerContext(env())) as AppContext;
    const raw = await (ctx.repo as any).getSubject(subjectId);
    expect(JSON.stringify(raw)).not.toContain("Asha Rao");

    // And the scanner still serves L1 from persisted state.
    const scan = await app2.scanner.scan(opaque, { ipCoarse: "1.2" });
    expect(scan.html).toContain("penicillin");
  });

  it("crypto-shred on deletion → subject key gone, ciphertext unrecoverable, no resurrection", async () => {
    const app = assembleApp((await createServerContext(env())) as AppContext);
    const login = await app.auth.login("pg@example.com", "correct horse battery staple");
    const stepped = await app.auth.stepUp(login.token, "correct horse battery staple");
    const principal = await app.auth.requirePrincipal(stepped.token);

    await app.rights.deleteAccount(principal);

    // Subject row purged.
    const ctx = (await createServerContext(env())) as AppContext;
    expect(await ctx.repo.getSubject(subjectId)).toBeUndefined();

    // Key tombstoned: attempting to use it throws (no resurrection to a new key).
    await expect(ctx.keys.ensureSubjectKey(subjectId)).rejects.toThrow();

    // Sessions revoked by deletion.
    expect(await app.auth.verifySession(login.token)).toBeUndefined();
    void accountId;
  });
});
