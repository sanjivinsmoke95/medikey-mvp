# MediKey MVP — Phase Reports

Autonomous phase-by-phase build against the frozen architecture. Each phase lists the required gate
fields. Implementation notes below apply to the whole build.

## Implementation notes (transparency — not architectural changes)
- **Runnable core + ports/adapters.** Persistence, cache, key-management, notifications and auth are
  behind **ports**. The MVP ships an **in-memory adapter** (used by tests and zero-config local runs)
  and the code is shaped for the **Postgres/Redis/KMS** adapters (docker-compose provided, SQL
  migrations provided). This is the local-first requirement (adjustment 1), not a change to the frozen
  choice of Postgres/Redis/KMS.
- **Auth provider.** The `AuthProvider` port ships with a clearly-labelled **dev-only adapter**.
  **Productionised passkeys/managed provider remain deferred** until your provider decision — exactly
  as the frozen plan requires (ADR-6 / adjustment 3). No custom production auth is committed.
- **Emergency page** is server-rendered (faithful to the frozen "SSR, minimal-JS" scanner). The rich
  **owner PWA UI (Next.js)** is deferred; all owner operations are exercised via the API + the SSR
  preview, and the end-to-end DoD flow is proven by an integration test.
- **Crypto:** only vetted library APIs (`node:crypto` AES-256-GCM / HMAC). MediKey implements the
  envelope/KMS protocol, never primitives (adjustment 2).
- No real medical data anywhere; synthetic only.

---

## P0 — Repository, tooling, CI, infrastructure baseline
- **Tasks completed:** T001 (scaffold, prior), T002 (CI + secret-scan + SCA gates), T003 (local-first
  `docker-compose.dev.yml` for Postgres+Redis; `infra/` Terraform skeleton for staging/prod only),
  T004 (extended env/secrets loader — config keys, secret-safe errors, production-required crypto
  material, legal-set deletion window left unset, location logging OFF by default).
- **Tests passed:** 7/7 (config env loader: defaults, validation, prod-requires-crypto, key-only error
  messages, location-off, no-defaulted-deletion-window, ephemeral-keys-dev-only).
- **Security checks passed:** secret-scan clean; no secrets committed; `.env*` git-ignored; error
  messages never leak values; location logging default OFF.
- **Files/modules changed:** `package.json`, `vitest.config.ts`, `scripts/secret-scan.mjs`,
  `.github/workflows/ci.yml`, `docker-compose.dev.yml`, `infra/README.md`,
  `packages/config/src/{env.ts,index.ts,env.test.ts}`.
- **Database changes:** none yet (schema begins P1).
- **API changes:** none yet.
- **Known issues:** ESLint is a placeholder script (green) — real ruleset added alongside more code;
  Terraform modules are a skeleton (not applied — app runs locally).
- **Deferred work:** real ESLint config; Terraform modules; Postgres/Redis adapters wired in later
  phases behind the ports.
- **Architectural deviations:** none.
- **Git commit hash:** 7252b3e
- **Next phase:** P1 — Security spine.

---

## P1 — Security spine
- **Tasks completed:** T005 (`@medikey/core` domain types + tiers), T006 (vetted-lib crypto:
  AES-256-GCM, HMAC, CSPRNG), T007 (KMS envelope: `KeyProvider` port + `LocalKeyProvider`,
  per-record DEKs, **crypto-shred**), T008 (HMAC identifier hashing + pepper + constant-time compare),
  T009 (deny-by-default authz: `assertOwns`/`assertStepUp`/tier-ceiling), T010 (`RateLimiter` port +
  memory impl), T011 (redacting structured logger), T012 (append-only `AuditSink`), T014 (migrations
  M01–M03), plus the persistence/cache/notifier ports + in-memory adapters and the `project()`
  disclosure boundary (T031 lands fully in P5; the pure engine ships here).
- **Tests passed:** 24/24 total (17 new): crypto round-trip + tamper-reject, HMAC stability +
  constant-time, identifier entropy/uniqueness, **envelope encrypt + dump-has-no-plaintext**,
  **crypto-shred → unrecoverable**, authz allow/deny/step-up, redaction (no medical values in logs),
  **project() 500-case property test (scanner levels never contain L3, purity)**, audit append-only,
  cache TTL+purge, rate-limit trip.
