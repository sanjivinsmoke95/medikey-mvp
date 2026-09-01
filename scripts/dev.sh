#!/usr/bin/env bash
# Local-first dev runner for the HTTP layer (owner console + scanner + API).
# Bundles the API from source with esbuild (workspace aliases → src entrypoints)
# and runs it on Node. Local adapters only — no cloud, no DB.
#
# Needs the declared runtime deps resolvable (zod, uuid). With pnpm:
#   pnpm install
# Without pnpm (zero-config), just the two runtime deps are enough:
#   npm install --no-save --no-package-lock zod uuid
#
#   PORT=8788 scripts/dev.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
mkdir -p .dev
# --packages=external keeps node_modules deps (zod, uuid, pg, redis) as runtime
# imports (pg/redis are CJS and can't be bundled into one ESM file); only our
# source + the workspace aliases are bundled.
npx --yes esbuild services/api/src/http/main.ts \
  --bundle --platform=node --format=esm --target=node20 --sourcemap \
  --packages=external \
  --alias:@medikey/api="$ROOT/services/api/src/index.ts" \
  --alias:@medikey/core="$ROOT/packages/core/src/index.ts" \
  --alias:@medikey/config="$ROOT/packages/config/src/index.ts" \
  --outfile=.dev/server.mjs

exec node .dev/server.mjs
