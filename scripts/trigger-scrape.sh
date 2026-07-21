#!/usr/bin/env bash
# Trigger scrapers against a running Canuto server (local or remote).
# Usage:
#   ./scripts/trigger-scrape.sh
#   CANUTO_URL=https://tu-app.vercel.app ./scripts/trigger-scrape.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${CANUTO_URL:-http://127.0.0.1:3000}"

SECRET="${SCRAPE_SECRET:-}"
if [[ -z "$SECRET" && -f "$ROOT/.env.local" ]]; then
  SECRET="$(
    grep -E '^SCRAPE_SECRET=' "$ROOT/.env.local" | head -n1 | cut -d= -f2- |
      sed 's/^["'\'']//;s/["'\'']$//'
  )"
fi

if [[ -z "$SECRET" || "$SECRET" == "change-me" ]]; then
  echo "Set SCRAPE_SECRET in the environment or .env.local" >&2
  exit 1
fi

curl -fsS -X POST "${BASE_URL%/}/api/scrape" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json"
echo
