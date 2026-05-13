"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, Invoice, Sector } from "@/lib/api";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Filter, Loader2 } from "lucide-react";

const SECTORS: { value: Sector | "all"; label: string }[] = [
  { value: "all", label: "All sectors" },
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

export default function MarketplacePage() {
  const { publicKey } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState<Sector | "all">("all");
  const [maxRisk, setMaxRisk] = useState(100);
  const [seeded, setSeeded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listInvoices({
        status: "listed",
        sector: sector === "all" ? undefined : sector,
        max_risk_score: maxRisk,
      });
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, maxRisk]);

  async function seedDemo() {
    try {
      await api.seed();
      setSeeded(true);
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="page-wrapper">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="section-eyebrow">— Marketplace</div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800">
            Tokenized invoices,<br />
            ready to fund.
          </h1>
          <p className="text-bark-500 mt-3 max-w-xl">
            Browse risk-scored invoices. Earn 8–35% APY on real-world receivables.
          </p>
        </div>
        {!seeded && invoices.length === 0 && !loading && (
          <button onClick={seedDemo} className="btn-secondary">
            Load demo invoices
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 mb-8 flex flex-wrap gap-5 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-bark-400" />
          <span className="text-sm text-bark-600 font-semibold">Filters</span>
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector | "all")}
          className="bg-cream-50 border border-bark-800/10 rounded-lg px-3 py-2 text-sm text-bark-800 outline-none focus:border-terra-500/40"
        >
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-sm text-bark-500">Max risk</span>
          <input
            type="range"
            min={20}
            max={100}
            step={10}
            value={maxRisk}
            onChange={(e) => setMaxRisk(Number(e.target.value))}
            className="flex-1 accent-terra-500"
          />
          <span className="text-sm font-mono text-bark-800 w-8 font-semibold">{maxRisk}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-bark-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-bark-500">
          <p>No invoices match your filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} invoice={inv} canFund={!!publicKey} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