- **Security checks passed:** deny-by-default authz; dump-is-ciphertext; crypto-shred; no custom
  crypto (vetted `node:crypto` only); redaction; append-only audit; secret-scan clean; location OFF.
- **Files/modules changed:** `packages/core/src/{ids,disclosure/tiers,disclosure/project,crypto/
  primitives,kms/key-provider,kms/envelope,authz/authz,observability/redaction,index,core.test}.ts`;
  `services/api/src/{domain/model,adapters/ports,adapters/memory,index,adapters/spine.test}.ts`;
  `db/migrations/0001_extensions.sql`, `0002_identity.sql`, `0003_consents.sql`; tsconfig base moved
  to source-mode (bundler resolution) so the app runs from source (local-first).
- **Database changes:** M01–M03 (accounts, credentials, sessions, consents, security_events). 🔒
  columns are bytea ciphertext; enums enforced in code.
- **API changes:** none yet (services begin P2).
- **Known issues:** none. `@medikey/config` refactored to source-mode exports (was dist-based).
- **Deferred work:** Postgres adapter implementing `Repository` (in-memory used for MVP/tests);
  IDOR harness lands with the first owner endpoints (P3).
- **Architectural deviations:** none. **Implementation note:** the frozen 8-package layout (doc 01)
  is realised as folders inside `@medikey/core` + `@medikey/api` with the same boundaries (pure
  `disclosure` imports no I/O); packages can be split later without logic change.
- **Git commit hash:** (see P1 commit)
- **Next phase:** P2 — Authentication.

---

## P2 — Authentication
- **Tasks completed:** T016 (`AuthProvider` port established BEFORE any WebAuthn; dev-only adapter,
  scrypt), T017 (register/login **via the port** — dev adapter; production passkeys deferred per
  ADR-6/adj.3), T018 (sessions, hashed tokens, **step-up**, revoke-all), T019 (email-OTP
  **recovery-only** + throttle; OTP session is primary and cannot reach stepped_up without the
  credential), T021 (consent capture at register). Phone verify + new-device notify stubbed (notify
  fires on login, no medical content).
- **Tests passed:** 31/31 (7 new): register+login+session, duplicate/weak rejcontainers, uniform
  login failure, step-up requires credential, **OTP recovery-only cannot step up**, revoke-all,
  notification is medical-free.
- **Security checks passed:** uniform auth failure (no user-enumeration); tokens stored hashed;
  OTP single-use + rate-limited; step-up gate; no secrets/PII in notifications; no productionised
  custom auth committed (dev adapter clearly labelled).
- **Files/modules changed:** `services/api/src/auth/{provider,service,auth.test}.ts`,
  `services/api/src/app/{context,errors}.ts`.
- **Database changes:** uses accounts/credentials/sessions/consents (M02–M03).
- **API changes:** service layer only (HTTP layer wired in P6/P8).
- **Known issues:** phone verification is a stub (not MVP-critical); real passkeys pending provider decision.
- **Deferred work:** managed/passkey `AuthProvider` adapter after the provider decision (OPEN, doc 06).
- **Architectural deviations:** none.
- **Git commit hash:** (see P2 commit)
- **Next phase:** P3 — Profile.

---

## P3 — Profile
- **Tasks completed:** T022 (M04 subjects/blood), T023 (subject CRUD, encrypted identity, owns-subject
  authz, 404-not-403), T024 (dependents modelled + isolated), T015 (**reusable IDOR harness**).
- **Tests passed:** 36/36 (5 new): create+derived-age, name-ciphertext-only, **IDOR (Bob↛Alice)**,
  identity-update-requires-step-up, dependent isolation.
- **Security checks passed:** deny-by-default owns-subject; IDOR denied; encrypted-at-rest; step-up
  for identity; no existence oracle (404).
