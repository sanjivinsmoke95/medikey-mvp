import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Principal } from "@medikey/core";
import { AuthzError } from "@medikey/core";
import { createApp, type App } from "../app/assemble";
import { AppError, AuthError } from "../app/errors";
import { renderEmergencyPage } from "../emergency/render";
import { OWNER_UI_HTML } from "./owner-ui";

/**
 * HTTP layer (P11) — wires the frozen service layer behind a zero-dependency
 * Node HTTP server. This is the runnable surface: a public SSR **scanner** path,
 * a JSON **owner API**, and a minimal server-served **owner console** (single
 * static page). No new authority: every handler calls the same services the
 * tests exercise, so all invariants (IDOR, step-up, L1-only, uniform neutral
 * pages, no-oracle) are preserved unchanged.
 *
 * Deliberately dependency-free: the MVP runs local-first from source with no
 * package install. The Postgres/Redis/KMS adapters and a rich PWA remain the
 * documented next builds; this server accepts either adapter set behind the
 * existing ports (it just calls createApp()).
 */

type Handler = (rc: ReqCtx) => Promise<void> | void;

interface Route {
  method: string;
  // path segments; a segment starting with ":" is a named param
  parts: string[];
  handler: Handler;
  auth: "none" | "primary" | "stepup";
}

interface ReqCtx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  principal?: Principal;
  app: App;
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

function html(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

/** Coarse network region only — first two octets, never a precise IP (G6). */
function coarseIp(req: IncomingMessage): string {
  const raw =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "";
  const v4 = raw.replace(/^::ffff:/, "");
  const octets = v4.split(".");
  return octets.length === 4 ? `${octets[0]}.${octets[1]}` : "unknown";
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new AppError("payload_too_large", "payload too large", 413);
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("invalid_json", "invalid JSON body", 400);
  }
}

function bearer(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization;
  if (!h) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1];
}

