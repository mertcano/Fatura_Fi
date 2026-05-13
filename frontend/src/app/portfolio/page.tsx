"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, PortfolioSummary } from "@/lib/api";
import { Loader2, Wallet, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { InvoiceCard } from "@/components/InvoiceCard";

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!publicKey) return;
    setLoading(true);
    try {
      const data = await api.portfolio(publicKey.toBase58());
      setPortfolio(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-terra-500/10 border border-terra-500/25 flex items-center justify-center mx-auto mb-6">
          <Wallet size={28} className="text-terra-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800">
          Connect your wallet
        </h1>
        <p className="text-bark-500 mt-3">Sign in with Phantom to view your invoice portfolio.</p>
      </div>
    );
  }

  if (loading || !portfolio) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-bark-400" /></div>;
  }

  const active = portfolio.invoices.filter((i) => i.status === "funded");
  const settled = portfolio.invoices.filter((i) => i.status === "settled");

  return (
    <div className="page-wrapper">
      <div className="mb-10">
        <div className="section-eyebrow">— Portfolio</div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800">
          Your positions.
        </h1>
        <p className="text-bark-400 mt-2 font-mono text-xs break-all">{portfolio.wallet}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <Stat icon={Clock} label="Active positions" value={portfolio.active_positions.toString()} />
        <Stat icon={Wallet} label="Invested" value={`${portfolio.total_invested_usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`} />
        <Stat icon={TrendingUp} label="Expected returns" value={`${portfolio.expected_returns_usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`} accent />
        <Stat icon={CheckCircle} label="Settled" value={portfolio.settled_count.toString()} />
      </div>

      {active.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-5 text-bark-800">Active positions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} canFund={false} onUpdate={load} portfolioMode />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-5 text-bark-800">Settled</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settled.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} canFund={false} onUpdate={load} portfolioMode />
            ))}
          </div>
        </section>
      )}

      {portfolio.invoices.length === 0 && (
        <div className="text-center py-20 text-bark-500">
          <p>You haven&apos;t funded any invoices yet.</p>
          <p className="text-sm mt-2 text-bark-400">Visit the marketplace to get started.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 text-bark-400 text-[10px] mb-3 font-mono uppercase tracking-wider font-semibold">
        <Icon size={12} /> {label}
      </div>
      <div className={`text-3xl font-semibold font-mono ${accent ? "text-mint-500" : "text-bark-800"}`}>{value}</div>
    </div>
  );
}
