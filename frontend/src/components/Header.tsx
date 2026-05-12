"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(m => m.WalletMultiButton),
  { ssr: false }
);

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/list", label: "List invoice" },
    { href: "/portfolio", label: "Portfolio" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-ink-950/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center font-bold text-white shadow-glow-purple-sm">
              F
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-brand opacity-0 group-hover:opacity-50 blur-md transition-opacity" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-base tracking-tight">FaturaFi</span>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md bg-mint-500/10 text-mint-400 border border-mint-500/20 font-mono">
              devnet
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  active
                    ? "text-white bg-white/5"
                    : "text-ink-300 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
