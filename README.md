<div align="center">

<h1>FaturaFi</h1>

**Paid before payday.**

Turkish small businesses wait 60–120 days to get paid on their invoices. FaturaFi turns those invoices into real Solana NFTs, scores them with explainable AI, and connects them to global liquidity — so business owners get paid in seconds instead of months.

[![Built on Solana](https://img.shields.io/badge/Built_on-Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![Anchor 0.30](https://img.shields.io/badge/Anchor-0.30.1-blue?style=for-the-badge)](https://www.anchor-lang.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-14B981?style=for-the-badge)](LICENSE)

### 🔗 [Try the live demo →](https://fatura-fi.vercel.app)

[View the Solana program](https://explorer.solana.com/address/CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36?cluster=devnet) · Built for [Colosseum Frontier 2026](https://www.colosseum.com) — Superteam Türkiye

</div>

---

## The problem

Every small business in Türkiye knows this story:

You ship goods or deliver a service. The buyer is reliable. The invoice gets accepted. And then you wait — 60 days, 90 days, sometimes 120 days — to actually get paid.

During that wait, you still have to pay your suppliers, your rent, and your employees. From a bank balance that's already shrinking.

**The numbers behind this:**
- 3.5 million small businesses operate in Türkiye
- They produce 56% of the country's GDP and employ 73% of the workforce
- At any given moment, **₺2.3 trillion** is trapped in unpaid invoices
- This cash-flow gap is the single biggest reason these businesses fail

**Why existing solutions don't work for most of them:**

| Option | The problem |
|---|---|
| Bank factoring | Requires collateral and credit history. Takes 3–5 days. Effective rates of 20–35% per year. |
| Credit cards | Limits are far too low for typical B2B invoice amounts. |
| Informal lenders | Predatory rates, no structure, no legal protection. |
| Doing nothing | The most common choice. Also the most common cause of failure. |

---

## What FaturaFi does

FaturaFi tokenizes unpaid invoices as Solana NFTs that anyone can fund with SOL.

Here's the flow, in five steps:

1. **A business lists an invoice.** They open the dApp, connect Phantom, and enter the invoice details: buyer name, amount, payment term, business history.

2. **The AI scores it instantly.** An XGBoost model trained on Turkish factoring market data returns a risk score (0–100), a letter grade (A through E), and a suggested discount rate. The whole thing takes under 2 seconds. The model also returns **SHAP explanations** — so the investor can see *exactly which factors* drove the score.

3. **A real NFT mints on Solana.** Phantom signs the transaction; an SPL Token NFT (decimals=0, supply=1) is minted on Solana devnet representing this specific receivable. Every mint produces a real transaction signature visible on Solana Explorer.

4. **An investor funds the invoice.** They browse the marketplace, filter by sector or risk grade, and fund it. The business owner gets discounted SOL in their wallet in about 400 milliseconds.

5. **The buyer pays at maturity.** When the original buyer pays the face value, the full amount goes to whoever holds the NFT. The investor's profit is the spread.

---

## Why this only works on Solana

This isn't a "we picked Solana because it's popular" thing. The product is **economically impossible** on most other chains. Here's why:

| Requirement | Why we need it | Solana delivers |
|---|---|---|
| Per-transaction cost under 0.01% of invoice value | A 0.5 SOL invoice can't afford $5 in gas | ~$0.00025 |
| Settlement in seconds, not minutes | Business owners need cash *now*, not after 12 minutes of confirmations | ~400ms finality |
| Throughput at SME scale | 3.5M businesses × 12 invoices/year = 42M transactions/year minimum | 65,000 TPS |
| Native NFT primitives | Each invoice needs to be a transferable, unique on-chain asset | SPL Token with decimals=0 |

On Ethereum L1, gas fees would eat the entire investor spread. On most L2s, finality slows down during congestion — which is exactly when small businesses need their money the fastest. Solana is the only network where the numbers actually work.

---

## How everything fits together

```
┌─────────────────────┐         ┌─────────────────────┐
│  Next.js frontend   │ ◄─────► │   FastAPI backend   │
│  + Phantom wallet   │  HTTPS  │   XGBoost + SHAP    │
│  hosted on Vercel   │         │  hosted on Railway  │
└──────────┬──────────┘         └──────────┬──────────┘
           │                                │
           │  Solana RPC                    │  SQLite
           ▼                                ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Solana devnet     │         │   invoices table    │
│                     │         │   risk drivers      │
│   • SPL Token mint  │         │   portfolios        │
│     (NFT per inv.)  │         └─────────────────────┘
│                     │
│   Anchor program    │
│   (deployed, for    │
│   full settlement   │
│   roadmap Q3 2026)  │
└─────────────────────┘
```

### Repository structure

```
faturafi/
├── program/          Anchor program (Rust) — the on-chain protocol
│   ├── programs/faturafi/src/lib.rs
│   └── tests/faturafi.ts
├── backend/          FastAPI service (Python) — risk scoring + DB
│   ├── ml/           XGBoost training pipeline
│   └── app/          API routes
├── frontend/         Next.js 14 (TypeScript) — UI + Solana wallet
│   ├── src/app/      Routes (marketplace, list, portfolio, invoice/[id])
│   ├── src/components/  Header, InvoiceCard, FaturaFiLogo (custom SVG)
│   └── src/lib/solana/  Real SPL Token NFT minting helper
├── docs/             Notes, X posts, additional docs
└── scripts/          One-command setup script
```

---

## The AI risk model

The heart of FaturaFi is a real, trained machine learning model — not a chatbot wrapper.

| Property | Value |
|---|---|
| Algorithm | XGBoost (gradient-boosted trees) |
| Training data | 10,000 synthetic invoices calibrated to real Turkish factoring patterns |
| Features used | 22 (sector, buyer size, macroeconomic conditions, payment history, term length, amounts) |
| Test AUC | **0.72** |
| Brier score | 0.17 |
| Explainability | SHAP values per prediction, hashed and committed on-chain |

### What drives a typical prediction

Based on actual feature importance from the trained model:

1. **Who the buyer is.** An enterprise-level buyer (think Migros, LC Waikiki) is far safer than a micro-business buyer. This single factor matters more than anything else.
2. **What sector the business is in.** Construction and agriculture carry higher historical default rates. Services and food businesses are safer.
3. **The macroeconomic environment.** During currency shocks, default rates roughly double across the board.
4. **How long the payment term is.** A 120-day invoice carries materially more risk than a 30-day one.
5. **The business's track record.** A history of on-time payment significantly reduces risk, even for newer businesses.

Every invoice in the marketplace has a **"Why this score?"** button. Click it and you see the actual SHAP drivers behind that specific number — not a black box.

---

## The on-chain program

The Anchor program is deployed and live on Solana devnet:

```
CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
```

**[View it on Solana Explorer →](https://explorer.solana.com/address/CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36?cluster=devnet)**

### What the program does

| Instruction | Who calls it | What it does |
|---|---|---|
| `initialize` | Protocol authority (once) | Sets up the treasury and fee config |
| `list_invoice` | The business | Creates an Invoice account + mints a unique NFT for it |
| `fund_invoice` | The investor | Transfers discounted USDC to the business, takes a small protocol fee, marks the NFT as funded |
| `settle_invoice` | The buyer | Transfers the face value to the current NFT holder |
| `mark_defaulted` | Anyone (after a 7-day grace period) | Marks an invoice as defaulted, unlocking the recovery flow |

The program uses three PDAs (Program Derived Addresses):
- `["config"]` — global protocol config
- `["invoice", invoice_id]` — state for each individual invoice
- `["invoice_nft", invoice_id]` — the NFT mint for each invoice

Every state change emits an on-chain event, so indexers or webhooks can power real-time dashboards.

### Why the dApp uses SPL Token directly for the demo

For the current hackathon MVP, the frontend mints invoice NFTs through **SPL Token directly** instead of through the Anchor program. This is a deliberate scoping decision:

- The Anchor program is **deployed and verifiable on-chain**
- Direct SPL minting lets users see a real on-chain NFT in their Phantom wallet within seconds, with no protocol initialization, no USDC mint setup, no devnet token faucet
- Full Anchor integration (fund/settle/default through PDAs, escrow logic) is the Q3 2026 roadmap item once the pilot moves to mainnet

This gives the demo real on-chain proof today, while keeping the protocol's full lifecycle ready for the production phase.

---

## Running it locally

### Prerequisites

You'll need:
- Node.js 20 or later
- Python 3.11 or later
- Rust + Solana CLI ([install guide](https://solana.com/docs/intro/installation))
- Anchor 0.30.1 (`avm install 0.30.1 && avm use 0.30.1`)
- A Phantom wallet set to Devnet (Settings → Developer Settings → Testnet Mode → ON)
- A little devnet SOL — get some at [faucet.solana.com](https://faucet.solana.com)

### Quick start

```bash
git clone https://github.com/mertcano/Fatura_Fi
cd Fatura_Fi
./scripts/setup.sh
```

The setup script installs all dependencies, generates the synthetic training data, and trains the model. Takes about 5 minutes total.

### Run all three services

You'll need three terminal windows:

```bash
# Terminal 1 — the backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — the frontend
cd frontend
npm run dev

# Terminal 3 — Anchor (only the first time)
cd program
anchor build --no-idl && anchor deploy --provider.cluster devnet
```

Then open <http://localhost:3000>, connect your Phantom wallet (make sure it's on Devnet), and on the marketplace page click **Load demo invoices** to seed some data.

For step-by-step deployment instructions, see [DEPLOY.md](DEPLOY.md).

---

## What's working in this MVP

- ✅ **Live on-chain NFT minting** — every listed invoice produces a real Solana NFT signed by the user's Phantom wallet
- ✅ Live AI risk scoring with sub-second response times
- ✅ SHAP-based explanations for every score
- ✅ Next.js 14 frontend with Phantom and Solflare wallet support
- ✅ Filterable marketplace (by sector, risk grade, amount)
- ✅ SME invoice submission form with all 22 model inputs
- ✅ Portfolio dashboard with two views: **Investments** and **My listings** (open / funded / settled)
- ✅ FastAPI backend with database persistence
- ✅ Anchor program covering the full invoice lifecycle, deployed on devnet
- ✅ End-to-end TypeScript integration tests for the program
- ✅ Production frontend on Vercel + backend on Railway
- ✅ Earth + Mint design system with custom SVG logo and Geist typography

---

## What comes next

**Q3 2026** — A pilot with 5 Turkish SMEs (we have early conversations going with textile workshops in Bursa and electronics suppliers in Konya) and 2 family-office investors. The synthetic training data gets replaced with real anonymized invoice data. The frontend migrates from direct SPL minting to full Anchor program integration with USDC escrow.

**Q4 2026** — A KVKK (Turkish GDPR) compliance audit. Pyth oracle integration for live TRY/USD pricing. A buyer verification flow using e-signature attestations recorded on-chain.

**Q1 2027** — Tranching: pooling similar-risk invoices into senior and junior tranches so institutional capital can participate at the risk level they want.

**Q2 2027** — Expanding the protocol to other emerging markets with similar SME cash-flow problems — Brazil, Indonesia, Egypt.

---

## Tech stack

| Layer | Technology |
|---|---|
| On-chain | Solana, Anchor 0.30.1, SPL Token (@solana/spl-token) |
| Risk model | XGBoost, scikit-learn, SHAP via XGBoost's `pred_contribs` |
| Backend | FastAPI, SQLAlchemy, Pydantic, SQLite |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Geist font |
| Wallets | @solana/wallet-adapter (Phantom + Solflare) |
| Deployment | Vercel (frontend), Railway (backend), Solana devnet (program) |

---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, build on it.

---

<div align="center">

Built for **Colosseum Frontier 2026** · Superteam Türkiye Track

**Paid before payday.**

[Live demo](https://fatura-fi.vercel.app) · [Solana program](https://explorer.solana.com/address/CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36?cluster=devnet)

</div>
