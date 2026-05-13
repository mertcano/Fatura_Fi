"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { api, Sector, BuyerTier } from "@/lib/api";
import { mintInvoiceNFT, explorerTx } from "@/lib/solana/mint";
import { Loader2, AlertCircle, Sparkles, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

const SECTORS: { value: Sector; label: string }[] = [
  { value: "textile", label: "Textile" },
  { value: "construction", label: "Construction" },
  { value: "food_beverage", label: "Food & beverage" },
  { value: "automotive", label: "Automotive" },
  { value: "electronics", label: "Electronics" },
  { value: "logistics", label: "Logistics" },
  { value: "retail", label: "Retail" },
  { value: "agriculture", label: "Agriculture" },
  { value: "services", label: "Services" },
];

const TIERS: { value: BuyerTier; label: string; hint: string }[] = [
  { value: "enterprise", label: "Enterprise", hint: "BIST-listed, large multinational" },
  { value: "mid_market", label: "Mid-market", hint: "100–1000 employees" },
  { value: "small_business", label: "Small business", hint: "10–100 employees" },
  { value: "micro", label: "Micro", hint: "Under 10 employees" },
];

type Stage = "form" | "scoring" | "minting" | "minted";

export default function ListInvoicePage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [mintInfo, setMintInfo] = useState<{ mintAddress: string; txSignature: string; invoiceId: string } | null>(null);

  const [form, setForm] = useState({
    sme_name: "",
    buyer_name: "",
    sector: "textile" as Sector,
    buyer_tier: "mid_market" as BuyerTier,
    amount_try: 250000,
    term_days: 60,
    sme_age_months: 36,
    sme_prior_invoices: 12,
    sme_ontime_ratio: 0.9,
    buyer_repeat_count: 3,
    buyer_avg_days_late: 4,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !signTransaction) {
      setError("Please connect your wallet first.");
      return;
    }
    setError(null);

    let invoiceId: string | null = null;
    try {
      // Step 1: AI scoring + DB record
      setStage("scoring");
      const inv = await api.createInvoice({
        ...form,
        sme_wallet: publicKey.toBase58(),
      });
      invoiceId = inv.id;

      // Step 2: Mint real NFT on Solana devnet
      setStage("minting");
      const result = await mintInvoiceNFT(connection, publicKey, signTransaction);

      // Step 3: Record the on-chain mint address on the invoice
      await api.attachNftMint(inv.id, result.mintAddress, result.txSignature);

      setMintInfo({
        mintAddress: result.mintAddress,
        txSignature: result.txSignature,
        invoiceId: inv.id,
      });
      setStage("minted");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || String(e);
      // Common cases: user rejected, insufficient SOL, etc.
      if (msg.includes("User rejected") || msg.includes("declined")) {
        setError("Transaction cancelled. To list the invoice on-chain, please approve the Phantom signature request.");
      } else if (msg.toLowerCase().includes("insufficient")) {
        setError("Not enough SOL for transaction fees. Run `solana airdrop 2 YOUR_WALLET --url devnet` or use https://faucet.solana.com");
      } else {
        setError(msg);
      }
      setStage("form");
    }
  }

  // ─── Success view ───────────────────────────────
  if (stage === "minted" && mintInfo) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="glass-card rounded-3xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-mint-500/10 border border-mint-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-mint-500" />
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-bark-800">
            Invoice NFT minted on-chain
          </h1>
          <p className="text-bark-500 mt-3">
            Your invoice is now a tokenized receivable. It&apos;s live on Solana devnet and ready for funding.
          </p>

          <div className="mt-8 bg-cream-50 rounded-xl p-5 text-left space-y-3 border border-bark-800/8">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-bark-400 font-mono font-semibold mb-1">NFT mint address</div>
              <div className="font-mono text-xs text-bark-700 break-all">{mintInfo.mintAddress}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-bark-400 font-mono font-semibold mb-1">Transaction</div>
              <div className="font-mono text-xs text-bark-700 break-all">{mintInfo.txSignature.slice(0, 24)}…{mintInfo.txSignature.slice(-20)}</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={explorerTx(mintInfo.txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary justify-center"
            >
              <ExternalLink size={14} /> View on Solana Explorer
            </a>
            <button
              onClick={() => router.push(`/invoice/${mintInfo.invoiceId}`)}
              className="btn-brand justify-center"
            >
              See invoice listing <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form view ────────────────────────────
  const busy = stage === "scoring" || stage === "minting";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-10">
        <div className="section-eyebrow">— List invoice</div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800">
          Get an <span className="text-terra-500">AI-scored</span><br />
          offer in seconds.
        </h1>
        <p className="text-bark-500 mt-3">
          Tokenize your receivable as a real Solana NFT. Find a SOL investor instantly.
        </p>
      </div>

      {!connected && (
        <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-terra-500/8 border border-terra-500/25 text-terra-700 text-sm">
          <AlertCircle size={16} />
          Connect your Phantom wallet to list an invoice on-chain.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Invoice details">
          <Field label="Your business name">
            <input
              required
              value={form.sme_name}
              onChange={(e) => setForm({ ...form, sme_name: e.target.value })}
              placeholder="Anadolu Tekstil Ltd."
              className="input"
              disabled={busy}
            />
          </Field>
          <Field label="Buyer / debtor name">
            <input
              required
              value={form.buyer_name}
              onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
              placeholder="Migros Ticaret A.Ş."
              className="input"
              disabled={busy}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sector">
              <select
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value as Sector })}
                className="input"
                disabled={busy}
              >
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Buyer size">
              <select
                value={form.buyer_tier}
                onChange={(e) => setForm({ ...form, buyer_tier: e.target.value as BuyerTier })}
                className="input"
                disabled={busy}
              >
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="text-xs text-bark-400 mt-1.5">
                {TIERS.find((t) => t.value === form.buyer_tier)?.hint}
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice amount (TRY)">
              <input
                type="number"
                required
                min={1000}
                value={form.amount_try}
                onChange={(e) => setForm({ ...form, amount_try: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
            <Field label="Payment term (days)">
              <input
                type="number"
                required
                min={15}
                max={180}
                value={form.term_days}
                onChange={(e) => setForm({ ...form, term_days: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
          </div>
        </Section>

        <Section title="Your business history" hint="Helps the model assess your track record">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business age (months)">
              <input
                type="number"
                min={0}
                value={form.sme_age_months}
                onChange={(e) => setForm({ ...form, sme_age_months: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
            <Field label="Prior invoices issued">
              <input
                type="number"
                min={0}
                value={form.sme_prior_invoices}
                onChange={(e) => setForm({ ...form, sme_prior_invoices: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
          </div>
          <Field label={`On-time payment ratio: ${(form.sme_ontime_ratio * 100).toFixed(0)}%`}>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.01}
              value={form.sme_ontime_ratio}
              onChange={(e) => setForm({ ...form, sme_ontime_ratio: Number(e.target.value) })}
              className="w-full accent-terra-500"
              disabled={busy}
            />
          </Field>
        </Section>

        <Section title="Buyer history" hint="If known; defaults assume new relationship">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Times bought from you before">
              <input
                type="number"
                min={0}
                value={form.buyer_repeat_count}
                onChange={(e) => setForm({ ...form, buyer_repeat_count: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
            <Field label="Avg payment delay (days)">
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.buyer_avg_days_late}
                onChange={(e) => setForm({ ...form, buyer_avg_days_late: Number(e.target.value) })}
                className="input"
                disabled={busy}
              />
            </Field>
          </div>
        </Section>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !connected}
          className="btn-brand w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stage === "scoring" ? (
            <><Loader2 size={16} className="animate-spin" /> Scoring with AI…</>
          ) : stage === "minting" ? (
            <><Loader2 size={16} className="animate-spin" /> Minting NFT on Solana — approve in Phantom…</>
          ) : (
            <><Sparkles size={16} /> Score & mint on-chain <ArrowRight size={16} /></>
          )}
        </button>

        <p className="text-xs text-bark-400 text-center">
          Two steps: (1) AI generates a risk score, (2) you sign a Phantom transaction that mints a real NFT on Solana devnet. Only network fees apply (~0.002 SOL). No USDC, no token swap.
        </p>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: #FAF7F2;
          border: 1px solid rgba(61, 46, 31, 0.1);
          border-radius: 10px;
          padding: 11px 14px;
          color: #3D2E1F;
          font-size: 14px;
          transition: all 0.2s;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(198, 107, 61, 0.4);
          background: #FFFFFF;
        }
        :global(.input::placeholder) {
          color: rgba(61, 46, 31, 0.3);
        }
        :global(.input:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg text-bark-800">{title}</h2>
        {hint && <p className="text-xs text-bark-400 mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-bark-700 mb-2 block font-medium">{label}</span>
      {children}
    </label>
  );
}
