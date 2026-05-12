# DEPLOY.md — Step-by-step deployment guide

This guide gets FaturaFi running end-to-end in **under 30 minutes** on a fresh machine. Copy-paste each command.

> **Audience**: Solana newcomers. If you've never run `anchor deploy` before, this is for you.

---

## 0. Prerequisites

You need a Mac or Linux machine (Windows users: install WSL2 first). Make sure you have:

- Python 3.11+ (`python3 --version`)
- Node.js 20+ (`node -v`)
- ~5 GB free disk space (Rust toolchain is heavy)
- A free hour the first time you do this

## 1. Install Solana + Anchor (one-time, ~10 minutes)

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```

This installs Rust, Solana CLI, Anchor (1.0+), Node.js, and Yarn together. After it finishes, **restart your terminal** and verify:

```bash
rustc --version && solana --version && anchor --version
```

If `anchor` shows version 1.x instead of 0.30.1, switch:

```bash
avm install 0.30.1
avm use 0.30.1
```

## 2. Set up your Solana wallet (one-time)

Create a keypair, switch to devnet, and get some test SOL:

```bash
solana-keygen new -o ~/.config/solana/id.json   # save the seed phrase somewhere safe!
solana config set --url devnet
solana airdrop 2
solana balance                                   # should show 2 SOL
```

If airdrop fails with "rate limited", grab some from <https://faucet.solana.com> manually using the address from `solana address`.

## 3. Clone and set up the project

```bash
git clone https://github.com/YOUR_HANDLE/faturafi
cd faturafi
./scripts/setup.sh
```

The setup script:
- Installs Python deps and trains the XGBoost model (~2 minutes)
- Installs Next.js deps (~2 minutes)
- Creates your `.env.local`

## 4. Build and deploy the Anchor program (~10 minutes first time)

```bash
cd program
anchor build
```

First build is slow (Rust compiles everything from scratch). Subsequent builds take ~30 seconds.

After build succeeds, sync the program ID Anchor generated for you:

```bash
anchor keys sync
anchor build      # rebuild with the synced ID
```

Deploy to devnet:

```bash
anchor deploy --provider.cluster devnet
```

When it finishes, copy the **Program Id** it prints. It looks like `7xKXt...long...string`.

## 5. Wire the program ID into the frontend

```bash
cd ../frontend
nano .env.local
```

Replace the `NEXT_PUBLIC_PROGRAM_ID=...` line with the program ID from step 4. Save and exit (Ctrl+X, Y, Enter).

## 6. Run everything

Open three terminals.

**Terminal 1 — backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3** is for you to run commands when needed (e.g. `solana airdrop 2` to top up your wallet).

## 7. Use the app

1. Open <http://localhost:3000> in your browser.
2. Install [Phantom](https://phantom.app) if you haven't.
3. In Phantom settings: **Developer Settings → Change Network → Devnet**.
4. Click **Connect Wallet** in the top right.
5. Go to `/marketplace` and click **Load demo invoices** (only the first time).
6. Browse, filter, click "Why this score?" to see SHAP explanations.
7. Test the full flow: go to `/list`, fill the form, get an AI-scored offer.
8. Switch wallets in Phantom (or use a different browser profile) to act as the investor and fund an invoice.
9. Check `/portfolio` to see your funded positions.

## 8. (Optional) Run the Anchor test suite

```bash
cd program
anchor test
```

This spins up a local validator, deploys the program, and runs the full lifecycle test (initialize → list → fund → settle). Useful for showing judges that the on-chain code works.

---

## Troubleshooting

### `anchor build` fails with "linker `cc` not found"

You're missing build essentials. On Ubuntu:
```bash
sudo apt install build-essential pkg-config libssl-dev libudev-dev
```
On Mac, install Xcode Command Line Tools:
```bash
xcode-select --install
```

### `anchor deploy` fails with "insufficient funds"

You ran out of devnet SOL. Get more:
```bash
solana airdrop 2
```

### Backend won't start — `ModuleNotFoundError`

Activate the venv first:
```bash
cd backend && source venv/bin/activate
```

### Frontend shows "API error" everywhere

The backend isn't running. Check terminal 1 for errors. Confirm it's accepting connections:
```bash
curl http://localhost:8000/api/health
```

### Phantom wallet won't connect

You're probably on mainnet. Open Phantom → Settings (gear icon) → Developer Settings → Change Network → **Devnet**.

### `anchor test` is super slow

That's normal first time. It's downloading the Solana test validator. Subsequent runs are fast.

---

## What to check before submitting

Run through this list before clicking submit on the hackathon platform:

- [ ] `anchor deploy` printed a program ID and you saved it
- [ ] Backend `/api/health` returns 200
- [ ] Frontend loads at `localhost:3000` without console errors
- [ ] Phantom connects on devnet
- [ ] Marketplace shows seeded invoices
- [ ] You can fund an invoice with a different wallet
- [ ] Demo video recorded and uploaded
- [ ] Pitch deck slides exported from `docs/pitch-deck.md` to actual slide format (Google Slides, Pitch, or Keynote)
- [ ] README screenshots updated with your own captures
- [ ] GitHub repo is public
- [ ] X (Twitter) launch thread drafted (see `docs/x-posts.md`)
