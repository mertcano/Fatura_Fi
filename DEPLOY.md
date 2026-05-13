# FaturaFi Deployment Guide

This is the operational runbook for FaturaFi — how to deploy, redeploy, troubleshoot, and demo the system. Use it when you're setting up a fresh environment, when something breaks, or right before a presentation.

For an overview of what the project does, see [README.md](README.md).

---

## Architecture in production

```
┌──────────────────┐   HTTPS    ┌──────────────────┐
│  Vercel          │ ────────►  │  Railway         │
│  fatura-fi       │            │  faturafi-prod   │
│  (Next.js 14)    │            │  (FastAPI)       │
└────────┬─────────┘            └────────┬─────────┘
         │                               │
         │ Solana RPC                    │ SQLite
         ▼                               ▼
   ┌─────────────┐                ┌─────────────┐
   │   Devnet    │                │ /tmp/db.sql │
   │ + Phantom   │                │ (ephemeral) │
   └─────────────┘                └─────────────┘
```

Three services, three deployment surfaces:

| Service | Hosting | URL | Reset behavior |
|---|---|---|---|
| Frontend | Vercel | https://fatura-fi.vercel.app | Auto-deploy on push to `main` |
| Backend  | Railway | https://faturafi-production.up.railway.app | Auto-deploy on push; **SQLite resets each deploy** |
| Program  | Solana devnet | `CoM9J1...drNF36` | Permanent until manually upgraded |

---

## First-time deployment

### 1. Deploy the Anchor program (one time)

```bash
cd program
solana config set --url devnet
solana airdrop 2
anchor build --no-idl
anchor deploy --provider.cluster devnet
```

The `--no-idl` flag is required for Anchor 0.30.1 with Rust 1.85+. Note the program ID it prints — that's your `NEXT_PUBLIC_PROGRAM_ID`.

### 2. Deploy the backend to Railway

1. Connect your GitHub repo to Railway
2. Set **Root Directory** to `backend`
3. `railway.json` already configured with: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Trigger deploy — Railway runs `pip install -r requirements.txt` automatically

The model files (`xgboost_model.json`, scalers) are committed to the repo via `git add -f backend/ml/*.json` because they're in `.gitignore` by default.

### 3. Deploy the frontend to Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `frontend`
3. Add environment variables in Vercel settings:
   ```
   NEXT_PUBLIC_API_URL=https://faturafi-production.up.railway.app
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
   ```

### 4. Seed the database for the first demo

```bash
curl -X POST 'https://faturafi-production.up.railway.app/api/seed?force=true'
```

Expected response:
```json
{"status":"seeded","count":8,"force":true}
```

---

## Running it locally

You need three terminals.

```bash
# Terminal 1 — backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Now running on http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env.local  # if you haven't already
npm run dev
# Now running on http://localhost:3000
```

Make sure `frontend/.env.local` points at your local backend during local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
```

For testing against the **deployed** backend from your local frontend, point at Railway instead:

```env
NEXT_PUBLIC_API_URL=https://faturafi-production.up.railway.app
```

**After changing `.env.local`, restart `npm run dev`** — Next.js does not pick up env changes hot.

---

## The demo dataset

The seed endpoint creates **8 demo invoices** across 5 sectors (textile, logistics, food & beverage, electronics, construction) and 5 buyer tiers (enterprise down to micro). They're identifiable by their `sme_wallet` field, which always starts with `DEMOsme`.

### Force re-seeding

If the marketplace gets cluttered with test data, or if you want a fresh demo right before a presentation, force-reseed:

```bash
curl -X POST 'https://faturafi-production.up.railway.app/api/seed?force=true'
```

This **deletes every invoice in the database** and recreates the 8 demos. Use it confidently — it's the official "reset to clean state" command.

### When seed endpoint says `already_seeded`

The seed endpoint without `?force=true` returns `{"status":"already_seeded"}` when 8 demo invoices already exist. This is intentional — it prevents duplicates on accidental calls.

To force a reset anyway, use `?force=true`.

---

## Real on-chain NFT minting

When a user clicks **List invoice** or **Fund this invoice**:

1. Frontend calls `mintInvoiceNFT()` in `src/lib/solana/mint.ts`
2. A new mint account is created with `decimals = 0`, supply = 1
3. Phantom prompts the user to sign the transaction
4. After signing, the NFT is minted to the user's associated token account
5. The mint address and transaction signature are stored in browser `localStorage` under the `faturafi:nft-mints` key
6. The Solana Explorer link uses the cluster's URL: `https://explorer.solana.com/address/{mint}?cluster=devnet`

### Why localStorage for mint records

The backend doesn't track per-invoice mint addresses (that's a roadmap item). For the MVP, the frontend caches mint records client-side. This means:

- Mint records show up on the same device/browser
- Switching devices → mint records won't be there (the on-chain NFT is still in the wallet though)
- Clearing browser data → mint records gone (NFT itself is still on-chain)

Production version will persist mint records server-side.

### Phantom devnet setup checklist

For users to mint NFTs they need:

1. Phantom extension installed
2. **Settings → Developer Settings → Testnet Mode → ON**
3. **Network → Devnet**
4. At least 0.05 SOL in their devnet wallet
5. Get devnet SOL: https://faucet.solana.com (paste wallet, select Devnet, request airdrop)

---

## Troubleshooting

### "Failed to fetch" in the browser

**Cause 1**: Frontend env points at the wrong backend.

