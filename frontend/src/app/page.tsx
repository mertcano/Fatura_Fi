"use client";

import Link from "next/link";
import { ArrowRight, Brain, Coins, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-24 pb-32 px-6">
        {/* Background glow orbs */}
        <div className="glow-purple w-[600px] h-[600px] -top-32 -left-32 animate-glow-pulse" />
        <div className="glow-mint w-[500px] h-[500px] top-40 right-0 animate-glow-pulse" style={{ animationDelay: "1s" }} />

        <div className="max-w-7xl mx-auto relative">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-sm mb-8 animate-fade-in">
            <Sparkles size={12} className="text-mint-400" />
            <span className="text-xs text-ink-200 font-medium">Colosseum Frontier 2026 · Superteam Türkiye</span>
          </div>

          {/* Headline */}
          <h1 className="text-display-xl font-display max-w-5xl animate-fade-up">
            The capital market<br />
            for <span className="text-gradient-brand">unpaid invoices.</span>
          </h1>

          {/* Subhead */}
          <p className="mt-8 text-lg md:text-xl text-ink-300 max-w-2xl leading-relaxed animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Turkish SMEs wait 60–120 days to get paid. FaturaFi tokenizes their unpaid invoices,
            prices them with AI, and connects them to global stablecoin liquidity — settled on Solana in seconds.
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
              <div key={i} className="border-l border-white/10 pl-6">
                <div className="stat-number font-mono">{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-ink-400 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ VALUE PROPS ═══════════════ */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-20">
            <div className="text-mint-400 text-sm font-mono uppercase tracking-wider mb-4">— What we built</div>
            <h2 className="text-display-md font-display">
              Real AI. <span className="text-gradient-brand">Real chain.</span> Real money.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                color: "purple",
                title: "AI risk scoring",
                body: "Every invoice graded A–E by an XGBoost model trained on sector, buyer tier, payment history. SHAP explanations show investors exactly why an invoice scored what it did.",
              },
              {
                icon: Coins,
                color: "mint",
                title: "Instant USDC liquidity",
                body: "SMEs receive discounted USDC the moment an investor funds. No bank intermediation, no 5-day clearing, no FX cost on stablecoin rails.",
              },
              {
                icon: ShieldCheck,
                color: "purple",
                title: "On-chain transparency",
                body: "Each invoice is an NFT representing the receivable. Risk score and SHAP-hash are committed on-chain so judges, regulators, and counterparties can audit.",
              },
            ].map((f, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-8 group relative overflow-hidden">
                {/* Hover glow accent */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${f.color === "mint" ? "bg-mint-500" : "bg-purple-500"} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500`} />

                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-6 ${f.color === "mint" ? "bg-mint-500/10 border border-mint-500/20" : "bg-purple-500/10 border border-purple-500/20"}`}>
                  <f.icon size={20} className={f.color === "mint" ? "text-mint-400" : "text-purple-400"} />
                </div>
                <h3 className="text-xl font-medium mb-3 tracking-tight">{f.title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="relative py-32 px-6">
        <div className="glow-purple w-[400px] h-[400px] top-40 -left-20 opacity-30" />

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl mb-20">
            <div className="text-purple-400 text-sm font-mono uppercase tracking-wider mb-4">— The flow</div>
            <h2 className="text-display-md font-display">From invoice<br />to <span className="text-gradient-brand">working capital.</span></h2>
          </div>

          <div className="space-y-3">
            {[
              ["01", "SME lists invoice", "Upload buyer, amount, payment term through the dApp."],
              ["02", "AI scores it instantly", "XGBoost returns score 0–100, grade A–E, suggested discount."],
              ["03", "Invoice NFT minted", "Anchor program mints a unique NFT on Solana representing the receivable."],
              ["04", "Investor funds it", "Marketplace investors purchase the NFT with USDC."],
              ["05", "SME gets liquidity", "Discounted USDC lands in SME's wallet in ~400ms."],
              ["06", "Buyer settles at maturity", "Face value transfers to investor; spread is the yield."],
            ].map(([num, title, body], i) => (
              <div
                key={num}
                className="group glass-card glass-card-hover rounded-xl p-6 flex items-start gap-6"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="font-mono text-2xl text-purple-400 font-medium opacity-50 group-hover:opacity-100 group-hover:text-mint-400 transition-all">
                  {num}
                </div>
                <div>
                  <h3 className="font-medium text-lg">{title}</h3>
                  <p className="text-ink-300 text-sm mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY SOLANA ═══════════════ */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card rounded-3xl p-10 md:p-16 relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-500 rounded-full opacity-20 blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-mint-500 rounded-full opacity-15 blur-[120px]" />

            <div className="relative">
              <div className="text-mint-400 text-sm font-mono uppercase tracking-wider mb-4">— Why Solana</div>
              <h2 className="text-display-md font-display mb-12 max-w-3xl">
                This product is <span className="text-gradient-brand">impossible</span> on any other chain.
              </h2>

              <div className="grid md:grid-cols-3 gap-12">
                <div>
                  <div className="text-5xl md:text-6xl font-mono font-medium text-gradient-brand">$0.00025</div>
                  <div className="text-ink-100 font-medium mt-3">Per-transaction cost</div>
                  <p className="text-ink-300 text-sm mt-3 leading-relaxed">
                    Micro-invoices (50–500 USDC) become economically viable. On L1 EVMs, $5 in gas would consume the entire spread.
                  </p>
                </div>
                <div>
                  <div className="text-5xl md:text-6xl font-mono font-medium text-gradient-brand">400ms</div>
                  <div className="text-ink-100 font-medium mt-3">Settlement finality</div>
                  <p className="text-ink-300 text-sm mt-3 leading-relaxed">
                    SMEs get their working capital in seconds, not the 3–5 days bank wires take after factoring approval.
                  </p>
                </div>
                <div>
                  <div className="text-5xl md:text-6xl font-mono font-medium text-gradient-brand">65k TPS</div>
                  <div className="text-ink-100 font-medium mt-3">Network throughput</div>
                  <p className="text-ink-300 text-sm mt-3 leading-relaxed">
                    Scales to millions of invoices without congestion pricing. Turkish KOBİ market alone is 3.5M businesses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative py-32 px-6">
        <div className="glow-purple w-[600px] h-[300px] top-20 left-1/2 -translate-x-1/2 opacity-40" />

        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-display-lg font-display">
            Real-world yield,<br />
            <span className="text-gradient-brand">real-world impact.</span>
          </h2>
          <p className="mt-8 text-lg text-ink-300 max-w-2xl mx-auto">
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