- **Files/modules changed:** `services/api/src/profile/{service,profile.test}.ts`,
  `services/api/src/testing/harness.ts`, `db/migrations/0004_subjects.sql`, model (+blood_group type).
- **Database changes:** M04 (subject_profiles).
- **API changes:** service layer.
- **Known issues:** none.
- **Deferred work:** dependent guardian-consent flow (V2, data slot present).
- **Architectural deviations:** none.
- **Git commit hash:** (see P3 commit)
- **Next phase:** P4 — Medical data.

---

## P4 — Medical data
- **Tasks completed:** T025 (M05 medical_items), T026–T028 (medical CRUD: allergy/condition/
  medication/avoidance/implant/surgery/injury/contact + blood_group), T029 (stated-negatives).
- **Tests passed:** 41/41 (5 new): encrypted allergy + default provenance + ciphertext-at-rest,
  stated-negative positive-assertion, **IDOR add/list/delete denied**, unknown-type rejected, owner
  update/delete.
- **Security checks passed:** encrypted-at-rest (dump has no plaintext); provenance-always-set
  (provenance-or-fail); IDOR denied; no clinical interpretation; absence≠negation.
- **Files/modules changed:** `services/api/src/medical/{service,medical.test}.ts`,
  `db/migrations/0005_medical.sql`.
- **Database changes:** M05 (medical_items — typed table, per-item envelope-encrypted payload).
- **API changes:** service layer.
- **Known issues:** none.
- **Deferred work:** verification/provenance=verified is V2.
- **Architectural deviations:** none. **Implementation note:** medical domain modelled as a single
  typed `medical_items` table (encrypted payload + metadata) rather than per-type tables; since
  sensitive fields are ciphertext they aren't independently queryable regardless, so this preserves
  the encryption/provenance/disclosure guarantees. Reverting to per-type tables is mechanical if you
  prefer the doc-03 granularity.
- **Git commit hash:** (see P4 commit)
- **Next phase:** P5 — Disclosure engine.

---

## P5 — Disclosure engine (critical boundary)
- **Tasks completed:** T030 (M06 selections+view), T031 (single `project()` used by cache, preview
  and break-glass; assembleFields is the only gather point), T032 (selection API + **tier ceilings**;
  DOB can't go to L1; l3-class can't be lifted), T033 (**emergency_view** builder + rebuild-on-change
  + active cache purge).
- **Tests passed:** 47/47 (6 new): **cached L1 = L1-only**, **L2 excludes L3**, **preview == scanner
  projection**, **DOB-at-L1 rejected (ceiling)**, setSelections needs step-up, rebuild keeps L1 current.
- **Security checks passed:** over-disclosure guard (single engine); L1/L2 never contain L3; whole
  profile never assembled for a scanner beyond the allow-list; step-up; tier ceilings.
- **Files/modules changed:** `services/api/src/disclosure/{service,disclosure.test}.ts`,
  `db/migrations/0006_disclosure.sql`, core `DisclosureField` (+tel/noneKnown).
- **Database changes:** M06 (emergency_selections, emergency_view).
- **API changes:** service layer (selections, preview, view).
- **Known issues:** none.
- **Deferred work:** none for the boundary.
- **Architectural deviations:** none.
- **Git commit hash:** (see P5 commit)
- **Next phase:** P6 — Emergency page.

---

## P6 — Emergency page + preview
- **Tasks completed:** T034 (accessible SSR emergency page primitives), T035 (owner preview uses same
  projection — verified in P5), T036 (mandatory-preview flow supported by preview API), T037 (SSR page
  + all states; perf methodology recorded in impl doc 20).
- **Tests passed:** 56/56 (9 new): provenance-on-every-field + **blood-group caveat**, **no directive
  language**, tap-to-call, **revoked==not_found neutral (no oracle)**, degraded never blanks, stale
  banner without hiding data, lang+noindex+no-external-requests, **XSS escaping**, escapeHtml.
- **Security checks passed:** display-not-instruct; provenance-or-fail; XSS output-encoding; uniform
  neutral pages; no trackers/external requests; renders only the given projection.
