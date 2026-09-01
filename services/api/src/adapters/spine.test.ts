import { describe, it, expect } from "vitest";
import { MemoryAuditSink, MemoryCache, MemoryRateLimiter, MemoryNotifier } from "./memory";
import { newId } from "@medikey/core";

describe("audit sink (append-only)", () => {
  it("appends and lists; exposes no mutate/delete surface", async () => {
    const audit = new MemoryAuditSink();
    await audit.append({
      id: newId(), type: "login", detail: {}, severity: "info",
      accountId: "a1", createdAt: new Date().toISOString(),
    });
    expect((await audit.list({ accountId: "a1" })).length).toBe(1);
    // Type-level guarantee: AuditSink has only append/list (no update/delete).
    expect("update" in audit).toBe(false);
    expect("delete" in audit).toBe(false);
  });
});

describe("cache TTL + active purge (revocation SLO backing)", () => {
  it("stores with TTL and purges on del", async () => {
    const cache = new MemoryCache();
    await cache.set("k", "v", 300);
    expect(await cache.get("k")).toBe("v");
    await cache.del("k"); // active purge
    expect(await cache.get("k")).toBeUndefined();
  });
  it("expires after TTL", async () => {
    const cache = new MemoryCache();
    await cache.set("k", "v", -1); // already expired
    expect(await cache.get("k")).toBeUndefined();
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then blocks", async () => {
    const rl = new MemoryRateLimiter();
    for (let i = 0; i < 5; i++) expect(await rl.allow("ip", 5, 60)).toBe(true);
    expect(await rl.allow("ip", 5, 60)).toBe(false);
  });
});

describe("notifier", () => {
  it("records notifications (content asserted medical-free by callers)", async () => {
    const n = new MemoryNotifier();
    await n.notifyOwner("a1", "break_glass", "Someone requested additional info at 14:32");
    expect(n.sent()[0]!.kind).toBe("break_glass");
  });
});
