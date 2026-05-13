"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaturaFiLogo } from "./FaturaFiLogo";

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
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream-50/85 border-b border-bark-800/8">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <FaturaFiLogo size={36} />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base tracking-tight text-bark-800">FaturaFi</span>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md bg-terra-500/10 text-terra-600 border border-terra-500/25 font-mono font-semibold">
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