- **Files/modules changed:** `services/api/src/emergency/{render,render.test}.ts`.
- **Database changes:** none.
- **API changes:** render function (wired to HTTP in P8).
- **Known issues:** rich owner PWA (Next.js) deferred; SSR page is the faithful scanner surface.
- **Deferred work:** Hindi content strings (architecture supports `lang`); Next.js owner UI.
- **Architectural deviations:** none (SSR is the frozen scanner rendering approach).
- **Git commit hash:** (see P6 commit)
- **Next phase:** P7 — QR credentials.

---

## P7 — QR credentials
- **Tasks completed:** T038 (M07 qr/tokens/logs), T039 (CSPRNG 128-bit id + HMAC hashed storage,
  plaintext returned once), T040 (revoke/regenerate + active cache purge; per-object independence).
- **Tests passed:** 62/62 (6 new): opaque-id + **hash-not-plaintext** + resolve, **revoke→inaccessible
  + uniform not_found**, **per-object independence**, regenerate, **step-up + IDOR on create/revoke**,
  **identifier absent from audit log**.
- **Security checks passed:** hashed identifiers (HMAC+pepper); plaintext never stored/logged; uniform
  not_found vs revoked; step-up + ownership; active cache purge on revoke (SLO backing).
- **Files/modules changed:** `services/api/src/qr/{service,qr.test}.ts`, `db/migrations/0007_qr.sql`.
- **Database changes:** M07 (qr_identifiers, access_tokens [L2-only CHECK], access_logs).
- **API changes:** service layer.
- **Known issues:** revocation SLO timing asserted structurally (active purge + TTL) — wall-clock
  propagation is an infra concern (edge TTL ceiling).
- **Deferred work:** QR image asset rendering (URL returned; image is a client concern).
- **Architectural deviations:** none.
- **Git commit hash:** (see P7 commit)
- **Next phase:** P8 — Scanner hardening.

---

## P8 — Scanner hardening
- **Tasks completed:** T041 (resolution + **uniform not_found/revoked**), T042 (layered rate limits
  per-IP + per-identifier; enumeration protection), T043 (coarse access logging; **location OFF by
  default**, opt-in only; anonymous access_type — never claims scanner identity).
- **Tests passed:** 68/68 (6 new): valid scan serves L1 + logs anonymous, **no location by default**,
  **coarse city only on opt-in**, **revoked==unknown identical page (no oracle)**, **rate-limit trips
  (enumeration)**, **scanner never shows non-selected/L2 fields**.
- **Security checks passed:** uniform responses (no oracle); rate limiting; enumeration infeasible;
  no default location; no scanner identity; L1-only (no L2/L3 leak).
- **Files/modules changed:** `services/api/src/scanner/{service,scanner.test}.ts`.
- **Database changes:** uses access_logs (M07).
- **API changes:** scanner service (HTTP wired at end).
- **Known issues:** none.
- **Deferred work:** WAF/bot-challenge is an edge/infra concern (rate-limit policy in app).
- **Architectural deviations:** none.
- **Git commit hash:** (see P8 commit)
- **Next phase:** P9 — Break-glass.

---

## P9 — Break-glass
- **Tasks completed:** T044 (L2-only mint + attestation + audit + owner notify), T045 (single-use,
  TTL, non-renewable L2 view), T046 (auto-suspend on abuse + notification). Owner/contact live-approval
  path deferred (break-glass is the frozen primary; approval is a should-have).
- **Tests passed:** 75/75 (7 new): grant→L2 view + **medical-free notification** + audit, **L2 never
  contains L3**, **single-use**, **expiry (non-renewable)**, **cross-subject token rejected**,
  **auto-suspend after repeated break-glass**, **token is L2-level (no l3 mint path)**.
- **Security checks passed:** L2-only (token level + projection filter + no l3 mint path); single-use;
  expiry; binding to subject; auto-suspend; notifications carry no medical content; audited.
