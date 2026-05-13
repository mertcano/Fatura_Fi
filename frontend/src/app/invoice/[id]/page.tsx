"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Invoice } from "@/lib/api";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { explorerAddress, explorerTx } from "@/lib/solana/mint";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [mintInfo, setMintInfo] = useState<{ mintAddress: string; txSignature: string } | null>(null);

  useEffect(() => {
    api.getInvoice(params.id)
      .then((i) => {
        setInv(i);
        // Check localStorage for client-side mint record
        const record = api.getNftMint(params.id);
        if (record) {
          setMintInfo({ mintAddress: record.mintAddress, txSignature: record.txSignature });
        } else if (i.nft_mint_address) {
          // Fallback to whatever backend has
          setMintInfo({ mintAddress: i.nft_mint_address, txSignature: "" });
        }
      })
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
      <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800 mt-6">
        Invoice scored<br />
        and listed.
      </h1>
      <p className="text-bark-500 mt-3 mb-10">
        Your invoice is now live on the marketplace. Investors can fund it instantly.
      </p>

      <div className="max-w-md">
        <InvoiceCard invoice={inv} canFund={false} onUpdate={() => {}} />
      </div>

      {mintInfo && (
        <div className="mt-6 glass-card rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-bark-400 font-mono font-semibold mb-3">
            On-chain proof
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-bark-500 min-w-[80px]">NFT mint</span>
              <a
                href={explorerAddress(mintInfo.mintAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-terra-600 hover:text-terra-700 break-all inline-flex items-center gap-1.5"
              >
                {mintInfo.mintAddress} <ExternalLink size={11} />
              </a>
            </div>
            {mintInfo.txSignature && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-bark-500 min-w-[80px]">Tx</span>
                <a
                  href={explorerTx(mintInfo.txSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-terra-600 hover:text-terra-700 break-all inline-flex items-center gap-1.5"
                >
                  {mintInfo.txSignature.slice(0, 24)}…{mintInfo.txSignature.slice(-12)} <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 glass-card rounded-2xl p-6 text-sm space-y-3">
        <h3 className="font-semibold text-bark-800">Next steps</h3>
        <ol className="space-y-2 text-bark-500">
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">01</span> Share this listing with potential investors.</li>
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">02</span> When funded, discounted SOL will land in your wallet within seconds.</li>
          <li className="flex gap-3"><span className="text-terra-500 font-mono font-semibold">03</span> Your buyer settles directly on maturity — face value goes to the investor.</li>
        </ol>
      </div>
    </div>
  );
}
