#!/usr/bin/env bash
# Local-first dev runner for the HTTP layer (owner console + scanner + API).
# Bundles the API from source with esbuild (workspace aliases → src entrypoints)
# and runs it on Node. Local adapters only — no cloud, no DB.
#
# Needs the declared runtime deps resolvable. With pnpm:
#   pnpm install
# Without pnpm (zero-config):
#   npm install --no-save --no-package-lock zod uuid @simplewebauthn/server qrcode
#   # add: pg redis   (only for persistent mode)
#
#   PORT=8788 scripts/dev.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
OUT="$ROOT/services/api/.dev/server.mjs"
mkdir -p "$ROOT/services/api/.dev"
# Bundle our source + the clean cross-workspace deps (zod, uuid) that esbuild can
# resolve at build time. The heavier deps stay EXTERNAL: pg/redis/qrcode are CJS
# with dynamic require() of node builtins (can't be bundled into ESM), and
# @simplewebauthn is kept external too. They are all direct services/api deps, and
# the bundle is emitted inside services/api, so node resolves them from
# services/api/node_modules under pnpm's nested layout (and from root under npm).
npx --yes esbuild services/api/src/http/main.ts \
  --bundle --platform=node --format=esm --target=node20 --sourcemap \
  --external:pg --external:redis --external:qrcode --external:@simplewebauthn/server \
  --alias:@medikey/api="$ROOT/services/api/src/index.ts" \
  --alias:@medikey/core="$ROOT/packages/core/src/index.ts" \
  --alias:@medikey/config="$ROOT/packages/config/src/index.ts" \
  --outfile="$OUT"

exec node "$OUT"
