"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Invoice } from "@/lib/api";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInvoice(params.id)
      .then(setInv)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-ink-500" />
    </div>
  );

  if (!inv) return (
    <div className="text-center py-20 text-ink-500">Invoice not found</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/marketplace" className="text-sm text-ink-400 hover:text-ink-200">← Back to marketplace</Link>
      <h1 className="text-3xl font-semibold mt-4 mb-2">Invoice scored & listed</h1>
      <p className="text-ink-400 mb-8">Your invoice is now live on the marketplace. Investors can fund it instantly.</p>

      <div className="max-w-md">
        <InvoiceCard invoice={inv} canFund={false} onUpdate={() => {}} />
      </div>

      <div className="mt-8 p-5 rounded-lg border border-ink-800 bg-ink-900/30 text-sm space-y-2">
        <h3 className="font-medium text-ink-200">Next steps</h3>
        <ol className="list-decimal pl-5 text-ink-400 space-y-1">
          <li>Share this listing with potential investors (link this page).</li>
          <li>When funded, discounted USDC will land in your wallet within seconds.</li>
          <li>Your buyer settles directly on maturity — face value goes to the investor.</li>
        </ol>
      </div>
    </div>
  );
}
