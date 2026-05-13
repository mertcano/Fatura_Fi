"use client";

import Link from "next/link";
import { ArrowRight, Brain, Coins, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-24 pb-32 px-6">
        <div className="max-w-7xl mx-auto relative">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bark-800/4 border border-bark-800/10 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
            <span className="text-xs text-bark-500 font-medium">Colosseum Frontier 2026 · Superteam Türkiye</span>
          </div>

          {/* Headline */}
          <h1 className="text-display-xl max-w-5xl animate-fade-up text-bark-800">
            The capital market<br />
            for <span className="text-gradient-brand">unpaid invoices.</span>
          </h1>

          {/* Subhead */}
          <p className="mt-8 text-lg md:text-xl text-bark-500 max-w-2xl leading-relaxed animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Turkish SMEs wait 60–120 days to get paid. FaturaFi tokenizes their unpaid invoices,
            prices them with AI, and connects them to global Solana liquidity — settled in seconds.
          </p>

          {/* CTA buttons */}
          <div className="mt-12 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link href="/marketplace" className="btn-primary">
              Browse marketplace <ArrowRight size={16} />
            </Link>
            <Link href="/list" className="btn-secondary">
              List an invoice
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            {[
              { value: "₺2.3T", label: "Trapped capital in TR" },
              { value: "3.5M", label: "Turkish SMEs" },
              { value: "400ms", label: "Settlement finality" },
              { value: "$0.00025", label: "Per transaction" },
            ].map((stat, i) => (
              <div key={i} className="border-l-2 border-terra-500/30 pl-5">
                <div className="stat-number font-mono">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-bark-400 mt-2 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ VALUE PROPS ═══════════════ */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="section-eyebrow">— What we built</div>
            <h2 className="text-display-md text-bark-800">
              Real AI. <span className="text-gradient-brand">Real chain.</span> Real money.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                color: "terra",
                title: "AI risk scoring",
                body: "Every invoice graded A–E by an XGBoost model trained on sector, buyer tier, and payment history. SHAP explanations show investors exactly why an invoice scored what it did.",
              },
              {
                icon: Coins,
                color: "mint",
                title: "Instant SOL liquidity",
                body: "SMEs receive discounted SOL the moment an investor funds. No bank intermediation, no 5-day clearing, no FX friction — settlement is native Solana.",
              },
              {
                icon: ShieldCheck,
                color: "terra",
                title: "On-chain transparency",
                body: "Each invoice is a real NFT on Solana representing the receivable. Risk score and SHAP-hash are committed on-chain so judges, regulators, and counterparties can audit.",
              },
            ].map((f, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-7 group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.color === "mint" ? "bg-mint-500/10 border border-mint-500/25" : "bg-terra-500/12 border border-terra-500/25"}`}>
                  <f.icon size={20} className={f.color === "mint" ? "text-mint-500" : "text-terra-500"} />
                </div>
                <h3 className="text-lg font-semibold mb-3 tracking-tight text-bark-800">{f.title}</h3>
                <p className="text-bark-500 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl mb-16">
            <div className="section-eyebrow">— The flow</div>
            <h2 className="text-display-md text-bark-800">From invoice<br />to <span className="text-gradient-brand">working capital.</span></h2>
          </div>

          <div className="space-y-3">
            {[
              ["01", "SME lists invoice", "Upload buyer, amount, payment term through the dApp."],
              ["02", "AI scores it instantly", "XGBoost returns score 0–100, grade A–E, suggested discount."],
              ["03", "Invoice NFT minted", "Phantom signs; a real NFT is minted on Solana representing the receivable."],
              ["04", "Investor funds it", "Marketplace investors purchase the invoice NFT with SOL."],
              ["05", "SME gets liquidity", "Discounted SOL lands in SME's wallet in ~400ms."],
              ["06", "Buyer settles at maturity", "Face value transfers to investor; spread is the yield."],
            ].map(([num, title, body]) => (
              <div
                key={num}
                className="group glass-card glass-card-hover rounded-xl p-5 flex items-start gap-6"
              >
                <div className="font-mono text-xl text-terra-500 font-semibold opacity-60 group-hover:opacity-100 transition-all min-w-[2rem]">
                  {num}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-bark-800">{title}</h3>
                  <p className="text-bark-500 text-sm mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY SOLANA ═══════════════ */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-cream-200 border border-bark-800/8 rounded-3xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-terra-500 rounded-full opacity-8 blur-[100px]" />

            <div className="relative">
              <div className="section-eyebrow text-mint-500">— Why Solana</div>
              <h2 className="text-display-md mb-12 max-w-3xl text-bark-800">
                This product is <span className="text-gradient-brand">impossible</span> on any other chain.
              </h2>

              <div className="grid md:grid-cols-3 gap-12">
                {[
                  { value: "$0.00025", label: "Per-transaction cost", body: "Micro-invoices (0.5–5 SOL face value) become economically viable. On L1 EVMs, $5 in gas would consume the entire spread." },
                  { value: "400ms", label: "Settlement finality", body: "SMEs get their working capital in seconds, not the 3–5 days bank wires take after factoring approval." },
                  { value: "65k TPS", label: "Network throughput", body: "Scales to millions of invoices without congestion pricing. Turkish KOBİ market alone is 3.5M businesses." },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-4xl md:text-5xl font-mono font-semibold text-gradient-brand">{stat.value}</div>
                    <div className="text-bark-800 font-semibold mt-3">{stat.label}</div>
                    <p className="text-bark-500 text-sm mt-3 leading-relaxed">{stat.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-display-lg text-bark-800">
            Real-world yield,<br />
            <span className="text-gradient-brand">real-world impact.</span>
          </h2>
          <p className="mt-8 text-lg text-bark-500 max-w-2xl mx-auto">
            73% of Turkish employment works for an SME waiting to get paid. Help unlock that capital.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="btn-brand">
              <Zap size={16} /> Explore the marketplace
            </Link>
            <Link href="/list" className="btn-secondary">
              List your invoice
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
