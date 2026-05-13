"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { api, Sector, BuyerTier } from "@/lib/api";
import { Loader2, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

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

export default function ListInvoicePage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!publicKey) {
      setError("Please connect your wallet first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const inv = await api.createInvoice({
        ...form,
        sme_wallet: publicKey.toBase58(),
      });
      router.push(`/invoice/${inv.id}`);
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-10">
        <div className="section-eyebrow">— List invoice</div>
        <h1 className="text-display-md text-bark-800">
          Get an <span className="font-serif-italic text-terra-500">AI-scored</span><br />
          offer in seconds.
        </h1>
        <p className="text-bark-500 mt-3">
          Tokenize your receivable. Find a stablecoin investor instantly.
        </p>
      </div>

      {!connected && (
        <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-terra-500/8 border border-terra-500/25 text-terra-700 text-sm">
          <AlertCircle size={16} />
          Connect your Phantom wallet to list an invoice.
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
            />
          </Field>
          <Field label="Buyer / debtor name">
            <input
              required
              value={form.buyer_name}
              onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
              placeholder="Migros Ticaret A.Ş."
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sector">
              <select
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value as Sector })}
                className="input"
              >
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Buyer size">
              <select
                value={form.buyer_tier}
                onChange={(e) => setForm({ ...form, buyer_tier: e.target.value as BuyerTier })}
                className="input"
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
              />
            </Field>
            <Field label="Prior invoices issued">
              <input
                type="number"
                min={0}
                value={form.sme_prior_invoices}
                onChange={(e) => setForm({ ...form, sme_prior_invoices: Number(e.target.value) })}
                className="input"
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
          disabled={submitting || !connected}
          className="btn-brand w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Scoring invoice...</>
          ) : (
            <><Sparkles size={16} /> Get AI-scored offer <ArrowRight size={16} /></>
          )}
        </button>
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