```bash
cat ~/Fatura_Fi/frontend/.env.local
```

If `NEXT_PUBLIC_API_URL` is `http://localhost:8000` but you're testing against deployed backend, that's the problem. Update to the Railway URL and restart `npm run dev`.

**Cause 2**: Backend is down or rebooting.

```bash
curl -s --max-time 5 https://faturafi-production.up.railway.app/api/health
```

Expected: `{"status":"ok","service":"faturafi-api","version":"0.1.0"}`

If timeout or non-200: check Railway dashboard → Deployments → Logs.

**Cause 3**: CORS — backend doesn't recognize the Vercel domain.

Check `backend/app/main.py` CORS middleware — it should include both `https://fatura-fi.vercel.app` and `http://localhost:3000`.

### Marketplace shows zero invoices

Database is empty (Railway likely re-deployed and reset SQLite).

```bash
curl -X POST 'https://faturafi-production.up.railway.app/api/seed?force=true'
```

Then hard-refresh the browser (Ctrl+Shift+R).

### Phantom won't sign / mint fails with "User rejected"

User clicked "Reject" in the Phantom popup. Show them how to approve next time. The transaction will retry on the next click.

### "Not enough SOL for transaction fees"

Wallet has less than ~0.002 SOL. Send them to https://faucet.solana.com for devnet airdrop.

### `anchor build` fails on Rust 1.85+

```bash
anchor build --no-idl
```

The IDL generator is incompatible with newer Rust. Skipping it works fine for deployment — only blocks if you need the auto-generated IDL.

### `next dev` shows `Environments: .env.local` but env not loading

Either:
- File has Windows line endings: `sed -i 's/\r$//' .env.local`
- Server cached old env: stop with Ctrl+C, remove `.next` folder, restart

```bash
rm -rf .next
npm run dev
```

### Vercel deployment "Error" status

Open the failed deployment → check **Build Logs**. Common causes:
- TypeScript error in newly added code (run `npx tsc --noEmit` locally first)
- Missing dependency (run `npm install` then commit `package-lock.json`)
- Out-of-memory during build (rare; contact Vercel support)

---

## Pre-demo checklist

Before any live demo or hackathon submission, run through this list. Takes 3 minutes.

```bash
# 1. Backend healthy?
curl -s https://faturafi-production.up.railway.app/api/health
# Expect: {"status":"ok",...}

# 2. Force-reseed for a clean demo
curl -X POST 'https://faturafi-production.up.railway.app/api/seed?force=true'
# Expect: {"status":"seeded","count":8,"force":true}

# 3. Frontend loads cleanly?
# Open https://fatura-fi.vercel.app — hard refresh (Ctrl+Shift+R)
# Marketplace should show 8 demo invoices

# 4. Phantom on devnet with at least 0.1 SOL?
# Settings → Developer Settings → Testnet Mode ON → Devnet

# 5. One end-to-end mint as final test
# Marketplace → pick an invoice → Fund → approve Phantom → see "Funded successfully"
```

---

## Common Git workflow

After local changes:

```bash
cd ~/Fatura_Fi
git status                    # see what changed
git add frontend/ backend/    # or specific files
git commit -m "feat: ..."
git push
```

Both Vercel and Railway watch the `main` branch and auto-deploy. Wait ~2 minutes after pushing before testing.

### Emergency rollback

If a push breaks production:

**Option A — Vercel rollback (fast, just the frontend):**
1. Vercel dashboard → Deployments
2. Pick a previous green deployment
3. "..." menu → **Promote to Production**

**Option B — Git revert (kalıcı, code + deploy):**
```bash
git log --oneline | head -5     # find the last good commit
git reset --hard <commit-hash>
git push --force origin main
```

⚠️ `--force` rewrites history. Make a backup branch first:
```bash
git branch backup-$(date +%s)
```

---

## Useful commands cheat sheet

| What you want | Command |
|---|---|
| Check backend health | `curl https://faturafi-production.up.railway.app/api/health` |
| Force-reseed DB | `curl -X POST 'https://faturafi-production.up.railway.app/api/seed?force=true'` |
| Check current invoice count | `curl -s 'https://faturafi-production.up.railway.app/api/invoices' \| python3 -c "import json,sys; print(len(json.load(sys.stdin)))"` |
| Get devnet SOL | Visit https://faucet.solana.com |
| Frontend logs | `cd frontend && npm run dev` — watch terminal |
| Production frontend logs | Vercel dashboard → Deployments → click latest → Runtime Logs |
| Production backend logs | Railway dashboard → Service → Deployments → click latest → View Logs |

---

## Environment variables reference

### Frontend (`frontend/.env.local` for local, Vercel env vars for production)

```env
NEXT_PUBLIC_API_URL=https://faturafi-production.up.railway.app
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
```

### Backend (Railway env vars)

No required env vars — backend reads everything from defaults. CORS allowlist is hardcoded in `app/main.py` to include the Vercel domain and localhost.

---

## What can break in production

| Symptom | Most likely cause | Fix |
|---|---|---|
| Marketplace empty | Railway redeploy reset SQLite | Force-reseed |
| Failed to fetch | Backend offline or CORS | Check Railway logs |
| Mint fails silently | Phantom not on devnet | User check Phantom settings |
| Slow page loads | Vercel cold start | First load after idle; subsequent fast |
| 502 from backend | Railway out of memory | Restart service in Railway dashboard |

---

Built for **Colosseum Frontier 2026** · Superteam Türkiye Track
