"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Invoice } from "@/lib/api";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Loader2, ArrowLeft } from "lucide-react";
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
      <Loader2 className="animate-spin text-bark-400" />
    </div>
  );

  if (!inv) return (
    <div className="text-center py-20 text-bark-500">Invoice not found</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-bark-500 hover:text-bark-800 transition">
        <ArrowLeft size={14} /> Back to marketplace
      </Link>
      <h1 className="text-display-md text-bark-800 mt-6">
        Invoice <span className="font-serif-italic text-mint-500">scored</span><br />
        and listed.
      </h1>
      <p className="text-bark-500 mt-3 mb-10">
        Your invoice is now live on the marketplace. Investors can fund it instantly.
      </p>

      <div className="max-w-md">
        <InvoiceCard invoice={inv} canFund={false} onUpdate={() => {}} />
      </div>

      <div className="mt-8 glass-card rounded-2xl p-6 text-sm space-y-3">
        <h3 className="font-semibold text-bark-800">Next steps</h3>
        <ol className="space-y-2 text-bark-500">
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">01</span> Share this listing with potential investors.</li>
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">02</span> When funded, discounted USDC will land in your wallet within seconds.</li>
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">03</span> Your buyer settles directly on maturity — face value goes to the investor.</li>
        </ol>
      </div>
    </div>
  );
}