- **Files/modules changed:** `services/api/src/breakglass/{service,breakglass.test}.ts`.
- **Database changes:** uses access_tokens/access_logs (M07).
- **API changes:** service layer.
- **Known issues:** none.
- **Deferred work:** owner/emergency-contact live-approval path + one-time pre-shared code (should-have).
- **Architectural deviations:** none.
- **Git commit hash:** (see P9 commit)
- **Next phase:** P10 — Data rights + MVP review.

---

## P10 — Data rights + MVP review
- **Tasks completed:** T047 (access history, coarse, owner-scoped), T048 (data export **own-only +
  step-up**, no bulk/admin path), **T049a** (deletion/restore spec), T049 (delete subject/account:
  purge + **crypto-shred** + revoke-all + **restore-no-resurrect**), consolidated **security suite**
  (12 checks) + **e2e DoD flow**.
- **Tests passed:** 92/92 (13 new): export own-only+step-up, history IDOR, **account deletion
  crypto-shred + restore-no-resurrect**, delete step-up; security-suite (12); e2e (1).
- **Security checks passed:** all required — IDOR, broken access control, enumeration, replay,
  revoked, expired, **L2→L3**, auth abuse, rate-limit bypass, log leakage, secret leakage,
  cross-account, unauthorized disclosure. Plus lint/typecheck/build/secret-scan green.
- **Files/modules changed:** `services/api/src/rights/{service,rights.test}.ts`,
  `services/api/src/app/assemble.ts`, `services/api/src/index.ts` (exports),
  `tests/e2e/mvp-flow.test.ts`, `tests/security/security-suite.test.ts`, `vitest.config.ts` (aliases),
  `docs/deletion-restore-spec.md`, `docs/mvp-review.md`.
- **Database changes:** none new (uses M01–M07).
- **API changes:** rights service + composition root.
- **Known issues:** none blocking; deferrals listed in `docs/mvp-review.md`.
- **Deferred work:** HTTP/PWA, Postgres/KMS adapters, production auth provider, approval path.
- **Architectural deviations:** none (two transparency notes in the review).
- **Git commit hash:** (see P10 commit)
- **Next phase:** MVP review delivered — awaiting instruction (NOT starting V2).

---

## P11 — HTTP layer + owner console (post-review, on instruction)
- **Tasks completed:** the deferred **"HTTP controllers + owner UI"** build. A zero-dependency Node
  HTTP layer over the existing service layer (no new authority — every handler calls the same
  services the tests use): public SSR **scanner** routes (`GET /e/:opaqueId`, `GET /e/:opaqueId/l2`,
  `POST /api/breakglass/:opaqueId/request`), a JSON **owner API** (auth/profile/medical/disclosure/
  QR/rights), an owner **"mandatory preview"** endpoint that renders the SAME `project()` output a
  scanner sees (`GET /api/subjects/:id/preview.html`), and a minimal server-served **owner console**
  (single static page). Bearer-token session auth; step-up enforced at the route boundary AND still
  in the services; typed `AppError`/`AuthzError` → HTTP status; scanner errors stay generic.
- **Verified end-to-end (live server):** register → login → step-up → create profile → add medical
  items → set disclosure → generate QR → **scan serves L1 only** (penicillin shown; warfarin/L2 and
  the L3 note both absent) → **break-glass serves L2** (warfarin) but **never L3** → **L2 token is
  single-use** → **revoked QR → uniform neutral page** → **no-auth request → 401**. Owner preview
  matches the scan exactly.
- **Security checks:** the frozen invariants are unchanged because the HTTP layer adds no authority —
  IDOR/step-up/uniform-neutral/L1-only/no-oracle are all still enforced in the services and were
  re-confirmed against the running server. Bearer tokens are the session tokens (hashed at rest);
  the iframe preview is fetched with the bearer header and injected via `srcdoc` (no token in a URL).
- **Files/modules changed:** `services/api/src/http/{server,owner-ui,main}.ts`; `scripts/dev.sh`;
  `.claude/launch.json`; `package.json` (`dev` script); `.gitignore` (`.dev/`); `README.md`
  (run-locally section); dark-mode contrast fix in `services/api/src/emergency/render.ts` (critical
  card + caveat were near-invisible on dark backgrounds).
