#!/usr/bin/env bash
# FaturaFi one-command setup
# Run from repo root: ./scripts/setup.sh

set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  FaturaFi setup"
echo "═══════════════════════════════════════════════════════════════"

# ── Prerequisites check ─────────────────────────────────────────────
echo ""
echo "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found. Install Python 3.11+."; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌ node not found. Install Node.js 20+."; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌ npm not found."; exit 1; }

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
NODE_VERSION=$(node -v)
echo "  ✓ python3 $PY_VERSION"
echo "  ✓ node $NODE_VERSION"

if command -v anchor >/dev/null 2>&1; then
  echo "  ✓ anchor $(anchor --version)"
else
  echo "  ⚠ anchor not found — you can install it later from https://www.anchor-lang.com/docs/installation"
fi

if command -v solana >/dev/null 2>&1; then
  echo "  ✓ solana $(solana --version | head -1)"
else
  echo "  ⚠ solana CLI not found — you can install it later"
fi

# ── Backend ─────────────────────────────────────────────────────────
echo ""
echo "[1/3] Setting up backend..."
cd "$ROOT/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo "  ✓ dependencies installed"

if [ ! -f "data/invoices.csv" ]; then
  echo "  ⚙ generating synthetic dataset (10k invoices)..."
  python ml/generate_dataset.py > /dev/null
  echo "  ✓ dataset generated"
fi

if [ ! -f "ml/model.json" ]; then
  echo "  ⚙ training XGBoost model..."
  python ml/train_model.py > /dev/null
  echo "  ✓ model trained"
fi

deactivate

# ── Frontend ────────────────────────────────────────────────────────
echo ""
echo "[2/3] Setting up frontend..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  npm install --no-audit --no-fund --silent
fi
echo "  ✓ dependencies installed"

if [ ! -f ".env.local" ]; then
  cp .env.local.example .env.local
  echo "  ✓ .env.local created (edit it with your deployed program ID)"
fi

# ── Anchor program ──────────────────────────────────────────────────
echo ""
echo "[3/3] Anchor program..."
cd "$ROOT/program"

if command -v anchor >/dev/null 2>&1; then
  if [ ! -d "node_modules" ]; then
    npm install --no-audit --no-fund --silent
  fi
  echo "  ✓ TypeScript test deps installed"
  echo "  ℹ run 'anchor build && anchor deploy --provider.cluster devnet' when ready"
else
  echo "  ⚠ skipped (anchor CLI not installed)"
fi

# ── Done ────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Setup complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the backend (terminal 1):"
echo "       cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "  2. Start the frontend (terminal 2):"
echo "       cd frontend && npm run dev"
echo ""
echo "  3. Open http://localhost:3000 and connect a Phantom wallet (devnet)."
echo ""
echo "  4. On the marketplace page, click 'Load demo invoices' to seed data."
echo ""
echo "  (Optional) Deploy the Anchor program — see DEPLOY.md"
echo ""
