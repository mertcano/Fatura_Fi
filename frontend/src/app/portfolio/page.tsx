"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, PortfolioSummary, Invoice } from "@/lib/api";
import { Loader2, Wallet, TrendingUp, CheckCircle, Clock, FileText, Hourglass } from "lucide-react";
import { InvoiceCard } from "@/components/InvoiceCard";

type Tab = "investments" | "listings";
type ListingSubTab = "open" | "funded" | "settled";

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [myListings, setMyListings] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("investments");
  const [listingSubTab, setListingSubTab] = useState<ListingSubTab>("open");

  async function load() {
    if (!publicKey) return;
    setLoading(true);
    try {
      const wallet = publicKey.toBase58();
      const [portfolioData, listingsData] = await Promise.all([
        api.portfolio(wallet),
        api.listInvoices({ sme_wallet: wallet }),
      ]);
      setPortfolio(portfolioData);
      setMyListings(listingsData);
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

  // Investments grouping (fund ettiğin pozisyonlar)
  const active = portfolio.invoices.filter((i) => i.status === "funded");
  const settledInvestments = portfolio.invoices.filter((i) => i.status === "settled");

  // My listings grouping (senin oluşturduğun invoice'lar)
  const listingsOpen = myListings.filter((i) => i.status === "listed");
  const listingsFunded = myListings.filter((i) => i.status === "funded");
  const listingsSettled = myListings.filter((i) => i.status === "settled");

  // Which subset to show based on current sub-tab
  const visibleListings =
    listingSubTab === "open" ? listingsOpen :
    listingSubTab === "funded" ? listingsFunded :
    listingsSettled;

  return (
    <div className="page-wrapper">
      <div className="mb-10">
        <div className="section-eyebrow">— Portfolio</div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-bark-800">
          Your positions.
        </h1>
        <p className="text-bark-400 mt-2 font-mono text-xs break-all">{portfolio.wallet}</p>
      </div>

      {/* Main tab bar */}
      <div className="flex gap-1 mb-8 p-1 bg-bark-800/4 rounded-full w-fit">
        <button
          onClick={() => setTab("investments")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            tab === "investments"
              ? "bg-cream-50 text-bark-800 shadow-sm"
              : "text-bark-500 hover:text-bark-800"
          }`}
        >
          <TrendingUp size={14} />
          Investments
          {portfolio.invoices.length > 0 && (
            <span className="text-xs bg-bark-800/10 px-2 py-0.5 rounded-full font-mono">
              {portfolio.invoices.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("listings")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            tab === "listings"
              ? "bg-cream-50 text-bark-800 shadow-sm"
              : "text-bark-500 hover:text-bark-800"
          }`}
        >
          <FileText size={14} />
          My listings
          {myListings.length > 0 && (
            <span className="text-xs bg-bark-800/10 px-2 py-0.5 rounded-full font-mono">
              {myListings.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── INVESTMENTS TAB ─── */}
      {tab === "investments" && (
        <>
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

          {settledInvestments.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-5 text-bark-800">Settled</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settledInvestments.map((inv) => (
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
        </>
      )}

      {/* ─── MY LISTINGS TAB ─── */}
      {tab === "listings" && (
        <>
          {/* Sub-tabs: Open / Funded / Settled */}
          <div className="flex gap-1 mb-8 p-1 bg-bark-800/4 rounded-full w-fit">
            <SubTab
              active={listingSubTab === "open"}
              onClick={() => setListingSubTab("open")}
              icon={Hourglass}
              label="Open"
              count={listingsOpen.length}
            />
            <SubTab
              active={listingSubTab === "funded"}
              onClick={() => setListingSubTab("funded")}
              icon={TrendingUp}
              label="Funded"
              count={listingsFunded.length}
            />
            <SubTab
              active={listingSubTab === "settled"}
              onClick={() => setListingSubTab("settled")}
              icon={CheckCircle}
              label="Settled"
              count={listingsSettled.length}
            />
          </div>

          {myListings.length === 0 ? (
            <div className="text-center py-20 text-bark-500">
              <p>You haven&apos;t listed any invoices yet.</p>
              <p className="text-sm mt-2 text-bark-400">Tokenize a receivable from the List invoice page.</p>
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="text-center py-20 text-bark-500">
              <p>
                No {listingSubTab === "open" ? "open" : listingSubTab === "funded" ? "funded" : "settled"} listings.
              </p>
              <p className="text-sm mt-2 text-bark-400">
                {listingSubTab === "open" && "All your listings have been funded or settled."}
                {listingSubTab === "funded" && "When investors fund your listings, they'll appear here."}
                {listingSubTab === "settled" && "When your buyers pay at maturity, settled listings show here."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleListings.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  canFund={false}
                  onUpdate={load}
                  portfolioMode={listingSubTab !== "open"}
                />
              ))}
            </div>
          )}
        </>
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

function SubTab({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
        active
          ? "bg-cream-50 text-bark-800 shadow-sm"
          : "text-bark-500 hover:text-bark-800"
      }`}
    >
      <Icon size={13} />
      {label}
      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
        active ? "bg-bark-800/10" : "bg-bark-800/6"
      }`}>
        {count}
      </span>
    </button>
  );
}
