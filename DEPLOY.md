# DEPLOY.md — Step-by-step deployment guide

This guide walks you through everything needed to get FaturaFi running end-to-end — both **locally** on your machine and **publicly deployed** on Vercel + Railway + Solana devnet.

If you've never deployed a Solana dApp before, this is for you. Copy-paste each command in order.

---

## Table of contents

1. [Local development](#1-local-development)
2. [Deploying the Anchor program to devnet](#2-deploying-the-anchor-program-to-devnet)
3. [Deploying the backend to Railway](#3-deploying-the-backend-to-railway)
4. [Deploying the frontend to Vercel](#4-deploying-the-frontend-to-vercel)
5. [Connecting everything](#5-connecting-everything)
6. [Troubleshooting](#6-troubleshooting)

---

## 0. Prerequisites

You'll need:

- A Mac or Linux machine — or Windows with **WSL2 (Ubuntu)** installed
- Node.js 20+ (`node -v`)
- Python 3.11+ (`python3 --version`)
- A free [GitHub](https://github.com) account
- A free [Railway](https://railway.app) account
- A free [Vercel](https://vercel.com) account
- About 1 hour of focused time the first time you do this

> **Windows users:** install WSL2 first. Open PowerShell as admin and run `wsl --install`. Reboot. Open Ubuntu and continue from there.

---

## 1. Local development

### 1.1 Install Solana + Rust + Anchor

The official one-line installer:

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```

If that fails with a network error (some regions block Cloudflare Workers), install the pieces individually:

```bash
# Build dependencies
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev libudev-dev curl git

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Anchor (via AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1
avm use 0.30.1

# Yarn (needed for Anchor tests)
npm install -g yarn
```

Verify all five are installed:

```bash
rustc --version && solana --version && anchor --version && node --version && yarn --version
```

You should see five version numbers. If any fails, fix that one before moving on.

### 1.2 Set up your Solana wallet

Create a keypair, switch to devnet, and get some test SOL:

```bash
solana-keygen new -o ~/.config/solana/id.json --no-bip39-passphrase
solana config set --url devnet
solana airdrop 2
solana balance
```

If the airdrop is rate-limited, grab some manually from <https://faucet.solana.com> using the address from `solana address`.

> **Important:** This is your **CLI wallet**, used to deploy the Anchor program. It's separate from any Phantom wallet you might use later as a normal user. The CLI wallet pays for the program deployment; your Phantom wallet will be used to interact with the dApp.

### 1.3 Clone the repo and set things up

```bash
git clone https://github.com/mertcano/Fatura_Fi
cd Fatura_Fi
./scripts/setup.sh
```

The setup script:
- Creates a Python virtual environment for the backend
- Installs all Python dependencies (~3 minutes)
- Generates 10,000 synthetic training invoices
- Trains the XGBoost risk model (~30 seconds)
- Installs all Next.js dependencies (~2 minutes)

When it's done, you have a working local copy.

### 1.4 Run all three services

Open three terminal windows. In each one:

**Terminal 1 — backend:**

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Visit <http://localhost:8000/api/health> — you should see `{"status":"ok"}`.

**Terminal 2 — frontend:**

```bash
cd frontend
cp .env.local.example .env.local
npm run dev
```

Visit <http://localhost:3000> — the homepage should load.

**Terminal 3 — Anchor (only needed once for first-time deployment, see section 2):**

```bash
cd program
```

### 1.5 Try the app

1. Open <http://localhost:3000> in your browser
2. Install the [Phantom wallet](https://phantom.app) browser extension if you don't have it
3. In Phantom: **Settings → Developer Settings → Testnet Mode → ON**, then switch the network to **Devnet**
4. Click **Select Wallet** in the top-right corner → connect Phantom
5. Navigate to **Marketplace** and click **Load demo invoices**
6. You should see 8 demo invoices with grades A–E. Click "Why this score?" on any card to see the SHAP explanation.

If all this works locally, you're ready to deploy.

---

## 2. Deploying the Anchor program to devnet

This part only needs to happen **once**.

### 2.1 Generate a program keypair

```bash
cd program
mkdir -p target/deploy
solana-keygen new -o target/deploy/faturafi-keypair.json --no-bip39-passphrase --force
```

This prints a public key — that becomes your **Program ID**. Copy it. (In this repo, it's already set to `CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36`, but if you generate a fresh keypair, you'll get a different one and you'll need to update the code.)

### 2.2 Sync the program ID into the code

The program ID needs to appear in two places: `programs/faturafi/src/lib.rs` (inside `declare_id!()`) and `Anchor.toml`. Anchor has a built-in command for this, but if it fails on the version mismatch (Anchor 0.30 + newer Rust), update the files directly with `sed`:

```bash
# Replace YOUR_PROGRAM_ID with what solana-keygen printed
PROGRAM_ID="YOUR_PROGRAM_ID"
sed -i "s|CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36|$PROGRAM_ID|g" programs/faturafi/src/lib.rs
sed -i "s|CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36|$PROGRAM_ID|g" Anchor.toml
```

If you're using the existing keypair (no fresh generation), skip this step — the IDs are already correct.

### 2.3 Build and deploy

```bash
anchor build --no-idl
```

> **Why `--no-idl`?** Anchor 0.30.1's IDL builder breaks on Rust 1.85+ because of a `proc_macro2::Span` API change. The program itself compiles fine; we just skip the IDL generation step. The frontend in this repo doesn't depend on the IDL file, so this is safe.

The first build takes 5–10 minutes (Rust compiles all dependencies from source). Subsequent builds are ~30 seconds.

Then deploy:

```bash
anchor deploy --provider.cluster devnet
```

You should see:

```
Program Id: CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
Deploy success
```

Verify it's live by visiting:
```
https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet
```

### 2.4 Top up your Phantom wallet

If you want to interact with the dApp as a user, your Phantom wallet also needs devnet SOL:

```bash
solana airdrop 2 YOUR_PHANTOM_ADDRESS --url devnet
```

(Or use <https://faucet.solana.com> manually.)

---

## 3. Deploying the backend to Railway

Railway hosts the FastAPI backend. The free tier gives you 500 hours/month, more than enough for a hackathon project.

### 3.1 Push your repo to GitHub

If you haven't already:

```bash
cd ~/Fatura_Fi
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/Fatura_Fi.git
git push -u origin main
```

> **GitHub authentication note:** GitHub no longer accepts passwords for git operations. You need a **Personal Access Token (PAT)**. Generate one at <https://github.com/settings/tokens/new> with `repo` scope, and use it as your password when git prompts you.

### 3.2 Create a Railway project

1. Open <https://railway.app> and **Login with GitHub**
2. Dashboard → **New Project** → **Deploy from GitHub repo** → select `Fatura_Fi`
3. The first build will probably fail — that's fine, we need to configure it next

### 3.3 Configure the service

Click on the service that was created, then:

1. **Settings tab → Source → Root Directory**: set to `backend` (no leading slash, no trailing slash — just `backend`)
2. **Variables tab → New Variable**: add `PYTHON_VERSION` with value `3.11`
3. The service auto-redeploys whenever you change settings; wait for the build (~3 minutes)

### 3.4 What's inside `backend/railway.json`

The repo includes this config so Railway knows how to start the server:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

You shouldn't need to touch this — it's already in the repo and works out of the box.

### 3.5 Generate a public domain

Settings → **Networking → Public Networking → Generate Domain**. Railway will give you a URL like `faturafi-production-xxxx.up.railway.app`. Copy this URL.

### 3.6 Test the backend

```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/api/health
```

You should see `{"status":"ok","service":"faturafi-api","version":"0.1.0"}`.

### 3.7 Seed the demo data

```bash
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/seed
```

Returns `{"status":"seeded","count":8}`. The marketplace now has 8 demo invoices.

> **Note about persistence:** Railway uses an ephemeral filesystem on the free tier, which means SQLite data resets on every redeploy. You'll need to re-run the seed command after each push. For production, swap SQLite for Railway's managed PostgreSQL.

---

## 4. Deploying the frontend to Vercel

### 4.1 Import the repo

1. Go to <https://vercel.com> and **Login with GitHub**
2. **Add New → Project** → find `Fatura_Fi` → **Import**

### 4.2 Configure the project — these settings matter

On the configuration screen:

- **Project Name**: `fatura-fi` (or whatever you like)
- **Framework Preset**: **Next.js** (Vercel usually detects this, but verify — if it says "Other", change it)
- **Root Directory**: **`frontend`** (click Edit, then type or browse to `frontend`). This is critical — if you skip this, the build fails because `package.json` isn't in the repo root.
- **Build & Output Settings**: leave at defaults

### 4.3 Add environment variables

In the **Environment Variables** section, add these three (use **+ Add More** after each):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app` |
| `NEXT_PUBLIC_SOLANA_RPC` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROGRAM_ID` | `CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36` |

> **Important:** Don't put a trailing slash on `NEXT_PUBLIC_API_URL`. It should end with `.app`, not `.app/`.

Click **Deploy**. Build takes 2–3 minutes.

### 4.4 (Optional) Customize the subdomain

After deployment, go to **Project Settings → Domains** and rename to something cleaner like `fatura-fi.vercel.app`.

---

## 5. Connecting everything

### 5.1 Update the backend's CORS allowlist

The backend needs to know which Vercel URLs are allowed to call it. Edit `backend/app/main.py` and find the CORS block:

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://fatura-fi.vercel.app",
    "https://YOUR-FULL-VERCEL-URL.vercel.app",
],
```

Add both your custom subdomain (`fatura-fi.vercel.app`) and the auto-generated Vercel URL (visible in your Vercel dashboard, looks like `fatura-fi-yourname.vercel.app`).

Commit and push:

```bash
git add backend/app/main.py
git commit -m "fix: add Vercel domains to CORS allowlist"
git push
```

Railway auto-redeploys (~2 minutes).

### 5.2 Re-seed after the redeploy

Because the SQLite database resets on every Railway redeploy, run seed again:

```bash
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/seed
```

### 5.3 Test the full live system

Open your Vercel URL and:

1. ✅ Homepage loads with the gradient hero
2. ✅ Click **Marketplace** — 8 demo invoices appear
3. ✅ Click **Why this score?** on any card — SHAP explanations expand
4. ✅ Connect a Phantom wallet (devnet mode!) — your address shows in the header
5. ✅ Visit **List invoice** — the form loads
6. ✅ Submit a test invoice — gets scored, redirects to the invoice detail page

If all six work, you're fully deployed.

---

## 6. Troubleshooting

Real problems you'll likely hit, with their fixes.

### Anchor build: `Invalid Base58 string`

The placeholder Program ID in `lib.rs` was invalid Base58 (contained `0`, `I`, `O`, or `l`). Either generate your own keypair and `sed`-replace the ID, or use the one already in this repo (`CoM9J1Uyg...`).

### Anchor build: `no method named 'source_file' found for struct 'proc_macro2::Span'`

Rust 1.85+ broke an API that Anchor 0.30.1's IDL builder uses. Skip IDL generation:

```bash
anchor build --no-idl
```

### Railway build: `parse failure, failed to decode json file: invalid character 'c'`

You accidentally got a heredoc preamble (`cat > railway.json << 'EOF'`) inside the JSON file. Use Python instead:

```bash
cd backend
rm railway.json
python3 << 'PYEOF'
import json
with open("railway.json", "w") as f:
    json.dump({
        "$schema": "https://railway.app/railway.schema.json",
        "build": {"builder": "NIXPACKS"},
        "deploy": {
            "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
            "restartPolicyType": "ON_FAILURE",
            "restartPolicyMaxRetries": 3
        }
    }, f, indent=2)
PYEOF
```

### Railway runtime: `XGBoostError: Opening /app/ml/model.json failed: No such file or directory`

The trained model files weren't pushed to the repo because they're in `.gitignore`. Force-add them:

```bash
git add -f backend/ml/model.json backend/ml/feature_encoder.json backend/ml/metrics.json
git commit -m "fix: ship trained model files for production"
git push
```

### Railway runtime: `TypeError: object of type 'NoneType' has no len()` in `shap/explainers/_tree.py`

The `shap` library has a version mismatch with XGBoost 2.1+. This repo already uses XGBoost's built-in `pred_contribs` instead, so this shouldn't happen — but if you re-introduce the `shap` library, expect this crash.

### Vercel build fails immediately

You forgot to set **Root Directory** to `frontend`. Go to **Project Settings → General → Root Directory** and set it.

### `pip install` fails with "externally-managed-environment"

You're running pip outside the virtualenv. Activate it first:

```bash
source venv/bin/activate
```

If the venv is broken, recreate it:

```bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If `venv` creation fails because `ensurepip` is missing:

```bash
sudo apt install -y python3-full python3-venv
```

### Frontend can't reach the backend (CORS error in browser console)

The Vercel URL isn't in the backend's `allow_origins` list. See [section 5.1](#51-update-the-backends-cors-allowlist).

### Phantom won't connect to the dApp

Phantom is probably on mainnet. Open Phantom → Settings → Developer Settings → **Testnet Mode ON** → switch to **Devnet** in the network selector.

### Airdrop fails with "rate limited"

Either wait a few minutes and try again, or use <https://faucet.solana.com> manually with your address.

---

## Submission checklist

Before submitting to Colosseum:

- [ ] Anchor program deployed to devnet, Program ID saved
- [ ] Backend `/api/health` returns 200 on the public Railway URL
- [ ] Backend `/api/seed` populated the database with 8 demo invoices
- [ ] Frontend loads on the public Vercel URL with no console errors
- [ ] Phantom wallet connects successfully (on Devnet)
- [ ] Marketplace shows all 8 demo invoices with proper grades
- [ ] "Why this score?" expands and shows SHAP drivers
- [ ] Listing a new invoice from the form works end-to-end
- [ ] README has live demo and Solana Explorer links updated
- [ ] GitHub repo is public, with About description, Website URL, and Topics filled in
- [ ] Repo URL, live demo URL, and your X handle ready to paste into the Colosseum submission form

You're done. Go submit.
