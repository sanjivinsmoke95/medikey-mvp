# MediKey MVP — Review

Autonomous phase-by-phase build (P0–P10) against the frozen architecture. **No V2 work started.**
This review is the gate for your decision on what comes next.

## Status: MVP core complete and green
- **92 tests pass** (unit + integration + **12-check security suite** + **end-to-end DoD flow**).
- Gates green: lint, strict typecheck, build, secret-scan.
- Runs **local-first** — zero cloud infrastructure required (in-memory/local adapters behind the
  frozen Postgres/Redis/KMS ports; docker-compose + SQL migrations provided for real deployment).

## Definition-of-Done flow — verified end-to-end (`tests/e2e/mvp-flow.test.ts`)
create account → create emergency profile → enter medical info → assign disclosure levels →
**preview exactly what a scanner sees** → activate object / generate QR → scanner scans → **L1 loads
with provenance** → access logged → user sees history → **break-glass → bounded L2 (temporary,
single-use, audited)** → **L3 unreachable via scanner** → revoke QR → **revoked QR inaccessible** →
account deletion (**crypto-shred + revoke-all + restore-no-resurrect**). ✅

## Security suite — all pass (`tests/security/security-suite.test.ts`)
IDOR ✅ · broken access control (step-up) ✅ · QR enumeration + rate-limit ✅ · token replay
(single-use) ✅ · revoked QR ✅ · expired token ✅ · **L2→L3 escalation impossible** ✅ · auth abuse
(uniform failure + OTP throttle) ✅ · rate-limit bypass (per-id also trips) ✅ · **log leakage
(redaction)** ✅ · **secret leakage (pepper never in pages/logs)** ✅ · cross-account ✅ ·
**unauthorized medical-field disclosure (L1 only)** ✅.

## Golden invariants — held throughout
No medical data in QR (opaque hashed id) · L3 never reachable by any scanner path (token level +
projection filter + no l3 mint path) · scanner receives only the allow-listed L1 `emergency_view` ·
deny-by-default authz + IDOR tests · field-level envelope encryption + **no bulk-decrypt/export** ·
no medical data in logs · provenance-or-fail + display-not-instruct · no PAN/Aadhaar · location
logging OFF by default · single disclosure engine used by scanner/preview/break-glass · vetted crypto
only (no custom primitives).

## Performance
The emergency page is server-rendered, no-JS-on-critical-path, tracker-free. **Measurement
methodology (p95 TTFUI, device class, network, cache state)** is specified in
`docs/impl/20-approved-adjustments.md`; a synthetic CI budget gate + field measurement in the blind
usability test are the enforcement points (not run in this sandbox).

## What is intentionally NOT in this MVP (deferred, not forgotten)
- **Rich owner PWA (Next.js UI):** deferred — all owner operations are exercised via the API + the
  SSR preview; the DoD flow is proven by the e2e test. HTTP controllers + the PWA are the next build.
- **Production auth provider:** the `AuthProvider` port ships a **dev-only** adapter; productionised
  passkeys / managed provider await your provider decision (OPEN, doc 06).
- **Postgres/Redis/KMS adapters:** ports + migrations + docker-compose provided; in-memory used for
  local/test. Wiring the Postgres/Redis/cloud-KMS adapters is a contained task.
- **Break-glass owner/contact live-approval + one-time code:** break-glass (the frozen primary) is
  implemented; the approval path is a should-have.
- **Verification (provenance=verified), dependents UI, Hindi content, physical fulfilment, admin
  console, WAF/bot edge, pentest:** post-MVP per the roadmap.

## Open decisions still open (unchanged — need you)
Auth provider (residency verification) · deletion reconciliation window (legal-set) · legal launch
gates · final L1 field set/ordering (validation) · emergency-contact display · cloud/CDN/WAF pick ·
break-glass accountability marker · object activation model · B2C-vs-B2B beta. All are behind config/
interface seams (`docs/impl/18-open-decisions.md`) — none were silently resolved.

## Architectural deviations
None to the frozen CLOSED decisions. Two transparency notes (not changes): the 8-package layout is
realised as folders inside `@medikey/core`/`@medikey/api` with the same boundaries; the medical domain
uses one typed `medical_items` table (encrypted payload) rather than per-type tables (same encryption/
provenance/disclosure guarantees). Both are mechanical to expand if you prefer the doc-01/03 shapes.

## Recommended next steps (your call — not started)
1. **HTTP layer + owner PWA** (wire the services behind NestJS controllers + a Next.js owner UI).
2. **Postgres/Redis/cloud-KMS adapters** + apply migrations in staging.
3. **Resolve the auth-provider decision** (residency check) and swap in the real adapter.
4. **Engage counsel** on the legal launch gates; run the **blind usability test**.
Per instruction, I have **not** begun V2 and am awaiting your direction.
