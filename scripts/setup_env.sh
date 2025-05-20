#!/bin/bash
# Setup script for local development or CI.
# Installs backend and frontend dependencies while network access is available.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ----- Backend -----
cd "$REPO_ROOT/backend"

# Create virtual environment if missing
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt

deactivate

# ----- Frontend -----
cd "$REPO_ROOT/frontend"
npm install

cd "$REPO_ROOT"

echo "Environment setup complete."