- **Database changes:** none (in-memory adapters).
- **Known issues:** local runner needs the two declared runtime deps resolvable (`zod`, `uuid`) —
  `pnpm install`, or `npm install --no-save zod uuid` for a zero-config run. Data is in-memory and
  resets on restart.
- **Deferred work (unchanged):** rich Next.js PWA; Postgres/Redis/cloud-KMS adapters; production auth
  provider; break-glass live-approval path.
- **Architectural deviations:** none. The frozen scanner remains SSR/minimal-JS; the owner console is
  an operator UI over the API, explicitly not the eventual PWA.
- **How to run:** `pnpm dev` (or `PORT=8788 bash scripts/dev.sh`) → `http://localhost:8788`.

---

## P12 — Postgres/Redis/KMS adapters (post-review, on instruction)
- **Tasks completed:** the deferred **"Postgres/Redis/cloud-KMS adapters"** build, behind the frozen
  ports (no service-layer changes). `PostgresRepository` (full `Repository`), `PgAuditSink`
  (append-only `security_events`), and a persistent `PgKeyProvider` — the KMS stand-in: each subject
  key is stored WRAPPED under `MASTER_KEY` in a new `subject_keys` table (M08), so the DB alone holds
  no usable key; crypto-shred is a tombstone (wrapped key nulled + `destroyed_at`) that blocks key
  re-creation (restore-no-resurrect). `RedisCache` + `RedisRateLimiter` (sliding-window sorted set)
  back the view cache and abuse limits. `createServerContext`/`createServerApp` select adapters from
  `DATABASE_URL`/`REDIS_URL` (dynamic imports, so the in-memory path never needs pg/redis); the two
  can be mixed. Migration runner `scripts/migrate.mjs`.
- **Verified against real servers (docker-compose Postgres 16 + Redis 7):** the full DoD flow runs
  through the Postgres+Redis-backed app (L1-only scan, break-glass L2 never L3, single-use); **data
  persists across a fresh connection**; **sensitive columns are ciphertext at rest** (raw
  `full_name_enc` contains no plaintext); **crypto-shred leaves the key unrecoverable with no
  resurrection** and revokes sessions. Also verified the running HTTP server boots `store: postgres,
  cache: redis` and serves the same flow. Full suite **101/101** with the DB env; **98 pass + 3
  skip** without it (adapter tests gate on `DATABASE_URL`, so CI stays DB-free).
- **Security checks:** field-level ciphertext at rest confirmed on real rows; no bulk-decrypt/export
  surface added; append-only audit sink (INSERT/SELECT only); parameterized SQL throughout;
  crypto-shred tombstone verified. Invariants unchanged — adapters carry no policy.
- **Files/modules changed:** `services/api/src/adapters/{postgres,redis,postgres.test}.ts`;
  `services/api/src/app/{context,assemble}.ts` (+`createServerContext`/`createServerApp`);
  `services/api/src/index.ts`; `services/api/src/http/main.ts` (boots the env-driven app);
  `db/migrations/0008_subject_keys.sql`; `scripts/migrate.mjs`; `services/api/package.json`
  (pg, redis); `README.md` (persistent mode).
- **Database changes:** M08 (subject_keys — persistent KeyProvider backing). M01–M07 unchanged.
- **Known issues:** `PgKeyProvider.hasSubjectKey` is a best-effort in-process cache (the port method
  is synchronous; it is test-only, not on any runtime path). Production would use a managed KMS/HSM
  rather than `subject_keys` + `MASTER_KEY`.
- **Deferred work (unchanged):** rich Next.js PWA; production auth provider; break-glass
  live-approval path; managed cloud KMS wiring; Terraform apply in staging.
- **Architectural deviations:** none. The frozen Postgres/Redis/KMS choice is realised behind the
  existing ports; `subject_keys` is the local persistent stand-in for the managed KMS.
- **How to run:** see README "Persistent mode" — `docker compose up`, `node scripts/migrate.mjs`,
  then `pnpm dev` with `DATABASE_URL`/`REDIS_URL`/`MASTER_KEY` set.
