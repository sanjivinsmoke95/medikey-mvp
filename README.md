# MediKey

Privacy-first emergency medical information & controlled-disclosure platform.

> **Status:** T001 — monorepo scaffold. This repository is being built task-by-task against the
> **frozen architecture** and **implementation plan** (see `docs/`). No feature code beyond the
> current approved task. Every change preserves the golden invariants in
> `docs/impl/00-README.md`.

## Monorepo layout
```
apps/        # web (owner PWA) + scanner (public emergency page)   [added in later tasks]
services/    # api (NestJS — the only DB writer)                   [added in later tasks]
packages/
  config/    # shared config + fail-fast, secret-safe env loader   [T001]
  # types, disclosure, security, authz, ui                          [added in later tasks]
db/          # migrations + synthetic seeds                          [added in later tasks]
infra/       # Terraform (staging/prod); local dev uses docker-compose [T003]
docs/        # frozen architecture (pass2/*) + implementation plan (impl/*)
```

## Toolchain
- **pnpm** workspaces + **Turborepo**
- **TypeScript** (strict) end-to-end
- Node **>= 20**

## Common commands
```bash
pnpm install     # install workspace deps
pnpm build       # turbo run build across packages
pnpm typecheck   # strict typecheck
pnpm lint        # (lint tooling lands in T002)
pnpm test        # (test tooling lands in T005)
```

## Run it locally (owner console + scanner)

The HTTP layer wires the service layer behind a zero-dependency Node server: a
public SSR **scanner** page, a JSON **owner API**, and a minimal server-served
**owner console**. It runs local-first on in-memory adapters — no DB, no cloud.

```bash
pnpm dev                 # → http://localhost:8788  (owner console)
# or, without pnpm (only the two runtime deps are needed):
npm install --no-save --no-package-lock zod uuid
PORT=8788 bash scripts/dev.sh
```

- Owner console: `http://localhost:8788/` — register, sign in, step-up, add
  medical items, set disclosure levels, preview, generate/revoke QR codes.
- Scanner emergency page: `http://localhost:8788/e/<opaque-id>` (the opaque id
  is shown once when you generate a code).

Data lives in memory and resets on restart (see persistent mode below). A rich
Next.js PWA remains the documented next build; this server is the operator UI.

## Persistent mode (Postgres + Redis)

Real adapters sit behind the same ports and are selected by environment:
`DATABASE_URL` → Postgres (repository, append-only audit sink, and a persistent
KeyProvider that wraps each subject key under `MASTER_KEY`); `REDIS_URL` → Redis
(view cache + rate limiter). Set neither and it stays in-memory; the two can be
mixed. Sensitive fields are ciphertext at rest; crypto-shred on deletion is a
tombstone (no resurrection).

```bash
docker compose -f docker-compose.dev.yml up -d       # Postgres + Redis (synthetic data only)

export DATABASE_URL="postgres://medikey:medikey_local_dev@127.0.0.1:5432/medikey_dev"
export REDIS_URL="redis://127.0.0.1:6379"
export MASTER_KEY="$(head -c32 /dev/urandom | base64)"   # 32-byte KEK; keep it stable to keep data readable
export IDENTIFIER_PEPPER="$(head -c32 /dev/urandom | base64)"

node scripts/migrate.mjs        # apply db/migrations/*.sql  (add --reset to rebuild the schema)
pnpm dev                        # boots with store: postgres, cache: redis
```

Adapter integration tests live in `services/api/src/adapters/postgres.test.ts`
and run only when `DATABASE_URL` is set (the default suite stays DB-free):

```bash
DATABASE_URL="postgres://medikey:medikey_local_dev@127.0.0.1:5432/medikey_test" \
REDIS_URL="redis://127.0.0.1:6379" pnpm test
```

## Development principles (enforced)
- **Local-first:** local dev runs without cloud infra (local Postgres/Redis via docker-compose; T003).
- **No secrets in the repo;** env is validated and fails fast (`@medikey/config`).
- **No real medical data outside production** — synthetic data only in local/dev/staging.
- **One task at a time**, tests + security check + diff review before moving on
  (`docs/impl/17-claude-code-workflow.md`).
