#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Error: .venv not found. Please create .venv first."
    exit 1
fi

echo "Starting Chronicle..."
echo "Backend & Web UI: http://127.0.0.1:8000"
echo "API Docs: http://127.0.0.1:8000/docs"

exec uvicorn backend.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload \
  --reload-dir backend \
  --reload-exclude "vault/*" \
  --reload-exclude "*.db*" \
  --reload-exclude "frontend/*"