export function buildRouter(app: App) {
  const routes: Route[] = [];
  const add = (method: string, path: string, auth: Route["auth"], handler: Handler) => {
    routes.push({ method, parts: path.split("/").filter(Boolean), handler, auth });
  };

  // ---- Public scanner surface (no auth; never leaks an existence oracle) ----
  add("GET", "/e/:opaqueId", "none", async ({ res, params, query, req }) => {
    const scan = await app.scanner.scan(params.opaqueId!, {
      ipCoarse: coarseIp(req),
      lang: query.get("lang") ?? undefined,
    });
    html(res, scan.state === "not_found" || scan.state === "revoked" ? 404 : 200, scan.html);
  });

  add("GET", "/e/:opaqueId/l2", "none", async ({ res, params, query }) => {
    const token = query.get("token") ?? "";
    const view = await app.breakGlass.viewL2(params.opaqueId!, token, query.get("lang") ?? "en");
    html(res, view.ok ? 200 : 404, view.html);
  });

  add("POST", "/api/breakglass/:opaqueId/request", "none", async ({ res, params, body }) => {
    const b = (body ?? {}) as { attestation?: string };
    const result = await app.breakGlass.request(params.opaqueId!, b.attestation);
    json(res, 200, result);
  });

  // ---- Auth ----
  add("POST", "/api/auth/register", "none", async ({ res, body }) => {
    const b = (body ?? {}) as { email?: string; secret?: string; preferredLanguage?: string };
    const out = await app.auth.register({
      email: String(b.email ?? ""),
      secret: String(b.secret ?? ""),
      preferredLanguage: b.preferredLanguage,
    });
    json(res, 201, out);
  });

  add("POST", "/api/auth/login", "none", async ({ res, body }) => {
    const b = (body ?? {}) as { email?: string; secret?: string };
    const out = await app.auth.login(String(b.email ?? ""), String(b.secret ?? ""));
    json(res, 200, out);
  });

  add("POST", "/api/auth/stepup", "primary", async ({ res, req, body }) => {
    const b = (body ?? {}) as { secret?: string };
    const token = bearer(req)!;
    const out = await app.auth.stepUp(token, String(b.secret ?? ""));
    json(res, 200, out);
  });

  add("GET", "/api/auth/me", "primary", ({ res, principal }) => {
    json(res, 200, { accountId: principal!.accountId, authStrength: principal!.authStrength });
  });

  // ---- Profile ----
  add("GET", "/api/subjects", "primary", async ({ res, principal }) => {
    json(res, 200, await app.profile.listSubjects(principal!));
  });

  add("POST", "/api/subjects", "primary", async ({ res, principal, body }) => {
    const b = (body ?? {}) as {
      fullName?: string;
      dateOfBirth?: string;
      preferredLanguage?: string;
      relationship?: string;
    };
    const out = await app.profile.createSubject(principal!, {
      fullName: String(b.fullName ?? ""),
      dateOfBirth: b.dateOfBirth,
      preferredLanguage: b.preferredLanguage,
      relationship: b.relationship as never,
    });
    json(res, 201, out);
  });

  add("GET", "/api/subjects/:id", "primary", async ({ res, principal, params }) => {
    json(res, 200, await app.profile.getSubject(principal!, params.id!));
  });

  add("PATCH", "/api/subjects/:id", "stepup", async ({ res, principal, params, body }) => {
    const b = (body ?? {}) as { fullName?: string; emergencyInstructions?: string; confirm?: boolean };
    await app.profile.updateIdentity(principal!, params.id!, b);
    json(res, 200, { ok: true });
  });

  // ---- Medical ----
  add("GET", "/api/subjects/:id/items", "primary", async ({ res, principal, params }) => {
    json(res, 200, await app.medical.listItems(principal!, params.id!));
  });

  add("POST", "/api/subjects/:id/items", "primary", async ({ res, principal, params, body }) => {
    const b = (body ?? {}) as {
      type?: string;
      data?: Record<string, unknown>;
      isCritical?: boolean;
      severity?: string;
      provenance?: string;
    };
    const out = await app.medical.addItem(principal!, params.id!, {
      type: b.type as never,
      data: b.data ?? {},
      isCritical: b.isCritical,
      severity: b.severity,
      provenance: b.provenance as never,
    });
    json(res, 201, out);
  });

  add("DELETE", "/api/items/:itemId", "primary", async ({ res, principal, params }) => {
    await app.medical.deleteItem(principal!, params.itemId!);
    json(res, 200, { ok: true });
  });

  // ---- Disclosure ----
  add("PUT", "/api/subjects/:id/selections", "stepup", async ({ res, principal, params, body }) => {
    const b = (body ?? {}) as { entries?: { fieldRef: string; tier: string }[] };
    await app.disclosure.setSelections(
      principal!,
      params.id!,
      (b.entries ?? []).map((e) => ({ fieldRef: e.fieldRef, tier: e.tier as never })),
    );
    json(res, 200, { ok: true });
  });

  add("GET", "/api/subjects/:id/preview", "primary", async ({ res, principal, params, query }) => {
    const level = (query.get("level") ?? "l1") as "l1" | "l2" | "l3";
    json(res, 200, await app.disclosure.preview(principal!, params.id!, level));
  });

  // Owner "mandatory preview" — renders the SAME SSR page a scanner sees.
  add("GET", "/api/subjects/:id/preview.html", "primary", async ({ res, principal, params, query }) => {
    const level = (query.get("level") ?? "l1") as "l1" | "l2" | "l3";
    const projection = await app.disclosure.preview(principal!, params.id!, level);
    const page = renderEmergencyPage({
      state: projection.fields.length === 0 ? "incomplete" : "ok",
      projection,
      lang: query.get("lang") ?? "en",
    });
    html(res, 200, page);
  });

  // ---- QR ----
  add("GET", "/api/subjects/:id/qr", "primary", async ({ res, principal, params }) => {
    json(res, 200, await app.qr.listQr(principal!, params.id!));
  });

  add("POST", "/api/subjects/:id/qr", "stepup", async ({ res, principal, params, body }) => {
    const b = (body ?? {}) as { label?: string };
    const out = await app.qr.createQr(principal!, params.id!, String(b.label ?? "wallet"));
    json(res, 201, out);
  });

  add("POST", "/api/qr/:qrId/revoke", "stepup", async ({ res, principal, params }) => {
    await app.qr.revokeQr(principal!, params.qrId!);
    json(res, 200, { ok: true });
  });

  // ---- Rights ----
  add("GET", "/api/subjects/:id/history", "primary", async ({ res, principal, params }) => {
    json(res, 200, await app.rights.accessHistory(principal!, params.id!));
  });

  add("POST", "/api/export", "stepup", async ({ res, principal }) => {
    json(res, 200, await app.rights.exportAccount(principal!));
  });

  add("DELETE", "/api/subjects/:id", "stepup", async ({ res, principal, params }) => {
    await app.rights.deleteSubject(principal!, params.id!);
    json(res, 200, { ok: true });
  });

  add("DELETE", "/api/account", "stepup", async ({ res, principal }) => {
    await app.rights.deleteAccount(principal!);
    json(res, 200, { ok: true });
  });

  // ---- Owner console (single static page) ----
  add("GET", "/", "none", ({ res }) => html(res, 200, OWNER_UI_HTML));
  add("GET", "/health", "none", ({ res }) => json(res, 200, { ok: true }));

  function match(method: string, path: string): { route: Route; params: Record<string, string> } | undefined {
    const parts = path.split("/").filter(Boolean);
    for (const route of routes) {
      if (route.method !== method) continue;
      if (route.parts.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.parts.length; i++) {
        const rp = route.parts[i]!;
        const pp = parts[i]!;
        if (rp.startsWith(":")) params[rp.slice(1)] = decodeURIComponent(pp);
        else if (rp !== pp) { ok = false; break; }
      }
      if (ok) return { route, params };
    }
    return undefined;
  }

  return { routes, match };
}

