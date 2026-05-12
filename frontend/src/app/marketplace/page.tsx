"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, Invoice, InvoiceGrade, Sector } from "@/lib/api";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Filter, Loader2 } from "lucide-react";

const GRADES: InvoiceGrade[] = ["A", "B", "C", "D", "E"];
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
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Marketplace</h1>
          <p className="text-ink-400 mt-1">
            Browse tokenized invoices. Earn 8–35% APY on real-world receivables.
          </p>
        </div>
        {!seeded && invoices.length === 0 && !loading && (
          <button
            onClick={seedDemo}
            className="px-4 py-2 text-sm rounded-lg border border-ink-700 hover:border-brand-500"
          >
            Load demo invoices
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 rounded-lg border border-ink-800 bg-ink-900/30">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-ink-500" />
          <span className="text-sm text-ink-400">Filters:</span>
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector | "all")}
          className="bg-ink-900 border border-ink-700 rounded-md px-3 py-1.5 text-sm"
        >
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-400">Max risk:</span>
          <input
            type="range"
            min={20}
            max={100}
            step={10}
            value={maxRisk}
            onChange={(e) => setMaxRisk(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-mono text-ink-300 w-8">{maxRisk}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-ink-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-ink-500">
          No invoices match your filters.
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
