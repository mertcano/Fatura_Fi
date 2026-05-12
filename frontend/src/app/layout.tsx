import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "FaturaFi — AI-powered invoice finance on Solana",
  description:
    "Turkish SMEs tokenize their unpaid invoices and access global stablecoin liquidity. Risk-scored by AI, settled on Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <WalletContextProvider>
          {/* Background mesh gradient — fixed, behind everything */}
          <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10" />
          <div className="fixed inset-0 grid-bg pointer-events-none -z-10 opacity-40" />

          <Header />
          <main className="min-h-screen relative">{children}</main>

          <footer className="border-t border-white/5 mt-32 py-12 relative">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-300">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">F</div>
                <span>FaturaFi · Built for Colosseum Frontier 2026</span>
              </div>
              <div className="text-ink-400">
                Hackathon prototype on Solana Devnet · Not financial advice
              </div>
            </div>
          </footer>
        </WalletContextProvider>
      </body>
    </html>
  );
}
