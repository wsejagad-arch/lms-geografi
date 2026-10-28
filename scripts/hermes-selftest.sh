#!/usr/bin/env bash
# Uji cepat adapter MCP Hermes terhadap API lokal (jalankan di mesin Hermes).
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${HERMES_ENV_FILE:-$HOME/.hermes/.env}"

if [ -z "${HERMES_API_KEY:-}" ] && [ -f "$ENV_FILE" ]; then
  HERMES_API_KEY="$(grep -E '^API_SERVER_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi
: "${HERMES_API_KEY:?API key tidak ditemukan (set HERMES_API_KEY atau isi $ENV_FILE)}"

export HERMES_API_KEY
export HERMES_BASE_URL="${HERMES_BASE_URL:-http://127.0.0.1:8642/v1}"
export HERMES_MODEL="${HERMES_MODEL:-hermes-agent}"

printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hermes_list_models","arguments":{}}}' \
  | python3 "$DIR/scripts/hermes_mcp.py"
