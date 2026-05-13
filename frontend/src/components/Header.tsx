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
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream-50/80 border-b border-bark-800/8">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra-500 to-terra-700 flex items-center justify-center font-bold text-cream-50 text-sm">
            F
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base tracking-tight text-bark-800">FaturaFi</span>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md bg-mint-500/10 text-mint-500 border border-mint-500/25 font-mono font-semibold">
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
                    ? "text-bark-800 bg-bark-800/6"
                    : "text-bark-500 hover:text-bark-800 hover:bg-bark-800/4"
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
