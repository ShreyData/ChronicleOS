#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure virtual environment exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Creating virtual environment .venv..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

# Build frontend if dist is missing
if [ ! -d "frontend/dist" ] || [ ! -f "frontend/dist/index.html" ]; then
    if command -v npm &> /dev/null; then
        echo "Building frontend web interface..."
        (cd frontend && npm install && npm run build)
    fi
fi

echo "Starting Chronicle..."
echo "Web UI & Backend: http://127.0.0.1:8000"
echo "API Docs: http://127.0.0.1:8000/docs"

exec uvicorn backend.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload \
  --reload-dir backend \
  --reload-exclude "vault/*" \
  --reload-exclude "*.db*" \
  --reload-exclude "frontend/*"
