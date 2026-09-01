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

Data lives in memory and resets on restart. The Postgres/Redis/KMS adapters and
a rich PWA remain the documented next builds; this server accepts either adapter
set behind the same ports.

## Development principles (enforced)
- **Local-first:** local dev runs without cloud infra (local Postgres/Redis via docker-compose; T003).
- **No secrets in the repo;** env is validated and fails fast (`@medikey/config`).
- **No real medical data outside production** — synthetic data only in local/dev/staging.
- **One task at a time**, tests + security check + diff review before moving on
  (`docs/impl/17-claude-code-workflow.md`).
