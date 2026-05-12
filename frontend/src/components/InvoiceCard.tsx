"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Invoice, api } from "@/lib/api";
import { Building2, Calendar, TrendingUp, Info, Loader2, CheckCircle2, ChevronDown } from "lucide-react";

// Grade colors — A=mint, gradients down to E=red
const GRADE_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  A: { bg: "bg-mint-500/10", text: "text-mint-300", border: "border-mint-500/30", glow: "bg-mint-500" },
  B: { bg: "bg-sky-500/10", text: "text-sky-300", border: "border-sky-500/30", glow: "bg-sky-500" },
  C: { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30", glow: "bg-purple-500" },
  D: { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/30", glow: "bg-orange-500" },
  E: { bg: "bg-red-500/10", text: "text-red-300", border: "border-red-500/30", glow: "bg-red-500" },
};

const SECTOR_LABELS: Record<string, string> = {
  textile: "Textile",
  construction: "Construction",
  food_beverage: "Food & beverage",
  automotive: "Automotive",
  electronics: "Electronics",
  logistics: "Logistics",
  retail: "Retail",
  agriculture: "Agriculture",
  services: "Services",
};

interface Props {
  invoice: Invoice;
  canFund: boolean;
  onUpdate: () => void;
}

export function InvoiceCard({ invoice: inv, canFund, onUpdate }: Props) {
  const { publicKey } = useWallet();
  const [expanded, setExpanded] = useState(false);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);

  const dueDate = new Date(inv.due_date);
  const daysToMaturity = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const apy = (inv.suggested_discount_rate * 365) / inv.term_days;
  const grade = GRADE_STYLES[inv.grade];
  const youPay = inv.amount_usdc * (1 - inv.suggested_discount_rate);

  async function handleFund() {
    if (!publicKey) return;
    setFunding(true);
    try {
      const mockNftMint = `NFT${inv.id.replace(/-/g, "").slice(0, 40)}`;
      await api.fundInvoice(inv.id, publicKey.toBase58(), mockNftMint);
      setFunded(true);
      setTimeout(() => onUpdate(), 800);
    } catch (e) {
      console.error(e);
      alert("Funding failed. Check console for details.");
    } finally {
      setFunding(false);
    }
  }

  return (
    <div className="group relative">
      {/* Hover glow */}
      <div className={`absolute -inset-px ${grade.glow} opacity-0 group-hover:opacity-20 blur-2xl rounded-2xl transition-opacity duration-500 pointer-events-none`} />

      <div className="relative glass-card rounded-2xl p-6 hover:border-white/15 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-mono mb-2">
              {SECTOR_LABELS[inv.sector]} · {inv.buyer_tier.replace("_", " ")}
            </div>
            <h3 className="font-medium text-base leading-tight truncate">{inv.sme_name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-ink-300 mt-1.5">
              <Building2 size={11} className="text-ink-400" />
              <span className="truncate">{inv.buyer_name}</span>
            </div>
          </div>
          <div className={`shrink-0 ml-4 px-3 py-1.5 rounded-lg border ${grade.bg} ${grade.text} ${grade.border} font-mono font-medium text-sm`}>
            {inv.grade}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2.5 mb-5 py-4 border-y border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-400">Face value</span>
            <span className="font-mono">${inv.amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-400">You pay</span>
            <span className="font-mono">${youPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-ink-300 text-sm">Implied APY</span>
            <span className="font-mono font-medium text-base text-mint-400">
              {(apy * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Bottom row stats */}
        <div className="flex justify-between text-xs text-ink-400 font-mono mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} />
            {daysToMaturity}d to maturity
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={11} />
            risk {inv.risk_score}/100
          </span>
        </div>

        {/* Explainability toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs text-ink-300 hover:text-ink-100 flex items-center justify-center gap-1.5 mb-3 py-1.5 rounded-md hover:bg-white/[0.03] transition-all"
        >
          <Info size={11} />
          {expanded ? "Hide explanation" : "Why this score?"}
          <ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && inv.risk_drivers && (
          <div className="bg-ink-950/60 rounded-lg p-3.5 mb-3 space-y-2 border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-mono mb-2">
              Top factors (SHAP)
            </div>
            {inv.risk_drivers.slice(0, 4).map((d, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-ink-200 truncate pr-2">{d.human_label}</span>
                <span className={`font-mono shrink-0 ${d.direction === "increases_risk" ? "text-red-400" : "text-mint-400"}`}>
                  {d.direction === "increases_risk" ? "↑ risk" : "↓ risk"}
                </span>
              </div>
            ))}
            <div className="text-[9px] text-ink-500 pt-2 border-t border-white/5 font-mono">
              model: xgboost-v1 · shap explanations committed on-chain
            </div>
          </div>
        )}

        {/* Action button */}
        {funded ? (
          <div className="w-full py-3 rounded-xl bg-mint-500/10 border border-mint-500/30 text-mint-300 text-sm flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 size={14} /> Funded successfully
          </div>
        ) : canFund ? (
          <button
            onClick={handleFund}
            disabled={funding}
            className="w-full py-3 rounded-xl bg-gradient-brand text-white text-sm font-medium flex items-center justify-center gap-2 hover:shadow-glow-purple disabled:opacity-50 transition-all"
          >
            {funding ? (
              <><Loader2 size={14} className="animate-spin" /> Processing</>
            ) : (
              "Fund this invoice"
            )}
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl border border-white/10 text-ink-400 text-sm text-center">
            Connect wallet to fund
          </div>
        )}
      </div>
    </div>
  );
}
