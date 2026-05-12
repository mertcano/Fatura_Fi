<div align="center">

<h1>FaturaFi</h1>

**The capital market for unpaid invoices, settled on Solana.**

AI-powered invoice tokenization protocol for Turkish SMEs. Receivables become NFTs, priced by an explainable risk model, funded by global stablecoin investors.

[![Built on Solana](https://img.shields.io/badge/Built_on-Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![Anchor 0.30](https://img.shields.io/badge/Anchor-0.30.1-blue?style=for-the-badge)](https://www.anchor-lang.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-14F195?style=for-the-badge)](LICENSE)

[Live demo](https://YOUR-VERCEL-URL.vercel.app) · [Devnet program](https://explorer.solana.com/address/CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36?cluster=devnet) · [Built for Colosseum Frontier 2026](https://www.colosseum.com)

</div>

---

## The problem

Small and medium businesses (KOBİ) in Türkiye wait **60 to 120 days** to get paid on invoices. During that wait, they're operating without working capital — paying suppliers, salaries, and rent from a shrinking bank balance.

The Turkish KOBİ market is **3.5 million businesses** representing 73% of employment and 56% of GDP. The total cash trapped in unpaid invoices at any moment is **₺2.3 trillion**.

The existing options fail most of them:

- **Bank factoring** is gatekept (collateral, credit history, 3–5 day approval) and expensive (20–35% effective annual rates)
- **Credit cards** have limits too low for B2B invoices
- **Informal lenders** are usurious
- **Doing without** is the most common path — and the leading cause of SME failure

---

## What FaturaFi does

A protocol that turns unpaid invoices into globally tradable, AI-priced financial instruments on Solana.

1. **SME lists an invoice** through a Phantom-connected dApp
2. **AI scores it** in under 2 seconds (XGBoost + SHAP explanations)
3. **NFT mints** on Solana via an Anchor program; the risk hash is committed on-chain
4. **Investors fund it** by depositing discounted USDC, which lands in the SME's wallet immediately
5. **At maturity**, the buyer settles the face value, which transfers to the current NFT holder

---

## Why Solana

The product is impossible on any chain without all three of these properties:

| Need | Why | Solana |
|---|---|---|
| Per-tx cost < 0.01% of face value | Micro-invoices (50–500 USDC) become uneconomical otherwise | `$0.00025` |
| Settlement in seconds | SMEs need their cash now, not after a 12-minute wait | `~400ms` |
| Throughput at SME scale | 3.5M SMEs × 12 invoices/year = 42M tx/year minimum | `65k TPS` |

Ethereum L1 fails on cost. Most L2s fail on finality during congestion. A factoring protocol that takes 5 minutes during peak hours isn't a factoring protocol — it's a slow bank.

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Next.js frontend   │ ◄─────► │   FastAPI backend   │
│  Phantom wallet     │  HTTPS  │   XGBoost + SHAP    │
└──────────┬──────────┘         └──────────┬──────────┘
           │                                │
           │  Anchor RPC                    │  SQLite/Postgres
           ▼                                ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Solana devnet     │         │   invoices table    │
│   FaturaFi program  │         │   risk_drivers      │
│   • initialize      │         │   portfolios        │
│   • list_invoice    │         └─────────────────────┘
│   • fund_invoice    │
│   • settle_invoice  │
│   • mark_defaulted  │
└─────────────────────┘
```

### Repo layout

```
faturafi/
├── program/          Anchor (Rust) — on-chain invoice tokenization
│   ├── programs/faturafi/src/lib.rs
│   └── tests/faturafi.ts
├── backend/          FastAPI (Python) — risk scoring API + DB
│   ├── ml/           XGBoost training pipeline
│   └── app/          FastAPI service
├── frontend/         Next.js 14 (TypeScript) — UI + wallet
│   └── src/
├── docs/             X posts, additional notes
└── scripts/          setup.sh
```

---

## The AI risk model

| Property | Value |
|---|---|
| Algorithm | XGBoost (gradient-boosted trees) |
| Training data | 10,000 synthetic invoices calibrated to Turkish factoring market dynamics |
| Features | Sector (9), buyer tier (4), macro scenario (3), amount, term, SME age, prior invoices, on-time ratio, buyer history, payment delays |
| Test AUC | **0.72** |
| Brier score | 0.17 |
| Explainability | SHAP values per prediction; SHA-256 hash committed on-chain |

### Top features driving predictions

1. **Buyer tier** (Enterprise/Mid-market/Small/Micro) — largest single driver
2. **Sector** — construction and agriculture carry higher default rates
3. **Macro scenario** — currency shock periods 1.8× base default rate
4. **Payment term length** — longer terms compound risk
5. **SME on-time payment ratio** — historical reliability

Every invoice page shows the top SHAP drivers so investors understand *why* the model scored it that way — not just the number.

---

## The on-chain program

Anchor program at `programs/faturafi/src/lib.rs`. Deployed to Solana devnet:

```
CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36
```

[View on Solana Explorer](https://explorer.solana.com/address/CoM9J1UygQFBNwTbhK1AwT8vymCKL7dPM7KW76drNF36?cluster=devnet)

### Instructions

| Instruction | Caller | What happens |
|---|---|---|
| `initialize` | Authority (once) | Sets treasury, fee config, USDC mint reference |
| `list_invoice` | SME | Creates Invoice PDA + mints unique NFT mint PDA |
| `fund_invoice` | Investor | Transfers discounted USDC to SME, protocol fee to treasury, records investor as NFT holder |
| `settle_invoice` | Buyer (or anyone) | Transfers face value USDC to current investor |
| `mark_defaulted` | Anyone (after 7-day grace) | Marks invoice defaulted; unlocks recovery flow |

### PDAs

- `["config"]` — global protocol config
- `["invoice", invoice_id]` — per-invoice state
- `["invoice_nft", invoice_id]` — per-invoice NFT mint

Events are emitted on every state transition so indexers (or a future Helius webhook) can power real-time investor dashboards.

---

## Quickstart

### Prerequisites

- Node.js 20+, Python 3.11+, Rust + Solana CLI
- Anchor 0.30.1 (`avm install 0.30.1 && avm use 0.30.1`)
- Phantom wallet on devnet

### One-command setup

```bash
git clone https://github.com/YOUR_HANDLE/faturafi
cd faturafi
./scripts/setup.sh
```

This installs all dependencies, generates the synthetic dataset, and trains the model.

### Run it

In three terminals:

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev

# Terminal 3 — Anchor (only first time)
cd program
anchor build && anchor deploy --provider.cluster devnet
```

Then open <http://localhost:3000> and connect a Phantom wallet (set to devnet).

On the marketplace page, click **Load demo invoices** once to seed.

Full step-by-step in [DEPLOY.md](DEPLOY.md).

---

## What's working

- AI risk scoring with SHAP explanations (live, sub-second response)
- Next.js 14 frontend with Phantom & Solflare wallet adapters
- Marketplace with sector/risk/amount filters
- SME invoice listing form with all model inputs
- Investor portfolio dashboard with realized/expected returns
- FastAPI backend with SQLAlchemy persistence
- Anchor program implementing the full invoice lifecycle
- End-to-end TypeScript integration tests
- Deployed to Solana devnet
- Solana-inspired UI/UX with Geist font and brand gradients

---

## Roadmap

**Q3 2026** — Pilot with 5 Turkish SMEs and 2 family-office investors. Real (non-synthetic) training data starts flowing.

**Q4 2026** — KVKK (Turkish GDPR) compliance audit. Pyth oracle integration for TRY/USD. Buyer verification flow (KEP signature → on-chain attestation).

**Q1 2027** — Tranching: pool similar-risk invoices into senior/junior tranches for institutional capital.

**Q2 2027** — Open the protocol to other emerging markets with similar SME cash-flow gaps (Brazil, Indonesia, Egypt).

---

## Tech stack

| Layer | Technology |
|---|---|
| On-chain | Solana, Anchor 0.30.1, SPL Token |
| Risk model | XGBoost, scikit-learn, SHAP |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, Geist font |
| Wallet | @solana/wallet-adapter (Phantom + Solflare) |
| Database | PostgreSQL (or SQLite for local dev) |

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built for Colosseum Frontier 2026 · Superteam Türkiye Track

</div>