export function createHttpServer(app: App = createApp()) {
  const router = buildRouter(app);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const matched = router.match(req.method ?? "GET", url.pathname);

    if (!matched) {
      json(res, 404, { error: "not_found" });
      return;
    }

    const { route, params } = matched;
    try {
      const body = req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
        ? await readBody(req)
        : undefined;

      let principal: Principal | undefined;
      if (route.auth !== "none") {
        const token = bearer(req);
        principal = token ? await app.auth.verifySession(token) : undefined;
        if (!principal) throw new AuthError();
        if (route.auth === "stepup" && principal.authStrength !== "stepped_up") {
          throw new AuthzError("step-up required");
        }
      }

      await route.handler({ req, res, params, query: url.searchParams, body, principal, app });
      if (!res.writableEnded) json(res, 204, {});
    } catch (err) {
      handleError(res, err);
    }
  });

  return server;
}

function handleError(res: ServerResponse, err: unknown): void {
  if (res.writableEnded) return;
  if (err instanceof AuthzError) {
    // No existence oracle (matrix #1): an OWNERSHIP failure must be
    // indistinguishable from not-found, so assertOwns() — which throws the
    // default "forbidden" — maps to 404. Step-up and tier-placement denials act
    // on the caller's own (already-owned / route-authenticated) request, so they
    // stay 403 and keep their actionable message.
    if (err.message === "forbidden") {
      json(res, 404, { error: "not_found" });
      return;
    }
    json(res, 403, { error: "forbidden", message: err.message });
    return;
  }
  if (err instanceof AppError) {
    json(res, err.status, { error: err.code, message: err.message });
    return;
  }
  // Never leak internals.
  json(res, 500, { error: "internal_error" });
}
