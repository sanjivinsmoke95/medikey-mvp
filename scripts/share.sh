#!/usr/bin/env bash
# Share MediKey with anyone via a Cloudflare Quick Tunnel — no deployment, no
# account, no DNS. Starts the local server (in-memory unless DATABASE_URL is
# set) and prints a public https://<random>.trycloudflare.com URL you can send.
#
# The generated QR encodes this public origin, so a phone can scan it and open
# the emergency page. The tunnel lives only while this command runs.
#
# Requires cloudflared:  brew install cloudflared   (macOS)
#   docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8788}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install it: brew install cloudflared" >&2
  exit 1
fi

mkdir -p .dev
if ! curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo "Starting MediKey on :$PORT …"
  PORT="$PORT" bash scripts/dev.sh > .dev/share-server.log 2>&1 &
  for _ in $(seq 1 30); do curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1 && break; sleep 1; done
fi
echo "MediKey is up on http://localhost:$PORT"
echo "Opening public tunnel — share the https://…trycloudflare.com URL below:"
exec cloudflared tunnel --url "http://localhost:$PORT"
