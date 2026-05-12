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
        <Wallet size={40} className="mx-auto text-ink-500 mb-4" />
        <h1 className="text-2xl font-semibold">Connect your wallet</h1>
        <p className="text-ink-400 mt-2">Sign in with Phantom to view your invoice portfolio.</p>
      </div>
    );
  }

  if (loading || !portfolio) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  }

  const active = portfolio.invoices.filter((i) => i.status === "funded");
  const settled = portfolio.invoices.filter((i) => i.status === "settled");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-2">Your portfolio</h1>
      <p className="text-ink-400 mb-8 font-mono text-sm break-all">{portfolio.wallet}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat icon={Clock} label="Active positions" value={portfolio.active_positions.toString()} />
        <Stat icon={Wallet} label="Invested" value={`$${portfolio.total_invested_usdc.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat icon={TrendingUp} label="Expected returns" value={`$${portfolio.expected_returns_usdc.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent />
        <Stat icon={CheckCircle} label="Settled" value={portfolio.settled_count.toString()} />
      </div>

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-medium mb-4">Active positions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} canFund={false} onUpdate={load} />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <h2 className="text-xl font-medium mb-4">Settled</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settled.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} canFund={false} onUpdate={load} />
            ))}
          </div>
        </section>
      )}

      {portfolio.invoices.length === 0 && (
        <div className="text-center py-16 text-ink-500">
          You haven&apos;t funded any invoices yet. Visit the marketplace to get started.
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-4">
      <div className="flex items-center gap-2 text-ink-500 text-xs mb-2">
        <Icon size={12} /> {label}
      </div>
      <div className={`text-2xl font-semibold ${accent ? "text-emerald-400" : ""}`}>{value}</div>
    </div>
  );
}
